import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Home,
  Target,
  Trophy,
  Settings,
  Wifi,
  WifiOff,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  createEmptyScores,
  EVENT_INFO,
  MAX_ARCHERS_PER_GROUP,
  TOTAL_CHECKPOINTS,
} from './constants';
import {
  Archer,
  ArcherStanding,
  Category,
  CheckpointConfig,
  CPScore,
  NavTab,
  TournamentState,
} from './types';
import { rankArchers } from './utils/scoring';
import {
  buildInitialState,
  loadFromIndexedDBFallback,
  loadFromLocalStorage,
  saveState,
} from './utils/storage';
import {
  DecodedPacket,
  DecodedSetupPacket,
  decodeRawSetupCompressed,
  ParsedParticipantRow,
} from './utils/transfer';
import { InfoView } from './components/InfoView';
import { ScorerView } from './components/ScorerView';
import { LeaderboardView } from './components/LeaderboardView';
import { AdminView } from './components/AdminView';
import { ArcherScorecardModal } from './components/ArcherScorecardModal';
import { PrintMode, PrintSheet } from './components/PrintSheet';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const App: React.FC = () => {
  const [state, setState] = useState<TournamentState>(() => {
    const saved = loadFromLocalStorage();
    return saved ?? buildInitialState(true);
  });

  const [activeTab, setActiveTab] = useState<NavTab>('info');
  const [selectedStanding, setSelectedStanding] = useState<ArcherStanding | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>('official_results');
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pendingSetupPacket, setPendingSetupPacket] = useState<DecodedSetupPacket | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Recover from IndexedDB if localStorage was cleared by mobile OS
  useEffect(() => {
    const existing = loadFromLocalStorage();
    if (!existing) {
      loadFromIndexedDBFallback().then((recovered) => {
        if (recovered) {
          setState(recovered);
        }
      });
    }
  }, []);

  // Persist every state change automatically
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Monitor Online/Offline status
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Capture PWA Install Prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Detect `#setup=...` patrol link shared by Urusetia
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash || '';
      if (hash.startsWith('#setup=')) {
        const compressed = hash.slice('#setup='.length);
        const decoded = decodeRawSetupCompressed(compressed);
        if (decoded) {
          setPendingSetupPacket(decoded);
        }
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleInstallPWA = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  // Generate clean sequential tag like L01 / W01
  const generateNextTag = (archersList: Archer[], category: Category): string => {
    const prefix = category === 'Wanita' ? 'W' : 'L';
    const existingCount = archersList.filter((a) => a.category === category).length;
    return `${prefix}${String(existingCount + 1).padStart(2, '0')}`;
  };

  // Merge Decoded SCORE or SETUP packets
  const handleMergePackets = useCallback(
    (packets: DecodedPacket[]) => {
      let mergedCount = 0;
      const patrolsSet = new Set<number>();

      setState((prev) => {
        // If still in demo mode when importing real packets, keep existing unless user cleared, or merge cleanly by ID / Name+Category
        const nextArchers = [...prev.archers];
        const nextPatrols = { ...prev.patrols };
        let nextCheckpoints = prev.checkpoints;
        let nextActivePatrol = prev.activePatrol;

        for (const pkt of packets) {
          patrolsSet.add(pkt.patrol);
          if (pkt.captainName) {
            nextPatrols[pkt.patrol] = {
              ...nextPatrols[pkt.patrol],
              patrolNumber: pkt.patrol,
              captainName: pkt.captainName,
              submittedAt: pkt.type === 'SCORE' ? pkt.timestamp : nextPatrols[pkt.patrol]?.submittedAt,
            };
          } else if (pkt.type === 'SCORE') {
            nextPatrols[pkt.patrol] = {
              ...nextPatrols[pkt.patrol],
              patrolNumber: pkt.patrol,
              submittedAt: pkt.timestamp,
            };
          }

          if (pkt.type === 'SETUP' && pkt.checkpoints && pkt.checkpoints.length === TOTAL_CHECKPOINTS) {
            nextCheckpoints = pkt.checkpoints;
            nextActivePatrol = pkt.patrol;
          }

          for (const incoming of pkt.archers) {
            mergedCount++;
            // Match by exact id first, otherwise by normalized name + category
            const matchIdx = nextArchers.findIndex(
              (a) =>
                a.id === incoming.id ||
                (a.name.trim().toLowerCase() === incoming.name.trim().toLowerCase() &&
                  a.category === incoming.category)
            );

            if (matchIdx !== -1) {
              const curr = nextArchers[matchIdx];
              // Merge non-null CP scores from incoming over curr
              const mergedScores: Record<number, CPScore> = { ...curr.scores };
              for (let cp = 1; cp <= TOTAL_CHECKPOINTS; cp++) {
                const incRow = incoming.scores[cp];
                if (incRow && incRow.some((x) => x !== null)) {
                  mergedScores[cp] = [...incRow] as CPScore;
                }
              }
              nextArchers[matchIdx] = {
                ...curr,
                tag: incoming.tag || curr.tag,
                club: incoming.club || curr.club,
                patrol: incoming.patrol || curr.patrol,
                scores: mergedScores,
                updatedAt: Date.now(),
              };
            } else {
              nextArchers.push({
                ...incoming,
                tag: incoming.tag || generateNextTag(nextArchers, incoming.category),
                updatedAt: Date.now(),
              });
            }
          }
        }

        return {
          ...prev,
          activePatrol: nextActivePatrol,
          archers: nextArchers,
          patrols: nextPatrols,
          checkpoints: nextCheckpoints,
        };
      });

      return {
        mergedArchers: mergedCount,
        patrolsTouched: Array.from(patrolsSet).sort((a, b) => a - b),
      };
    },
    []
  );

  const handleAcceptSetupPacket = (replaceExistingDemo: boolean) => {
    if (!pendingSetupPacket) return;
    if (replaceExistingDemo) {
      setState((prev) => ({
        ...prev,
        isDemoData: false,
        activePatrol: pendingSetupPacket.patrol,
        archers: pendingSetupPacket.archers,
        checkpoints:
          pendingSetupPacket.checkpoints && pendingSetupPacket.checkpoints.length === TOTAL_CHECKPOINTS
            ? pendingSetupPacket.checkpoints
            : prev.checkpoints,
        patrols: {
          ...prev.patrols,
          [pendingSetupPacket.patrol]: {
            patrolNumber: pendingSetupPacket.patrol,
            captainName: pendingSetupPacket.captainName || '',
          },
        },
      }));
    } else {
      handleMergePackets([pendingSetupPacket]);
    }
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setPendingSetupPacket(null);
    setActiveTab('score');
    showToast(`Kumpulan ${pendingSetupPacket.patrol} sedia untuk pemarkahan!`);
  };

  const handleUpdateCPScore = useCallback((archerId: string, cp: number, newScore: CPScore) => {
    setState((prev) => ({
      ...prev,
      archers: prev.archers.map((a) =>
        a.id === archerId
          ? {
              ...a,
              scores: {
                ...a.scores,
                [cp]: newScore,
              },
              updatedAt: Date.now(),
            }
          : a
      ),
    }));
  }, []);

  // Helper: ensure 1 Kumpulan = 1 Kategori (never mix Lelaki & Wanita in the same Kumpulan)
  const resolveSingleCategoryPatrol = (
    list: Archer[],
    category: Category,
    requestedPatrol: number,
    hasExplicitPatrol: boolean
  ): number => {
    if (hasExplicitPatrol) {
      const members = list.filter((a) => a.patrol === requestedPatrol);
      if (members.length === 0 || members[0].category === category) {
        return requestedPatrol;
      }
    }
    // 1. Existing Kumpulan of the SAME category with space (< MAX_ARCHERS_PER_GROUP)
    for (let p = 1; p <= TOTAL_CHECKPOINTS; p++) {
      const members = list.filter((a) => a.patrol === p);
      if (members.length > 0 && members[0].category === category && members.length < MAX_ARCHERS_PER_GROUP) {
        return p;
      }
    }
    // 2. First completely empty Kumpulan
    for (let p = 1; p <= TOTAL_CHECKPOINTS; p++) {
      if (list.filter((a) => a.patrol === p).length === 0) {
        return p;
      }
    }
    // 3. Fallback: any Kumpulan of the same category
    for (let p = 1; p <= TOTAL_CHECKPOINTS; p++) {
      const members = list.filter((a) => a.patrol === p);
      if (members.length === 0 || members[0].category === category) {
        return p;
      }
    }
    return requestedPatrol;
  };

  const handleAddParticipant = useCallback(
    (data: { name: string; category: Category; club: string; patrol: number; tag: string }) => {
      let assignedPatrol = data.patrol;
      setState((prev) => {
        assignedPatrol = resolveSingleCategoryPatrol(prev.archers, data.category, data.patrol, true);
        const tag = data.tag || generateNextTag(prev.archers, data.category);
        const newArcher: Archer = {
          id: `arch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          tag,
          name: data.name,
          category: data.category,
          club: data.club,
          patrol: assignedPatrol,
          scores: createEmptyScores(),
          updatedAt: Date.now(),
        };
        return {
          ...prev,
          archers: [...prev.archers, newArcher],
          patrols: {
            ...prev.patrols,
            [assignedPatrol]: {
              ...prev.patrols[assignedPatrol],
              patrolNumber: assignedPatrol,
              captainName: prev.patrols[assignedPatrol]?.captainName || '',
              category: data.category,
            },
          },
        };
      });
      showToast(`Peserta "${data.name}" ditambah ke Kumpulan ${assignedPatrol} (${data.category})`);
    },
    [showToast]
  );

  const handleBulkAddParticipants = useCallback(
    (rows: ParsedParticipantRow[]) => {
      setState((prev) => {
        const list = prev.isDemoData ? [] : [...prev.archers];
        const nextPatrols = prev.isDemoData ? {} : { ...prev.patrols };
        for (const r of rows) {
          const targetPatrol = resolveSingleCategoryPatrol(
            list,
            r.category,
            r.patrol,
            r.hasExplicitPatrol
          );
          const tag = r.tag || generateNextTag(list, r.category);
          list.push({
            id: `arch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            tag,
            name: r.name,
            category: r.category,
            club: r.club,
            patrol: targetPatrol,
            scores: createEmptyScores(),
            updatedAt: Date.now(),
          });
          nextPatrols[targetPatrol] = {
            ...nextPatrols[targetPatrol],
            patrolNumber: targetPatrol,
            captainName: nextPatrols[targetPatrol]?.captainName || '',
            category: r.category,
          };
        }
        return {
          ...prev,
          isDemoData: false,
          archers: list,
          patrols: nextPatrols,
        };
      });
      showToast(`Berjaya mengimport ${rows.length} peserta (mengikut kategori kumpulan)!`);
    },
    [showToast]
  );

  const handleUpdateArcherMeta = useCallback(
    (
      id: string,
      updates: Partial<Pick<Archer, 'name' | 'category' | 'club' | 'patrol' | 'tag'>>
    ) => {
      setState((prev) => {
        const target = prev.archers.find((a) => a.id === id);
        if (!target) return prev;
        const nextCategory = updates.category ?? target.category;
        let nextPatrol = updates.patrol ?? target.patrol;
        const othersInDest = prev.archers.filter((a) => a.id !== id && a.patrol === nextPatrol);
        if (othersInDest.length > 0 && othersInDest[0].category !== nextCategory) {
          nextPatrol = resolveSingleCategoryPatrol(
            prev.archers.filter((a) => a.id !== id),
            nextCategory,
            nextPatrol,
            false
          );
        }
        return {
          ...prev,
          archers: prev.archers.map((a) =>
            a.id === id
              ? { ...a, ...updates, category: nextCategory, patrol: nextPatrol, updatedAt: Date.now() }
              : a
          ),
        };
      });
    },
    []
  );

  const handleDeleteArcher = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      archers: prev.archers.filter((a) => a.id !== id),
    }));
  }, []);

  const handleAutoDistributePatrols = useCallback(
    (maxPerGroup: number) => {
      const safeMax = Math.min(MAX_ARCHERS_PER_GROUP, Math.max(2, maxPerGroup));
      let totalGroupsCreated = 0;
      setState((prev) => {
        const men = prev.archers.filter((a) => a.category === 'Lelaki');
        const women = prev.archers.filter((a) => a.category === 'Wanita');
        const menGroupCount = men.length > 0 ? Math.ceil(men.length / safeMax) : 0;
        const womenGroupCount = women.length > 0 ? Math.ceil(women.length / safeMax) : 0;
        totalGroupsCreated = menGroupCount + womenGroupCount;

        const reassignedMen = men.map((archer, idx) => ({
          ...archer,
          patrol: (idx % menGroupCount) + 1,
          updatedAt: Date.now(),
        }));
        const reassignedWomen = women.map((archer, idx) => ({
          ...archer,
          patrol: menGroupCount + (idx % womenGroupCount) + 1,
          updatedAt: Date.now(),
        }));

        const nextPatrols: Record<number, typeof prev.patrols[number]> = {};
        for (let p = 1; p <= menGroupCount; p++) {
          nextPatrols[p] = {
            patrolNumber: p,
            captainName: prev.patrols[p]?.captainName || '',
            category: 'Lelaki',
          };
        }
        for (let p = menGroupCount + 1; p <= menGroupCount + womenGroupCount; p++) {
          nextPatrols[p] = {
            patrolNumber: p,
            captainName: prev.patrols[p]?.captainName || '',
            category: 'Wanita',
          };
        }

        return {
          ...prev,
          archers: [...reassignedMen, ...reassignedWomen],
          patrols: nextPatrols,
        };
      });
      showToast(
        `Peserta diagihkan mengikut kategori ke dalam ${totalGroupsCreated || 1} Kumpulan (L & W berasingan)!`
      );
    },
    [showToast]
  );

  const handleUpdateCaptainName = useCallback((patrol: number, captainName: string) => {
    setState((prev) => ({
      ...prev,
      patrols: {
        ...prev.patrols,
        [patrol]: {
          ...prev.patrols[patrol],
          patrolNumber: patrol,
          captainName,
        },
      },
    }));
  }, []);

  const handleUpdateCheckpoint = useCallback(
    (cp: number, updates: Partial<CheckpointConfig>) => {
      setState((prev) => ({
        ...prev,
        checkpoints: prev.checkpoints.map((item) =>
          item.cp === cp ? { ...item, ...updates } : item
        ),
      }));
    },
    []
  );

  const handleResolveShootOff = useCallback(
    (winnerId: string, runnerUpId: string) => {
      setState((prev) => ({
        ...prev,
        archers: prev.archers.map((a) => {
          if (a.id === winnerId) return { ...a, shootOffRank: 1, updatedAt: Date.now() };
          if (a.id === runnerUpId) return { ...a, shootOffRank: 2, updatedAt: Date.now() };
          return a;
        }),
      }));
      showToast('Keputusan Shoot-Off telah direkodkan!');
    },
    [showToast]
  );

  const handleViewArcherFromScorer = useCallback(
    (archer: Archer) => {
      const ranked = rankArchers(state.archers, archer.category);
      const found = ranked.find((r) => r.archer.id === archer.id);
      if (found) setSelectedStanding(found);
    },
    [state.archers]
  );

  const triggerPrint = (mode: PrintMode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 120);
  };

  const menCount = useMemo(
    () => state.archers.filter((a) => a.category === 'Lelaki').length,
    [state.archers]
  );
  const womenCount = useMemo(
    () => state.archers.filter((a) => a.category === 'Wanita').length,
    [state.archers]
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Main Interactive PWA Shell (Hidden on Paper Print) */}
      <div className="no-print flex min-h-screen flex-col">
        {/* Top Sticky Header (Responsive: Compact on Mobile Vertical, Integrated Nav on Tablet & PC) */}
        <header className="sticky top-0 z-30 border-b border-kinabalu-800 bg-kinabalu-950 text-white shadow-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3.5 py-2.5 sm:px-5">
            <button
              onClick={() => setActiveTab('info')}
              className="flex min-w-0 items-center gap-2.5 text-left"
            >
              <img
                src="./images/logo-ktacr.png"
                alt="KTACR"
                className="h-10 w-10 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <div className="truncate text-xs sm:text-sm font-black tracking-wide text-amber-400 leading-none">
                  HUNTING 2D RANAU 2026
                </div>
                <div className="mt-0.5 truncate text-[10px] sm:text-[11px] font-medium text-slate-300">
                  {EVENT_INFO.organizerShort} • Sobou Range
                </div>
              </div>
            </button>

            {/* Desktop & Tablet Integrated Top Navigation (md and above) */}
            <nav className="hidden md:flex items-center gap-1 rounded-xl bg-white/5 p-1">
              <button
                onClick={() => setActiveTab('info')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                  activeTab === 'info'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Home className="h-3.5 w-3.5" />
                Info Acara
              </button>
              <button
                onClick={() => setActiveTab('score')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                  activeTab === 'score'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Target className="h-3.5 w-3.5" />
                Skor Kumpulan
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                  activeTab === 'leaderboard'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Trophy className="h-3.5 w-3.5" />
                Keputusan
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                  activeTab === 'admin'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Settings className="h-3.5 w-3.5" />
                Urusetia
              </button>
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  isOnline
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                    : 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                }`}
              >
                {isOnline ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span>Offline Sedia</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span>Mod Offline</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </header>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 px-4 w-full max-w-sm">
            <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl ring-1 ring-amber-400/50">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span className="flex-1">{toastMsg}</span>
              <button onClick={() => setToastMsg(null)} className="text-slate-400">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Container (Vertical Mobile Default -> Wide Tablet/PC) */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-3 pt-4 pb-24 sm:px-5 md:pb-10">
          {activeTab === 'info' && (
            <InfoView
              archerCount={state.archers.length}
              menCount={menCount}
              womenCount={womenCount}
              isDemoData={state.isDemoData}
              checkpoints={state.checkpoints}
              canInstallPWA={Boolean(installPrompt)}
              onInstallPWA={handleInstallPWA}
              onNavigate={setActiveTab}
              onClearDemo={() => {
                setState(buildInitialState(false));
                showToast('Data simulasi dikosongkan. Sedia untuk peserta sebenar!');
              }}
            />
          )}

          {activeTab === 'score' && (
            <ScorerView
              archers={state.archers}
              checkpoints={state.checkpoints}
              patrols={state.patrols}
              activePatrol={state.activePatrol}
              onChangePatrol={(patrol) =>
                setState((prev) => ({ ...prev, activePatrol: patrol }))
              }
              onUpdateCaptainName={handleUpdateCaptainName}
              onUpdateCPScore={handleUpdateCPScore}
              onQuickAddArcher={handleAddParticipant}
              onViewArcherCard={handleViewArcherFromScorer}
            />
          )}

          {activeTab === 'leaderboard' && (
            <LeaderboardView
              archers={state.archers}
              onSelectStanding={setSelectedStanding}
              onResolveShootOff={handleResolveShootOff}
              onPrintOfficialResults={() => triggerPrint('official_results')}
            />
          )}

          {activeTab === 'admin' && (
            <AdminView
              state={state}
              onMergePackets={handleMergePackets}
              onImportFullBackup={(backup) => {
                setState({ ...backup, isDemoData: false });
                showToast('Sandaran penuh berjaya dipulihkan!');
              }}
              onAddParticipant={handleAddParticipant}
              onBulkAddParticipants={handleBulkAddParticipants}
              onUpdateArcherMeta={handleUpdateArcherMeta}
              onDeleteArcher={handleDeleteArcher}
              onAutoDistributePatrols={handleAutoDistributePatrols}
              onUpdateCaptainName={handleUpdateCaptainName}
              onUpdateCheckpoint={handleUpdateCheckpoint}
              onResetScoresOnly={() => {
                setState((prev) => ({
                  ...prev,
                  archers: prev.archers.map((a) => ({
                    ...a,
                    scores: createEmptyScores(),
                    shootOffRank: undefined,
                    updatedAt: Date.now(),
                  })),
                }));
                showToast('Semua markah telah direset kepada 0.');
              }}
              onClearAllParticipants={() => {
                setState((prev) => ({
                  ...prev,
                  isDemoData: false,
                  archers: [],
                }));
                showToast('Semua peserta telah dikosongkan.');
              }}
              onLoadDemoData={() => {
                setState(buildInitialState(true));
                showToast('Data simulasi (Demo) telah dimuatkan semula!');
              }}
              onPrintPatrolSheets={() => triggerPrint('patrol_sheets')}
            />
          )}
        </main>

        {/* Sticky Bottom Mobile PWA Tab Bar (Vertical Phone Default — Hidden on Tablet/PC md+) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-4 px-1.5 pt-1.5">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[11px] font-bold transition ${
                activeTab === 'info'
                  ? 'text-kinabalu-900 bg-amber-400/25 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Home className="h-5 w-5" />
              <span className="mt-0.5">Info Acara</span>
            </button>

            <button
              onClick={() => setActiveTab('score')}
              className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[11px] font-bold transition ${
                activeTab === 'score'
                  ? 'text-kinabalu-900 bg-amber-400/25 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Target className="h-5 w-5" />
              <span className="mt-0.5">Skor Kumpulan</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[11px] font-bold transition ${
                activeTab === 'leaderboard'
                  ? 'text-kinabalu-900 bg-amber-400/25 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Trophy className="h-5 w-5" />
              <span className="mt-0.5">Keputusan</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[11px] font-bold transition ${
                activeTab === 'admin'
                  ? 'text-kinabalu-900 bg-amber-400/25 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Settings className="h-5 w-5" />
              <span className="mt-0.5">Urusetia</span>
            </button>
          </div>
        </nav>

        {/* Individual 21-CP Scorecard Modal */}
        {selectedStanding && (
          <ArcherScorecardModal
            standing={selectedStanding}
            checkpoints={state.checkpoints}
            onClose={() => setSelectedStanding(null)}
          />
        )}

        {/* Incoming `#setup=...` Kumpulan Link Confirmation Modal */}
        {pendingSetupPacket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="bg-kinabalu-900 px-5 py-4 text-white">
                <h3 className="text-base font-bold text-amber-400">
                  Terima Agihan Kumpulan {pendingSetupPacket.patrol} daripada Urusetia
                </h3>
                <p className="mt-0.5 text-xs text-slate-300">
                  Mengandungi {pendingSetupPacket.archers.length} pemanah & Arahan 21 Check Point.
                </p>
              </div>
              <div className="space-y-3 p-5 text-xs text-slate-700">
                <p>
                  Adakah anda ingin memuatkan senarai{' '}
                  <strong>Kumpulan {pendingSetupPacket.patrol}</strong> ke dalam telefon ini untuk
                  mula mencatat markah?
                </p>

                <button
                  onClick={() => handleAcceptSetupPacket(true)}
                  className="w-full rounded-xl bg-kinabalu-900 py-3 font-extrabold text-amber-400 hover:bg-kinabalu-800"
                >
                  Ya, Muat Kumpulan {pendingSetupPacket.patrol} Sahaja (Telefon Ketua)
                </button>

                {!state.isDemoData && state.archers.length > 0 && (
                  <button
                    onClick={() => handleAcceptSetupPacket(false)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 font-bold text-slate-800 hover:bg-slate-100"
                  >
                    Gabung ke Senarai Sedia Ada ({state.archers.length} peserta)
                  </button>
                )}

                <button
                  onClick={() => {
                    window.history.replaceState(
                      null,
                      '',
                      window.location.pathname + window.location.search
                    );
                    setPendingSetupPacket(null);
                  }}
                  className="w-full py-2 font-semibold text-slate-500 hover:text-slate-800"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dedicated Paper / PDF Print Layout */}
      <PrintSheet
        mode={printMode}
        archers={state.archers}
        checkpoints={state.checkpoints}
        patrols={state.patrols}
      />
    </div>
  );
};

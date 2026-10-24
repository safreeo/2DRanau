import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Send,
  UserPlus,
  Delete,
  RotateCcw,
  Compass,
  QrCode,
  Share2,
  Download,
  Copy,
  Check,
  X,
  FileSpreadsheet,
  Users,
  Lock,
} from 'lucide-react';
import { MAX_ARCHERS_PER_GROUP, TOTAL_CHECKPOINTS } from '../constants';
import {
  Archer,
  ArrowScore,
  Category,
  CheckpointConfig,
  CPScore,
  PatrolInfo,
} from '../types';
import {
  computeArcherStats,
  cpTotalPoints,
  isCPComplete,
  isCPPartial,
  sortCPArrows,
} from '../utils/scoring';
import {
  buildPatrolWhatsAppMessage,
  encodePatrolScorePacket,
} from '../utils/transfer';
import { QrCodeModal } from './QrCodeModal';

interface ScorerViewProps {
  archers: Archer[];
  checkpoints: CheckpointConfig[];
  patrols: Record<number, PatrolInfo>;
  activePatrol: number;
  onChangePatrol: (patrol: number) => void;
  onUpdateCaptainName: (patrol: number, captainName: string) => void;
  onUpdateCPScore: (archerId: string, cp: number, newScore: CPScore) => void;
  onQuickAddArcher: (data: {
    name: string;
    category: Category;
    club: string;
    patrol: number;
    tag: string;
  }) => void;
  onViewArcherCard: (archer: Archer) => void;
}

function getArrowBoxStyle(score: ArrowScore, isSelectedSlot: boolean): string {
  const ring = isSelectedSlot ? 'ring-2 ring-kinabalu-900 ring-offset-1 scale-105' : '';
  switch (score) {
    case '8':
      return `bg-amber-400 text-amber-950 border-amber-500 ${ring}`;
    case '5':
      return `bg-red-600 text-white border-red-700 ${ring}`;
    case '3':
      return `bg-blue-600 text-white border-blue-700 ${ring}`;
    case 'M':
      return `bg-slate-600 text-white border-slate-700 ${ring}`;
    default:
      return `bg-white text-slate-400 border-dashed border-slate-300 ${ring}`;
  }
}

export const ScorerView: React.FC<ScorerViewProps> = ({
  archers,
  checkpoints,
  patrols,
  activePatrol,
  onChangePatrol,
  onUpdateCaptainName,
  onUpdateCPScore,
  onQuickAddArcher,
  onViewArcherCard,
}) => {
  const patrolArchers = useMemo(
    () => archers.filter((a) => a.patrol === activePatrol),
    [archers, activePatrol]
  );

  // 1 Kumpulan = 1 Kategori sahaja (derive from existing members or configured group category)
  const lockedGroupCategory: Category | null = useMemo(() => {
    if (patrolArchers.length > 0) return patrolArchers[0].category;
    return patrols[activePatrol]?.category ?? null;
  }, [patrolArchers, patrols, activePatrol]);

  const isGroupFull = patrolArchers.length >= MAX_ARCHERS_PER_GROUP;
  const allCPNumbers = useMemo(
    () => Array.from({ length: TOTAL_CHECKPOINTS }, (_, i) => i + 1),
    []
  );

  const findInitialCP = (list: Archer[]): number => {
    if (list.length === 0) return 1;
    for (let cp = 1; cp <= TOTAL_CHECKPOINTS; cp++) {
      if (!list.every((a) => isCPComplete(a.scores[cp]))) return cp;
    }
    return 1;
  };

  const [currentCP, setCurrentCP] = useState<number>(() => findInitialCP(patrolArchers));
  const [selectedArcherId, setSelectedArcherId] = useState<string | null>(
    patrolArchers[0]?.id ?? null
  );
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubmitSheet, setShowSubmitSheet] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Quick Add Form State
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<Category>('Lelaki');
  const [newClub, setNewClub] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    const groupList = archers.filter((a) => a.patrol === activePatrol);
    const nextCP = findInitialCP(groupList);
    setCurrentCP(nextCP);
    setSelectedArcherId(groupList[0]?.id ?? null);
    setSelectedSlot(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePatrol]);

  useEffect(() => {
    if (lockedGroupCategory) {
      setNewCat(lockedGroupCategory);
    }
  }, [lockedGroupCategory]);

  useEffect(() => {
    if (patrolArchers.length === 0) {
      setSelectedArcherId(null);
      return;
    }
    if (!selectedArcherId || !patrolArchers.some((a) => a.id === selectedArcherId)) {
      const incomplete = patrolArchers.find((a) => !isCPComplete(a.scores[currentCP]));
      setSelectedArcherId((incomplete ?? patrolArchers[0]).id);
    }
  }, [patrolArchers, selectedArcherId, currentCP]);

  const currentCPConfig = useMemo(
    () =>
      checkpoints.find((c) => c.cp === currentCP) || {
        cp: currentCP,
        animal: `Sasaran 2D #${currentCP}`,
        distance: '7~20m',
        instruction: 'Ikut arahan pancang di lapangan.',
      },
    [checkpoints, currentCP]
  );

  // Track which CPs are incomplete so Ketua can jump to any remaining CP easily
  const incompleteCPs = useMemo(() => {
    if (patrolArchers.length === 0) return [];
    return allCPNumbers.filter((cp) => !patrolArchers.every((a) => isCPComplete(a.scores[cp])));
  }, [patrolArchers, allCPNumbers]);

  const patrolCompletedCPCount = TOTAL_CHECKPOINTS - incompleteCPs.length;

  const currentCPDoneCount = useMemo(
    () => patrolArchers.filter((a) => isCPComplete(a.scores[currentCP])).length,
    [patrolArchers, currentCP]
  );

  const selectCP = (cp: number) => {
    setCurrentCP(cp);
    setSelectedSlot(null);
    const firstIncomplete = patrolArchers.find((a) => !isCPComplete(a.scores[cp]));
    if (firstIncomplete) {
      setSelectedArcherId(firstIncomplete.id);
    } else if (patrolArchers[0]) {
      setSelectedArcherId(patrolArchers[0].id);
    }
  };

  const jumpToNextIncompleteCP = () => {
    if (incompleteCPs.length === 0) return;
    const afterCurrent = incompleteCPs.find((cp) => cp > currentCP);
    selectCP(afterCurrent ?? incompleteCPs[0]);
  };

  const handleScoreTap = (val: Exclude<ArrowScore, null>) => {
    const targetArcher = patrolArchers.find((a) => a.id === selectedArcherId);
    if (!targetArcher) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }

    const existing: CPScore = [...(targetArcher.scores[currentCP] || [null, null, null])] as CPScore;

    let slotIdx = selectedSlot;
    if (slotIdx === null) {
      const emptyIdx = existing.findIndex((s) => s === null);
      slotIdx = emptyIdx !== -1 ? emptyIdx : 2;
    }

    existing[slotIdx] = val;

    const allFilled = existing.every((s) => s !== null);
    if (allFilled) {
      const sorted = sortCPArrows(existing);
      onUpdateCPScore(targetArcher.id, currentCP, sorted);
      setSelectedSlot(null);

      // Auto-advance to the next archer in this Kumpulan who hasn't finished this CP
      const currentArcherIdx = patrolArchers.findIndex((a) => a.id === targetArcher.id);
      for (let offset = 1; offset < patrolArchers.length; offset++) {
        const candidate = patrolArchers[(currentArcherIdx + offset) % patrolArchers.length];
        if (!isCPComplete(candidate.scores[currentCP])) {
          setSelectedArcherId(candidate.id);
          return;
        }
      }
    } else {
      onUpdateCPScore(targetArcher.id, currentCP, existing);
      const nextEmpty = existing.findIndex((s) => s === null);
      setSelectedSlot(nextEmpty !== -1 ? nextEmpty : null);
    }
  };

  const handleBackspace = () => {
    const targetArcher = patrolArchers.find((a) => a.id === selectedArcherId);
    if (!targetArcher) return;
    const existing: CPScore = [...(targetArcher.scores[currentCP] || [null, null, null])] as CPScore;

    if (selectedSlot !== null && existing[selectedSlot] !== null) {
      existing[selectedSlot] = null;
      onUpdateCPScore(targetArcher.id, currentCP, existing);
      return;
    }

    for (let i = 2; i >= 0; i--) {
      if (existing[i] !== null) {
        existing[i] = null;
        onUpdateCPScore(targetArcher.id, currentCP, existing);
        setSelectedSlot(i);
        return;
      }
    }
  };

  const handleClearCPForArcher = () => {
    if (!selectedArcherId) return;
    onUpdateCPScore(selectedArcherId, currentCP, [null, null, null]);
    setSelectedSlot(0);
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isGroupFull) return;
    const effectiveCategory = lockedGroupCategory ?? newCat;
    onQuickAddArcher({
      name: newName.trim(),
      category: effectiveCategory,
      club: newClub.trim(),
      patrol: activePatrol,
      tag: newTag.trim(),
    });
    setNewName('');
    setNewClub('');
    setNewTag('');
    setShowAddModal(false);
  };

  const captainName = patrols[activePatrol]?.captainName || '';

  const patrolScoreCode = useMemo(
    () => encodePatrolScorePacket(activePatrol, captainName, patrolArchers),
    [activePatrol, captainName, patrolArchers]
  );

  const patrolWhatsAppMsg = useMemo(
    () => buildPatrolWhatsAppMessage(activePatrol, captainName, patrolArchers),
    [activePatrol, captainName, patrolArchers]
  );

  const handleDownloadPatrolJson = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            type: 'KTACR_PATROL_SCORE',
            patrol: activePatrol,
            category: lockedGroupCategory,
            captainName,
            exportedAt: new Date().toISOString(),
            packet: patrolScoreCode,
            archers: patrolArchers,
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skor-kumpulan-${String(activePatrol).padStart(2, '0')}-ranau2026.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(patrolWhatsAppMsg);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2200);
    } catch {
      // ignore
    }
  };

  return (
    <div className="pb-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5">
      {/* LEFT / TOP COLUMN: Kumpulan Selector, Free-Order CP 1-21 Picker & Arahan CP */}
      <div className="space-y-3.5 lg:sticky lg:top-20 lg:col-span-5">
        {/* Top Kumpulan Selector & Progress Card */}
        <div className="rounded-2xl bg-kinabalu-900 p-3.5 sm:p-4 text-white shadow-md">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <label
                htmlFor="kumpulan-select"
                className="shrink-0 text-xs font-bold text-amber-400"
              >
                KUMPULAN:
              </label>
              <select
                id="kumpulan-select"
                value={activePatrol}
                onChange={(e) => onChangePatrol(Number(e.target.value))}
                className="min-w-0 flex-1 rounded-xl border border-amber-400/50 bg-kinabalu-800 px-2.5 py-2 text-xs sm:text-sm font-extrabold text-white focus:border-amber-400 focus:outline-none"
              >
                {allCPNumbers.map((p) => {
                  const members = archers.filter((a) => a.patrol === p);
                  const cat = members[0]?.category || patrols[p]?.category;
                  const catText = cat ? `[${cat.toUpperCase()}]` : '[Kosong]';
                  return (
                    <option key={p} value={p}>
                      Kumpulan {String(p).padStart(2, '0')} {catText} — {members.length}/
                      {MAX_ARCHERS_PER_GROUP} orang
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {lockedGroupCategory && (
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-black uppercase ${
                      lockedGroupCategory === 'Wanita'
                        ? 'bg-pink-500/25 text-pink-200 border border-pink-400/40'
                        : 'bg-sky-500/25 text-sky-200 border border-sky-400/40'
                    }`}
                  >
                    {lockedGroupCategory}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-200">
                  <Users className="h-3.5 w-3.5 text-amber-400" />
                  {patrolArchers.length}/{MAX_ARCHERS_PER_GROUP} Ahli
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowAddModal(true)}
                  disabled={isGroupFull}
                  title={
                    isGroupFull
                      ? `Had maksimum ${MAX_ARCHERS_PER_GROUP} pemanah satu kumpulan telah penuh`
                      : 'Tambah pemanah ke kumpulan ini'
                  }
                  className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <UserPlus className="h-3.5 w-3.5 text-amber-400" />
                  {isGroupFull ? `Penuh (${MAX_ARCHERS_PER_GROUP}/${MAX_ARCHERS_PER_GROUP})` : '+ Pemanah'}
                </button>

                {patrolArchers.length > 0 && (
                  <button
                    onClick={() => setShowSubmitSheet(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 shadow-sm hover:bg-amber-300"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Hantar Skor
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Ketua Name & Kumpulan Progress Bar */}
          <div className="mt-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-300 shrink-0">Ketua:</span>
              <input
                type="text"
                value={captainName}
                onChange={(e) => onUpdateCaptainName(activePatrol, e.target.value)}
                placeholder="Taip nama Ketua / Pencatat..."
                className="w-full rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-300">Kemajuan Kumpulan {activePatrol}:</span>
                <span className="text-amber-300">{patrolCompletedCPCount} / 21 CP Selesai</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${(patrolCompletedCPCount / TOTAL_CHECKPOINTS) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Flexible Any-CP Selector (Start & Resume from ANY CP 1-21) */}
        {patrolArchers.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] font-extrabold text-slate-700">
                PILIH MANA-MANA CHECK POINT (CP 1 – CP 21):
              </div>

              <select
                value={currentCP}
                onChange={(e) => selectCP(Number(e.target.value))}
                aria-label="Lompat terus ke Check Point"
                className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-extrabold text-kinabalu-900 focus:border-kinabalu-800 focus:outline-none"
              >
                {allCPNumbers.map((cp) => {
                  const done = patrolArchers.every((a) => isCPComplete(a.scores[cp]));
                  return (
                    <option key={cp} value={cp}>
                      CP {String(cp).padStart(2, '0')} {done ? '(✓ Siap)' : '(Belum Siap)'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 lg:grid lg:grid-cols-7 lg:overflow-visible lg:pb-0">
              {allCPNumbers.map((cp) => {
                const allDone = patrolArchers.every((a) => isCPComplete(a.scores[cp]));
                const anyPartial =
                  !allDone &&
                  patrolArchers.some(
                    (a) => isCPComplete(a.scores[cp]) || isCPPartial(a.scores[cp])
                  );
                const isActive = cp === currentCP;

                let btnStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                if (allDone) {
                  btnStyle = 'bg-emerald-100 text-emerald-900 border-emerald-400';
                } else if (anyPartial) {
                  btnStyle = 'bg-amber-50 text-amber-900 border-amber-300';
                }
                if (isActive) {
                  btnStyle =
                    'bg-kinabalu-900 text-amber-400 border-kinabalu-900 ring-2 ring-amber-400';
                }

                return (
                  <button
                    key={cp}
                    onClick={() => selectCP(cp)}
                    className={`relative flex h-10 min-w-[48px] lg:min-w-0 shrink-0 flex-col items-center justify-center rounded-xl border text-xs font-extrabold transition ${btnStyle}`}
                  >
                    <span>CP{cp}</span>
                    <span className="text-[9px] font-semibold opacity-85">
                      {allDone ? '✓' : anyPartial ? '••' : '—'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Notice of Remaining Incomplete CPs (Helpful when jumping around CPs!) */}
            {incompleteCPs.length > 0 && incompleteCPs.length <= 8 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 text-[11px]">
                <span className="font-bold text-amber-800">CP Belum Lengkap:</span>
                {incompleteCPs.map((cp) => (
                  <button
                    key={cp}
                    type="button"
                    onClick={() => selectCP(cp)}
                    className={`rounded-md px-2 py-0.5 font-extrabold transition ${
                      cp === currentCP
                        ? 'bg-kinabalu-900 text-amber-400'
                        : 'bg-amber-100 text-amber-950 hover:bg-amber-200'
                    }`}
                  >
                    CP {cp}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Current Checkpoint Instruction Banner */}
        {patrolArchers.length > 0 && (
          <div className="rounded-2xl border-l-4 border-l-amber-500 border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-kinabalu-900 px-2.5 py-1 text-xs font-black text-amber-400">
                  <Compass className="h-3.5 w-3.5" />
                  CP {String(currentCP).padStart(2, '0')}
                </span>
                <span className="text-sm font-extrabold text-slate-900">
                  {currentCPConfig.animal}
                </span>
              </div>
              <span className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-extrabold text-amber-900">
                Jarak: {currentCPConfig.distance}
              </span>
            </div>
            <p className="mt-1.5 text-xs font-medium text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Arahan CP:</strong> {currentCPConfig.instruction}
            </p>
          </div>
        )}
      </div>

      {/* RIGHT / BOTTOM COLUMN: Up to 8 Archers List (Single Category) + Tactile Scoring Pad */}
      <div className="mt-3.5 space-y-3 lg:col-span-7 lg:mt-0">
        {patrolArchers.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-base font-extrabold text-slate-800">
              Tiada pemanah dalam Kumpulan {activePatrol} lagi
            </p>
            <p className="mt-1 text-xs text-slate-500">
              1 kumpulan untuk 1 kategori sahaja (Lelaki atau Wanita, maksimum{' '}
              {MAX_ARCHERS_PER_GROUP} orang).
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-kinabalu-900 px-4 py-2.5 text-sm font-bold text-amber-400 hover:bg-kinabalu-800"
            >
              <UserPlus className="h-4 w-4" />
              Tambah Pemanah ke Kumpulan {activePatrol}
            </button>
          </div>
        ) : (
          <>
            {/* Kumpulan Archers List */}
            <div className="space-y-2">
              {patrolArchers.map((archer, memberIdx) => {
                const cpScore: CPScore = archer.scores[currentCP] || [null, null, null];
                const cpPts = cpTotalPoints(cpScore);
                const done = isCPComplete(cpScore);
                const stats = computeArcherStats(archer);
                const isSelected = archer.id === selectedArcherId;

                return (
                  <div
                    key={archer.id}
                    className={`overflow-hidden rounded-2xl border-2 transition ${
                      isSelected
                        ? 'border-kinabalu-900 bg-white shadow-md'
                        : done
                        ? 'border-emerald-200 bg-white/95'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div
                      onClick={() => {
                        setSelectedArcherId(archer.id);
                        setSelectedSlot(null);
                      }}
                      className="flex cursor-pointer flex-col gap-2.5 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-black text-slate-700">
                            {memberIdx + 1}
                          </span>
                          {archer.tag && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-600">
                              {archer.tag}
                            </span>
                          )}
                          {archer.club && (
                            <span className="truncate text-[11px] font-medium text-slate-500">
                              {archer.club}
                            </span>
                          )}
                          {done && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        </div>

                        <div className="mt-1 text-sm font-extrabold leading-snug text-slate-900 break-words">
                          {archer.name}
                        </div>

                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500">
                          <span>
                            Jumlah: <strong className="text-slate-800">{stats.totalPoints}</strong>{' '}
                            mata ({stats.completedCPs}/21 CP)
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewArcherCard(archer);
                            }}
                            className="inline-flex items-center gap-0.5 font-bold text-kinabalu-700 underline hover:text-kinabalu-900"
                          >
                            <FileSpreadsheet className="h-3 w-3" />
                            Kad Skor
                          </button>
                        </div>
                      </div>

                      {/* 3 Arrow Boxes (A1, A2, A3) + CP Subtotal */}
                      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 sm:border-t-0 sm:pt-0 sm:justify-end shrink-0">
                        <span className="text-[11px] font-semibold text-slate-500 sm:hidden">
                          Skor CP {currentCP}:
                        </span>
                        <div className="flex items-center gap-1.5">
                          {[0, 1, 2].map((slotIdx) => {
                            const isActiveSlot = isSelected && selectedSlot === slotIdx;
                            return (
                              <button
                                key={slotIdx}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedArcherId(archer.id);
                                  setSelectedSlot(slotIdx);
                                }}
                                className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 text-base font-black transition ${getArrowBoxStyle(
                                  cpScore[slotIdx],
                                  isActiveSlot
                                )}`}
                                aria-label={`Arrow A${slotIdx + 1}`}
                              >
                                {cpScore[slotIdx] ?? `A${slotIdx + 1}`}
                              </button>
                            );
                          })}

                          <div className="ml-0.5 flex h-11 min-w-[46px] flex-col items-center justify-center rounded-xl bg-slate-100 px-2">
                            <span className="text-[9px] font-bold uppercase text-slate-500">
                              CP
                            </span>
                            <span className="text-sm font-black text-slate-900">{cpPts}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded High-Contrast Outdoor Scoring Pad for Active Archer */}
                    {isSelected && (
                      <div className="border-t border-slate-100 bg-slate-50 px-3 py-3 sm:px-3.5">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                          <span className="font-bold text-kinabalu-900">
                            {selectedSlot !== null
                              ? `Tukar A${selectedSlot + 1}:`
                              : 'Tekan skor anak panah:'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleBackspace}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-bold text-slate-700 active:bg-slate-200"
                            >
                              <Delete className="h-3.5 w-3.5" />
                              Padam
                            </button>
                            <button
                              type="button"
                              onClick={handleClearCPForArcher}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-bold text-red-600 active:bg-red-50"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Reset
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleScoreTap('8')}
                            className="flex h-14 flex-col items-center justify-center rounded-2xl border-2 border-amber-500 bg-amber-400 text-amber-950 shadow-sm transition active:scale-95"
                          >
                            <span className="text-2xl font-black leading-none">8</span>
                            <span className="mt-0.5 text-[10px] font-extrabold">8 MATA</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleScoreTap('5')}
                            className="flex h-14 flex-col items-center justify-center rounded-2xl border-2 border-red-700 bg-red-600 text-white shadow-sm transition active:scale-95"
                          >
                            <span className="text-2xl font-black leading-none">5</span>
                            <span className="mt-0.5 text-[10px] font-extrabold text-red-100">
                              5 MATA
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleScoreTap('3')}
                            className="flex h-14 flex-col items-center justify-center rounded-2xl border-2 border-blue-700 bg-blue-600 text-white shadow-sm transition active:scale-95"
                          >
                            <span className="text-2xl font-black leading-none">3</span>
                            <span className="mt-0.5 text-[10px] font-extrabold text-blue-100">
                              3 MATA
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleScoreTap('M')}
                            className="flex h-14 flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-600 text-white shadow-sm transition active:scale-95"
                          >
                            <span className="text-2xl font-black leading-none">M</span>
                            <span className="mt-0.5 text-[10px] font-extrabold text-slate-200">
                              MISS (0)
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Flexible CP Stepper Footer */}
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    selectCP(((currentCP - 2 + TOTAL_CHECKPOINTS) % TOTAL_CHECKPOINTS) + 1)
                  }
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-extrabold text-slate-800 hover:bg-slate-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                  CP {((currentCP - 2 + TOTAL_CHECKPOINTS) % TOTAL_CHECKPOINTS) + 1}
                </button>

                <div className="text-center text-xs">
                  <div className="font-extrabold text-slate-900">
                    CP {currentCP}: {currentCPDoneCount}/{patrolArchers.length} Siap
                  </div>
                  <div className="text-[10px] text-slate-500">Bebas pilih mana-mana CP</div>
                </div>

                {patrolCompletedCPCount === TOTAL_CHECKPOINTS ? (
                  <button
                    type="button"
                    onClick={() => setShowSubmitSheet(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <Send className="h-4 w-4" />
                    Selesai • Hantar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => selectCP((currentCP % TOTAL_CHECKPOINTS) + 1)}
                    className="inline-flex items-center gap-1 rounded-xl bg-kinabalu-900 px-3 py-2.5 text-xs font-extrabold text-amber-400 hover:bg-kinabalu-800"
                  >
                    CP {(currentCP % TOTAL_CHECKPOINTS) + 1}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>

              {incompleteCPs.length > 0 && currentCPDoneCount === patrolArchers.length && (
                <button
                  type="button"
                  onClick={jumpToNextIncompleteCP}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2 text-xs font-black text-slate-950 hover:bg-amber-300"
                >
                  Lompat ke CP Belum Siap Seterusnya (CP{' '}
                  {incompleteCPs.find((cp) => cp > currentCP) ?? incompleteCPs[0]}) →
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Quick Add Archer to Current Kumpulan Modal (Enforces 1 Kumpulan = 1 Kategori) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-kinabalu-900 px-5 py-4 text-white">
              <div>
                <h3 className="text-base font-bold text-amber-400">
                  Tambah Pemanah — Kumpulan {activePatrol}
                </h3>
                <p className="text-[11px] text-slate-300">
                  Kapasiti: {patrolArchers.length}/{MAX_ARCHERS_PER_GROUP} orang
                  {lockedGroupCategory ? ` • Kategori ${lockedGroupCategory}` : ''}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-300 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleQuickAddSubmit} className="space-y-3.5 p-5">
              <div>
                <label className="block text-xs font-bold text-slate-700">Nama Pemanah *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Ahmad Zaki Bin Ali"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium focus:border-kinabalu-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Kategori {lockedGroupCategory ? '(Dikunci)' : '*'}
                  </label>
                  {lockedGroupCategory ? (
                    <div className="mt-1 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-extrabold text-slate-800">
                      <Lock className="h-3.5 w-3.5 text-slate-500" />
                      {lockedGroupCategory}
                    </div>
                  ) : (
                    <select
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value as Category)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold"
                    >
                      <option value="Lelaki">Lelaki</option>
                      <option value="Wanita">Wanita</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    No. Tag (Pilihan)
                  </label>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Cth: L21"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              {lockedGroupCategory && (
                <p className="text-[11px] font-medium text-slate-500">
                  * 1 kumpulan adalah untuk 1 kategori sahaja ({lockedGroupCategory}).
                </p>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Kelab / Pasukan (Pilihan)
                </label>
                <input
                  type="text"
                  value={newClub}
                  onChange={(e) => setNewClub(e.target.value)}
                  placeholder="Contoh: KTACR Ranau"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isGroupFull}
                  className="rounded-xl bg-kinabalu-900 px-5 py-2.5 text-xs font-extrabold text-amber-400 hover:bg-kinabalu-800 disabled:opacity-40"
                >
                  Simpan Pemanah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kumpulan Score Submission / Share Sheet */}
      {showSubmitSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-kinabalu-900 px-5 py-4 text-white">
              <div>
                <h3 className="text-base font-bold text-amber-400">
                  Hantar Skor Kumpulan {String(activePatrol).padStart(2, '0')}
                  {lockedGroupCategory ? ` (${lockedGroupCategory})` : ''}
                </h3>
                <p className="mt-0.5 text-xs text-slate-300">
                  {patrolArchers.length} pemanah • {patrolCompletedCPCount}/21 CP selesai
                </p>
              </div>
              <button
                onClick={() => setShowSubmitSheet(false)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 p-5">
              {patrolCompletedCPCount < TOTAL_CHECKPOINTS && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  <strong>Perhatian:</strong> Baru{' '}
                  <strong>{patrolCompletedCPCount} daripada 21 CP</strong> lengkap bagi semua ahli
                  Kumpulan {activePatrol} (CP belum siap: {incompleteCPs.map((c) => `CP${c}`).join(', ')}
                  ). Anda masih boleh berkongsi skor semasa jika mahu.
                </div>
              )}

              <button
                onClick={() => {
                  setShowSubmitSheet(false);
                  setShowQrModal(true);
                }}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-kinabalu-900 bg-kinabalu-900 px-4 py-3.5 text-left text-white hover:bg-kinabalu-800"
              >
                <QrCode className="h-7 w-7 shrink-0 text-amber-400" />
                <div>
                  <div className="text-sm font-extrabold text-amber-400">
                    Papar Kod QR Skor Kumpulan (Tanpa Internet)
                  </div>
                  <div className="text-xs text-slate-300">
                    Urusetia imbas terus dari skrin telefon anda menggunakan kamera PWA
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(patrolWhatsAppMsg)}`,
                    '_blank',
                    'noopener,noreferrer'
                  );
                }}
                className="flex w-full items-center gap-3 rounded-xl bg-emerald-600 px-4 py-3.5 text-left text-white hover:bg-emerald-700"
              >
                <Share2 className="h-6 w-6 shrink-0" />
                <div>
                  <div className="text-sm font-extrabold">Hantar Laporan melalui WhatsApp</div>
                  <div className="text-xs text-emerald-100">
                    Ringkasan skor semua ahli + Kod Gabung Pintar untuk Urusetia
                  </div>
                </div>
              </button>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={handleCopyReport}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100"
                >
                  {copiedMsg ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-700">Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Salin Mesej Skor</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadPatrolJson}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100"
                >
                  <Download className="h-4 w-4" />
                  <span>Simpan Fail .JSON</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Display Modal */}
      {showQrModal && (
        <QrCodeModal
          title={`Kod QR Skor Kumpulan ${String(activePatrol).padStart(2, '0')}`}
          subtitle={`${patrolArchers.length} pemanah${
            lockedGroupCategory ? ` (${lockedGroupCategory})` : ''
          } • ${patrolCompletedCPCount}/21 CP Selesai`}
          qrValue={patrolScoreCode}
          copyText={patrolWhatsAppMsg}
          whatsappText={patrolWhatsAppMsg}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
};

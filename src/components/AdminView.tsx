import React, { useMemo, useState } from 'react';
import {
  QrCode,
  Users,
  Upload,
  UserPlus,
  Shuffle,
  Trash2,
  Share2,
  Printer,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  RotateCcw,
  Sparkles,
  Search,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import { MAX_ARCHERS_PER_GROUP, TOTAL_CHECKPOINTS } from '../constants';
import {
  Archer,
  Category,
  CheckpointConfig,
  PatrolInfo,
  TournamentState,
} from '../types';
import { isCPComplete } from '../utils/scoring';
import {
  DecodedPacket,
  encodePatrolSetupPayload,
  extractAndDecodePackets,
  ParsedParticipantRow,
  parseParticipantLines,
} from '../utils/transfer';
import { QrCodeModal } from './QrCodeModal';
import { QrScannerModal } from './QrScannerModal';

interface AdminViewProps {
  state: TournamentState;
  onMergePackets: (packets: DecodedPacket[]) => { mergedArchers: number; patrolsTouched: number[] };
  onImportFullBackup: (backup: TournamentState) => void;
  onAddParticipant: (p: {
    name: string;
    category: Category;
    club: string;
    patrol: number;
    tag: string;
  }) => void;
  onBulkAddParticipants: (rows: ParsedParticipantRow[]) => void;
  onUpdateArcherMeta: (
    id: string,
    updates: Partial<Pick<Archer, 'name' | 'category' | 'club' | 'patrol' | 'tag'>>
  ) => void;
  onDeleteArcher: (id: string) => void;
  onAutoDistributePatrols: (maxPerGroup: number) => void;
  onUpdateCaptainName: (patrol: number, captainName: string) => void;
  onUpdateCheckpoint: (cp: number, updates: Partial<CheckpointConfig>) => void;
  onResetScoresOnly: () => void;
  onClearAllParticipants: () => void;
  onLoadDemoData: () => void;
  onPrintPatrolSheets: () => void;
}

type AdminSubTab = 'merge' | 'participants' | 'patrols' | 'checkpoints';

export const AdminView: React.FC<AdminViewProps> = ({
  state,
  onMergePackets,
  onImportFullBackup,
  onAddParticipant,
  onBulkAddParticipants,
  onUpdateArcherMeta,
  onDeleteArcher,
  onAutoDistributePatrols,
  onUpdateCaptainName,
  onUpdateCheckpoint,
  onResetScoresOnly,
  onClearAllParticipants,
  onLoadDemoData,
  onPrintPatrolSheets,
}) => {
  const [subTab, setSubTab] = useState<AdminSubTab>('merge');

  // Merge state
  const [pasteInput, setPasteInput] = useState('');
  const [mergeFeedback, setMergeFeedback] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Add/Import participants state
  const [singleName, setSingleName] = useState('');
  const [singleCategory, setSingleCategory] = useState<Category>('Lelaki');
  const [singleClub, setSingleClub] = useState('');
  const [singlePatrol, setSinglePatrol] = useState(1);
  const [singleTag, setSingleTag] = useState('');

  const [bulkText, setBulkText] = useState('');
  const [targetMaxPerGroup, setTargetMaxPerGroup] = useState<number>(MAX_ARCHERS_PER_GROUP);
  const [participantSearch, setParticipantSearch] = useState('');
  const [editingArcherId, setEditingArcherId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    name: string;
    category: Category;
    club: string;
    patrol: number;
    tag: string;
  } | null>(null);

  // Patrol Share QR Modal
  const [sharePatrolNum, setSharePatrolNum] = useState<number | null>(null);
  const [showEmptyPatrols, setShowEmptyPatrols] = useState(false);

  const parsedBulkPreview = useMemo(() => parseParticipantLines(bulkText), [bulkText]);

  // Helper: get existing category of each Kumpulan (1 kumpulan = 1 kategori sahaja)
  const groupCategoryMap = useMemo(() => {
    const map: Record<number, Category | null> = {};
    for (let p = 1; p <= TOTAL_CHECKPOINTS; p++) {
      const firstMember = state.archers.find((a) => a.patrol === p);
      map[p] = firstMember ? firstMember.category : state.patrols[p]?.category ?? null;
    }
    return map;
  }, [state.archers, state.patrols]);

  const findBestGroupForCategory = (cat: Category): number => {
    // 1. Existing group of same category with < 8 members
    for (let p = 1; p <= TOTAL_CHECKPOINTS; p++) {
      const gCat = groupCategoryMap[p];
      const cnt = state.archers.filter((a) => a.patrol === p).length;
      if (gCat === cat && cnt > 0 && cnt < MAX_ARCHERS_PER_GROUP) return p;
    }
    // 2. Empty group
    for (let p = 1; p <= TOTAL_CHECKPOINTS; p++) {
      const cnt = state.archers.filter((a) => a.patrol === p).length;
      if (cnt === 0 && (!groupCategoryMap[p] || groupCategoryMap[p] === cat)) return p;
    }
    // 3. Any empty group regardless of old label
    for (let p = 1; p <= TOTAL_CHECKPOINTS; p++) {
      if (state.archers.filter((a) => a.patrol === p).length === 0) return p;
    }
    return 1;
  };

  const handleProcessTextImport = (text: string) => {
    const packets = extractAndDecodePackets(text);
    if (packets.length === 0) {
      setMergeFeedback({
        ok: false,
        msg: 'Tiada kod KTACR26 yang sah ditemui. Pastikan anda menyalin keseluruhan mesej skor WhatsApp daripada Ketua Kumpulan.',
      });
      return;
    }
    const res = onMergePackets(packets);
    setMergeFeedback({
      ok: true,
      msg: `Berjaya menggabungkan skor ${res.mergedArchers} pemanah daripada Kumpulan ${res.patrolsTouched.join(', ')}!`,
    });
    setPasteInput('');
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = String(reader.result || '');
        const parsed = JSON.parse(raw);

        // Case 1: Patrol JSON with packet
        if (parsed && typeof parsed.packet === 'string') {
          handleProcessTextImport(parsed.packet);
          return;
        }
        // Case 2: Full Tournament Backup JSON
        if (parsed && Array.isArray(parsed.archers) && Array.isArray(parsed.checkpoints)) {
          onImportFullBackup(parsed as TournamentState);
          setMergeFeedback({
            ok: true,
            msg: `Berjaya memulihkan data penuh pertandingan (${parsed.archers.length} pemanah)!`,
          });
          return;
        }
        setMergeFeedback({
          ok: false,
          msg: 'Format fail JSON tidak dikenali.',
        });
      } catch {
        setMergeFeedback({
          ok: false,
          msg: 'Gagal membaca fail JSON.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      setBulkText(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSingleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim()) return;
    const existingCat = groupCategoryMap[singlePatrol];
    const currentGroupCount = state.archers.filter((a) => a.patrol === singlePatrol).length;
    if (currentGroupCount > 0 && existingCat && existingCat !== singleCategory) {
      window.alert(
        `Kumpulan ${singlePatrol} adalah untuk Kategori ${existingCat} sahaja (tidak boleh bercampur Lelaki & Wanita). Sila pilih kumpulan lain.`
      );
      return;
    }
    if (
      currentGroupCount >= MAX_ARCHERS_PER_GROUP &&
      !window.confirm(
        `Kumpulan ${singlePatrol} sudah mempunyai ${currentGroupCount}/${MAX_ARCHERS_PER_GROUP} orang (had maksimum ${MAX_ARCHERS_PER_GROUP} orang). Teruskan tambah ke kumpulan ini?`
      )
    ) {
      return;
    }
    onAddParticipant({
      name: singleName.trim(),
      category: singleCategory,
      club: singleClub.trim(),
      patrol: singlePatrol,
      tag: singleTag.trim(),
    });
    setSingleName('');
    setSingleClub('');
    setSingleTag('');
  };

  const handleExportFullBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-penuh-2dranau-2026.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Patrol Status Summary
  const patrolSummaries = useMemo(() => {
    const list = [];
    for (let p = 1; p <= TOTAL_CHECKPOINTS; p++) {
      const members = state.archers.filter((a) => a.patrol === p);
      let completedCPs = 0;
      if (members.length > 0) {
        for (let cp = 1; cp <= TOTAL_CHECKPOINTS; cp++) {
          if (members.every((a) => isCPComplete(a.scores[cp]))) {
            completedCPs++;
          }
        }
      }
      list.push({
        patrol: p,
        members,
        completedCPs,
        captainName: state.patrols[p]?.captainName || '',
        submittedAt: state.patrols[p]?.submittedAt,
      });
    }
    return list;
  }, [state.archers, state.patrols]);

  const activePatrolSummaries = patrolSummaries.filter((p) => p.members.length > 0);

  const filteredArchers = useMemo(() => {
    const q = participantSearch.trim().toLowerCase();
    if (!q) return state.archers;
    return state.archers.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.club.toLowerCase().includes(q) ||
        a.tag.toLowerCase().includes(q) ||
        `kumpulan ${a.patrol}`.includes(q) ||
        `k${a.patrol}`.includes(q)
    );
  }, [state.archers, participantSearch]);

  const sharePayload = useMemo(() => {
    if (sharePatrolNum === null) return null;
    const members = state.archers.filter((a) => a.patrol === sharePatrolNum);
    const groupCat = members[0]?.category || state.patrols[sharePatrolNum]?.category;
    const cap = state.patrols[sharePatrolNum]?.captainName || '';
    const encoded = encodePatrolSetupPayload(sharePatrolNum, cap, members, state.checkpoints);
    const waText = [
      `🏹 *AGIHAN KUMPULAN ${String(sharePatrolNum).padStart(2, '0')}${
        groupCat ? ` (${groupCat.toUpperCase()})` : ''
      } — HUNTING 2D RANAU 2026*`,
      cap ? `Ketua: *${cap}*` : '',
      `Bil. Pemanah: *${members.length} orang*`,
      `_Bebas mula & sambung dari mana-mana Check Point (CP 1–21) mengikut arahan penganjur._`,
      ``,
      `Klik pautan ini untuk terus muat masuk senarai Kumpulan ${sharePatrolNum} & Arahan 21 CP ke telefon anda:`,
      encoded.shareUrl,
      ``,
      `_Atau salin kod ini di Panel Urusetia:_`,
      encoded.code,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      patrol: sharePatrolNum,
      count: members.length,
      qrValue: encoded.code,
      waText,
    };
  }, [sharePatrolNum, state.archers, state.patrols, state.checkpoints]);

  return (
    <div className="space-y-4 pb-8">
      {/* Header & Sub-tab Switcher */}
      <div className="rounded-2xl bg-kinabalu-900 p-4 text-white shadow-md">
        <h2 className="text-base font-black text-amber-400">PANEL PENGURUSAN URUSETIA</h2>
        <p className="text-xs text-slate-300">
          Urus peserta, agihan Kumpulan (1 kumpulan = 1 kategori, maks. 8 orang), arahan 21 CP &
          gabung skor Ketua Kumpulan.
        </p>

        <div className="mt-3.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <button
            onClick={() => setSubTab('merge')}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
              subTab === 'merge'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-white/10 text-slate-200 hover:bg-white/15'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            Gabung Skor
          </button>

          <button
            onClick={() => setSubTab('participants')}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
              subTab === 'participants'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-white/10 text-slate-200 hover:bg-white/15'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Peserta ({state.archers.length})
          </button>

          <button
            onClick={() => setSubTab('patrols')}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
              subTab === 'patrols'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-white/10 text-slate-200 hover:bg-white/15'
            }`}
          >
            <Share2 className="h-3.5 w-3.5" />
            Kumpulan ({activePatrolSummaries.length})
          </button>

          <button
            onClick={() => setSubTab('checkpoints')}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
              subTab === 'checkpoints'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-white/10 text-slate-200 hover:bg-white/15'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            Arahan CP & Data
          </button>
        </div>
      </div>

      {/* ================= SUB-TAB 1: GABUNG SKOR PATROL ================= */}
      {subTab === 'merge' && (
        <div className="space-y-4">
          {mergeFeedback && (
            <div
              className={`rounded-2xl border p-3.5 text-xs font-semibold ${
                mergeFeedback.ok
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                  : 'border-red-300 bg-red-50 text-red-900'
              }`}
            >
              {mergeFeedback.msg}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-extrabold text-kinabalu-900">
              Terima Skor daripada Telefon Ketua Kumpulan (100% Tanpa Server)
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Pilih salah satu kaedah di bawah apabila Ketua Kumpulan selesai merekod 21 CP:
            </p>

            <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-3 rounded-2xl bg-kinabalu-900 p-4 text-left text-white shadow-sm hover:bg-kinabalu-800"
              >
                <QrCode className="h-8 w-8 shrink-0 text-amber-400" />
                <div>
                  <div className="text-sm font-extrabold text-amber-400">
                    Imbas Kod QR Skor Kumpulan
                  </div>
                  <div className="text-xs text-slate-300">
                    Guna kamera telefon/tablet ini — berfungsi tanpa sebarang internet
                  </div>
                </div>
              </button>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-left hover:bg-slate-100">
                <Upload className="h-7 w-7 shrink-0 text-kinabalu-700" />
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    Muat Naik Fail Skor (.JSON)
                  </div>
                  <div className="text-xs text-slate-600">
                    Pilih fail .json skor kumpulan atau fail sandaran penuh pertandingan
                  </div>
                </div>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleJsonUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Paste WhatsApp Report Box */}
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700">
                Atau Tampal (Paste) Mesej Laporan WhatsApp daripada Ketua Kumpulan:
              </label>
              <textarea
                rows={4}
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                placeholder="Salin mesej laporan skor dari WhatsApp (boleh tampal banyak mesej kumpulan sekaligus) yang mengandungi kod KTACR26-SCORE:..."
                className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 text-xs font-mono focus:border-kinabalu-800 focus:outline-none"
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => handleProcessTextImport(pasteInput)}
                  disabled={!pasteInput.trim()}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"
                >
                  Proses & Gabung Skor Sekarang
                </button>
              </div>
            </div>
          </div>

          {/* Kumpulan Completion Checklist */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-extrabold text-kinabalu-900">
              Status Semakan Kumpulan Aktif ({activePatrolSummaries.length} Kumpulan)
            </h3>
            {activePatrolSummaries.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Belum ada peserta diagihkan ke dalam Kumpulan.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {activePatrolSummaries.map((p) => {
                  const isComplete = p.completedCPs === TOTAL_CHECKPOINTS;
                  return (
                    <div
                      key={p.patrol}
                      className={`rounded-xl border p-3 ${
                        isComplete
                          ? 'border-emerald-300 bg-emerald-50/70'
                          : 'border-amber-200 bg-amber-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">
                          Kumpulan {String(p.patrol).padStart(2, '0')}
                        </span>
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-600" />
                        )}
                      </div>
                      <div className="mt-1 text-[11px] font-semibold text-slate-700">
                        {p.members.length} pemanah • {p.completedCPs}/21 CP
                      </div>
                      {p.captainName && (
                        <div className="truncate text-[10px] text-slate-500">{p.captainName}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 2: SENARAI PESERTA & IMPORT ================= */}
      {subTab === 'participants' && (
        <div className="space-y-4">
          {/* Add Single Participant */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-kinabalu-900">
              <UserPlus className="h-4 w-4 text-kinabalu-700" />
              Tambah Peserta Individu
            </h3>

            <form
              onSubmit={handleSingleAdd}
              className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-12"
            >
              <input
                type="text"
                required
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                placeholder="Nama Penuh Peserta *"
                className="sm:col-span-4 rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium"
              />
              <select
                value={singleCategory}
                onChange={(e) => {
                  const nextCat = e.target.value as Category;
                  setSingleCategory(nextCat);
                  const currMembers = state.archers.filter((a) => a.patrol === singlePatrol);
                  if (currMembers.length > 0 && currMembers[0].category !== nextCat) {
                    setSinglePatrol(findBestGroupForCategory(nextCat));
                  }
                }}
                className="sm:col-span-2 rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold"
              >
                <option value="Lelaki">Lelaki</option>
                <option value="Wanita">Wanita</option>
              </select>
              <input
                type="text"
                value={singleClub}
                onChange={(e) => setSingleClub(e.target.value)}
                placeholder="Kelab / Pasukan"
                className="sm:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
              <select
                value={singlePatrol}
                onChange={(e) => setSinglePatrol(Number(e.target.value))}
                className="sm:col-span-2 rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs font-bold"
                title="Kumpulan (1 kategori sahaja, maks 8 orang)"
              >
                {Array.from({ length: TOTAL_CHECKPOINTS }, (_, i) => {
                  const pNum = i + 1;
                  const members = state.archers.filter((a) => a.patrol === pNum);
                  const cnt = members.length;
                  const lockedCat = cnt > 0 ? members[0].category : null;
                  const incompatible = lockedCat !== null && lockedCat !== singleCategory;
                  return (
                    <option key={pNum} value={pNum} disabled={incompatible}>
                      K{pNum} {lockedCat ? `[${lockedCat[0]}]` : ''} ({cnt}/{MAX_ARCHERS_PER_GROUP})
                    </option>
                  );
                })}
              </select>
              <button
                type="submit"
                className="sm:col-span-2 rounded-xl bg-kinabalu-900 px-3 py-2 text-xs font-extrabold text-amber-400 hover:bg-kinabalu-800"
              >
                + Tambah
              </button>
            </form>
          </div>

          {/* Bulk CSV / Excel / WhatsApp Import */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-kinabalu-900">
                  Import Senarai Pukal (CSV / Excel / WhatsApp)
                </h3>
                <p className="text-xs text-slate-500">
                  Format setiap baris: <code>Nama, Kategori (L/W), Kelab, No Kumpulan (1-21)</code>
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100">
                <Upload className="h-3.5 w-3.5" />
                Pilih Fail .CSV / .TXT
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCsvFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              rows={4}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Contoh tampal terus dari Excel / WhatsApp:\nAhmad Firdaus, L, KTACR Ranau, 1\nSiti Rahmah, W, Kundasang Tradisional, 2\nMohd Rizal, Lelaki, Tambunan Bowhunters, 1`}
              className="mt-2.5 w-full rounded-xl border border-slate-300 p-3 text-xs font-mono focus:border-kinabalu-800 focus:outline-none"
            />

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">
                Dikesan untuk diimport:{' '}
                <strong className="text-kinabalu-900">{parsedBulkPreview.length} peserta</strong>
              </span>
              <button
                type="button"
                disabled={parsedBulkPreview.length === 0}
                onClick={() => {
                  onBulkAddParticipants(parsedBulkPreview);
                  setBulkText('');
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                Import {parsedBulkPreview.length} Peserta
              </button>
            </div>
          </div>

          {/* Auto-Distribute Kumpulan Helper (Strictly Separate L & W, Max 8 per Group) */}
          {state.archers.length > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-extrabold text-kinabalu-900">
                  Agihan Automatik Kumpulan Mengikut Kategori (Tidak Bercampur L & W)
                </div>
                <div className="text-[11px] text-slate-500">
                  Menyusun Kumpulan Lelaki & Kumpulan Wanita secara berasingan dan seimbang
                  (maksimum {MAX_ARCHERS_PER_GROUP} orang satu kumpulan).
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={targetMaxPerGroup}
                  onChange={(e) => setTargetMaxPerGroup(Number(e.target.value))}
                  className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold"
                >
                  {[8, 7, 6, 5, 4].map((maxSz) => (
                    <option key={maxSz} value={maxSz}>
                      Maks. {maxSz} org / kumpulan
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onAutoDistributePatrols(targetMaxPerGroup)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-kinabalu-900 px-3.5 py-2 text-xs font-extrabold text-amber-400 hover:bg-kinabalu-800"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  Agih Sekata
                </button>
              </div>
            </div>
          )}

          {/* Manage Existing Participants Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-extrabold text-kinabalu-900">
                Senarai Peserta Berdaftar ({state.archers.length})
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  placeholder="Cari nama / kelab / kumpulan..."
                  className="w-full rounded-xl border border-slate-300 py-1.5 pl-8 pr-3 text-xs"
                />
              </div>
            </div>

            {filteredArchers.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">Tiada peserta dalam senarai.</p>
            ) : (
              <div className="mt-3 max-h-96 overflow-y-auto divide-y divide-slate-100 border-t border-slate-100">
                {filteredArchers.map((a) => {
                  const isEditing = editingArcherId === a.id && editDraft !== null;
                  return (
                    <div key={a.id} className="py-2.5 text-xs">
                      {isEditing ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 items-center bg-amber-50/60 p-2 rounded-xl">
                          <input
                            type="text"
                            value={editDraft.name}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, name: e.target.value })
                            }
                            className="sm:col-span-4 rounded-lg border border-slate-300 px-2.5 py-1.5 font-semibold"
                          />
                          <select
                            value={editDraft.category}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                category: e.target.value as Category,
                              })
                            }
                            className="sm:col-span-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-bold"
                          >
                            <option value="Lelaki">Lelaki</option>
                            <option value="Wanita">Wanita</option>
                          </select>
                          <input
                            type="text"
                            value={editDraft.club}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, club: e.target.value })
                            }
                            placeholder="Kelab"
                            className="sm:col-span-3 rounded-lg border border-slate-300 px-2.5 py-1.5"
                          />
                          <select
                            value={editDraft.patrol}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                patrol: Number(e.target.value),
                              })
                            }
                            className="sm:col-span-1 rounded-lg border border-slate-300 bg-white px-1.5 py-1.5 font-bold"
                          >
                            {Array.from({ length: TOTAL_CHECKPOINTS }, (_, i) => (
                              <option key={i + 1} value={i + 1}>
                                K{i + 1}
                              </option>
                            ))}
                          </select>
                          <div className="sm:col-span-2 flex justify-end gap-1">
                            <button
                              onClick={() => {
                                onUpdateArcherMeta(a.id, editDraft);
                                setEditingArcherId(null);
                                setEditDraft(null);
                              }}
                              className="rounded-lg bg-emerald-600 p-1.5 text-white"
                              title="Simpan"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingArcherId(null);
                                setEditDraft(null);
                              }}
                              className="rounded-lg bg-slate-200 p-1.5 text-slate-700"
                              title="Batal"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  a.category === 'Wanita'
                                    ? 'bg-pink-100 text-pink-800'
                                    : 'bg-sky-100 text-sky-900'
                                }`}
                              >
                                {a.category === 'Wanita' ? 'W' : 'L'}
                              </span>
                              <span className="font-bold text-slate-900 truncate">{a.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {a.tag && <span>{a.tag} • </span>}
                              {a.club || 'Persendirian'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={a.patrol}
                              onChange={(e) =>
                                onUpdateArcherMeta(a.id, { patrol: Number(e.target.value) })
                              }
                              className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-extrabold text-kinabalu-900"
                              aria-label="Tukar Kumpulan"
                            >
                              {Array.from({ length: TOTAL_CHECKPOINTS }, (_, i) => {
                                const pNum = i + 1;
                                const otherMembers = state.archers.filter(
                                  (m) => m.patrol === pNum && m.id !== a.id
                                );
                                const incompatible =
                                  otherMembers.length > 0 &&
                                  otherMembers[0].category !== a.category;
                                return (
                                  <option key={pNum} value={pNum} disabled={incompatible}>
                                    Kumpulan {pNum}
                                    {incompatible ? ` (${otherMembers[0].category})` : ''}
                                  </option>
                                );
                              })}
                            </select>

                            <button
                              onClick={() => {
                                setEditingArcherId(a.id);
                                setEditDraft({
                                  name: a.name,
                                  category: a.category,
                                  club: a.club,
                                  patrol: a.patrol,
                                  tag: a.tag,
                                });
                              }}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              title="Edit Peserta"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                if (window.confirm(`Padam peserta "${a.name}"?`)) {
                                  onDeleteArcher(a.id);
                                }
                              }}
                              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700"
                              title="Padam Peserta"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 3: AGIHAN KUMPULAN & KONGSI KE KETUA ================= */}
      {subTab === 'patrols' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-extrabold text-kinabalu-900">
                Senarai Agihan Kumpulan (1 Kumpulan = 1 Kategori Sahaja)
              </h3>
              <p className="text-xs text-slate-500">
                Maksimum {MAX_ARCHERS_PER_GROUP} orang satu kumpulan. Setiap kumpulan bebas mula &
                sambung dari mana-mana CP mengikut arahan penganjur.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEmptyPatrols((v) => !v)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
              >
                {showEmptyPatrols ? 'Sembunyi Kumpulan Kosong' : 'Papar Semua 21 Kumpulan'}
              </button>
              <button
                onClick={onPrintPatrolSheets}
                className="inline-flex items-center gap-1.5 rounded-xl bg-kinabalu-900 px-3.5 py-2 text-xs font-extrabold text-amber-400 hover:bg-kinabalu-800"
              >
                <Printer className="h-3.5 w-3.5" />
                Cetak Senarai Kumpulan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(showEmptyPatrols ? patrolSummaries : activePatrolSummaries).map((p) => {
              const overLimit = p.members.length > MAX_ARCHERS_PER_GROUP;
              return (
                <div
                  key={p.patrol}
                  className={`flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-sm ${
                    overLimit ? 'border-red-400 ring-1 ring-red-300' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-kinabalu-900 px-2.5 py-1 text-xs font-black text-amber-400">
                        KUMPULAN {String(p.patrol).padStart(2, '0')}
                        {p.members[0]?.category
                          ? ` • ${p.members[0].category.toUpperCase()}`
                          : ''}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-extrabold ${
                          overLimit
                            ? 'bg-red-100 text-red-700'
                            : p.members.length === MAX_ARCHERS_PER_GROUP
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {p.members.length}/{MAX_ARCHERS_PER_GROUP} orang
                      </span>
                    </div>

                    <div className="mt-2.5">
                      <input
                        type="text"
                        value={p.captainName}
                        onChange={(e) => onUpdateCaptainName(p.patrol, e.target.value)}
                        placeholder="Nama Ketua / Pencatat Kumpulan..."
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium focus:border-kinabalu-700 focus:outline-none"
                      />
                    </div>

                    {p.members.length > 0 ? (
                      <ul className="mt-2.5 space-y-1 text-xs text-slate-700">
                        {p.members.map((m, idx) => (
                          <li key={m.id} className="flex items-center justify-between gap-2">
                            <span className="truncate font-semibold">
                              {idx + 1}. {m.name}
                            </span>
                            <span className="shrink-0 text-[10px] font-bold text-slate-500">
                              {m.category}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-xs italic text-slate-400">
                        Tiada pemanah ditetapkan.
                      </p>
                    )}
                  </div>

                  {p.members.length > 0 && (
                    <button
                      onClick={() => setSharePatrolNum(p.patrol)}
                      className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-kinabalu-900 bg-kinabalu-900/5 py-2 text-xs font-extrabold text-kinabalu-900 hover:bg-kinabalu-900 hover:text-amber-400 transition"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      Kongsi QR / Pautan ke Ketua K{p.patrol}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 4: ARAHAN 21 CP & DATA ================= */}
      {subTab === 'checkpoints' && (
        <div className="space-y-4">
          {/* Backup & Reset Controls */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-extrabold text-kinabalu-900">
              Sandaran (Backup) & Kawalan Data Pertandingan
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={handleExportFullBackup}
                className="inline-flex items-center gap-1.5 rounded-xl bg-kinabalu-900 px-3.5 py-2 text-xs font-extrabold text-amber-400 hover:bg-kinabalu-800"
              >
                <Download className="h-3.5 w-3.5" />
                Simpan Backup Penuh (.JSON)
              </button>

              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'Reset semua skor markah kepada kosong tetapi KEKALKAN senarai peserta & kumpulan?'
                    )
                  ) {
                    onResetScoresOnly();
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-950 hover:bg-amber-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Markah Sahaja
              </button>

              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'Kosongkan SEMUA peserta dan skor untuk memulakan kemasukan data sebenar?'
                    )
                  ) {
                    onClearAllParticipants();
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Kosongkan Semua Peserta
              </button>

              {!state.isDemoData && (
                <button
                  onClick={() => {
                    if (
                      state.archers.length === 0 ||
                      window.confirm('Gantikan data semasa dengan Data Simulasi (Demo)?')
                    ) {
                      onLoadDemoData();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  Muat Data Simulasi (Demo)
                </button>
              )}
            </div>
          </div>

          {/* Editable 21 Checkpoints */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-extrabold text-kinabalu-900">
              Tetapan Sasaran & Arahan 21 Check Point (7m ~ 20m)
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Setiap perubahan disimpan secara automatik dan dipaparkan pada skrin pemarkahan.
            </p>

            <div className="mt-3 space-y-2.5">
              {state.checkpoints.map((cpItem) => (
                <div
                  key={cpItem.cp}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-12 sm:items-center"
                >
                  <div className="sm:col-span-1 font-black text-xs text-kinabalu-900">
                    CP {String(cpItem.cp).padStart(2, '0')}
                  </div>
                  <input
                    type="text"
                    value={cpItem.animal}
                    onChange={(e) =>
                      onUpdateCheckpoint(cpItem.cp, { animal: e.target.value })
                    }
                    placeholder="Nama Sasaran 2D"
                    className="sm:col-span-3 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                  />
                  <input
                    type="text"
                    value={cpItem.distance}
                    onChange={(e) =>
                      onUpdateCheckpoint(cpItem.cp, { distance: e.target.value })
                    }
                    placeholder="Jarak (cth: 14m)"
                    className="sm:col-span-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold"
                  />
                  <input
                    type="text"
                    value={cpItem.instruction}
                    onChange={(e) =>
                      onUpdateCheckpoint(cpItem.cp, { instruction: e.target.value })
                    }
                    placeholder="Arahan memanah di check point ini..."
                    className="sm:col-span-6 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <QrScannerModal
          onResult={(decoded) => {
            setShowScanner(false);
            handleProcessTextImport(decoded);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Share Kumpulan Setup QR Modal */}
      {sharePayload && (
        <QrCodeModal
          title={`Agihan Kumpulan ${String(sharePayload.patrol).padStart(2, '0')}`}
          subtitle={`${sharePayload.count} pemanah + Arahan 21 Check Point`}
          qrValue={sharePayload.qrValue}
          copyText={sharePayload.waText}
          whatsappText={sharePayload.waText}
          onClose={() => setSharePatrolNum(null)}
        />
      )}
    </div>
  );
};

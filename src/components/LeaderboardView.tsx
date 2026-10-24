import React, { useMemo, useState } from 'react';
import {
  Trophy,
  Medal,
  Printer,
  Download,
  Copy,
  Check,
  Search,
  AlertTriangle,
  Share2,
  X,
  Columns2,
} from 'lucide-react';
import { Archer, ArcherStanding, Category } from '../types';
import { rankArchers } from '../utils/scoring';
import { buildOfficialResultsWhatsApp, generateOfficialCSV } from '../utils/transfer';

interface LeaderboardViewProps {
  archers: Archer[];
  onSelectStanding: (standing: ArcherStanding) => void;
  onResolveShootOff: (winnerId: string, runnerUpId: string) => void;
  onPrintOfficialResults: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  archers,
  onSelectStanding,
  onResolveShootOff,
  onPrintOfficialResults,
}) => {
  const [category, setCategory] = useState<Category>('Lelaki');
  const [splitDesktopView, setSplitDesktopView] = useState<boolean>(false);
  const [query, setQuery] = useState('');
  const [copiedWa, setCopiedWa] = useState(false);
  const [shootOffPair, setShootOffPair] = useState<[ArcherStanding, ArcherStanding] | null>(null);

  const menStandings = useMemo(() => rankArchers(archers, 'Lelaki'), [archers]);
  const womenStandings = useMemo(() => rankArchers(archers, 'Wanita'), [archers]);

  const filterList = (list: ArcherStanding[]) => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.archer.name.toLowerCase().includes(q) ||
        s.archer.club.toLowerCase().includes(q) ||
        s.archer.tag.toLowerCase().includes(q) ||
        `kumpulan ${s.archer.patrol}`.includes(q) ||
        `k${s.archer.patrol}`.includes(q)
    );
  };

  const activeStandings = category === 'Lelaki' ? menStandings : womenStandings;
  const filteredSingle = useMemo(() => filterList(activeStandings), [activeStandings, query]);
  const filteredMen = useMemo(() => filterList(menStandings), [menStandings, query]);
  const filteredWomen = useMemo(() => filterList(womenStandings), [womenStandings, query]);

  const handleDownloadCSV = () => {
    const csv = generateOfficialCSV(archers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keputusan-rasmi-hunting-2d-ranau-2026.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyWhatsApp = async () => {
    const msg = buildOfficialResultsWhatsApp(archers);
    try {
      await navigator.clipboard.writeText(msg);
      setCopiedWa(true);
      setTimeout(() => setCopiedWa(false), 2300);
    } catch {
      // ignore
    }
  };

  const handleShareWhatsApp = () => {
    const msg = buildOfficialResultsWhatsApp(archers);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const topThree = activeStandings.filter((s) => s.arrowsShot > 0).slice(0, 3);

  const renderStandingsTable = (standings: ArcherStanding[], catTitle: Category) => {
    if (standings.length === 0) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <Trophy className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-bold text-slate-700">
            Tiada rekod peserta ditemui bagi Kategori {catTitle}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tambah atau import senarai peserta di tab Urusetia untuk memulakan pertandingan.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {splitDesktopView && (
          <div className="border-b border-slate-200 bg-kinabalu-900 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-amber-400">
            Kategori {catTitle} ({standings.length} Peserta)
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-100 text-[10px] sm:text-[11px] font-extrabold uppercase text-slate-700">
              <tr>
                <th className="px-2 sm:px-3 py-2.5 w-10 text-center">Ked</th>
                <th className="px-2 sm:px-3 py-2.5">Pemanah</th>
                <th className="hidden sm:table-cell px-2 py-2.5 text-center">CP</th>
                <th className="px-2 sm:px-2.5 py-2.5 text-right bg-amber-50/80 text-kinabalu-950">
                  Mata
                </th>
                <th className="px-1.5 sm:px-2 py-2.5 text-center text-amber-800">8</th>
                <th className="px-1.5 sm:px-2 py-2.5 text-center text-red-700">5</th>
                <th className="px-1.5 sm:px-2 py-2.5 text-center text-blue-700">3</th>
                <th className="hidden sm:table-cell px-2 py-2.5 text-center text-slate-500">M</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {standings.map((item, idx) => {
                const prev = idx > 0 ? standings[idx - 1] : null;
                const next = idx < standings.length - 1 ? standings[idx + 1] : null;

                const samePointsAsPrev =
                  prev && prev.arrowsShot > 0 && prev.totalPoints === item.totalPoints;
                const samePointsAsNext =
                  next && next.arrowsShot > 0 && next.totalPoints === item.totalPoints;

                let tieBreakHint: string | null = null;
                if ((samePointsAsPrev || samePointsAsNext) && !item.isExactTie) {
                  if (item.archer.shootOffRank) {
                    tieBreakHint = `Shoot-off #${item.archer.shootOffRank}`;
                  } else {
                    const neighbor = samePointsAsNext ? next! : prev!;
                    if (neighbor.count8 !== item.count8) {
                      tieBreakHint = `TB 8 (${item.count8})`;
                    } else if (neighbor.count5 !== item.count5) {
                      tieBreakHint = `TB 5 (${item.count5})`;
                    } else if (neighbor.count3 !== item.count3) {
                      tieBreakHint = `TB 3 (${item.count3})`;
                    }
                  }
                }

                const showMedalZoneDivider = !query.trim() && item.rank === 4;
                const showCutoffDivider = !query.trim() && item.rank === 16;

                const rankBadge = () => {
                  if (item.prizeZone === 'juara') {
                    return (
                      <span className="inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-amber-950 ring-2 ring-amber-500">
                        1
                      </span>
                    );
                  }
                  if (item.prizeZone === 'naib_juara') {
                    return (
                      <span className="inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-slate-300 text-xs font-black text-slate-900 ring-2 ring-slate-400">
                        2
                      </span>
                    );
                  }
                  if (item.prizeZone === 'ketiga') {
                    return (
                      <span className="inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-orange-300 text-xs font-black text-orange-950 ring-2 ring-orange-400">
                        3
                      </span>
                    );
                  }
                  if (item.prizeZone === 'medal') {
                    return (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-extrabold text-emerald-900 border border-emerald-300">
                        {item.rank}
                      </span>
                    );
                  }
                  return <span className="text-xs font-bold text-slate-500">{item.rank}</span>;
                };

                return (
                  <React.Fragment key={item.archer.id}>
                    {showMedalZoneDivider && (
                      <tr className="bg-emerald-50/90">
                        <td
                          colSpan={8}
                          className="px-3 py-1.5 text-[10px] sm:text-[11px] font-extrabold text-emerald-900"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Medal className="h-3.5 w-3.5 text-emerald-700" />
                            ZON PEMENANG MEDAL (TEMPAT KE-4 HINGGA KE-15)
                          </span>
                        </td>
                      </tr>
                    )}

                    {showCutoffDivider && (
                      <tr className="bg-slate-100">
                        <td
                          colSpan={8}
                          className="px-3 py-1.5 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-500"
                        >
                          ─── Garisan Penamat Hadiah Tempat Ke-15 ───
                        </td>
                      </tr>
                    )}

                    <tr
                      onClick={() => onSelectStanding(item)}
                      className="cursor-pointer transition hover:bg-amber-50/40"
                    >
                      <td className="px-2 sm:px-3 py-2.5 text-center">{rankBadge()}</td>
                      <td className="px-2 sm:px-3 py-2.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="font-extrabold text-slate-900 leading-snug">
                            {item.archer.name}
                          </span>
                          {tieBreakHint && (
                            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                              {tieBreakHint}
                            </span>
                          )}
                          {item.isExactTie &&
                            next &&
                            next.isExactTie &&
                            next.totalPoints === item.totalPoints && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShootOffPair([item, next]);
                                }}
                                className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-extrabold text-white hover:bg-red-700"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                SERI • Shoot-Off
                              </button>
                            )}
                        </div>
                        <div className="mt-0.5 text-[10px] sm:text-[11px] text-slate-500">
                          {item.archer.tag && (
                            <span className="font-semibold text-slate-600">
                              {item.archer.tag} •{' '}
                            </span>
                          )}
                          <span>{item.archer.club || 'Persendirian'}</span> •{' '}
                          <span className="font-semibold text-kinabalu-700">
                            Kumpulan {item.archer.patrol}
                          </span>
                          <span className="sm:hidden"> • {item.completedCPs}/21 CP</span>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-2 py-2.5 text-center">
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                            item.completedCPs === 21
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.completedCPs}/21
                        </span>
                      </td>
                      <td className="px-2 sm:px-2.5 py-2.5 text-right bg-amber-50/40 text-sm font-black text-kinabalu-950">
                        {item.totalPoints}
                      </td>
                      <td className="px-1.5 sm:px-2 py-2.5 text-center font-bold text-amber-900">
                        {item.count8}
                      </td>
                      <td className="px-1.5 sm:px-2 py-2.5 text-center font-semibold text-red-700">
                        {item.count5}
                      </td>
                      <td className="px-1.5 sm:px-2 py-2.5 text-center font-semibold text-blue-700">
                        {item.count3}
                      </td>
                      <td className="hidden sm:table-cell px-2 py-2.5 text-center text-slate-500">
                        {item.countM}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 bg-slate-50 px-3.5 py-2 text-[11px] text-slate-500">
          Tip: Tekan mana-mana nama pemanah untuk membuka <strong>Kad Skor Penuh 21 CP</strong>.
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top Category Switcher & Export Bar */}
      <div className="rounded-2xl bg-kinabalu-900 p-4 text-white shadow-md">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-black tracking-tight text-amber-400">
              PAPAN KEPUTUSAN & KEDUDUKAN
            </h2>
            <p className="text-xs text-slate-300">
              Susunan automatik mengikut Tie-Break Rasmi: <strong>Mata → 8 → 5 → 3</strong>
            </p>
          </div>

          {/* Print & Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSplitDesktopView((v) => !v)}
              className={`hidden lg:inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                splitDesktopView
                  ? 'bg-amber-400 text-slate-950 font-extrabold'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title="Papar kategori Lelaki & Wanita bersebelahan pada skrin PC"
            >
              <Columns2 className="h-3.5 w-3.5" />
              {splitDesktopView ? '1 Lajur' : '2 Lajur (PC)'}
            </button>
            <button
              onClick={onPrintOfficialResults}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 text-xs font-extrabold text-slate-950 shadow-sm hover:bg-amber-300"
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak / PDF Rasmi
            </button>
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20"
            >
              <Download className="h-3.5 w-3.5 text-amber-300" />
              CSV Excel
            </button>
            <button
              onClick={handleCopyWhatsApp}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20"
            >
              {copiedWa ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-amber-300" />
                  <span>Salin Teks</span>
                </>
              )}
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              title="Kongsi ke WhatsApp"
            >
              <Share2 className="h-3.5 w-3.5" />
              WA
            </button>
          </div>
        </div>

        {/* Category Segmented Tabs (Hidden on lg if split 2-column mode active) */}
        <div
          className={`mt-3.5 grid grid-cols-2 gap-2 rounded-xl bg-kinabalu-950/70 p-1 ${
            splitDesktopView ? 'lg:hidden' : ''
          }`}
        >
          <button
            onClick={() => setCategory('Lelaki')}
            className={`rounded-lg py-2.5 text-xs font-extrabold transition ${
              category === 'Lelaki'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            KATEGORI LELAKI ({menStandings.length})
          </button>
          <button
            onClick={() => setCategory('Wanita')}
            className={`rounded-lg py-2.5 text-xs font-extrabold transition ${
              category === 'Wanita'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            KATEGORI WANITA ({womenStandings.length})
          </button>
        </div>
      </div>

      {/* Top 3 Podium Cards (Single View Mode) */}
      {!query.trim() && !splitDesktopView && topThree.length > 0 && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {topThree.map((item) => {
            const styles =
              item.rank === 1
                ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100/70'
                : item.rank === 2
                ? 'border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100'
                : 'border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50/60';

            const label =
              item.rank === 1
                ? '🥇 JUARA'
                : item.rank === 2
                ? '🥈 NAIB JUARA'
                : '🥉 TEMPAT KETIGA';

            return (
              <div
                key={item.archer.id}
                onClick={() => onSelectStanding(item)}
                className={`cursor-pointer rounded-2xl border-2 p-3.5 shadow-sm transition hover:shadow-md ${styles}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">{label}</span>
                  <span className="rounded-md bg-kinabalu-900 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    Piala + Tunai
                  </span>
                </div>
                <div className="mt-1.5 truncate text-sm font-black text-slate-950">
                  {item.archer.name}
                </div>
                <div className="truncate text-[11px] font-medium text-slate-600">
                  {item.archer.club || 'Persendirian'} • Kumpulan {item.archer.patrol}
                </div>
                <div className="mt-2.5 flex items-baseline justify-between border-t border-black/10 pt-2">
                  <div>
                    <span className="text-xl font-black text-kinabalu-900">
                      {item.totalPoints}
                    </span>
                    <span className="ml-1 text-[11px] font-bold text-slate-600">mata</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-700">
                    8:{item.count8} · 5:{item.count5} · 3:{item.count3}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search Filter */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama pemanah, kelab, tag atau kumpulan..."
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-xs font-medium text-slate-900 shadow-sm focus:border-kinabalu-800 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Standings Content: Single Column (Mobile/Default) vs Side-by-Side 2-Column on Desktop */}
      {splitDesktopView ? (
        <>
          <div className="lg:hidden">{renderStandingsTable(filteredSingle, category)}</div>
          <div className="hidden lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
            {renderStandingsTable(filteredMen, 'Lelaki')}
            {renderStandingsTable(filteredWomen, 'Wanita')}
          </div>
        </>
      ) : (
        renderStandingsTable(filteredSingle, category)
      )}

      {/* Shoot-Off Tie-Breaker Judge Modal */}
      {shootOffPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-kinabalu-900 px-5 py-4 text-white">
              <h3 className="text-base font-bold text-amber-400">
                Keputusan Penentuan Seri (Shoot-Off)
              </h3>
              <button
                onClick={() => setShootOffPair(null)}
                className="rounded-lg p-1 text-slate-300 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 p-5 text-xs text-slate-700">
              <p>
                Kedua-dua pemanah ini terikat penuh pada{' '}
                <strong>
                  {shootOffPair[0].totalPoints} mata (8:{shootOffPair[0].count8}, 5:
                  {shootOffPair[0].count5}, 3:{shootOffPair[0].count3})
                </strong>
                . Pilih pemenang panahan penentu (Shoot-Off):
              </p>

              <button
                onClick={() => {
                  onResolveShootOff(shootOffPair[0].archer.id, shootOffPair[1].archer.id);
                  setShootOffPair(null);
                }}
                className="w-full rounded-xl border-2 border-kinabalu-900 bg-slate-50 p-3.5 text-left font-bold text-slate-900 hover:bg-amber-50"
              >
                🏆 Menang Shoot-Off:{' '}
                <span className="font-black">{shootOffPair[0].archer.name}</span>
              </button>

              <button
                onClick={() => {
                  onResolveShootOff(shootOffPair[1].archer.id, shootOffPair[0].archer.id);
                  setShootOffPair(null);
                }}
                className="w-full rounded-xl border-2 border-kinabalu-900 bg-slate-50 p-3.5 text-left font-bold text-slate-900 hover:bg-amber-50"
              >
                🏆 Menang Shoot-Off:{' '}
                <span className="font-black">{shootOffPair[1].archer.name}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

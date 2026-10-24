import React from 'react';
import { X, Share2, Award, Target } from 'lucide-react';
import { EVENT_INFO, MAX_SCORE, TOTAL_CHECKPOINTS } from '../constants';
import { ArcherStanding, ArrowScore, CheckpointConfig } from '../types';
import { cpTotalPoints } from '../utils/scoring';

interface ArcherScorecardModalProps {
  standing: ArcherStanding;
  checkpoints: CheckpointConfig[];
  onClose: () => void;
}

function arrowBadgeClass(score: ArrowScore): string {
  switch (score) {
    case '8':
      return 'bg-amber-400 text-amber-950 border-amber-500';
    case '5':
      return 'bg-red-600 text-white border-red-700';
    case '3':
      return 'bg-blue-600 text-white border-blue-700';
    case 'M':
      return 'bg-slate-600 text-white border-slate-700';
    default:
      return 'bg-slate-100 text-slate-400 border-slate-200';
  }
}

export const ArcherScorecardModal: React.FC<ArcherScorecardModalProps> = ({
  standing,
  checkpoints,
  onClose,
}) => {
  const { archer, rank, totalPoints, count8, count5, count3, countM, arrowsShot, completedCPs, prizeZone } =
    standing;

  const avgArrow = arrowsShot > 0 ? (totalPoints / arrowsShot).toFixed(2) : '0.00';

  const handleShareScorecard = () => {
    const lines: string[] = [
      `🏹 *KAD SKOR INDIVIDU — ${EVENT_INFO.shortTitle.toUpperCase()}*`,
      `Nama: *${archer.name}* (${archer.category})`,
      `Tag / Kumpulan: *${archer.tag || '-'}* • *Kumpulan ${archer.patrol}*${archer.club ? ` • ${archer.club}` : ''}`,
      `Kedudukan Semasa: *#${rank}* (${archer.category})`,
      `Jumlah Mata: *${totalPoints} / ${MAX_SCORE}* (${completedCPs}/21 CP)`,
      `Pecahan: *8*=${count8} | *5*=${count5} | *3*=${count3} | *M*=${countM}`,
      `────────────────────`,
    ];

    for (let cp = 1; cp <= TOTAL_CHECKPOINTS; cp++) {
      const r = archer.scores[cp] || [null, null, null];
      if (r[0] === null && r[1] === null && r[2] === null) continue;
      const tot = cpTotalPoints(r);
      lines.push(
        `CP${String(cp).padStart(2, '0')}: [${r.map((a) => a ?? '-').join(' ')}] = ${tot}`
      );
    }

    lines.push(`────────────────────`, `_"${EVENT_INFO.slogan}"_ — KTACR`);
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer');
  };

  let runningTotal = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 sm:items-center sm:p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="bg-kinabalu-900 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-amber-400 px-2 py-0.5 text-xs font-extrabold text-slate-950">
                  #{rank} {archer.category.toUpperCase()}
                </span>
                {archer.tag && (
                  <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold text-slate-200">
                    {archer.tag}
                  </span>
                )}
                <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                  Kumpulan {archer.patrol}
                </span>
              </div>
              <h3 className="mt-1.5 text-lg font-extrabold leading-snug text-white">
                {archer.name}
              </h3>
              <p className="text-xs text-slate-300">
                {archer.club || 'Persendirian / Terbuka'} • {completedCPs}/21 CP Selesai
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {prizeZone !== 'none' && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-400/20 px-2.5 py-1 text-xs font-bold text-amber-300 border border-amber-400/30">
              <Award className="h-4 w-4" />
              {prizeZone === 'juara' && 'Zon Hadiah: JUARA (Piala + Wang Tunai)'}
              {prizeZone === 'naib_juara' && 'Zon Hadiah: NAIB JUARA (Piala + Wang Tunai)'}
              {prizeZone === 'ketiga' && 'Zon Hadiah: TEMPAT KETIGA (Piala + Wang Tunai)'}
              {prizeZone === 'medal' && `Zon Hadiah: PEMENANG MEDAL (Tempat Ke-${rank})`}
            </div>
          )}
        </div>

        {/* Summary Stats Strip */}
        <div className="grid grid-cols-6 gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-3 text-center">
          <div className="col-span-2 rounded-xl bg-kinabalu-900 px-2 py-2 text-white">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              Jumlah Mata
            </div>
            <div className="text-xl font-black text-white">
              {totalPoints}
              <span className="text-[11px] font-normal text-slate-300">/{MAX_SCORE}</span>
            </div>
          </div>
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-1 py-2">
            <div className="text-[10px] font-bold text-amber-800">Skor 8</div>
            <div className="text-base font-extrabold text-amber-950">{count8}</div>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 px-1 py-2">
            <div className="text-[10px] font-bold text-red-700">Skor 5</div>
            <div className="text-base font-extrabold text-red-900">{count5}</div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-1 py-2">
            <div className="text-[10px] font-bold text-blue-700">Skor 3</div>
            <div className="text-base font-extrabold text-blue-900">{count3}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-100 px-1 py-2">
            <div className="text-[10px] font-bold text-slate-600">Miss</div>
            <div className="text-base font-extrabold text-slate-800">{countM}</div>
          </div>
        </div>

        {/* 21 Checkpoints Scrollable Table */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Target className="h-3.5 w-3.5 text-kinabalu-700" />
              Rekod Penuh 21 Check Point
            </span>
            <span>Purata: {avgArrow} / panah</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[11px] font-bold uppercase text-slate-600">
                <tr>
                  <th className="px-2.5 py-2">CP & Sasaran</th>
                  <th className="px-2 py-2 text-center">3 Panah</th>
                  <th className="px-2 py-2 text-right">CP</th>
                  <th className="px-2.5 py-2 text-right">Kumpul</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from({ length: TOTAL_CHECKPOINTS }, (_, idx) => {
                  const cp = idx + 1;
                  const cpCfg = checkpoints.find((c) => c.cp === cp);
                  const row = archer.scores[cp] || [null, null, null];
                  const hasAny = row.some((x) => x !== null);
                  const pts = cpTotalPoints(row);
                  if (hasAny) runningTotal += pts;

                  return (
                    <tr key={cp} className={hasAny ? 'bg-white' : 'bg-slate-50/60 text-slate-400'}>
                      <td className="px-2.5 py-2">
                        <div className="font-bold text-slate-800">
                          CP {String(cp).padStart(2, '0')}
                          {cpCfg?.distance && (
                            <span className="ml-1.5 font-normal text-slate-500">
                              ({cpCfg.distance})
                            </span>
                          )}
                        </div>
                        {cpCfg?.animal && (
                          <div className="truncate max-w-[135px] text-[11px] text-slate-500">
                            {cpCfg.animal}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs font-extrabold ${arrowBadgeClass(
                                row[i]
                              )}`}
                            >
                              {row[i] ?? '·'}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-slate-900">
                        {hasAny ? pts : '-'}
                      </td>
                      <td className="px-2.5 py-2 text-right font-semibold text-slate-600">
                        {hasAny ? runningTotal : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2.5 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            onClick={handleShareScorecard}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            <Share2 className="h-4 w-4" />
            Kongsi Kad Skor (WhatsApp)
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { EVENT_INFO, TOTAL_CHECKPOINTS } from '../constants';
import { Archer, CheckpointConfig, PatrolInfo } from '../types';
import { rankArchers } from '../utils/scoring';

export type PrintMode = 'official_results' | 'patrol_sheets';

interface PrintSheetProps {
  mode: PrintMode;
  archers: Archer[];
  checkpoints: CheckpointConfig[];
  patrols: Record<number, PatrolInfo>;
}

function formatPrizeText(zone: string, rank: number): string {
  switch (zone) {
    case 'juara':
      return 'JUARA (Piala + Tunai)';
    case 'naib_juara':
      return 'NAIB JUARA (Piala + Tunai)';
    case 'ketiga':
      return 'TEMPAT KE-3 (Piala + Tunai)';
    case 'medal':
      return `MEDAL (#${rank})`;
    default:
      return '-';
  }
}

export const PrintSheet: React.FC<PrintSheetProps> = ({
  mode,
  archers,
  checkpoints,
  patrols,
}) => {
  const men = rankArchers(archers, 'Lelaki');
  const women = rankArchers(archers, 'Wanita');

  const activePatrolNums = Array.from({ length: TOTAL_CHECKPOINTS }, (_, i) => i + 1).filter((p) =>
    archers.some((a) => a.patrol === p)
  );

  return (
    <div className="hidden print-only bg-white text-black">
      {/* Official KTACR Letterhead */}
      <div className="flex items-center gap-4 border-b-2 border-slate-900 pb-3">
        <img
          src="./images/logo-ktacr.png"
          alt="Logo KTACR"
          className="h-16 w-16 object-contain"
        />
        <div className="flex-1">
          <div className="text-[10pt] font-bold uppercase tracking-wider text-slate-700">
            {EVENT_INFO.organizer}
          </div>
          <h1 className="text-[15pt] font-black uppercase leading-tight text-black">
            {EVENT_INFO.title}
          </h1>
          <div className="text-[9.5pt] text-slate-700">
            Tarikh: {EVENT_INFO.date} • Masa: {EVENT_INFO.time} • Tempat: {EVENT_INFO.venue}
          </div>
        </div>
      </div>

      {mode === 'official_results' ? (
        <div className="mt-4 space-y-6">
          <div className="flex items-center justify-between rounded border border-slate-400 bg-slate-50 px-3 py-1.5 text-[9pt]">
            <span>
              <strong>Format:</strong> 21 Checkpoints × 3 Anak Panah (7~20m) | Skor: 8, 5, 3, M
            </span>
            <span>
              <strong>Penentu Seri (Tie-Break):</strong> Mata → 8 → 5 → 3
            </span>
          </div>

              {/* KATEGORI LELAKI */}
          <div>
            <h2 className="mb-2 text-[12pt] font-black uppercase text-black">
              KEPUTUSAN RASMI — KATEGORI LELAKI ({men.length} Peserta)
            </h2>
            <table className="w-full border-collapse border border-slate-500 text-[9.5pt]">
              <thead>
                <tr className="bg-slate-200 font-bold">
                  <th className="border border-slate-500 px-2 py-1 text-center w-10">Ked</th>
                  <th className="border border-slate-500 px-2 py-1 text-left">Nama Pemanah</th>
                  <th className="border border-slate-500 px-2 py-1 text-left">Kelab / Kumpulan</th>
                  <th className="border border-slate-500 px-2 py-1 text-center">CP</th>
                  <th className="border border-slate-500 px-2 py-1 text-right">Mata</th>
                  <th className="border border-slate-500 px-1.5 py-1 text-center">8</th>
                  <th className="border border-slate-500 px-1.5 py-1 text-center">5</th>
                  <th className="border border-slate-500 px-1.5 py-1 text-center">3</th>
                  <th className="border border-slate-500 px-1.5 py-1 text-center">M</th>
                  <th className="border border-slate-500 px-2 py-1 text-left">Hadiah</th>
                </tr>
              </thead>
              <tbody>
                {men.map((s) => (
                  <tr
                    key={s.archer.id}
                    className={s.rank <= 3 ? 'font-bold bg-slate-50' : ''}
                  >
                    <td className="border border-slate-400 px-2 py-1 text-center">{s.rank}</td>
                    <td className="border border-slate-400 px-2 py-1">
                      {s.archer.name}{' '}
                      {s.archer.tag ? <span className="text-[8.5pt]">({s.archer.tag})</span> : null}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 text-[8.5pt]">
                      {s.archer.club || '-'} (K{s.archer.patrol})
                    </td>
                    <td className="border border-slate-400 px-2 py-1 text-center">
                      {s.completedCPs}/21
                    </td>
                    <td className="border border-slate-400 px-2 py-1 text-right font-black">
                      {s.totalPoints}
                    </td>
                    <td className="border border-slate-400 px-1.5 py-1 text-center">{s.count8}</td>
                    <td className="border border-slate-400 px-1.5 py-1 text-center">{s.count5}</td>
                    <td className="border border-slate-400 px-1.5 py-1 text-center">{s.count3}</td>
                    <td className="border border-slate-400 px-1.5 py-1 text-center">{s.countM}</td>
                    <td className="border border-slate-400 px-2 py-1 text-[8.5pt]">
                      {formatPrizeText(s.prizeZone, s.rank)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* KATEGORI WANITA */}
          <div className="print-break-before pt-2">
            <h2 className="mb-2 text-[12pt] font-black uppercase text-black">
              KEPUTUSAN RASMI — KATEGORI WANITA ({women.length} Peserta)
            </h2>
            <table className="w-full border-collapse border border-slate-500 text-[9.5pt]">
              <thead>
                <tr className="bg-slate-200 font-bold">
                  <th className="border border-slate-500 px-2 py-1 text-center w-10">Ked</th>
                  <th className="border border-slate-500 px-2 py-1 text-left">Nama Pemanah</th>
                  <th className="border border-slate-500 px-2 py-1 text-left">Kelab / Kumpulan</th>
                  <th className="border border-slate-500 px-2 py-1 text-center">CP</th>
                  <th className="border border-slate-500 px-2 py-1 text-right">Mata</th>
                  <th className="border border-slate-500 px-1.5 py-1 text-center">8</th>
                  <th className="border border-slate-500 px-1.5 py-1 text-center">5</th>
                  <th className="border border-slate-500 px-1.5 py-1 text-center">3</th>
                  <th className="border border-slate-500 px-1.5 py-1 text-center">M</th>
                  <th className="border border-slate-500 px-2 py-1 text-left">Hadiah</th>
                </tr>
              </thead>
              <tbody>
                {women.map((s) => (
                  <tr
                    key={s.archer.id}
                    className={s.rank <= 3 ? 'font-bold bg-slate-50' : ''}
                  >
                    <td className="border border-slate-400 px-2 py-1 text-center">{s.rank}</td>
                    <td className="border border-slate-400 px-2 py-1">
                      {s.archer.name}{' '}
                      {s.archer.tag ? <span className="text-[8.5pt]">({s.archer.tag})</span> : null}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 text-[8.5pt]">
                      {s.archer.club || '-'} (K{s.archer.patrol})
                    </td>
                    <td className="border border-slate-400 px-2 py-1 text-center">
                      {s.completedCPs}/21
                    </td>
                    <td className="border border-slate-400 px-2 py-1 text-right font-black">
                      {s.totalPoints}
                    </td>
                    <td className="border border-slate-400 px-1.5 py-1 text-center">{s.count8}</td>
                    <td className="border border-slate-400 px-1.5 py-1 text-center">{s.count5}</td>
                    <td className="border border-slate-400 px-1.5 py-1 text-center">{s.count3}</td>
                    <td className="border border-slate-400 px-1.5 py-1 text-center">{s.countM}</td>
                    <td className="border border-slate-400 px-2 py-1 text-[8.5pt]">
                      {formatPrizeText(s.prizeZone, s.rank)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Official Judge & Club Chairman Signature Block */}
          <div className="print-avoid-break mt-10 grid grid-cols-2 gap-12 pt-8 text-[10pt]">
            <div className="text-center">
              <div className="mx-auto mb-2 h-12 border-b border-slate-800 w-56" />
              <div className="font-bold">KETUA HAKIM PERTANDINGAN</div>
              <div className="text-[9pt] text-slate-600">{EVENT_INFO.shortTitle}</div>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-2 h-12 border-b border-slate-800 w-56" />
              <div className="font-bold">{EVENT_INFO.contactName.toUpperCase()}</div>
              <div className="text-[9pt] text-slate-600">
                {EVENT_INFO.contactRole} ({EVENT_INFO.organizerShort})
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* KUMPULAN ASSIGNMENT & CHECKPOINT REFERENCE PRINT */
        <div className="mt-4 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[12pt] font-black uppercase">
              SENARAI AGIHAN KUMPULAN (1 KUMPULAN = 1 KATEGORI)
            </h2>
            <span className="text-[8.5pt] font-semibold text-slate-600">
              * Bebas mula & sambung di mana-mana Check Point (CP 1–21) mengikut arahan penganjur
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {activePatrolNums.map((p) => {
              const members = archers.filter((a) => a.patrol === p);
              const groupCat = members[0]?.category || patrols[p]?.category;
              const cap = patrols[p]?.captainName;
              return (
                <div
                  key={p}
                  className="print-avoid-break rounded border border-slate-500 p-3 text-[9.5pt]"
                >
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1 font-bold">
                    <span>
                      KUMPULAN {String(p).padStart(2, '0')}
                      {groupCat ? ` — KATEGORI ${groupCat.toUpperCase()}` : ''}
                    </span>
                    <span>{members.length} Pemanah</span>
                  </div>
                  {cap && <div className="mt-1 text-[8.5pt]">Ketua: {cap}</div>}
                  <ol className="mt-1.5 list-decimal pl-4 space-y-0.5">
                    {members.map((m) => (
                      <li key={m.id}>
                        <strong>{m.name}</strong>
                        {m.tag ? ` (${m.tag})` : ''}
                        {m.club ? ` — ${m.club}` : ''}
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>

          <div className="print-break-before pt-2">
            <h2 className="mb-2 text-[12pt] font-black uppercase">
              RUJUKAN ARAHAN 21 CHECK POINT
            </h2>
            <table className="w-full border-collapse border border-slate-500 text-[9pt]">
              <thead>
                <tr className="bg-slate-200 font-bold">
                  <th className="border border-slate-500 px-2 py-1 w-14">CP</th>
                  <th className="border border-slate-500 px-2 py-1">Sasaran 2D</th>
                  <th className="border border-slate-500 px-2 py-1 w-16 text-center">Jarak</th>
                  <th className="border border-slate-500 px-2 py-1">Arahan Memanah</th>
                </tr>
              </thead>
              <tbody>
                {checkpoints.map((c) => (
                  <tr key={c.cp}>
                    <td className="border border-slate-400 px-2 py-1 font-bold text-center">
                      CP {c.cp}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 font-semibold">{c.animal}</td>
                    <td className="border border-slate-400 px-2 py-1 text-center">{c.distance}</td>
                    <td className="border border-slate-400 px-2 py-1">{c.instruction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

import LZString from 'lz-string';
import {
  createEmptyScores,
  DEFAULT_CHECKPOINTS,
  EVENT_INFO,
  TOTAL_CHECKPOINTS,
} from '../constants';
import { Archer, ArrowScore, Category, CheckpointConfig, CPScore } from '../types';
import { computeArcherStats, cpTotalPoints, rankArchers } from './scoring';

interface CompactArcherRecord {
  i: string; // id
  t: string; // tag
  n: string; // name
  g: 'L' | 'W'; // gender
  c: string; // club
  p: number; // patrol
  s: string; // 63-char scores string ('8','5','3','M','.')
}

export interface DecodedScorePacket {
  type: 'SCORE';
  patrol: number;
  captainName: string;
  timestamp: number;
  archers: Archer[];
}

export interface DecodedSetupPacket {
  type: 'SETUP';
  patrol: number;
  captainName: string;
  archers: Archer[];
  checkpoints?: CheckpointConfig[];
}

export type DecodedPacket = DecodedScorePacket | DecodedSetupPacket;

function packScoresToString(scores: Record<number, CPScore>): string {
  let out = '';
  for (let cp = 1; cp <= TOTAL_CHECKPOINTS; cp++) {
    const row = scores[cp] || [null, null, null];
    for (let idx = 0; idx < 3; idx++) {
      const v = row[idx];
      out += v === '8' || v === '5' || v === '3' || v === 'M' ? v : '.';
    }
  }
  return out;
}

function unpackStringToScores(str: string): Record<number, CPScore> {
  const scores = createEmptyScores();
  for (let cp = 1; cp <= TOTAL_CHECKPOINTS; cp++) {
    const base = (cp - 1) * 3;
    const parseChar = (ch: string | undefined): ArrowScore => {
      if (ch === '8' || ch === '5' || ch === '3' || ch === 'M') return ch;
      return null;
    };
    scores[cp] = [parseChar(str[base]), parseChar(str[base + 1]), parseChar(str[base + 2])];
  }
  return scores;
}

function archerToCompact(archer: Archer): CompactArcherRecord {
  return {
    i: archer.id,
    t: archer.tag,
    n: archer.name,
    g: archer.category === 'Wanita' ? 'W' : 'L',
    c: archer.club,
    p: archer.patrol,
    s: packScoresToString(archer.scores),
  };
}

function compactToArcher(rec: CompactArcherRecord, updatedAt: number): Archer {
  return {
    id: rec.i || `arch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tag: rec.t || '',
    name: rec.n || 'Tanpa Nama',
    category: rec.g === 'W' ? 'Wanita' : 'Lelaki',
    club: rec.c || '',
    patrol: Math.min(Math.max(1, Number(rec.p) || 1), TOTAL_CHECKPOINTS),
    scores: unpackStringToScores(rec.s || ''),
    updatedAt,
  };
}

function safeCompress(jsonStr: string): string {
  return LZString.compressToEncodedURIComponent(jsonStr)
    .replace(/\+/g, '.P')
    .replace(/-/g, '.M')
    .replace(/\$/g, '.S');
}

function safeDecompress(encoded: string): string | null {
  const restored = encoded
    .trim()
    .replace(/\.P/g, '+')
    .replace(/\.M/g, '-')
    .replace(/\.S/g, '$');
  return LZString.decompressFromEncodedURIComponent(restored);
}

/**
 * Encodes a Patrol's full scorecard into a compact `KTACR26-SCORE:...` string (~250-350 chars)
 * suitable for instant QR scanning OR pasting into WhatsApp.
 */
export function encodePatrolScorePacket(
  patrolNumber: number,
  captainName: string,
  patrolArchers: Archer[]
): string {
  const payload = {
    v: 1,
    k: 'S',
    p: patrolNumber,
    cp: captainName || '',
    ts: Date.now(),
    a: patrolArchers.map(archerToCompact),
  };
  const compressed = safeCompress(JSON.stringify(payload));
  return `KTACR26-SCORE:${compressed}`;
}

/**
 * Encodes a Patrol's roster + CP instructions for sending from Urusetia to a Patrol Captain
 * via QR code or clickable WhatsApp URL (`#setup=...`).
 */
export function encodePatrolSetupPayload(
  patrolNumber: number,
  captainName: string,
  patrolArchers: Archer[],
  checkpoints: CheckpointConfig[]
): { code: string; shareUrl: string } {
  // Only serialize checkpoints that differ from DEFAULT_CHECKPOINTS so 8-archer QR codes stay ultra-compact!
  const changedCPs = checkpoints
    .filter((item) => {
      const def = DEFAULT_CHECKPOINTS.find((d) => d.cp === item.cp);
      if (!def) return true;
      return (
        def.animal !== item.animal ||
        def.distance !== item.distance ||
        def.instruction !== item.instruction
      );
    })
    .map((item) => [item.cp, item.animal, item.distance, item.instruction]);

  const payload = {
    v: 1,
    k: 'P',
    p: patrolNumber,
    cp: captainName || '',
    a: patrolArchers.map(archerToCompact),
    c: changedCPs,
  };
  const compressed = safeCompress(JSON.stringify(payload));
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  return {
    code: `KTACR26-SETUP:${compressed}`,
    shareUrl: `${baseUrl}#setup=${compressed}`,
  };
}

export function decodeRawSetupCompressed(compressed: string): DecodedSetupPacket | null {
  try {
    const json = safeDecompress(compressed);
    if (!json) return null;
    const data = JSON.parse(json);
    if (!data || data.k !== 'P' || !Array.isArray(data.a)) return null;
    const now = Date.now();

    let checkpoints: CheckpointConfig[] | undefined;
    if (Array.isArray(data.c)) {
      const merged = DEFAULT_CHECKPOINTS.map((d) => ({ ...d }));
      for (const arr of data.c as [number, string, string, string][]) {
        const cpNum = Number(arr[0]);
        const idx = merged.findIndex((m) => m.cp === cpNum);
        if (idx !== -1) {
          merged[idx] = {
            cp: cpNum,
            animal: String(arr[1] || ''),
            distance: String(arr[2] || ''),
            instruction: String(arr[3] || ''),
          };
        }
      }
      checkpoints = merged;
    }

    return {
      type: 'SETUP',
      patrol: Number(data.p) || 1,
      captainName: String(data.cp || ''),
      archers: data.a.map((rec: CompactArcherRecord) => compactToArcher(rec, now)),
      checkpoints,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts and decodes ONE OR MANY `KTACR26-SCORE:...` or `KTACR26-SETUP:...` blocks
 * from arbitrary pasted WhatsApp chat text or QR scan strings!
 */
export function extractAndDecodePackets(rawText: string): DecodedPacket[] {
  const results: DecodedPacket[] = [];
  if (!rawText) return results;

  // Also check if user pasted a `#setup=...` URL directly
  const setupUrlMatch = rawText.match(/#setup=([A-Za-z0-9.+$\-]+)/g);
  if (setupUrlMatch) {
    for (const token of setupUrlMatch) {
      const part = token.replace('#setup=', '');
      const decoded = decodeRawSetupCompressed(part);
      if (decoded) results.push(decoded);
    }
  }

  const regex = /KTACR26-(SCORE|SETUP):([A-Za-z0-9.+$\-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawText)) !== null) {
    const kind = match[1];
    const compressed = match[2];
    try {
      if (kind === 'SETUP') {
        const decoded = decodeRawSetupCompressed(compressed);
        if (decoded) results.push(decoded);
      } else if (kind === 'SCORE') {
        const json = safeDecompress(compressed);
        if (!json) continue;
        const data = JSON.parse(json);
        if (!data || data.k !== 'S' || !Array.isArray(data.a)) continue;
        const ts = Number(data.ts) || Date.now();
        results.push({
          type: 'SCORE',
          patrol: Number(data.p) || 1,
          captainName: String(data.cp || ''),
          timestamp: ts,
          archers: data.a.map((rec: CompactArcherRecord) => compactToArcher(rec, ts)),
        });
      }
    } catch {
      // Skip malformed block and continue
    }
  }

  return results;
}

/**
 * Builds the human-readable + machine-importable WhatsApp Patrol Report for the Captain.
 */
export function buildPatrolWhatsAppMessage(
  patrolNumber: number,
  captainName: string,
  patrolArchers: Archer[]
): string {
  const code = encodePatrolScorePacket(patrolNumber, captainName, patrolArchers);
  const groupCategory = patrolArchers[0]?.category;
  const lines: string[] = [
    `*LAPORAN SKOR KUMPULAN ${String(patrolNumber).padStart(2, '0')}${
      groupCategory ? ` (${groupCategory.toUpperCase()})` : ''
    }*`,
    `_${EVENT_INFO.shortTitle} (KTACR)_`,
    captainName ? `Ketua: *${captainName}*` : `Jumlah Ahli: *${patrolArchers.length} orang*`,
    `────────────────────`,
  ];

  patrolArchers.forEach((archer, idx) => {
    const st = computeArcherStats(archer);
    const catShort = archer.category === 'Wanita' ? 'W' : 'L';
    lines.push(
      `${idx + 1}. *${archer.name}* (${catShort}${archer.tag ? ` • ${archer.tag}` : ''})`,
      `   Mata: *${st.totalPoints}* | 8:${st.count8}  5:${st.count5}  3:${st.count3}  M:${st.countM} (${st.completedCPs}/21 CP)`
    );
  });

  lines.push(
    `────────────────────`,
    `_Salin keseluruhan mesej ini & tampal di Panel Urusetia (Gabung Skor):_`,
    code
  );

  return lines.join('\n');
}

/**
 * Builds an official formatted WhatsApp Results Announcement for Lelaki & Wanita (Top 15).
 */
export function buildOfficialResultsWhatsApp(archers: Archer[]): string {
  const men = rankArchers(archers, 'Lelaki').filter((s) => s.arrowsShot > 0);
  const women = rankArchers(archers, 'Wanita').filter((s) => s.arrowsShot > 0);

  const formatList = (title: string, list: ReturnType<typeof rankArchers>) => {
    const out = [`*${title}*`];
    if (list.length === 0) {
      out.push('_Tiada rekod markah lagi_');
      return out.join('\n');
    }
    list.slice(0, 15).forEach((s) => {
      const medal =
        s.rank === 1
          ? '🥇 '
          : s.rank === 2
          ? '🥈 '
          : s.rank === 3
          ? '🥉 '
          : s.rank <= 15
          ? '🏅 '
          : '';
      out.push(
        `${medal}*#${s.rank} ${s.archer.name}*${s.archer.club ? ` (${s.archer.club})` : ''} — *${s.totalPoints} mata* [8:${s.count8} | 5:${s.count5} | 3:${s.count3}]`
      );
    });
    return out.join('\n');
  };

  return [
    `🏹 *KEPUTUSAN RASMI*`,
    `*${EVENT_INFO.title.toUpperCase()}*`,
    `📅 ${EVENT_INFO.date} | 📍 ${EVENT_INFO.venue}`,
    ``,
    formatList('KATEGORI LELAKI (TOP 15)', men),
    ``,
    formatList('KATEGORI WANITA (TOP 15)', women),
    ``,
    `_"${EVENT_INFO.slogan}"_ — *KTACR*`,
  ].join('\n');
}

/**
 * Parses CSV or pasted participant lines (Excel tab-separated, comma-separated, or pipe-separated).
 * Expected flexible columns: Name, Category (L/W/Lelaki/Wanita), Club (optional), Patrol 1-21 (optional), Tag (optional)
 */
export interface ParsedParticipantRow {
  name: string;
  category: Category;
  club: string;
  patrol: number;
  hasExplicitPatrol: boolean;
  tag: string;
}

export function parseParticipantLines(raw: string): ParsedParticipantRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const parsed: ParsedParticipantRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line
      .split(/\t|,|\||;/)
      .map((p) => p.trim().replace(/^["']|["']$/g, ''));

    if (parts.length === 0 || !parts[0]) continue;

    // Skip obvious CSV header row
    const firstLower = parts[0].toLowerCase();
    if (
      i === 0 &&
      (firstLower === 'nama' ||
        firstLower === 'name' ||
        firstLower === 'nama peserta' ||
        firstLower === 'bil' ||
        firstLower === 'no')
    ) {
      continue;
    }

    // Handle leading numbering column like "1, Ahmad Zaki, L, KTACR, 2"
    let offset = 0;
    if (/^\d+$/.test(parts[0]) && parts.length >= 2 && /[a-zA-Z]/.test(parts[1])) {
      offset = 1;
    }

    const rawName = parts[offset]?.replace(/^\d+[.)]\s*/, '').trim();
    if (!rawName) continue;

    const rawCat = (parts[offset + 1] || 'L').toLowerCase();
    const category: Category =
      rawCat.startsWith('w') ||
      rawCat.startsWith('p') ||
      rawCat.startsWith('f') ||
      rawCat.includes('wanita') ||
      rawCat.includes('perempuan') ||
      rawCat.includes('muslimah')
        ? 'Wanita'
        : 'Lelaki';

    const club = parts[offset + 2] || '';
    const rawPatrolStr = (parts[offset + 3] || '').replace(/[^\d]/g, '');
    const rawPatrol = parseInt(rawPatrolStr, 10);
    const hasExplicitPatrol =
      !isNaN(rawPatrol) && rawPatrol >= 1 && rawPatrol <= TOTAL_CHECKPOINTS;
    const patrol = hasExplicitPatrol ? rawPatrol : 1;
    const tag = parts[offset + 4] || '';

    parsed.push({
      name: rawName,
      category,
      club,
      patrol,
      hasExplicitPatrol,
      tag,
    });
  }

  return parsed;
}

/**
 * Generates UTF-8 BOM CSV of complete official standings + CP1..CP21 scores for Excel / Google Sheets.
 */
export function generateOfficialCSV(archers: Archer[]): string {
  const men = rankArchers(archers, 'Lelaki');
  const women = rankArchers(archers, 'Wanita');
  const allRanked = [...men, ...women];

  const cpHeaders: string[] = [];
  for (let cp = 1; cp <= TOTAL_CHECKPOINTS; cp++) {
    cpHeaders.push(`CP${cp}_Panah`, `CP${cp}_Mata`);
  }

  const headers = [
    'Kategori',
    'Kedudukan',
    'Status_Hadiah',
    'Tag',
    'Nama_Pemanah',
    'Kelab',
    'Kumpulan',
    'CP_Selesai',
    'Jumlah_Mata',
    'Jumlah_8',
    'Jumlah_5',
    'Jumlah_3',
    'Jumlah_M',
    ...cpHeaders,
  ];

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const prizeLabel = (zone: string) => {
    switch (zone) {
      case 'juara':
        return 'JUARA (Piala + Tunai)';
      case 'naib_juara':
        return 'NAIB JUARA (Piala + Tunai)';
      case 'ketiga':
        return 'TEMPAT KE-3 (Piala + Tunai)';
      case 'medal':
        return 'MEDAL (Tempat 4-15)';
      default:
        return '-';
    }
  };

  const rows = allRanked.map((st) => {
    const cpCols: (string | number)[] = [];
    for (let cp = 1; cp <= TOTAL_CHECKPOINTS; cp++) {
      const r = st.archer.scores[cp] || [null, null, null];
      const txt = r.map((x) => x ?? '-').join('/');
      cpCols.push(txt, cpTotalPoints(r));
    }

    return [
      st.archer.category,
      st.rank,
      prizeLabel(st.prizeZone),
      st.archer.tag,
      st.archer.name,
      st.archer.club,
      `Kumpulan ${st.archer.patrol}`,
      `${st.completedCPs}/21`,
      st.totalPoints,
      st.count8,
      st.count5,
      st.count3,
      st.countM,
      ...cpCols,
    ]
      .map(escapeCsv)
      .join(',');
  });

  // Prepend UTF-8 BOM so Microsoft Excel opens Bahasa Melayu & symbols cleanly
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

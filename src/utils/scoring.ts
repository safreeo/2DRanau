import { TOTAL_CHECKPOINTS } from '../constants';
import { Archer, ArcherStanding, ArrowScore, Category, CPScore, PrizeZone } from '../types';

export function arrowNumericValue(score: ArrowScore): number {
  switch (score) {
    case '8':
      return 8;
    case '5':
      return 5;
    case '3':
      return 3;
    case 'M':
    default:
      return 0;
  }
}

const ARROW_SORT_WEIGHT: Record<string, number> = {
  '8': 4,
  '5': 3,
  '3': 2,
  M: 1,
};

export function sortCPArrows(cp: CPScore): CPScore {
  const filled = cp.filter((a): a is Exclude<ArrowScore, null> => a !== null);
  filled.sort((a, b) => (ARROW_SORT_WEIGHT[b] ?? 0) - (ARROW_SORT_WEIGHT[a] ?? 0));
  return [filled[0] ?? null, filled[1] ?? null, filled[2] ?? null];
}

export function cpTotalPoints(cp: CPScore | undefined): number {
  if (!cp) return 0;
  return arrowNumericValue(cp[0]) + arrowNumericValue(cp[1]) + arrowNumericValue(cp[2]);
}

export function isCPComplete(cp: CPScore | undefined): boolean {
  if (!cp) return false;
  return cp[0] !== null && cp[1] !== null && cp[2] !== null;
}

export function isCPPartial(cp: CPScore | undefined): boolean {
  if (!cp) return false;
  const filledCount = cp.filter((a) => a !== null).length;
  return filledCount > 0 && filledCount < 3;
}

export interface ArcherComputedStats {
  totalPoints: number;
  count8: number;
  count5: number;
  count3: number;
  countM: number;
  arrowsShot: number;
  completedCPs: number;
}

export function computeArcherStats(archer: Archer): ArcherComputedStats {
  let totalPoints = 0;
  let count8 = 0;
  let count5 = 0;
  let count3 = 0;
  let countM = 0;
  let arrowsShot = 0;
  let completedCPs = 0;

  for (let cp = 1; cp <= TOTAL_CHECKPOINTS; cp++) {
    const row = archer.scores[cp];
    if (!row) continue;
    let cpFilled = 0;
    for (let i = 0; i < 3; i++) {
      const s = row[i];
      if (s === null || s === undefined) continue;
      cpFilled++;
      arrowsShot++;
      if (s === '8') {
        count8++;
        totalPoints += 8;
      } else if (s === '5') {
        count5++;
        totalPoints += 5;
      } else if (s === '3') {
        count3++;
        totalPoints += 3;
      } else if (s === 'M') {
        countM++;
      }
    }
    if (cpFilled === 3) {
      completedCPs++;
    }
  }

  return {
    totalPoints,
    count8,
    count5,
    count3,
    countM,
    arrowsShot,
    completedCPs,
  };
}

export function getPrizeZone(rank: number, arrowsShot: number): PrizeZone {
  if (arrowsShot === 0) return 'none';
  if (rank === 1) return 'juara';
  if (rank === 2) return 'naib_juara';
  if (rank === 3) return 'ketiga';
  if (rank >= 4 && rank <= 15) return 'medal';
  return 'none';
}

/**
 * Official Ranking Engine
 * Tie-break format: Points -> 8 -> 5 -> 3 (-> Shoot-off override if recorded)
 */
export function rankArchers(archers: Archer[], category?: Category): ArcherStanding[] {
  const filtered = category ? archers.filter((a) => a.category === category) : archers;

  const entries = filtered.map((archer) => ({
    archer,
    ...computeArcherStats(archer),
  }));

  entries.sort((a, b) => {
    // 1. Total Points (descending)
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    // 2. Count of 8s (descending)
    if (b.count8 !== a.count8) return b.count8 - a.count8;
    // 3. Count of 5s (descending)
    if (b.count5 !== a.count5) return b.count5 - a.count5;
    // 4. Count of 3s (descending)
    if (b.count3 !== a.count3) return b.count3 - a.count3;

    // 5. Manual Shoot-Off decision if recorded by Judge
    const soA = a.archer.shootOffRank ?? 999;
    const soB = b.archer.shootOffRank ?? 999;
    if (soA !== soB) return soA - soB;

    // 6. Archers who have shot arrows rank above unstarted archers even at 0 pts
    if (b.arrowsShot !== a.arrowsShot) return b.arrowsShot - a.arrowsShot;

    // 7. Deterministic fallback by tag then name
    const tagCmp = a.archer.tag.localeCompare(b.archer.tag, 'ms', { numeric: true });
    if (tagCmp !== 0) return tagCmp;
    return a.archer.name.localeCompare(b.archer.name, 'ms');
  });

  return entries.map((entry, idx) => {
    const prev = idx > 0 ? entries[idx - 1] : null;
    const next = idx < entries.length - 1 ? entries[idx + 1] : null;

    const sameAs = (other: typeof prev) =>
      Boolean(
        other &&
          entry.arrowsShot > 0 &&
          other.arrowsShot > 0 &&
          entry.totalPoints === other.totalPoints &&
          entry.count8 === other.count8 &&
          entry.count5 === other.count5 &&
          entry.count3 === other.count3 &&
          (entry.archer.shootOffRank ?? null) === (other.archer.shootOffRank ?? null)
      );

    const isExactTie = sameAs(prev) || sameAs(next);
    const rank = idx + 1;

    return {
      ...entry,
      rank,
      isExactTie,
      prizeZone: getPrizeZone(rank, entry.arrowsShot),
    };
  });
}

/**
 * Returns the 21-CP Shotgun Start shooting sequence for a Patrol.
 * e.g. Patrol 5 starts at CP 5 -> 6 -> ... -> 21 -> 1 -> 2 -> 3 -> 4
 */
export function getShotgunOrder(startCP: number): number[] {
  const safeStart = Math.min(Math.max(1, Math.floor(startCP || 1)), TOTAL_CHECKPOINTS);
  const order: number[] = [];
  for (let i = 0; i < TOTAL_CHECKPOINTS; i++) {
    const cp = ((safeStart - 1 + i) % TOTAL_CHECKPOINTS) + 1;
    order.push(cp);
  }
  return order;
}

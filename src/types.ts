export type ArrowScore = '8' | '5' | '3' | 'M' | null;

export type Category = 'Lelaki' | 'Wanita';

export type CPScore = [ArrowScore, ArrowScore, ArrowScore];

export interface CheckpointConfig {
  cp: number; // 1 .. 21
  animal: string;
  distance: string; // e.g. "12m" (7 ~ 20 meter)
  instruction: string;
}

export interface PatrolInfo {
  patrolNumber: number; // 1 .. 21 (No. Kumpulan)
  category?: Category; // 1 kumpulan = 1 kategori sahaja (Lelaki atau Wanita)
  captainName: string;
  submittedAt?: number;
}

export interface Archer {
  id: string;
  tag: string; // e.g. "L01" or "P01-A"
  name: string;
  category: Category;
  club: string;
  patrol: number; // 1 .. 21
  scores: Record<number, CPScore>;
  shootOffRank?: number; // Lower number wins when tied on Points-8-5-3 (e.g. 1 beats 2)
  updatedAt: number;
}

export type PrizeZone = 'juara' | 'naib_juara' | 'ketiga' | 'medal' | 'none';

export interface ArcherStanding {
  archer: Archer;
  rank: number;
  totalPoints: number;
  count8: number;
  count5: number;
  count3: number;
  countM: number;
  arrowsShot: number;
  completedCPs: number;
  isExactTie: boolean;
  prizeZone: PrizeZone;
}

export interface TournamentState {
  version: number;
  isDemoData: boolean;
  activePatrol: number;
  archers: Archer[];
  checkpoints: CheckpointConfig[];
  patrols: Record<number, PatrolInfo>;
}

export type NavTab = 'info' | 'score' | 'leaderboard' | 'admin';

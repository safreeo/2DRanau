import { Archer, ArrowScore, CheckpointConfig, CPScore, PatrolInfo } from './types';

export const TOTAL_CHECKPOINTS = 21;
export const ARROWS_PER_CP = 3;
export const MAX_ARCHERS_PER_GROUP = 8;
export const MAX_ARROWS = TOTAL_CHECKPOINTS * ARROWS_PER_CP; // 63
export const MAX_SCORE = MAX_ARROWS * 8; // 504

export const EVENT_INFO = {
  title: 'Pertandingan Memanah Hunting 2D Ranau 2026',
  shortTitle: 'Hunting 2D Ranau 2026',
  date: '25 Oktober 2026 (Ahad)',
  time: '7.30 Pagi',
  venue: 'Sobou Range, Kampung Lasing, Ranau',
  organizer: 'Kinabalu Traditional Archery Club Ranau (KTACR)',
  organizerShort: 'KTACR',
  fee: 'RM30',
  slogan: 'Kerana Memanah Kita Bersaudara',
  contactName: 'Azmi Mohamad',
  contactRole: 'Pengerusi Kelab KTACR',
  contactPhoneDisplay: '010 360 9336',
  contactWhatsapp: '60103609336',
  categories: ['Lelaki', 'Wanita'] as const,
  checkpoints: 21,
  arrowsPerCP: 3,
  distanceRange: '7 ~ 20 meter',
  scoringMatrix: ['8', '5', '3', 'M'] as const,
  tieBreakText: 'Points - 8 - 5 - 3',
  prizes: [
    { rank: 'Juara', reward: 'Piala + Wang Tunai', badge: '1' },
    { rank: 'Naib Juara', reward: 'Piala + Wang Tunai', badge: '2' },
    { rank: 'Tempat Ketiga', reward: 'Piala + Wang Tunai', badge: '3' },
    { rank: 'Tempat Ke-4 hingga Ke-15', reward: 'Medal Pemenang', badge: '4–15' },
  ],
};

export const DEFAULT_CHECKPOINTS: CheckpointConfig[] = [
  { cp: 1, animal: 'Rusa Sambar', distance: '15m', instruction: 'Berdiri bebas di belakang pancang. Kaki hadapan menyentuh penanda.' },
  { cp: 2, animal: 'Babi Hutan', distance: '11m', instruction: 'Melutut satu lutut di belakang pancang.' },
  { cp: 3, animal: 'Burung Enggang', distance: '9m', instruction: 'Berdiri tegak, memanah melalui ruang celah ranting.' },
  { cp: 4, animal: 'Pelanduk', distance: '7m', instruction: 'Duduk di atas bangku/tunggul yang disediakan.' },
  { cp: 5, animal: 'Kambing Gurun', distance: '18m', instruction: 'Berdiri bebas di belakang garisan pancang (sasaran lereng bukit).' },
  { cp: 6, animal: 'Kijang Borneo', distance: '13m', instruction: 'Berdiri dengan kedua-dua kaki rapat sepanjang 3 panahan.' },
  { cp: 7, animal: 'Babi Hutan Berlari', distance: '14m', instruction: 'Melutut kedua-dua lutut di atas pelapik.' },
  { cp: 8, animal: 'Ayam Hutan', distance: '8m', instruction: 'Bongkok sedikit di bawah palang hadangan.' },
  { cp: 9, animal: 'Beruang Madu', distance: '16m', instruction: 'Berdiri bebas, dilarang memijak garisan penanda.' },
  { cp: 10, animal: 'Rusa Tanduk Besar', distance: '20m', instruction: 'Jarak jauh — berdiri bebas di belakang pancang merah.' },
  { cp: 11, animal: 'Musang Pandan', distance: '9m', instruction: 'Melutut satu lutut, badan condong ke tepi halangan.' },
  { cp: 12, animal: 'Seladang', distance: '19m', instruction: 'Berdiri bebas di belakang pancang.' },
  { cp: 13, animal: 'Landak Raya', distance: '7m', instruction: 'Sasaran kecil jarak dekat — berdiri sebelah kaki di belakang penanda.' },
  { cp: 14, animal: 'Kambing Bukit', distance: '17m', instruction: 'Panahan sudut menurun — berdiri stabil di belakang pancang.' },
  { cp: 15, animal: 'Burung Kuang', distance: '10m', instruction: 'Duduk di atas kerusi/tunggul tanpa mengangkat punggung.' },
  { cp: 16, animal: 'Babi Jantan', distance: '15m', instruction: 'Anak panah 1 berdiri, Anak panah 2 & 3 melutut.' },
  { cp: 17, animal: 'Kancil', distance: '8m', instruction: 'Melutut satu lutut di belakang pancang kuning.' },
  { cp: 18, animal: 'Kerbau Liar', distance: '20m', instruction: 'Berdiri bebas, masa panahan 60 saat bagi 3 anak panah.' },
  { cp: 19, animal: 'Tenggiling / Sasaran Kecil', distance: '10m', instruction: 'Berdiri di belakang garisan, busur condong (canting) dibenarkan.' },
  { cp: 20, animal: 'Harimau Dahan', distance: '16m', instruction: 'Melutut satu lutut di sebalik pelindung kayu.' },
  { cp: 21, animal: 'Rusa Kinabalu (Boss Target)', distance: '18m', instruction: 'CP Terakhir — Berdiri bebas di belakang pancang utama.' },
];

export function createEmptyScores(): Record<number, CPScore> {
  const scores: Record<number, CPScore> = {};
  for (let cp = 1; cp <= TOTAL_CHECKPOINTS; cp++) {
    scores[cp] = [null, null, null];
  }
  return scores;
}

export function createDefaultPatrols(): Record<number, PatrolInfo> {
  const patrols: Record<number, PatrolInfo> = {};
  for (let i = 1; i <= TOTAL_CHECKPOINTS; i++) {
    patrols[i] = {
      patrolNumber: i,
      captainName: '',
    };
  }
  return patrols;
}

// Deterministic helper to generate realistic demo scorecards, optionally skipping specific CPs to demonstrate non-sequential CP scoring
function buildDemoScores(
  pattern: ArrowScore[][],
  skipCPs: number[] = []
): Record<number, CPScore> {
  const scores = createEmptyScores();
  for (let cp = 1; cp <= TOTAL_CHECKPOINTS; cp++) {
    if (skipCPs.includes(cp)) continue;
    const row = pattern[(cp - 1) % pattern.length];
    scores[cp] = [row[0] ?? null, row[1] ?? null, row[2] ?? null];
  }
  return scores;
}

// Helper to craft exact counts of 8, 5, 3, M across 21 CPs (63 arrows) so tie-breaks are 100% verifiable
function buildExactCountScores(c8: number, c5: number, c3: number, cM: number, completedCPs = 21): Record<number, CPScore> {
  const pool: ArrowScore[] = [];
  for (let i = 0; i < c8; i++) pool.push('8');
  for (let i = 0; i < c5; i++) pool.push('5');
  for (let i = 0; i < c3; i++) pool.push('3');
  for (let i = 0; i < cM; i++) pool.push('M');

  const scores = createEmptyScores();
  // Distribute fairly across CPs with deterministic shuffle
  for (let cp = 1; cp <= completedCPs; cp++) {
    const idx1 = ((cp - 1) * 3) % pool.length;
    const idx2 = ((cp - 1) * 3 + 1) % pool.length;
    const idx3 = ((cp - 1) * 3 + 2) % pool.length;
    const raw: ArrowScore[] = [
      (cp - 1) * 3 < pool.length ? pool[idx1] : 'M',
      (cp - 1) * 3 + 1 < pool.length ? pool[idx2] : 'M',
      (cp - 1) * 3 + 2 < pool.length ? pool[idx3] : 'M',
    ];
    const order = { '8': 4, '5': 3, '3': 2, 'M': 1 };
    raw.sort((a, b) => (order[b || 'M'] || 0) - (order[a || 'M'] || 0));
    scores[cp] = [raw[0], raw[1], raw[2]];
  }
  return scores;
}

export function createDemoState(): {
  archers: Archer[];
  patrols: Record<number, PatrolInfo>;
} {
  const now = Date.now();
  const patrols = createDefaultPatrols();
  // 1 Kumpulan = 1 Kategori sahaja (tidak bercampur Lelaki & Wanita)
  patrols[1] = { patrolNumber: 1, category: 'Lelaki', captainName: 'Azlan Shah (Ketua K1)' };
  patrols[2] = { patrolNumber: 2, category: 'Lelaki', captainName: 'Farid Kamilan (Ketua K2)' };
  patrols[3] = { patrolNumber: 3, category: 'Lelaki', captainName: 'Razak Lasing (Ketua K3)' };
  patrols[4] = { patrolNumber: 4, category: 'Wanita', captainName: 'Noraini Daud (Ketua K4)' };
  patrols[5] = { patrolNumber: 5, category: 'Wanita', captainName: 'Siti Nurhaliza (Ketua K5)' };

  // Notice:
  // - Kumpulan 1, 2, 3 = Kategori Lelaki sahaja (maksimum <= 8 orang setiap kumpulan)
  // - Kumpulan 4, 5 = Kategori Wanita sahaja (maksimum <= 8 orang setiap kumpulan)
  // - Kumpulan 1 mempunyai CP 8 & CP 21 belum direkod (19/21 CP) untuk menunjukkan skor boleh direkod/disambung dari mana-mana CP!
  const archers: Archer[] = [
    // --- LELAKI (17 Pemanah diagih dalam Kumpulan 1 [4 org], Kumpulan 2 [6 org], Kumpulan 3 [7 org]) ---
    {
      id: 'demo-l-01',
      tag: 'L01',
      name: 'Mohd Syafiq Bin Majid',
      category: 'Lelaki',
      club: 'KTACR Ranau',
      patrol: 2,
      scores: buildExactCountScores(36, 21, 5, 1, 21), // 408
      updatedAt: now,
    },
    {
      id: 'demo-l-02',
      tag: 'L02',
      name: 'Khairul Anwar Lasing',
      category: 'Lelaki',
      club: 'KTACR Ranau',
      patrol: 2,
      scores: buildExactCountScores(31, 25, 5, 2, 21), // 388 (Tie-break winner via 31x '8')
      updatedAt: now,
    },
    {
      id: 'demo-l-03',
      tag: 'L03',
      name: 'Zulkifli Tambunan',
      category: 'Lelaki',
      club: 'Tambunan Bowhunters',
      patrol: 3,
      scores: buildExactCountScores(28, 31, 3, 1, 21), // 388 (28x '8')
      updatedAt: now,
    },
    {
      id: 'demo-l-04',
      tag: 'L04',
      name: 'Azlan Shah Sulaiman',
      category: 'Lelaki',
      club: 'KTACR Ranau',
      patrol: 1, // Kumpulan 1 Lelaki (CP 8 & CP 21 belum siap)
      scores: buildDemoScores(
        [
          ['8', '8', '5'],
          ['8', '5', '5'],
          ['8', '8', '3'],
          ['8', '5', '3'],
        ],
        [8, 21]
      ),
      updatedAt: now,
    },
    {
      id: 'demo-l-05',
      tag: 'L05',
      name: 'Hafizuddin Kundasang',
      category: 'Lelaki',
      club: 'Kundasang Tradisional',
      patrol: 3,
      scores: buildExactCountScores(27, 26, 8, 2, 21), // 370
      updatedAt: now,
    },
    {
      id: 'demo-l-06',
      tag: 'L06',
      name: 'Rizalman Kota Belud',
      category: 'Lelaki',
      club: 'KB Tradisional',
      patrol: 3,
      scores: buildExactCountScores(25, 28, 7, 3, 21), // 361
      updatedAt: now,
    },
    {
      id: 'demo-l-07',
      tag: 'L07',
      name: 'Firdaus Bin Osman',
      category: 'Lelaki',
      club: 'Kinabalu Archers KK',
      patrol: 1, // Kumpulan 1 Lelaki
      scores: buildDemoScores(
        [
          ['8', '5', '5'],
          ['8', '5', '3'],
          ['5', '5', '3'],
          ['8', '8', '5'],
        ],
        [8, 21]
      ),
      updatedAt: now,
    },
    {
      id: 'demo-l-08',
      tag: 'L08',
      name: 'Amirul Hakim',
      category: 'Lelaki',
      club: 'Keningau Tradisional',
      patrol: 2,
      scores: buildExactCountScores(23, 26, 10, 4, 21), // 344
      updatedAt: now,
    },
    {
      id: 'demo-l-09',
      tag: 'L09',
      name: 'Badrul Hisyam',
      category: 'Lelaki',
      club: 'KTACR Ranau',
      patrol: 2,
      scores: buildExactCountScores(21, 27, 11, 4, 21), // 336
      updatedAt: now,
    },
    {
      id: 'demo-l-10',
      tag: 'L10',
      name: 'Kamarul Zaman',
      category: 'Lelaki',
      club: 'Papar Bowmen',
      patrol: 3,
      scores: buildExactCountScores(20, 27, 11, 5, 21), // 328
      updatedAt: now,
    },
    {
      id: 'demo-l-11',
      tag: 'L11',
      name: 'Ridzuan Sabri',
      category: 'Lelaki',
      club: 'Sandakan Tradisional',
      patrol: 1, // Kumpulan 1 Lelaki
      scores: buildDemoScores(
        [
          ['8', '5', '5'],
          ['5', '5', '3'],
          ['8', '5', '3'],
          ['8', '3', '3'],
        ],
        [8, 21]
      ),
      updatedAt: now,
    },
    {
      id: 'demo-l-12',
      tag: 'L12',
      name: 'Luqmanul Hakim',
      category: 'Lelaki',
      club: 'KTACR Ranau',
      patrol: 1, // Kumpulan 1 Lelaki
      scores: buildDemoScores(
        [
          ['8', '5', '3'],
          ['5', '5', '3'],
          ['8', '3', 'M'],
          ['8', '5', '5'],
        ],
        [8, 21]
      ),
      updatedAt: now,
    },
    {
      id: 'demo-l-13',
      tag: 'L13',
      name: 'Shahrul Nizam',
      category: 'Lelaki',
      club: 'Tuaran Archers',
      patrol: 2,
      scores: buildExactCountScores(17, 25, 14, 7, 21), // 303
      updatedAt: now,
    },
    {
      id: 'demo-l-14',
      tag: 'L14',
      name: 'Hasbullah Jamil',
      category: 'Lelaki',
      club: 'Beaufort Tradisional',
      patrol: 3,
      scores: buildExactCountScores(16, 24, 15, 8, 21), // 293
      updatedAt: now,
    },
    {
      id: 'demo-l-15',
      tag: 'L15',
      name: 'Irfan Danial',
      category: 'Lelaki',
      club: 'Kundasang Tradisional',
      patrol: 3,
      scores: buildExactCountScores(15, 23, 16, 9, 21), // 283 (Medal #15 cutoff)
      updatedAt: now,
    },
    {
      id: 'demo-l-16',
      tag: 'L16',
      name: 'Nazri Harun',
      category: 'Lelaki',
      club: 'KTACR Ranau',
      patrol: 2,
      scores: buildExactCountScores(14, 21, 17, 11, 21), // 268
      updatedAt: now,
    },
    {
      id: 'demo-l-17',
      tag: 'L17',
      name: 'Faizal Ramli',
      category: 'Lelaki',
      club: 'Kota Marudu Archers',
      patrol: 3,
      scores: buildExactCountScores(12, 20, 18, 13, 21), // 250
      updatedAt: now,
    },

    // --- WANITA (6 Pemanah diagih dalam Kumpulan 4 [3 org] & Kumpulan 5 [3 org] — 100% Kategori Wanita) ---
    {
      id: 'demo-w-01',
      tag: 'W01',
      name: 'Siti Nurhaliza Binti Karim',
      category: 'Wanita',
      club: 'KTACR Ranau',
      patrol: 5,
      scores: buildExactCountScores(30, 24, 7, 2, 21), // 381
      updatedAt: now,
    },
    {
      id: 'demo-w-02',
      tag: 'W02',
      name: 'Noraini Binti Daud',
      category: 'Wanita',
      club: 'KTACR Ranau',
      patrol: 4,
      scores: buildExactCountScores(26, 26, 8, 3, 21), // 362
      updatedAt: now,
    },
    {
      id: 'demo-w-03',
      tag: 'W03',
      name: 'Nurul Ain Kundasang',
      category: 'Wanita',
      club: 'Kundasang Tradisional',
      patrol: 4,
      scores: buildExactCountScores(24, 26, 9, 4, 21), // 349
      updatedAt: now,
    },
    {
      id: 'demo-w-04',
      tag: 'W04',
      name: 'Aisyah Humaira',
      category: 'Wanita',
      club: 'Kinabalu Archers KK',
      patrol: 5,
      scores: buildExactCountScores(22, 25, 11, 5, 21), // 334
      updatedAt: now,
    },
    {
      id: 'demo-w-05',
      tag: 'W05',
      name: 'Farah Wahida',
      category: 'Wanita',
      club: 'Tambunan Bowhunters',
      patrol: 4,
      scores: buildExactCountScores(20, 24, 12, 7, 21), // 316
      updatedAt: now,
    },
    {
      id: 'demo-w-06',
      tag: 'W06',
      name: 'Maisarah Zainal',
      category: 'Wanita',
      club: 'KTACR Ranau',
      patrol: 5,
      scores: buildExactCountScores(18, 23, 14, 8, 21), // 301
      updatedAt: now,
    },
  ];

  patrols[2].submittedAt = now - 1200_000;
  patrols[3].submittedAt = now - 900_000;
  patrols[4].submittedAt = now - 600_000;
  patrols[5].submittedAt = now - 300_000;

  return { archers, patrols };
}

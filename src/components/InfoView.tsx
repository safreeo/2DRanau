import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Target,
  Phone,
  ShieldCheck,
  Image as ImageIcon,
  Download,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  WifiOff,
  Compass,
  X,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { EVENT_INFO, MAX_ARCHERS_PER_GROUP, MAX_ARROWS, MAX_SCORE } from '../constants';
import { CheckpointConfig, NavTab } from '../types';

interface InfoViewProps {
  archerCount: number;
  menCount: number;
  womenCount: number;
  isDemoData: boolean;
  checkpoints: CheckpointConfig[];
  canInstallPWA: boolean;
  onInstallPWA: () => void;
  onNavigate: (tab: NavTab) => void;
  onClearDemo: () => void;
}

export const InfoView: React.FC<InfoViewProps> = ({
  archerCount,
  menCount,
  womenCount,
  isDemoData,
  checkpoints,
  canInstallPWA,
  onInstallPWA,
  onNavigate,
  onClearDemo,
}) => {
  const [showPoster, setShowPoster] = useState(false);
  const [showAllCP, setShowAllCP] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  return (
    <div className="space-y-4 pb-6">
      {/* Demo Mode Notice Banner */}
      {isDemoData && (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-xs text-amber-950">
              <span className="font-bold">Mod Data Simulasi (Pra-Tonton) Aktif:</span> {archerCount}{' '}
              pemanah contoh dimuatkan supaya anda boleh terus menguji skor, tie-break & cetakan.
            </div>
          </div>
          <button
            onClick={onClearDemo}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Kosongkan Untuk Hari Pertandingan
          </button>
        </div>
      )}

      {/* Official KTACR Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-kinabalu-950 via-kinabalu-900 to-kinabalu-800 text-white shadow-xl">
        {/* Stylized Mount Kinabalu Peak Silhouette SVG Background */}
        <svg
          viewBox="0 0 800 220"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-36 w-full object-cover opacity-20"
          preserveAspectRatio="none"
        >
          <path
            d="M0,220 L0,155 L95,120 L165,135 L260,72 L310,92 L375,32 L415,55 L455,22 L505,65 L560,50 L645,105 L725,95 L800,140 L800,220 Z"
            fill="#fbbf24"
          />
          <path
            d="M0,220 L0,175 L140,145 L250,165 L385,95 L495,135 L630,120 L800,165 L800,220 Z"
            fill="#040d1f"
          />
        </svg>

        <div className="relative z-10 p-5 sm:p-6">
          {/* Top Status Pill */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-300">
              <WifiOff className="h-3.5 w-3.5" />
              100% Boleh Guna Offline (Tanpa Server)
            </span>

            {canInstallPWA ? (
              <button
                onClick={onInstallPWA}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold text-slate-950 shadow-sm hover:bg-amber-300"
              >
                <Download className="h-3.5 w-3.5" />
                Pasang Aplikasi (PWA)
              </button>
            ) : (
              <button
                onClick={() => setShowIosGuide((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-amber-300 hover:bg-white/15"
              >
                <Download className="h-3 w-3" />
                Cara Simpan ke Skrin Utama
              </button>
            )}
          </div>

          {showIosGuide && (
            <div className="mt-3 rounded-xl border border-white/15 bg-slate-950/60 p-3 text-xs text-slate-200">
              <p className="font-bold text-amber-300">Pasang PWA di Telefon Anda:</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-300">
                <li>
                  <strong>Android (Chrome):</strong> Tekan menu <strong>⋮</strong> di penjuru atas & pilih{' '}
                  <em>&ldquo;Install app&rdquo; / &ldquo;Add to Home screen&rdquo;</em>.
                </li>
                <li>
                  <strong>iPhone (Safari):</strong> Tekan ikon <strong>Share (↑)</strong> di bawah & pilih{' '}
                  <em>&ldquo;Add to Home Screen&rdquo;</em>.
                </li>
              </ul>
            </div>
          )}

          {/* Club Logo + Event Title */}
          <div className="mt-4 flex flex-col items-center text-center sm:flex-row sm:text-left sm:gap-5">
            <img
              src="./images/logo-ktacr.png"
              alt="Logo Kinabalu Traditional Archery Club Ranau"
              className="h-28 w-28 shrink-0 object-contain sm:h-32 sm:w-32"
            />
            <div className="mt-3 sm:mt-0">
              <div className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                Anjuran {EVENT_INFO.organizer}
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                PERTANDINGAN MEMANAH{' '}
                <span className="text-amber-400">HUNTING 2D RANAU 2026</span>
              </h1>
              <p className="mt-1.5 text-sm font-medium italic text-amber-200/90">
                &ldquo;{EVENT_INFO.slogan}&rdquo;
              </p>
            </div>
          </div>

          {/* Primary Quick Action Buttons */}
          <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              onClick={() => onNavigate('score')}
              className="flex items-center justify-between rounded-2xl bg-amber-400 px-4 py-3.5 text-left font-extrabold text-slate-950 shadow-md transition active:scale-[0.99] hover:bg-amber-300"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-amber-400">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black">Mula Skor Kumpulan</div>
                  <div className="text-[11px] font-semibold text-slate-800">
                    Ketua / Pencatat Kumpulan (CP 1–21)
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5" />
            </button>

            <button
              onClick={() => onNavigate('leaderboard')}
              className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 text-left font-bold text-white backdrop-blur-sm transition active:scale-[0.99] hover:bg-white/15"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-extrabold">Papan Keputusan</div>
                  <div className="text-[11px] text-slate-300">
                    Lelaki ({menCount}) • Wanita ({womenCount})
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-amber-300" />
            </button>
          </div>
        </div>

        {/* Traditional Sabahan Geometric Accent Strip */}
        <div className="sabah-motif-bar h-3 w-full" />
      </div>

      {/* Event Details & Poster Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-kinabalu-900">
            Butiran Pertandingan
          </h2>
          <button
            onClick={() => setShowPoster(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-kinabalu-900 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-kinabalu-800"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Lihat Poster Iklan
          </button>
        </div>

        <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
            <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-kinabalu-700" />
            <div>
              <div className="text-[11px] font-semibold uppercase text-slate-500">Tarikh</div>
              <div className="text-sm font-extrabold text-slate-900">{EVENT_INFO.date}</div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-kinabalu-700" />
            <div>
              <div className="text-[11px] font-semibold uppercase text-slate-500">Masa Mula</div>
              <div className="text-sm font-extrabold text-slate-900">{EVENT_INFO.time}</div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-sabahred-600" />
            <div>
              <div className="text-[11px] font-semibold uppercase text-slate-500">Lokasi</div>
              <div className="text-sm font-extrabold text-slate-900">{EVENT_INFO.venue}</div>
            </div>
          </div>
        </div>

        {/* Contact & Registration Info Bar */}
        <div className="mt-3 flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-700">
            <span className="font-bold text-slate-900">Yuran Penyertaan: {EVENT_INFO.fee}</span> •
            Pertanyaan: <span className="font-semibold">{EVENT_INFO.contactName}</span> (
            {EVENT_INFO.contactRole})
          </div>
          <a
            href={`https://wa.me/${EVENT_INFO.contactWhatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <Phone className="h-3.5 w-3.5" />
            WhatsApp {EVENT_INFO.contactPhoneDisplay}
          </a>
        </div>
      </div>

      {/* Format Pertandingan & Scoring Matrix */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-kinabalu-900">
            Format Pertandingan
          </h2>

          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 text-center">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] font-semibold text-slate-500">Kategori</div>
              <div className="mt-0.5 text-sm sm:text-base font-black text-kinabalu-900">
                Lelaki & Wanita
              </div>
            </div>
            <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3">
              <div className="text-[11px] font-semibold text-amber-900">Saiz Kumpulan</div>
              <div className="mt-0.5 text-sm sm:text-base font-black text-kinabalu-950">
                Maks. {MAX_ARCHERS_PER_GROUP} Org (1 Kat.)
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] font-semibold text-slate-500">Checkpoints</div>
              <div className="mt-0.5 text-sm sm:text-base font-black text-kinabalu-900">21 CP</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] font-semibold text-slate-500">Anak Panah / CP</div>
              <div className="mt-0.5 text-sm sm:text-base font-black text-kinabalu-900">
                3 Batang ({MAX_ARROWS})
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 col-span-2 sm:col-span-2">
              <div className="text-[11px] font-semibold text-slate-500">Jarak Sasaran</div>
              <div className="mt-0.5 text-sm sm:text-base font-black text-kinabalu-900">
                7 ~ 20 Meter (2D Haiwan)
              </div>
            </div>
          </div>

          {/* Scoring Matrix */}
          <div className="mt-4">
            <div className="text-xs font-bold text-slate-700">
              Matriks Pemarkahan (Maksimum {MAX_SCORE} Mata):
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl border-2 border-amber-500 bg-amber-400 py-2.5 shadow-sm">
                <div className="text-xl font-black text-amber-950">8</div>
                <div className="text-[10px] font-bold text-amber-900">Zon 8</div>
              </div>
              <div className="rounded-xl border-2 border-red-700 bg-red-600 py-2.5 text-white shadow-sm">
                <div className="text-xl font-black">5</div>
                <div className="text-[10px] font-bold text-red-100">Zon 5</div>
              </div>
              <div className="rounded-xl border-2 border-blue-700 bg-blue-600 py-2.5 text-white shadow-sm">
                <div className="text-xl font-black">3</div>
                <div className="text-[10px] font-bold text-blue-100">Zon 3</div>
              </div>
              <div className="rounded-xl border-2 border-slate-700 bg-slate-600 py-2.5 text-white shadow-sm">
                <div className="text-xl font-black">M</div>
                <div className="text-[10px] font-bold text-slate-200">0 Mata</div>
              </div>
            </div>
          </div>

          {/* Tie-Break Rule */}
          <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-kinabalu-700/20 bg-kinabalu-900/5 px-3 py-2.5 text-xs">
            <ShieldCheck className="h-4 w-4 shrink-0 text-kinabalu-800" />
            <div>
              <span className="font-bold text-kinabalu-900">Penentu Seri (Tie-Break): </span>
              <span className="font-semibold text-slate-700">
                Jumlah Mata → Kiraan 8 → Kiraan 5 → Kiraan 3
              </span>
            </div>
          </div>
        </div>

        {/* Hadiah & Panduan Pantas */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-kinabalu-900">
              Hadiah Setiap Kategori (Lelaki & Wanita)
            </h2>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5">
                <span className="text-xs font-extrabold text-amber-950">🥇 JUARA</span>
                <span className="text-xs font-bold text-amber-800">Piala + Wang Tunai</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2.5">
                <span className="text-xs font-extrabold text-slate-800">🥈 NAIB JUARA</span>
                <span className="text-xs font-bold text-slate-700">Piala + Wang Tunai</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-orange-300 bg-orange-50 px-3.5 py-2.5">
                <span className="text-xs font-extrabold text-orange-950">🥉 TEMPAT KETIGA</span>
                <span className="text-xs font-bold text-orange-800">Piala + Wang Tunai</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                <span className="text-xs font-extrabold text-emerald-950">
                  🏅 TEMPAT KE-4 HINGGA KE-15
                </span>
                <span className="text-xs font-bold text-emerald-800">Medal Pemenang</span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-900 p-3.5 text-xs text-slate-200">
            <div className="font-bold text-amber-400">Aliran Mudah Tanpa Internet di Lapangan:</div>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-slate-300">
              <li>
                <strong>Urusetia</strong> agih peserta mengikut <strong>1 Kumpulan = 1 Kategori</strong>{' '}
                (Lelaki atau Wanita, maks. {MAX_ARCHERS_PER_GROUP} orang).
              </li>
              <li>
                <strong>Ketua Kumpulan</strong> bebas bermula & menyambung rekod skor dari{' '}
                <strong>mana-mana Check Point (CP 1–21)</strong> mengikut arahan penganjur.
              </li>
              <li>
                Tamat semua 21 CP, Ketua tekan <strong>Hantar Skor</strong> (imbas QR di meja
                Urusetia atau WhatsApp) untuk jana <strong>Keputusan Rasmi & PDF</strong>!
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Senarai Arahan 21 Check Point Preview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <button
          onClick={() => setShowAllCP((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-2.5">
            <Compass className="h-5 w-5 text-kinabalu-800" />
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-kinabalu-900">
                Senarai & Arahan 21 Check Point
              </h2>
              <p className="text-xs text-slate-500">
                Setiap check point mempunyai jarak (7m–20m) dan arahan khusus untuk diikuti
              </p>
            </div>
          </div>
          {showAllCP ? (
            <ChevronUp className="h-5 w-5 text-slate-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-500" />
          )}
        </button>

        {showAllCP && (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {checkpoints.map((c) => (
              <div
                key={c.cp}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-kinabalu-900 text-xs font-black text-amber-400">
                  CP{c.cp}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-extrabold text-slate-900">
                      {c.animal}
                    </span>
                    <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                      {c.distance}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">{c.instruction}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Official Poster Lightbox Modal */}
      {showPoster && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
          onClick={() => setShowPoster(false)}
        >
          <div
            className="relative max-h-[92vh] max-w-lg overflow-hidden rounded-2xl bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPoster(false)}
              className="absolute right-3 top-3 z-10 rounded-full bg-slate-950/80 p-2 text-white hover:bg-slate-950"
              aria-label="Tutup Poster"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src="./images/poster-hunting-2d-ranau-2026.jpg"
              alt="Poster Pertandingan Memanah Hunting 2D Ranau 2026"
              className="max-h-[88vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

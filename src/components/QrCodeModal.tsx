import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Share2 } from 'lucide-react';

interface QrCodeModalProps {
  title: string;
  subtitle?: string;
  qrValue: string;
  copyText?: string;
  whatsappText?: string;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  title,
  subtitle,
  qrValue,
  copyText,
  whatsappText,
  onClose,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(qrValue, {
      errorCorrectionLevel: qrValue.length > 480 ? 'L' : 'M',
      margin: 2,
      width: 400,
      color: {
        dark: '#071733',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch((err) => {
        console.error('Gagal menjana kod QR:', err);
      });
    return () => {
      active = false;
    };
  }, [qrValue]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText || qrValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback textarea copy
      const ta = document.createElement('textarea');
      ta.value = copyText || qrValue;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleWhatsApp = () => {
    const text = whatsappText || copyText || qrValue;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between bg-kinabalu-900 px-4 py-3.5 sm:px-5 sm:py-4 text-white">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-amber-400">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-300">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-slate-50 p-3 sm:p-4">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt="Kod QR Kumpulan"
                className="h-56 w-56 sm:h-64 sm:w-64 rounded-lg bg-white p-1.5 shadow-sm"
              />
            ) : (
              <div className="flex h-56 w-56 sm:h-64 sm:w-64 items-center justify-center text-sm text-slate-500">
                Menjana Kod QR...
              </div>
            )}
            <p className="mt-2.5 text-center text-xs font-medium text-slate-600">
              100% Tanpa Internet — Imbas terus dari skrin ini di meja Urusetia / Ketua
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5">
            {whatsappText && (
              <button
                onClick={handleWhatsApp}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm active:scale-[0.99] hover:bg-emerald-700"
              >
                <Share2 className="h-4 w-4" />
                Hantar melalui WhatsApp
              </button>
            )}

            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700">Berjaya Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-600" />
                  <span>Salin Teks / Kod Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

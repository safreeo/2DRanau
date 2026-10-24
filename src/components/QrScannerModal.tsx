import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, ImagePlus, X, AlertCircle } from 'lucide-react';

interface QrScannerModalProps {
  title?: string;
  onResult: (decodedText: string) => void;
  onClose: () => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  title = 'Imbas Kod QR Skor Kumpulan',
  onResult,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(true);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let stopped = false;

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Kamera tidak disokong dalam pelayar ini. Anda boleh pilih gambar/screenshot QR di bawah.'
        );
        setScanning(false);
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          tick();
        }
      } catch {
        setCameraError(
          'Akses kamera tidak dibenarkan atau tiada kamera. Sila benarkan kamera atau muat naik gambar QR.'
        );
        setScanning(false);
      }
    };

    const tick = () => {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code && code.data) {
            stopped = true;
            if (stream) stream.getTracks().forEach((t) => t.stop());
            onResult(code.data);
            return;
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          URL.revokeObjectURL(url);
          onResult(code.data);
          return;
        }
      }
      URL.revokeObjectURL(url);
      setCameraError('Tiada kod QR yang sah ditemui dalam gambar tersebut.');
    };
    img.src = url;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-kinabalu-900 px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-bold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {scanning && !cameraError ? (
            <div className="relative overflow-hidden rounded-xl bg-slate-900 aspect-square">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-52 w-52 rounded-2xl border-2 border-amber-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              </div>
              <div className="absolute inset-x-0 bottom-3 text-center">
                <span className="rounded-full bg-slate-950/80 px-3 py-1 text-xs font-medium text-amber-300">
                  Halakan kamera pada Kod QR di skrin telefon Ketua Kumpulan
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p>{cameraError || 'Kamera dihentikan.'}</p>
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100">
              <ImagePlus className="h-4 w-4 text-kinabalu-700" />
              <span>Pilih Gambar / Screenshot Kod QR</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

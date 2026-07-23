import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RotateCcw, Check, X, Loader2 } from 'lucide-react';

interface SelfieCameraProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export const SelfieCamera: React.FC<SelfieCameraProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user'
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
        };
      }
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Akses kamera ditolak. Harap izinkan akses kamera pada browser/perangkat Anda.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('Kamera tidak ditemukan pada perangkat ini.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Kamera sedang digunakan oleh aplikasi lain.');
      } else {
        setError('Gagal mengakses kamera. Pastikan perangkat Anda memiliki kamera yang aktif.');
      }
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopStream();
  }, [startCamera, stopStream]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror the image horizontally to match preview
    ctx.translate(width, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(video, 0, 0, width, height);

    // Add timestamp overlay
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, height - 50, width, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    const hmStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit'
    }).replace(':', '.');
    const timeStr = `${dateStr} - Pukul ${hmStr}`;
    ctx.fillText(timeStr, width / 2, height - 20);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);

    canvas.toBlob(
      (blob) => {
        if (blob) setCapturedBlob(blob);
      },
      'image/jpeg',
      0.85
    );

    stopStream();
  };

  const handleRetake = async () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    await startCamera();
  };

  const handleConfirm = () => {
    if (capturedBlob) {
      onCapture(capturedBlob);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-school-blue/10 rounded-xl">
              <Camera size={20} className="text-school-blue dark:text-white" />
            </div>
            <h3 className="font-extrabold text-slate-800 dark:text-slate-50 text-lg">Foto Selfie Absensi</h3>
          </div>
          <button
            onClick={() => { stopStream(); onClose(); }}
            className="p-2 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Camera / Preview Area */}
        <div className="p-5 flex flex-col items-center">
          <div className="relative w-full max-w-[320px] aspect-[3/4] rounded-3xl overflow-hidden border-4 border-school-blue/20 shadow-lg shadow-blue-500/10 mb-5 bg-slate-100 dark:bg-slate-800">
            {/* Selalu render video agar referensi (ref) tidak null saat stream siap */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${(!error && !isLoading && !capturedImage) ? 'block' : 'hidden'}`}
              style={{ transform: 'scaleX(-1)' }}
            />
            
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Selfie Preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {isLoading && (
              <div className="absolute inset-0 w-full h-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-3 z-10">
                <Loader2 size={32} className="text-school-blue dark:text-white animate-spin" />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Memuat kamera...</p>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-6 z-20">
                <p className="text-sm text-rose-500 font-medium text-center">{error}</p>
              </div>
            )}

            {/* Overlay border effect */}
            {!error && !isLoading && !capturedImage && (
              <div className="absolute inset-0 rounded-3xl border-4 border-white/20 pointer-events-none z-30" />
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full">
            {error ? (
              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={startCamera}
                  className="w-full bg-school-blue dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 dark:hover:bg-slate-600 text-white py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} /> Coba Lagi
                </button>
                
                {/* Tombol Bypass khusus untuk tahap testing/development */}
                {import.meta.env.DEV && (
                  <button
                    onClick={() => {
                      const canvas = document.createElement('canvas');
                      canvas.width = 640;
                      canvas.height = 640;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.fillStyle = '#e2e8f0';
                        ctx.fillRect(0, 0, 640, 640);
                        ctx.fillStyle = '#64748b';
                        ctx.font = 'bold 32px system-ui';
                        ctx.textAlign = 'center';
                        ctx.fillText('FOTO DUMMY (TESTING)', 320, 320);
                        canvas.toBlob((blob) => { if (blob) onCapture(blob); }, 'image/jpeg');
                      }
                    }}
                    className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    Bypass Tanpa Kamera (Testing)
                  </button>
                )}
              </div>
            ) : capturedImage ? (
              <>
                <button
                  onClick={handleRetake}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} /> Ambil Ulang
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                >
                  <Check size={18} /> Konfirmasi
                </button>
              </>
            ) : (
              <button
                onClick={handleCapture}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-school-blue to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              >
                <Camera size={18} /> Ambil Foto
              </button>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-3 text-center">
            Pastikan wajah Anda terlihat jelas dan pencahayaan cukup
          </p>
        </div>
      </div>
    </div>
  );
};

















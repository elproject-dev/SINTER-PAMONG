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
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
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
    const size = Math.min(video.videoWidth, video.videoHeight);

    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror the image horizontally to match preview, and crop to square
    ctx.translate(size, 0);
    ctx.scale(-1, 1);

    const offsetX = (video.videoWidth - size) / 2;
    const offsetY = (video.videoHeight - size) / 2;
    ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);

    // Add timestamp overlay
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, size - 40, size, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const now = new Date();
    const timeStr = now.toLocaleString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    ctx.fillText(timeStr, size / 2, size - 16);

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
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-school-blue/10 rounded-xl">
              <Camera size={20} className="text-school-blue" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-lg">Foto Selfie Absensi</h3>
          </div>
          <button
            onClick={() => { stopStream(); onClose(); }}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Camera / Preview Area */}
        <div className="p-5 flex flex-col items-center">
          <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-school-blue/20 shadow-lg shadow-blue-500/10 mb-5">
            {error ? (
              <div className="w-full h-full bg-slate-100 flex items-center justify-center p-6">
                <p className="text-sm text-rose-500 font-medium text-center">{error}</p>
              </div>
            ) : isLoading ? (
              <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center gap-3">
                <Loader2 size={32} className="text-school-blue animate-spin" />
                <p className="text-sm text-slate-500 font-medium">Memuat kamera...</p>
              </div>
            ) : capturedImage ? (
              <img
                src={capturedImage}
                alt="Selfie Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            )}

            {/* Overlay ring effect */}
            {!error && !isLoading && !capturedImage && (
              <div className="absolute inset-0 rounded-full border-4 border-white/20 pointer-events-none" />
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full">
            {error ? (
              <button
                onClick={startCamera}
                className="flex-1 bg-school-blue hover:bg-blue-700 text-white py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} /> Coba Lagi
              </button>
            ) : capturedImage ? (
              <>
                <button
                  onClick={handleRetake}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
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

import React, { useState, useEffect, useCallback } from 'react';
import { User, AttendanceRecord } from '../../lib/types';
import { getUserTodayAttendance, saveAttendance, getSchoolSettings, getUserAllAttendance } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { Clock, Calendar, CheckCircle, XCircle, MapPin, Loader2, Camera, List, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useRealtimeSubscription } from '../../lib/useRealtime';
import { SelfieCamera } from '../../components/SelfieCamera';

interface AbsensiProps {
  user: User;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Earth radius in meters
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const Absensi: React.FC<AbsensiProps> = ({ user }) => {
  const [attendance, setAttendance] = useState<AttendanceRecord | undefined>(undefined);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [leaveNote, setLeaveNote] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    const record = await getUserTodayAttendance(user.id);
    setAttendance(record);

    const history = await getUserAllAttendance(user.id);
    setAllRecords(history);

    setIsLoading(false);
  }, [user.id]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useRealtimeSubscription(['data_absensi'], fetchAttendance);

  const uploadSelfie = async (blob: Blob): Promise<string | null> => {

    const dateStr = format(new Date(), 'ddMMMyyyy').toUpperCase();
    const safeName = user.name.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Format nama folder: Hanya nama staff saja
    const folderName = safeName;
    const fileName = `selfie_${dateStr}_${safeName}.JPG`;
    const filePath = `${folderName}/${fileName}`;

    const { error } = await supabase.storage
      .from('selfie_absensi')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) {
      console.error('Error uploading selfie:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('selfie_absensi')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return <span className="px-2.5 py-1 bg-green-500 text-white rounded-full text-xs font-bold shadow-sm">Hadir</span>;
      case 'leave': return <span className="px-2.5 py-1 bg-amber-500 text-white rounded-full text-xs font-bold shadow-sm">Izin</span>;
      case 'sick': return <span className="px-2.5 py-1 bg-amber-500 text-white rounded-full text-xs font-bold shadow-sm">Sakit</span>;
      default: return <span className="px-2.5 py-1 bg-red-500 text-white rounded-full text-xs font-bold shadow-sm">Absen</span>;
    }
  };

  const handleSelfieCapture = (blob: Blob) => {
    setSelfieBlob(blob);
    const previewUrl = URL.createObjectURL(blob);
    setSelfiePreview(previewUrl);
    setShowCamera(false);
  };

  const handleCheckIn = () => {
    if (!selfieBlob) {
      setShowCamera(true);
      return;
    }

    setIsLocating(true);
    setIsUploading(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Browser Anda tidak mendukung fitur lokasi (GPS).');
      setIsLocating(false);
      setIsUploading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const settings = await getSchoolSettings();
        const distance = calculateDistance(latitude, longitude, settings.latitude, settings.longitude);

        if (distance > settings.maxRadius) {
          setLocationError(`Gagal: Anda berjarak ${Math.round(distance)} meter dari sekolah. (Lokasi Anda: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}). Maksimal radius adalah ${settings.maxRadius} meter.`);
          setIsLocating(false);
          setIsUploading(false);
          return;
        }

        // Upload selfie
        const selfieUrl = await uploadSelfie(selfieBlob);
        if (!selfieUrl) {
          setLocationError('Gagal mengunggah foto selfie. Silakan coba lagi.');
          setIsLocating(false);
          setIsUploading(false);
          return;
        }

        const record: AttendanceRecord = {
          id: crypto.randomUUID(),
          userId: user.id,
          date: new Date().toISOString().split('T')[0],
          checkIn: new Date().toISOString(),
          status: 'present',
          latitude: latitude,
          longitude: longitude,
          selfieUrl: selfieUrl
        };
        saveAttendance(record).then(() => {
          setAttendance(record);
          setIsLocating(false);
          setIsUploading(false);
          setSelfieBlob(null);
          if (selfiePreview) URL.revokeObjectURL(selfiePreview);
          setSelfiePreview(null);
        });
      },
      (error) => {
        let errorMsg = 'Gagal mendapatkan lokasi.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Akses lokasi ditolak. Harap izinkan akses lokasi (GPS) pada browser Anda.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Informasi lokasi tidak tersedia saat ini.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Waktu permintaan lokasi habis.';
        }
        setLocationError(errorMsg);
        setIsLocating(false);
        setIsUploading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCheckOut = async () => {
    if (attendance) {
      const updatedRecord = {
        ...attendance,
        checkOut: new Date().toISOString()
      };
      await saveAttendance(updatedRecord);
      setAttendance(updatedRecord);
    }
  };

  const handleLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveNote.trim()) return;

    const record: AttendanceRecord = {
      id: crypto.randomUUID(),
      userId: user.id,
      date: new Date().toISOString().split('T')[0],
      status: 'leave',
      note: leaveNote
    };
    await saveAttendance(record);
    setAttendance(record);
    setLeaveNote('');
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 dark:text-slate-50 tracking-tight mb-1 sm:mb-2">Absensi</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base lg:text-lg">Catat absensi harian dan ajukan perizinan</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 sm:p-6 hover:shadow-md transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-50 tracking-tight">Status Kehadiran</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center font-medium bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
            <Calendar className="mr-1.5 text-school-blue dark:text-white" size={16} />
            {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 size={40} className="text-school-blue dark:text-white animate-spin" />
            <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Memeriksa status kehadiran Anda...</p>
          </div>
        ) : !attendance ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-2 -mr-2 w-24 h-24 bg-white dark:bg-slate-800 opacity-40 rounded-full blur-xl"></div>
              <h3 className="font-bold text-slate-800 dark:text-slate-50 text-base mb-3 relative z-10">Absen Reguler</h3>

              {locationError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg mb-3 text-xs flex items-start relative z-10">
                  <MapPin size={16} className="mr-1.5 shrink-0" />
                  <p className="font-medium">{locationError}</p>
                </div>
              )}

              {/* Selfie Preview */}
              {selfiePreview && (
                <div className="relative z-10 mb-3 flex flex-col items-center gap-1.5">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-200 shadow-md shadow-emerald-500/10">
                    <img src={selfiePreview} alt="Selfie Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle size={12} />
                    <span className="text-[10px] font-bold">Foto siap</span>
                  </div>
                  <button
                    onClick={() => { setSelfieBlob(null); if (selfiePreview) URL.revokeObjectURL(selfiePreview); setSelfiePreview(null); setShowCamera(true); }}
                    className="text-[10px] font-semibold text-school-blue dark:text-white hover:text-blue-700 dark:hover:text-slate-300 underline underline-offset-2 transition-colors"
                  >
                    Ulang
                  </button>
                </div>
              )}

              <button
                onClick={handleCheckIn}
                disabled={isLocating || isUploading}
                className="relative z-10 w-full bg-gradient-to-r from-school-blue to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center space-x-2 shadow-sm shadow-blue-500/20 hover:shadow-blue-500/30 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {isLocating || isUploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{isUploading ? 'Mengunggah...' : 'Mencari Lokasi...'}</span>
                  </>
                ) : selfieBlob ? (
                  <>
                    <Clock size={18} className="animate-pulse" />
                    <span>Absen Masuk Sekarang</span>
                  </>
                ) : (
                  <>
                    <Camera size={18} />
                    <span>Ambil Selfie & Absen</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-slate-50 text-base mb-3">Pengajuan Izin/Sakit</h3>
              <form onSubmit={handleLeaveRequest} className="space-y-3">
                <textarea
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  placeholder="Tulis alasan singkat..."
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 rounded-lg p-3 h-20 text-sm resize-none focus:ring-1 focus:ring-school-blue focus:border-school-blue outline-none shadow-sm transition-all text-slate-700 dark:text-slate-200"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/50 text-slate-600 dark:text-slate-300 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
                >
                  Ajukan
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 sm:p-6 border border-emerald-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-24 h-24 bg-white dark:bg-slate-800 opacity-40 rounded-full blur-xl"></div>
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3 sm:gap-0">
              <div className="text-center sm:text-left">
                <p className="text-xs font-semibold text-emerald-600/80 uppercase tracking-widest mb-1">Status Hari Ini</p>
                <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-2 sm:space-y-0 sm:space-x-3 mt-1">
                  {attendance.selfieUrl ? (
                    <div className="hidden sm:block w-10 h-10 rounded-full overflow-hidden border border-emerald-300 shadow-sm shrink-0">
                      <img src={attendance.selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                    </div>
                  ) : attendance.status === 'present' ? (
                    <div className="bg-emerald-100 p-1.5 rounded-full text-emerald-600">
                      <CheckCircle size={20} />
                    </div>
                  ) : (
                    <div className="bg-amber-100 dark:bg-amber-900/60 p-1.5 rounded-full text-amber-600">
                      <XCircle size={20} />
                    </div>
                  )}
                  <span className="text-xl font-bold capitalize text-slate-800 dark:text-slate-50">
                    {attendance.status === 'present' ? 'Hadir & Aktif' : 'Izin/Sakit'}
                  </span>
                </div>
              </div>
              {attendance.status === 'present' && !attendance.checkOut && (
                <button
                  onClick={handleCheckOut}
                  className="bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm shadow-red-500/20 w-full sm:w-auto hover:shadow-red-500/30"
                >
                  Absen Keluar
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 text-xs sm:text-sm relative z-10 bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-emerald-100/50">
              {attendance.selfieUrl && (
                <div className="flex justify-center pb-2 border-b border-emerald-100">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-200 shadow-sm">
                    <img src={attendance.selfieUrl} alt="Foto Selfie Absensi" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              <div className="flex justify-between items-start">
                {attendance.checkIn && (
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Waktu Masuk</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-50 mt-0.5">
                      {format(new Date(attendance.checkIn), 'HH:mm')} WIB
                    </p>
                  </div>
                )}
                {attendance.checkOut && (
                  <div className="text-right">
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Waktu Keluar</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-50 mt-0.5">
                      {format(new Date(attendance.checkOut), 'HH:mm')} WIB
                    </p>
                  </div>
                )}
              </div>
              {attendance.note && (
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Catatan</p>
                  <p className="font-medium text-slate-800 dark:text-slate-50 mt-0.5">{attendance.note}</p>
                </div>
              )}
              {attendance.latitude && attendance.longitude && (
                <div className="flex items-center justify-between border-t border-emerald-100/60 pt-2 mt-1">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-semibold">Lokasi</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200 text-[10px]">
                      {attendance.latitude.toFixed(5)}, {attendance.longitude.toFixed(5)}
                    </p>
                  </div>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${attendance.latitude},${attendance.longitude}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors"
                  >
                    Buka Map
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mt-8">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center space-x-2 bg-white dark:bg-slate-800">
          <List size={20} className="text-slate-600 dark:text-slate-300" />
          <h2 className="font-bold text-slate-800 dark:text-slate-50 text-lg">Riwayat Kehadiran Anda</h2>
        </div>
        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="w-full text-left border-collapse min-w-[900px] hidden xl:table">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 w-12 text-center">NO</th>
                <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 w-36 text-center">TANGGAL</th>
                <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700">NAMA LENGKAP</th>
                <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700">PROFESI / JABATAN</th>
                <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center">STATUS</th>
                <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-28">JAM MASUK</th>
                <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-28">JAM KELUAR</th>
                <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 w-64">CATATAN</th>
                <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-20">FOTO</th>
                <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center">LOKASI (GPS)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-center mb-3 text-school-blue dark:text-white">
                      <Loader2 size={32} className="animate-spin" />
                    </div>
                    <p className="font-bold text-lg text-slate-600 dark:text-slate-300 mb-1">Memuat Data...</p>
                  </td>
                </tr>
              ) : allRecords.length > 0 ? (
                allRecords.map((record, index) => (
                  <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 text-center">
                      {format(new Date(record.date), 'dd MMM yyyy', { locale: id })}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm">
                      <div className="font-bold text-school-blue dark:text-white">{user.name}</div>
                    </td>
                    <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
                      {user.position || <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center text-sm text-slate-600 dark:text-slate-300">
                      {record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '-'}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center text-sm text-slate-600 dark:text-slate-300">
                      {record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '-'}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={record.note}>
                      {record.note || '-'}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                      {record.selfieUrl ? (
                        <a
                          href={record.selfieUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-school-blue dark:text-white hover:text-blue-700 dark:hover:text-slate-300 hover:underline font-bold text-sm"
                          title="Lihat Foto Selfie di Tab Baru"
                        >
                          Lihat
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                      {record.latitude && record.longitude ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${record.latitude},${record.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs font-bold text-white bg-[#00bcd4] hover:bg-cyan-500 px-3 py-1.5 rounded-md transition-colors shadow-sm"
                        >
                          <Eye size={14} className="mr-1.5" /> Lihat
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    Belum ada data riwayat absensi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="xl:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <div className="flex justify-center mb-3 text-school-blue dark:text-white">
                  <Loader2 size={32} className="animate-spin" />
                </div>
                <p className="font-bold text-lg text-slate-600 dark:text-slate-300 mb-1">Memuat Data...</p>
              </div>
            ) : allRecords.length > 0 ? (
              allRecords.map(record => (
                <div key={record.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 mb-0.5">{format(new Date(record.date), 'dd MMM yyyy', { locale: id })}</span>
                        <h3 className="font-extrabold text-school-blue dark:text-white text-base">{user.name}</h3>
                        {user.position && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{user.position}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(record.status)}
                    </div>
                  </div>

                  <div className="text-sm flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Jam Masuk</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Jam Keluar</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '-'}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center mt-1">
                    <div className="text-xs text-slate-500 dark:text-slate-400 italic max-w-[50%] truncate">
                      {record.note ? `Catatan: ${record.note}` : 'Tidak ada catatan'}
                    </div>
                    <div className="flex items-center gap-3">
                      {record.selfieUrl && (
                        <a
                          href={record.selfieUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-school-blue dark:text-white hover:text-blue-700 dark:hover:text-slate-300 hover:underline text-xs font-bold"
                        >
                          Lihat Foto
                        </a>
                      )}
                      {record.latitude && record.longitude ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${record.latitude},${record.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs font-bold text-white bg-[#00bcd4] hover:bg-cyan-500 px-3 py-1.5 rounded-md transition-colors shadow-sm"
                        >
                          <MapPin size={14} className="mr-1.5" /> Lokasi
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">Tanpa GPS</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <div className="flex justify-center mb-2 text-slate-300">
                  <List size={32} />
                </div>
                Belum ada data riwayat absensi.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selfie Camera Modal */}
      {showCamera && (
        <SelfieCamera
          onCapture={handleSelfieCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};


















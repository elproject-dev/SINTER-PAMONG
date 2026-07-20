import React, { useState, useEffect, useCallback } from 'react';
import { User, AttendanceRecord } from '../../lib/types';
import { getUserTodayAttendance, saveAttendance, getSchoolSettings } from '../../lib/db';
import { Clock, Calendar, CheckCircle, XCircle, MapPin, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useRealtimeSubscription } from '../../lib/useRealtime';

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
  const [isLoading, setIsLoading] = useState(true);
  const [leaveNote, setLeaveNote] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  
  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    const record = await getUserTodayAttendance(user.id);
    setAttendance(record);
    setIsLoading(false);
  }, [user.id]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useRealtimeSubscription(['data_absensi'], fetchAttendance);

  const handleCheckIn = () => {
    setIsLocating(true);
    setLocationError('');
    
    if (!navigator.geolocation) {
      setLocationError('Browser Anda tidak mendukung fitur lokasi (GPS).');
      setIsLocating(false);
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
          return;
        }

        const record: AttendanceRecord = {
          id: crypto.randomUUID(),
          userId: user.id,
          date: new Date().toISOString().split('T')[0],
          checkIn: new Date().toISOString(),
          status: 'present',
          latitude: latitude,
          longitude: longitude
        };
        saveAttendance(record).then(() => {
          setAttendance(record);
          setIsLocating(false);
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
    <div className="w-full space-y-6 sm:space-y-10">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-800 mb-2 tracking-tight">Absensi</h1>
        <p className="text-slate-500 text-lg">Catat absensi harian dan ajukan perizinan</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 sm:p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Status Kehadiran</h2>
          <p className="text-sm sm:text-base text-slate-500 flex items-center font-medium bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            <Calendar className="mr-2 text-school-blue" size={18} />
            {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 size={40} className="text-school-blue animate-spin" />
            <p className="text-slate-500 font-medium animate-pulse">Memeriksa status kehadiran Anda...</p>
          </div>
        ) : !attendance ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 sm:p-6 rounded-3xl border border-blue-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-40 rounded-full blur-2xl"></div>
              <h3 className="font-bold text-slate-800 text-lg mb-6 relative z-10">Absen Reguler</h3>
              
              {locationError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-start animate-in fade-in relative z-10">
                  <MapPin size={18} className="mr-2 mt-0.5 shrink-0" />
                  <p className="font-medium">{locationError}</p>
                </div>
              )}
              
              <button
                onClick={handleCheckIn}
                disabled={isLocating}
                className="relative z-10 w-full bg-gradient-to-r from-school-blue to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center space-x-3 shadow-lg shadow-blue-500/30 hover:-translate-y-1 hover:shadow-blue-500/50 disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed"
              >
                {isLocating ? (
                  <>
                    <Loader2 size={22} className="animate-spin" />
                    <span className="text-lg tracking-wide">Mencari Lokasi...</span>
                  </>
                ) : (
                  <>
                    <Clock size={22} className="animate-pulse" />
                    <span className="text-lg tracking-wide">Absen Masuk Sekarang</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 text-lg mb-4">Pengajuan Izin / Sakit</h3>
              <form onSubmit={handleLeaveRequest} className="space-y-4">
                <textarea
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  placeholder="Tulis alasan izin atau sakit secara singkat..."
                  className="w-full bg-white border border-slate-300 rounded-2xl p-4 h-24 resize-none focus:ring-2 focus:ring-school-blue focus:border-school-blue outline-none shadow-sm transition-all text-slate-700"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-white border-2 border-slate-200 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50 text-slate-600 py-3.5 rounded-2xl font-bold transition-all shadow-sm"
                >
                  Ajukan Izin/Sakit
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-40 rounded-full blur-2xl"></div>
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 sm:gap-0">
              <div className="text-center sm:text-left">
                <p className="text-sm font-medium text-emerald-600/80 uppercase tracking-widest mb-1">Status Hari Ini</p>
                <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-2 sm:space-y-0 sm:space-x-3 mt-1">
                  {attendance.status === 'present' ? (
                    <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                      <CheckCircle size={28} />
                    </div>
                  ) : (
                    <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                      <XCircle size={28} />
                    </div>
                  )}
                  <span className="text-2xl sm:text-3xl font-extrabold capitalize text-slate-800">
                    {attendance.status === 'present' ? 'Hadir & Aktif' : 'Izin/Sakit'}
                  </span>
                </div>
              </div>
              {attendance.status === 'present' && !attendance.checkOut && (
                <button
                  onClick={handleCheckOut}
                  className="bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-red-500/30 w-full sm:w-auto hover:-translate-y-1 hover:shadow-red-500/50"
                >
                  Absen Keluar
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm relative z-10 bg-white/40 p-4 rounded-2xl">
              {attendance.checkIn && (
                <div>
                  <p className="text-slate-500">Waktu Masuk</p>
                  <p className="font-medium text-slate-800">
                    {format(new Date(attendance.checkIn), 'HH:mm')} WIB
                  </p>
                </div>
              )}
              {attendance.checkOut && (
                <div>
                  <p className="text-slate-500">Waktu Keluar</p>
                  <p className="font-medium text-slate-800">
                    {format(new Date(attendance.checkOut), 'HH:mm')} WIB
                  </p>
                </div>
              )}
              {attendance.note && (
                <div className="col-span-2">
                  <p className="text-slate-500">Catatan</p>
                  <p className="font-medium text-slate-800">{attendance.note}</p>
                </div>
              )}
              {attendance.latitude && attendance.longitude && (
                <div className="col-span-2 flex items-center justify-between border-t border-emerald-100 pt-3 mt-1">
                  <div>
                    <p className="text-slate-500 text-xs">Lokasi Tersimpan</p>
                    <p className="font-medium text-slate-800 text-xs">
                      {attendance.latitude.toFixed(6)}, {attendance.longitude.toFixed(6)}
                    </p>
                  </div>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${attendance.latitude},${attendance.longitude}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                  >
                    Buka Map
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

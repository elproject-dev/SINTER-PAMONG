import React, { useState, useEffect, useCallback } from 'react';
import { User, TaskReport, AttendanceRecord } from '../../lib/types';
import { getUserTaskReports, getUserMonthlyAttendance } from '../../lib/db';
import { Clock, CheckCircle, XCircle, ClipboardList } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';
import { StarRating } from '../../components/StarRating';
import { useProfilePic } from '../../hooks/useProfilePic';
import { ProfileModal } from '../../components/ProfileModal';

import { useRealtimeSubscription } from '../../lib/useRealtime';

interface StaffDashboardProps {
  user: User;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ user }) => {
  const [taskReports, setTaskReports] = useState<TaskReport[]>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<AttendanceRecord[]>([]);

  const {
    profilePic,
    isUploadingPic,
    isProfileOpen,
    setIsProfileOpen,
    handleProfilePicChange
  } = useProfilePic(user.id, user.name);

  const fetchData = useCallback(async () => {
    const [reports, attData] = await Promise.all([
      getUserTaskReports(user.id),
      getUserMonthlyAttendance(user.id)
    ]);

    setTaskReports(reports);
    setMonthlyAttendance(attData);
  }, [user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeSubscription(['data_absensi', 'penilaian_tugas'], fetchData);

  // Calculate task report stats
  const totalLampiranTugas = taskReports.reduce((sum, r) => sum + (r.totalUpdates || 0), 0);
  const totalMenunggu = taskReports.reduce((sum, r) => sum + (r.totalMenunggu || 0), 0);
  const totalDisetujui = taskReports.reduce((sum, r) => sum + (r.totalDisetujui || 0), 0);
  const totalDitolak = taskReports.reduce((sum, r) => sum + (r.totalDitolak || 0), 0);

  // Calculate monthly attendance stats
  const totalMasuk = monthlyAttendance.filter(a => a.status === 'present').length;
  const totalIzin = monthlyAttendance.filter(a => a.status === 'leave' || a.status === 'sick').length;
  const totalTercatat = totalMasuk + totalIzin;

  // Calculate task star rating
  const gradedTasks = taskReports.filter(r => (r.averageScore ?? r.score) != null && (r.averageScore ?? r.score)! > 0);
  const overallScore = gradedTasks.reduce((sum, r) => sum + ((r.averageScore ?? r.score) || 0), 0);
  const averageAllTasks = gradedTasks.length > 0 ? overallScore / gradedTasks.length : 0;
  const starRating = averageAllTasks.toFixed(1);

  const StatCard = ({ title, value, icon, gradientClass, subtitle, to, className = '' }: any) => {
    const CardContent = (
      <div className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${gradientClass} text-white border border-white/20 h-full`}>
        <div className="absolute top-0 right-0 -mt-3 -mr-3 w-24 h-24 bg-white dark:bg-slate-800 opacity-[0.15] rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black opacity-[0.05] rounded-full blur-xl"></div>
        <div className="relative z-10">
          <div className="absolute top-0 right-0 p-1.5 rounded-xl bg-white/20 dark:bg-slate-800/20 backdrop-blur-md border border-white/30 shadow-sm">
            {React.cloneElement(icon, { size: 16, className: 'text-white' })}
          </div>
          <p className="text-white/90 font-bold text-[10px] sm:text-[11px] uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-black mt-1.5 tracking-tight drop-shadow-sm truncate">{value}</h3>
          <p className="text-white/80 text-[10px] sm:text-[11px] mt-1.5 truncate font-medium">{subtitle}</p>
        </div>
      </div>
    );

    return to ? <Link to={to} className={`block h-full cursor-pointer ${className}`}>{CardContent}</Link> : <div className={`h-full ${className}`}>{CardContent}</div>;
  };

  return (
    <div className="w-full space-y-6 sm:space-y-10 overflow-x-clip pb-8">

      <div className="flex items-stretch justify-between gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 dark:text-slate-50 tracking-tight mb-1 sm:mb-2 truncate">Dashboard Staf</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base lg:text-lg truncate">Ringkasan informasi dan aktivitas Anda hari ini</p>
        </div>

        <div className="shrink-0 flex items-center justify-end relative">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="relative inline-flex items-center justify-center shrink-0 border-0 bg-transparent p-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-school-blue focus:ring-offset-2 rounded-full transition-transform hover:scale-105 w-12 h-12 sm:w-14 sm:h-14 mr-2 sm:mr-4"
            title="Profil Pengguna & Live Update"
          >
            <div className="absolute inset-0.5 sm:inset-1 rounded-full animate-ping opacity-50 bg-emerald-400"></div>

            <div className="relative z-10 w-full h-full rounded-full flex flex-col items-center justify-center text-base sm:text-lg font-bold shadow-md border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <img src={profilePic || `${import.meta.env.BASE_URL}check.png`} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `${import.meta.env.BASE_URL}check.png`; }} />
            </div>
          </button>

          <ProfileModal 
            user={user}
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            profilePic={profilePic}
            isUploadingPic={isUploadingPic}
            onProfilePicChange={handleProfilePicChange}
          />
        </div>
      </div>



      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Total Lampiran"
          value={totalLampiranTugas}
          subtitle="Semua dokumen lampiran"
          icon={<ClipboardList />}
          gradientClass="bg-gradient-to-tr from-emerald-500 via-green-500 to-teal-400"
          to="/staff/daftar-tugas"
        />
        <StatCard
          title="Total Tugas"
          value={taskReports.length}
          subtitle="Tugas keseluruhan"
          icon={<ClipboardList />}
          gradientClass="bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600"
          to="/staff/daftar-tugas"
          className="hidden xl:block"
        />
        <StatCard
          title="Disetujui"
          value={totalDisetujui}
          subtitle="Lampiran selesai"
          icon={<CheckCircle />}
          gradientClass="bg-gradient-to-tr from-sky-500 via-cyan-500 to-teal-400"
          to="/staff/daftar-tugas"
        />
        <StatCard
          title="Menunggu"
          value={totalMenunggu}
          subtitle="Belum direview"
          icon={<Clock />}
          gradientClass="bg-gradient-to-tr from-amber-500 via-orange-400 to-yellow-400"
          to="/staff/daftar-tugas"
        />
        <StatCard
          title="Ditolak"
          value={totalDitolak}
          subtitle="Perlu perbaikan"
          icon={<XCircle />}
          gradientClass="bg-gradient-to-tr from-rose-500 via-pink-500 to-red-400"
          to="/staff/daftar-tugas"
        />
      </div>

      {/* Distribusi Kehadiran Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:gap-8 items-center">
          <div className="w-full sm:w-1/2 flex flex-col items-center sm:items-start h-full">
            <h3 className="text-slate-600 dark:text-slate-300 font-medium mb-4 sm:mb-6 text-center sm:text-left w-full">Distribusi Total Kehadiran</h3>
            <div className="w-full h-48 sm:h-56 relative flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="gradMasuk" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                    <linearGradient id="gradIzin" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                    <linearGradient id="gradKosong" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#cbd5e1" />
                      <stop offset="100%" stopColor="#e2e8f0" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={totalTercatat === 0 ? [
                      { name: 'Belum Ada Data', value: 1, color: 'url(#gradKosong)' }
                    ] : [
                      { name: 'Hadir', value: totalMasuk, color: 'url(#gradMasuk)' },
                      { name: 'Izin/Sakit', value: totalIzin, color: 'url(#gradIzin)' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    dataKey="value"
                    stroke="none"
                  >
                    {(totalTercatat === 0 ? [
                      { color: 'url(#gradKosong)' }
                    ] : [
                      { color: 'url(#gradMasuk)' },
                      { color: 'url(#gradIzin)' }
                    ]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="w-full sm:w-1/2 space-y-4">
            <div>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-1 text-center sm:text-left">Total Absensi</p>
            <div className="flex items-center justify-between w-full mt-2 border-b border-dashed border-slate-200 dark:border-slate-700 pb-4">
              <span className="text-slate-800 dark:text-slate-50 text-3xl font-bold leading-none">{totalTercatat}</span>
              <span className="text-slate-400 font-medium text-lg mt-1">Hari</span>
            </div>
          </div>
            <div className="pt-4 space-y-4">
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-500 to-green-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Masuk (Hadir)</span>
                <span className="font-bold text-emerald-500">{totalMasuk}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div> Izin / Sakit</span>
                <span className="font-bold text-amber-500">{totalIzin}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Distribusi Status Tugas Chart Section */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:gap-8 items-center">
          <div className="w-full sm:w-1/2 flex flex-col items-center sm:items-start h-full">
            <h3 className="text-slate-600 dark:text-slate-300 font-medium mb-4 sm:mb-6 text-center sm:text-left w-full">Distribusi Status Tugas</h3>
            <div className="w-full h-48 sm:h-56 relative flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="gradSelesai" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0ea5e9" />
                      <stop offset="100%" stopColor="#2dd4bf" />
                    </linearGradient>
                    <linearGradient id="gradMenungguTugas" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                    <linearGradient id="gradDitolak" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#fb7185" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={(totalDisetujui + totalMenunggu + totalDitolak) === 0 ? [
                      { name: 'Belum Ada Data', value: 1, color: 'url(#gradKosong)' }
                    ] : [
                      { name: 'Sudah Dinilai', value: totalDisetujui, color: 'url(#gradSelesai)' },
                      { name: 'Menunggu', value: totalMenunggu, color: 'url(#gradMenungguTugas)' },
                      { name: 'Ditolak', value: totalDitolak, color: 'url(#gradDitolak)' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    dataKey="value"
                    stroke="none"
                  >
                    {((totalDisetujui + totalMenunggu + totalDitolak) === 0 ? [
                      { color: 'url(#gradKosong)' }
                    ] : [
                      { color: 'url(#gradSelesai)' },
                      { color: 'url(#gradMenungguTugas)' },
                      { color: 'url(#gradDitolak)' }
                    ]).map((entry, index) => (
                      <Cell key={`cell-tugas-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="w-full sm:w-1/2 space-y-4">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-1 text-center sm:text-left">Nilai Bintang</p>
              <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
                <span className="text-slate-800 dark:text-slate-50 text-3xl font-bold leading-none">{starRating}</span>
                <StarRating score={averageAllTasks} size={26} className="flex items-center gap-1" />
              </div>
            </div>
            <div className="pt-4 space-y-4">
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-sky-500 to-teal-400 shadow-[0_0_8px_rgba(14,165,233,0.5)]"></div> Sudah Dinilai</span>
                <span className="font-bold text-sky-500">{totalDisetujui}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div> Menunggu</span>
                <span className="font-bold text-amber-500">{totalMenunggu}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-rose-500 to-pink-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div> Ditolak</span>
                <span className="font-bold text-rose-500">{totalDitolak}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};


















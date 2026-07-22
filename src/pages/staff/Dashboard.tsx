import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, TaskReport, AttendanceRecord } from '../../lib/types';
import { getUserTaskReports, uploadProfilePicture, getUserMonthlyAttendance } from '../../lib/db';
import { Clock, CheckCircle, XCircle, ClipboardList, User as UserIcon, X, Camera, Loader2, LogOut } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';
import { StarRating } from '../../components/StarRating';
import { BiHappyBeaming } from "react-icons/bi";
import { useRealtimeSubscription } from '../../lib/useRealtime';
import { supabase } from '../../lib/supabase';

interface StaffDashboardProps {
  user: User;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ user }) => {
  const [taskReports, setTaskReports] = useState<TaskReport[]>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<AttendanceRecord[]>([]);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    const savedPic = localStorage.getItem(`profile_pic_${user.id}`);
    if (savedPic) setProfilePic(savedPic);
  }, [user.id]);

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPic(true);
      const url = await uploadProfilePicture(file);
      setProfilePic(url);
      localStorage.setItem(`profile_pic_${user.id}`, url);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Gagal mengunggah foto profil. Silakan coba lagi.');
    } finally {
      setIsUploadingPic(false);
    }
  };

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
        <div className="absolute top-0 right-0 -mt-3 -mr-3 w-24 h-24 bg-white opacity-[0.15] rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black opacity-[0.05] rounded-full blur-xl"></div>
        <div className="relative z-10">
          <div className="absolute top-0 right-0 p-1.5 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 shadow-sm">
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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 tracking-tight mb-1 sm:mb-2 truncate">Dashboard Staf</h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-lg truncate">Ringkasan informasi dan aktivitas Anda hari ini</p>
        </div>

        <div className="shrink-0 flex items-center justify-end relative">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="relative inline-flex items-center justify-center shrink-0 border-0 bg-transparent p-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-school-blue focus:ring-offset-2 rounded-full transition-transform hover:scale-105 w-12 h-12 sm:w-14 sm:h-14 mr-2 sm:mr-4"
            title="Profil Pengguna & Live Update"
          >
            <div className="absolute inset-0.5 sm:inset-1 rounded-full animate-ping opacity-50 bg-emerald-400"></div>

            <div className="relative z-10 w-full h-full rounded-full flex flex-col items-center justify-center text-base sm:text-lg font-bold shadow-md border-2 border-slate-200 bg-white overflow-hidden">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <BiHappyBeaming className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400" />
                </div>
              )}
            </div>
          </button>

          {/* Profile Dialog Modal */}
          {isProfileOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsProfileOpen(false)} />

              {/* Dialog Content */}
              <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-2xl max-h-[90vh] overflow-y-auto relative z-10 animate-in zoom-in-95 duration-200">
                <div className="p-4 sm:p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-school-blue/10 rounded-full flex items-center justify-center text-school-blue shrink-0">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <h2 className="text-xl font-bold text-slate-800">Profil Pengguna</h2>
                    </div>
                    <button
                      onClick={() => setIsProfileOpen(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                      title="Tutup Popup"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content Area */}
                  <div className="bg-slate-50 p-5 sm:p-6 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-6 items-start justify-between text-left">
                    {/* Info list (left) */}
                    <div className="flex-1 space-y-4 w-full">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Nama Lengkap</p>
                        <p className="font-medium text-slate-900 text-base">{user.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Email</p>
                        <p className="font-medium text-slate-900 text-base">{user.email || '-'}</p>
                      </div>
                      <div className="flex flex-col items-start">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Peran</p>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-school-blue text-white capitalize shadow-sm -ml-2.5">
                          {user.jobRoles?.join(', ') || user.role}
                        </span>
                      </div>
                      <div className="flex flex-col items-start">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Jabatan Utama</p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize shadow-sm -ml-2.5 ${user.position && user.position !== 'Belum Ditugaskan' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {user.position || 'Belum Ditugaskan'}
                        </span>
                      </div>
                    </div>

                    {/* Avatar & Actions (right) */}
                    <div className="flex flex-col items-center gap-3 shrink-0 w-full sm:w-auto">
                      <div className="relative group w-20 h-20 rounded-full border-4 border-white shadow-md bg-slate-200 flex items-center justify-center overflow-hidden">
                        {profilePic ? (
                          <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                            <BiHappyBeaming className="w-16 h-16 text-slate-400" />
                          </div>
                        )}

                        {/* Hover Overlay for Upload */}
                        <div
                          className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {isUploadingPic ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          ) : (
                            <>
                              <Camera className="w-5 h-5 text-white mb-0.5" />
                              <span className="text-[8px] text-white font-bold uppercase tracking-wider">Ubah Foto</span>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleProfilePicChange}
                        />
                      </div>
                      <button
                        onClick={async () => {
                          setIsProfileOpen(false);
                          if (window.confirm('Apakah Anda yakin ingin keluar?')) {
                            await supabase.auth.signOut();
                            localStorage.removeItem('hr_current_user');
                            window.location.href = '/';
                          }
                        }}
                        className="w-full flex items-center justify-center gap-1.5 bg-rose-500 text-white hover:bg-rose-600 hover:shadow-md px-3 py-2 rounded-full transition-all text-sm font-semibold border border-transparent mt-5 shadow-sm"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
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
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:gap-8 items-center">
          <div className="w-full sm:w-1/2 flex flex-col items-center sm:items-start h-full">
            <h3 className="text-slate-600 font-medium mb-4 sm:mb-6 text-center sm:text-left w-full">Distribusi Total Kehadiran</h3>
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
            <p className="text-slate-500 font-medium mb-1 text-center sm:text-left">Total Absensi</p>
            <div className="flex items-center justify-between w-full mt-2 border-b border-dashed border-slate-200 pb-4">
              <span className="text-slate-800 text-3xl font-bold leading-none">{totalTercatat}</span>
              <span className="text-slate-400 font-medium text-lg mt-1">Hari</span>
            </div>
          </div>
            <div className="pt-4 space-y-4">
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-600 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-500 to-green-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Masuk (Hadir)</span>
                <span className="font-bold text-emerald-500">{totalMasuk}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-600 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div> Izin / Sakit</span>
                <span className="font-bold text-amber-500">{totalIzin}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Distribusi Status Tugas Chart Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:gap-8 items-center">
          <div className="w-full sm:w-1/2 flex flex-col items-center sm:items-start h-full">
            <h3 className="text-slate-600 font-medium mb-4 sm:mb-6 text-center sm:text-left w-full">Distribusi Status Tugas</h3>
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
              <p className="text-slate-500 font-medium mb-1 text-center sm:text-left">Nilai Bintang</p>
              <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
                <span className="text-slate-800 text-3xl font-bold leading-none">{starRating}</span>
                <StarRating score={averageAllTasks} size={26} className="flex items-center gap-1" />
              </div>
            </div>
            <div className="pt-4 space-y-4">
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-600 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-sky-500 to-teal-400 shadow-[0_0_8px_rgba(14,165,233,0.5)]"></div> Sudah Dinilai</span>
                <span className="font-bold text-sky-500">{totalDisetujui}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-600 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div> Menunggu</span>
                <span className="font-bold text-amber-500">{totalMenunggu}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-600 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-rose-500 to-pink-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div> Ditolak</span>
                <span className="font-bold text-rose-500">{totalDitolak}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

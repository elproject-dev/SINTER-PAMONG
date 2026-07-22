import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, AttendanceRecord, KPIEvaluation, TaskReport } from '../../lib/types';
import { getUserTodayAttendance, getUserKPIs, getUserTaskReports, uploadProfilePicture } from '../../lib/db';
import { Clock, Calendar, CheckCircle, XCircle, Star, ClipboardList, ArrowRight, User as UserIcon, X, Camera, Loader2, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useRealtimeSubscription } from '../../lib/useRealtime';
import { supabase } from '../../lib/supabase';

interface StaffDashboardProps {
  user: User;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ user }) => {
  const [attendance, setAttendance] = useState<AttendanceRecord | undefined>(undefined);
  const [kpis, setKpis] = useState<KPIEvaluation[]>([]);
  const [taskReports, setTaskReports] = useState<TaskReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userInitial = user.name.charAt(0).toUpperCase();

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
    setIsLoading(true);
    const [att, userKpis, reports] = await Promise.all([
      getUserTodayAttendance(user.id),
      getUserKPIs(user.id),
      getUserTaskReports(user.id)
    ]);
    
    setAttendance(att);
    setKpis(userKpis);
    setTaskReports(reports);
    setIsLoading(false);
  }, [user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeSubscription(['data_absensi', 'penilaian_kpi', 'penilaian_tugas'], fetchData);

  const latestKPI = kpis.length > 0 ? kpis[kpis.length - 1] : null;
  const totalTasks = latestKPI?.taskScores?.length || 0;
  const totalScore = latestKPI?.taskScores?.reduce((sum, item) => sum + item.score, 0) || 0;
  const kpiAverage = totalTasks > 0 ? (totalScore / totalTasks).toFixed(1) : '-';

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
            <div className="absolute inset-0.5 sm:inset-1 rounded-full animate-ping opacity-20 bg-emerald-500"></div>
            
            <div className="relative z-10 w-full h-full rounded-full flex flex-col items-center justify-center text-base sm:text-lg font-bold shadow-md border-2 border-emerald-500 text-emerald-700 bg-emerald-50 overflow-hidden">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <span className="text-xl sm:text-2xl font-extrabold leading-none mt-1">{userInitial}</span>
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Profil</span>
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
                          <div className="w-full h-full bg-school-blue flex items-center justify-center text-3xl font-bold text-white">
                            {userInitial}
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

      {/* Greeting Banner */}
      <div className="bg-gradient-to-r from-school-blue to-indigo-600 rounded-3xl p-8 sm:p-10 shadow-lg shadow-blue-500/20 relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <p className="text-blue-100 font-medium mb-1 tracking-wide">Selamat datang kembali,</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{user.name}</h2>
            <p className="text-sm mt-3 bg-white/20 inline-block px-3 py-1 rounded-full backdrop-blur-sm capitalize font-semibold shadow-sm">
              {user.position || user.jobRoles?.join(', ') || user.role}
            </p>
          </div>
          <div className="mt-6 md:mt-0 text-left md:text-right">
            <p className="text-sm text-blue-100 mb-1 flex items-center md:justify-end">
              <Calendar size={16} className="mr-1.5" /> Tanggal Hari Ini
            </p>
            <p className="text-xl font-bold">{format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Status Kehadiran Widget */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 relative overflow-hidden group transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)] flex flex-col justify-between min-h-[220px]">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors duration-500"></div>
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white/90 text-lg tracking-wide">Kehadiran</h3>
              <div className="p-2.5 bg-white/15 backdrop-blur-md text-white rounded-2xl shadow-sm border border-white/20 group-hover:scale-110 transition-transform duration-300">
                <Clock size={20} />
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center">
              {isLoading ? (
                <div className="flex items-center text-white/70 mb-4 animate-pulse">
                  <div className="w-5 h-5 mr-2 rounded-full border-2 border-white/50 border-t-transparent animate-spin"></div>
                  <span className="font-bold">Memeriksa...</span>
                </div>
              ) : !attendance ? (
                <div className="flex items-center text-rose-200 mb-4">
                  <XCircle size={24} className="mr-2" />
                  <span className="font-bold text-lg drop-shadow-sm">Belum Absen Masuk</span>
                </div>
              ) : (
                <div className="flex items-center text-emerald-200 mb-4">
                  <CheckCircle size={24} className="mr-2" />
                  <span className="font-bold text-lg drop-shadow-sm">
                    {attendance.status === 'present' ? 'Hadir & Aktif' : 'Izin / Sakit'}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <Link to="/staff/absensi" className="flex items-center justify-center w-full py-3 mt-4 bg-white/10 hover:bg-white hover:text-school-blue text-white rounded-xl font-bold transition-colors duration-300 group/btn relative z-10 backdrop-blur-md border border-white/20 shadow-sm">
            Catat Kehadiran <ArrowRight size={18} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Laporan Kegiatan Widget */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 relative overflow-hidden group transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)] flex flex-col justify-between min-h-[220px]">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors duration-500"></div>
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white/90 text-lg tracking-wide">Daftar Tugas</h3>
              <div className="p-2.5 bg-white/15 backdrop-blur-md text-white rounded-2xl shadow-sm border border-white/20 group-hover:scale-110 transition-transform duration-300">
                <ClipboardList size={20} />
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center mb-4">
              <p className="text-5xl font-extrabold text-white drop-shadow-sm">{taskReports.length}</p>
              <p className="text-sm text-white/80 font-medium mt-1">Laporan tugas dikirim</p>
            </div>
          </div>
          
          <Link to="/staff/daftar-tugas" className="flex items-center justify-center w-full py-3 mt-4 bg-white/10 hover:bg-white hover:text-amber-600 text-white rounded-xl font-bold transition-colors duration-300 group/btn relative z-10 backdrop-blur-md border border-white/20 shadow-sm">
            Lihat Daftar Tugas <ArrowRight size={18} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Penilaian KPI Widget */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 relative overflow-hidden group transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)] flex flex-col justify-between min-h-[220px]">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors duration-500"></div>
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white/90 text-lg tracking-wide">Penilaian KPI</h3>
              <div className="p-2.5 bg-white/15 backdrop-blur-md text-white rounded-2xl shadow-sm border border-white/20 group-hover:scale-110 transition-transform duration-300">
                <Star size={20} />
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center mb-4">
              <p className="text-5xl font-extrabold text-white drop-shadow-sm">{kpiAverage}</p>
              <p className="text-sm text-white/80 font-medium mt-1">Rata-rata skor bulan terakhir</p>
            </div>
          </div>
          
          <Link to="/staff/nilai-kpi" className="flex items-center justify-center w-full py-3 mt-4 bg-white/10 hover:bg-white hover:text-emerald-600 text-white rounded-xl font-bold transition-colors duration-300 group/btn relative z-10 backdrop-blur-md border border-white/20 shadow-sm">
            Lihat Rincian <ArrowRight size={18} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>
        
      </div>
    </div>
  );
};

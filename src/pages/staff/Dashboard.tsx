import React, { useState, useEffect, useCallback } from 'react';
import { User, AttendanceRecord, KPIEvaluation, TaskReport } from '../../lib/types';
import { getUserTodayAttendance, getUserKPIs, getUserTaskReports } from '../../lib/db';
import { Clock, Calendar, CheckCircle, XCircle, Star, ClipboardList, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useRealtimeSubscription } from '../../lib/useRealtime';

interface StaffDashboardProps {
  user: User;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ user }) => {
  const [attendance, setAttendance] = useState<AttendanceRecord | undefined>(undefined);
  const [kpis, setKpis] = useState<KPIEvaluation[]>([]);
  const [taskReports, setTaskReports] = useState<TaskReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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

  useRealtimeSubscription(['data_absensi', 'penilaian_kpi', 'laporan_tugas'], fetchData);

  const latestKPI = kpis.length > 0 ? kpis[kpis.length - 1] : null;
  const totalTasks = latestKPI?.taskScores?.length || 0;
  const totalScore = latestKPI?.taskScores?.reduce((sum, item) => sum + item.score, 0) || 0;
  const kpiAverage = totalTasks > 0 ? (totalScore / totalTasks).toFixed(1) : '-';

  return (
    <div className="w-full space-y-6 sm:space-y-10">
      
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-800 mb-2 tracking-tight">Dashboard Staf</h1>
        <p className="text-slate-500 text-lg">Ringkasan informasi dan aktivitas Anda hari ini</p>
      </div>

      {/* Greeting Banner */}
      <div className="bg-gradient-to-r from-school-blue to-indigo-600 rounded-3xl p-8 sm:p-10 shadow-lg shadow-blue-500/20 relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <p className="text-blue-100 font-medium mb-1 tracking-wide">Selamat datang kembali,</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{user.name}</h2>
            <p className="text-sm mt-3 bg-white/20 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
              {user.jobRoles?.join(', ') || user.role}
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
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-lg">Kehadiran</h3>
              <div className="p-2 bg-blue-50 text-school-blue rounded-xl">
                <Clock size={20} />
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex items-center text-slate-500 mb-6 animate-pulse">
                <div className="w-5 h-5 mr-2 rounded-full border-2 border-school-blue border-t-transparent animate-spin"></div>
                <span className="font-bold">Memeriksa...</span>
              </div>
            ) : !attendance ? (
              <div className="flex items-center text-amber-500 mb-6">
                <XCircle size={24} className="mr-2" />
                <span className="font-bold">Belum Absen Masuk</span>
              </div>
            ) : (
              <div className="flex items-center text-emerald-500 mb-6">
                <CheckCircle size={24} className="mr-2" />
                <span className="font-bold">
                  {attendance.status === 'present' ? 'Hadir & Aktif' : 'Izin / Sakit'}
                </span>
              </div>
            )}
          </div>
          
          <Link to="/staff/absensi" className="flex items-center justify-center w-full py-3 bg-slate-50 hover:bg-school-blue hover:text-white text-school-blue rounded-xl font-bold transition-colors group">
            Catat Kehadiran <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Laporan Kegiatan Widget */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-lg">KPI</h3>
              <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
                <ClipboardList size={20} />
              </div>
            </div>
            <div className="mb-6">
              <p className="text-4xl font-extrabold text-slate-800">{taskReports.length}</p>
              <p className="text-sm text-slate-500 font-medium">Laporan tugas dikirim</p>
            </div>
          </div>
          
          <Link to="/staff/kpi" className="flex items-center justify-center w-full py-3 bg-slate-50 hover:bg-school-blue hover:text-white text-school-blue rounded-xl font-bold transition-colors group">
            Tulis Laporan <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Penilaian KPI Widget */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-lg">Penilaian KPI</h3>
              <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl">
                <Star size={20} />
              </div>
            </div>
            <div className="mb-6">
              <p className="text-4xl font-extrabold text-slate-800">{kpiAverage}</p>
              <p className="text-sm text-slate-500 font-medium">Rata-rata skor bulan terakhir</p>
            </div>
          </div>
          
          <Link to="/staff/nilai-kpi" className="flex items-center justify-center w-full py-3 bg-slate-50 hover:bg-school-blue hover:text-white text-school-blue rounded-xl font-bold transition-colors group">
            Lihat Rincian <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
      </div>
    </div>
  );
};

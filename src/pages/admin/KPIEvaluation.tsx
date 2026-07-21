import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getStaff, saveKPI, getKPIs, getStaffTasks } from '../../lib/db';
import { User, KPIEvaluation, KPITaskScore, StaffTask } from '../../lib/types';
import { KPIDictionary } from '../../lib/kpiDictionary';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Save, Star, RefreshCcw, Search, Award, Loader2 } from 'lucide-react';
import { useRealtimeSubscription } from '../../lib/useRealtime';

const formatMonth = (monthStr: string) => {
  if (!monthStr) return 'Belum Tersedia';
  try {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, 'MMMM yyyy', { locale: id });
  } catch {
    return monthStr;
  }
};

interface KPIEvaluationProps {
  currentUser: User;
}

export const AdminKPIEvaluation: React.FC<KPIEvaluationProps> = ({ currentUser }) => {
  const [staff, setStaff] = useState<User[]>([]);
  const [allKPIs, setAllKPIs] = useState<KPIEvaluation[]>([]);
  const [allStaffTasks, setAllStaffTasks] = useState<StaffTask[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [taskScores, setTaskScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getStaff();
      setStaff(data);
      const kpis = await getKPIs();
      setAllKPIs(kpis);
      const staffTasks = await getStaffTasks();
      setAllStaffTasks(staffTasks);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeSubscription(['penilaian_kpi', 'nilai_kpi', 'profil_pengguna', 'tugas_staff'], fetchData);

  const selectedUser = staff.find(s => s.id === selectedStaff);
  
  // Ambil gabungan semua tugas berdasarkan jobRoles dari staf terpilih dan tugas spesifik staf
  const getCombinedTasks = useCallback((user?: User, userTasks?: StaffTask[]): string[] => {
    if (!user) return [];
    
    const tasks = new Set<string>();
    
    if (user.jobRoles && user.jobRoles.length > 0) {
      user.jobRoles.forEach(role => {
        const roleTasks = KPIDictionary[role] || [];
        roleTasks.forEach(t => tasks.add(t));
      });
    }

    if (userTasks && userTasks.length > 0) {
      userTasks.forEach(t => tasks.add(t.namaTugas));
    }
    
    if (tasks.size === 0) {
      return [
        'Kedisiplinan & Etos Kerja',
        'Tanggung Jawab & Penyelesaian Tugas',
        'Inisiatif & Problem Solving',
        'Kemampuan Komunikasi & Kerjasama Tim',
        'Kehadiran dan Ketepatan Waktu'
      ];
    }
    
    return Array.from(tasks);
  }, []);

  const tasks = useMemo(() => {
    const userTasks = allStaffTasks.filter(t => t.userId === selectedStaff);
    return getCombinedTasks(selectedUser, userTasks);
  }, [selectedUser, selectedStaff, allStaffTasks, getCombinedTasks]);

  // Initialize scores when selected staff or month changes
  useEffect(() => {
    if (!selectedStaff) return;
    
    const existingKPI = allKPIs.find(k => k.userId === selectedStaff && k.month === selectedMonth);
    
    if (existingKPI) {
      const savedScores: Record<string, number> = {};
      existingKPI.taskScores.forEach(s => {
        savedScores[s.task] = s.score;
      });
      setTaskScores(savedScores);
      setNotes(existingKPI.notes || '');
    } else {
      const initialScores: Record<string, number> = {};
      tasks.forEach(task => {
        initialScores[task] = 0; // Default score 0
      });
      setTaskScores(initialScores);
      setNotes('');
    }
  }, [selectedStaff, selectedMonth, allKPIs, tasks]);

  const handleScoreChange = (task: string, score: number) => {
    setTaskScores(prev => ({
      ...prev,
      [task]: score
    }));
  };

  const averageScore = useMemo(() => {
    if (tasks.length === 0) return 0;
    const total = tasks.reduce((sum, task) => sum + (taskScores[task] ?? 0), 0);
    return (total / tasks.length).toFixed(1);
  }, [tasks, taskScores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || tasks.length === 0) return;

    const finalTaskScores: KPITaskScore[] = tasks.map(task => ({
      task,
      score: taskScores[task] ?? 0
    }));

    const kpi: KPIEvaluation = {
      id: crypto.randomUUID(),
      userId: selectedStaff,
      evaluatorId: currentUser.id,
      month: selectedMonth,
      taskScores: finalTaskScores,
      notes,
      createdAt: new Date().toISOString()
    };

    await saveKPI(kpi);
    
    const updatedKPIs = await getKPIs();
    setAllKPIs(updatedKPIs);
    
    setShowSuccess(true);
    setIsModalOpen(false);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Helper untuk hitung rata-rata tersimpan per staff untuk bulan terpilih
  const getSavedAverage = (staffId: string) => {
    const kpi = allKPIs.find(k => k.userId === staffId && k.month === selectedMonth);
    if (!kpi || kpi.taskScores.length === 0) return null;
    const total = kpi.taskScores.reduce((sum, s) => sum + s.score, 0);
    return (total / kpi.taskScores.length).toFixed(1);
  };

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.position || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEvaluationModal = (staffId: string) => {
    setSelectedStaff(staffId);
    setIsModalOpen(true);
  };

  const RatingScale = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => (
    <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:justify-between mb-2 items-start gap-2">
        <label className="block text-sm font-medium text-slate-700 leading-snug w-full sm:w-3/4">{label}</label>
        <span className="text-school-blue font-bold text-base bg-blue-100 px-2.5 py-0.5 rounded-lg shrink-0">{value} / 5</span>
      </div>
      <div className="flex space-x-1 mt-1">
        {[1, 2, 3, 4, 5].map(num => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={`p-1 transition-all focus:outline-none ${
              value >= num 
                ? 'text-amber-400 hover:text-amber-500 scale-105' 
                : 'text-slate-300 hover:text-slate-400'
            }`}
          >
            <Star size={24} fill={value >= num ? "currentColor" : "none"} strokeWidth={1.5} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 mb-1 sm:mb-2 tracking-tight">Penilaian KPI Staf</h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-lg">Evaluasi kinerja bulanan berdasarkan rincian tugas (Skala 1 - 5)</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Cari nama staf..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-4 pl-10 text-slate-700 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-medium text-sm"
            />
          </div>

          <div className="relative w-full sm:w-48 shrink-0">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-4 text-slate-700 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-bold cursor-pointer text-sm"
            />
          </div>
        </div>
      </div>

      {showSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl flex items-center shadow-sm font-medium animate-in fade-in slide-in-from-top-4">
          <div className="mr-3 bg-emerald-100 p-1.5 rounded-full">✅</div>
          Penilaian KPI berhasil disimpan!
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center space-x-2 bg-white">
          <Award size={20} className="text-slate-600" />
          <h2 className="font-bold text-slate-800 text-lg">Data Kinerja Staf & Guru</h2>
        </div>
        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="w-full text-left border-collapse min-w-[800px] hidden md:table">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold border border-slate-200 w-12 text-center">NO</th>
                <th className="px-4 py-3 font-bold border border-slate-200">NAMA LENGKAP</th>
                <th className="px-4 py-3 font-bold border border-slate-200">PROFESI / JABATAN</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-40">PERIODE</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-40">SKOR KPI</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-28">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 border border-slate-200">
                    <div className="flex justify-center mb-3 text-school-blue">
                      <Loader2 size={32} className="animate-spin" />
                    </div>
                    <p className="font-bold text-lg text-slate-600 mb-1">Memuat Data...</p>
                  </td>
                </tr>
              ) : filteredStaff.length > 0 ? (
                filteredStaff.map((user, index) => {
                  const score = getSavedAverage(user.id);
                  return (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 border border-slate-200 text-center text-sm font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-sm font-bold text-slate-800">
                        {user.name}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-sm text-slate-700">
                        {user.position || 'Belum ada jabatan'}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center text-sm text-slate-700 font-semibold">
                        {selectedMonth}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center">
                        {score ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            ⭐ {score} / 5
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Belum Dinilai
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center">
                        <button
                          onClick={() => openEvaluationModal(user.id)}
                          title="Beri Nilai KPI"
                          className="p-2 rounded-full text-school-blue hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <Star size={18} fill={score ? "currentColor" : "none"} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 border border-slate-200">
                    <div className="flex justify-center mb-2 text-slate-300">
                      <Award size={32} />
                    </div>
                    Tidak ada staf yang ditemukan berdasarkan pencarian Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500">
                <div className="flex justify-center mb-3 text-school-blue">
                  <Loader2 size={32} className="animate-spin" />
                </div>
                <p className="font-bold text-lg text-slate-600 mb-1">Memuat Data...</p>
              </div>
            ) : filteredStaff.length > 0 ? (
              filteredStaff.map(user => {
                const score = getSavedAverage(user.id);
                return (
                  <div key={user.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <h3 className="font-extrabold text-slate-800 text-base">{user.name}</h3>
                        <p className="text-sm font-medium text-school-blue">{user.position || 'Belum ada jabatan'}</p>
                      </div>
                      <div>
                        {score ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            ⭐ {score} / 5
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Belum Dinilai
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-2 flex justify-end gap-2 mt-1">
                      <button
                        onClick={() => openEvaluationModal(user.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold bg-blue-50 text-school-blue hover:bg-blue-100 transition-all"
                      >
                        <Star size={16} fill={score ? "currentColor" : "none"}/> Beri Nilai KPI
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500">
                <div className="flex justify-center mb-2 text-slate-300">
                  <Award size={32} />
                </div>
                Tidak ada staf yang ditemukan berdasarkan pencarian Anda.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Penilaian KPI */}
      {isModalOpen && selectedStaff && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl shrink-0">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">Form Evaluasi KPI</h3>
                <p className="text-sm text-slate-500 mt-1 font-semibold">
                  {selectedUser.name} • {selectedUser.position || 'Belum ada jabatan'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-none">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 gap-3">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Periode Bulan</p>
                    <p className="font-bold text-slate-700 mt-0.5">{formatMonth(selectedMonth)}</p>
                  </div>
                  <div className="bg-school-blue text-white px-3.5 py-1.5 rounded-xl shadow-md border border-blue-500 flex items-center gap-1.5 font-bold shrink-0 text-sm">
                    <Star size={16} className="text-amber-300" />
                    Rata-rata: {averageScore} / 5
                  </div>
                </div>

                {allKPIs.find(k => k.userId === selectedStaff && k.month === selectedMonth) && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl flex items-center text-xs">
                    <RefreshCcw size={16} className="mr-2 shrink-0 animate-spin-slow" />
                    Staf ini sudah memiliki nilai KPI untuk bulan {formatMonth(selectedMonth)}. Menyimpan akan memperbarui nilai yang ada.
                  </div>
                )}

                <div className="space-y-4">
                  {/* General / Role-based Tasks */}
                  {tasks.filter(t => !allStaffTasks.find(st => st.userId === selectedStaff && st.namaTugas === t)).length > 0 && (
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-base mb-3 border-b border-slate-100 pb-2">Indikator Kinerja Utama (Umum & Jabatan)</h4>
                      {tasks.filter(t => !allStaffTasks.find(st => st.userId === selectedStaff && st.namaTugas === t)).map((task, idx) => (
                        <RatingScale 
                          key={`general-${idx}`} 
                          label={task} 
                          value={taskScores[task] ?? 0} 
                          onChange={(val) => handleScoreChange(task, val)} 
                        />
                      ))}
                    </div>
                  )}

                  {/* Specific Staff Tasks */}
                  {tasks.filter(t => allStaffTasks.find(st => st.userId === selectedStaff && st.namaTugas === t)).length > 0 && (
                    <div className="space-y-1 mt-6">
                      <h4 className="font-bold text-slate-800 text-base mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                        <Award size={18} className="text-school-blue" />
                        Tugas Khusus (dari Daftar Tugas)
                      </h4>
                      {tasks.filter(t => allStaffTasks.find(st => st.userId === selectedStaff && st.namaTugas === t)).map((task, idx) => (
                        <div key={`specific-${idx}`} className="relative">
                          <RatingScale 
                            label={task} 
                            value={taskScores[task] ?? 0} 
                            onChange={(val) => handleScoreChange(task, val)} 
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 mt-4">Catatan Evaluasi Umum</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Berikan feedback umum atau catatan kinerja bulan ini..."
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 h-28 resize-none focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50 rounded-b-3xl shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-school-blue hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {allKPIs.find(k => k.userId === selectedStaff && k.month === selectedMonth) ? 'Update Nilai' : 'Simpan Nilai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

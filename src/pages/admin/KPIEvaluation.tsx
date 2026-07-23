import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getStaff, getKPIs, getStaffTasks, getAllTaskReports, getAttendance, saveKPI } from '../../lib/db';
import { User, KPIEvaluation, StaffTask, TaskReport, AttendanceRecord } from '../../lib/types';
import { KPIDictionary } from '../../lib/kpiDictionary';
import { format } from 'date-fns';

import { Search, Award, Loader2, Eye, SlidersHorizontal, X, Plus, Star, ChevronDown, Check, User as UserIcon, Layers, Edit } from 'lucide-react';
import { AiOutlineStop } from "react-icons/ai";
import { useRealtimeSubscription } from '../../lib/useRealtime';
import { StarRating } from '../../components/StarRating';

interface KPIEvaluationProps {
  currentUser: User;
}

export const AdminKPIEvaluation: React.FC<KPIEvaluationProps> = ({ currentUser }) => {
  const [staff, setStaff] = useState<User[]>([]);
  const [allKPIs, setAllKPIs] = useState<KPIEvaluation[]>([]);
  const [allStaffTasks, setAllStaffTasks] = useState<StaffTask[]>([]);
  const [allTaskReports, setAllTaskReports] = useState<TaskReport[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [taskScores, setTaskScores] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const filterPopupRef = useRef<HTMLDivElement>(null);

  const [showAddManualForm, setShowAddManualForm] = useState(false);
  const [manualStaffId, setManualStaffId] = useState('');
  const [manualCategory, setManualCategory] = useState('Umum');
  const [manualIndicatorName, setManualIndicatorName] = useState('');
  const [manualIndicatorScore, setManualIndicatorScore] = useState(0);

  const formRef = useRef<HTMLDivElement>(null);
  const staffDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [categories, setCategories] = useState(['Umum', 'Tugas', 'Absensi']);
  const [categorySearch, setCategorySearch] = useState('');

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
      const reports = await getAllTaskReports();
      setAllTaskReports(reports);
      const attendance = await getAttendance();
      setAllAttendance(attendance);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeSubscription(['penilaian_kpi', 'nilai_kpi', 'profil_pengguna', 'tugas_staff', 'data_absensi'], fetchData);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopupRef.current && !filterPopupRef.current.contains(event.target as Node)) {
        setShowFilterPopup(false);
      }
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(event.target as Node)) {
        setIsStaffDropdownOpen(false);
        setStaffSearch('');
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
        setCategorySearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        'Kehadiran dan Ketepatan Waktu',
        'Data Absensi'
      ];
    }

    const allTasks = Array.from(tasks);
    if (!allTasks.includes('Data Absensi')) {
      allTasks.push('Data Absensi');
    }
    return allTasks;
  }, []);

  const tasks = useMemo(() => {
    const userTasks = allStaffTasks.filter(t => t.userId === selectedStaff);
    const combined = getCombinedTasks(selectedUser, userTasks);

    // Sertakan indikator manual yang sudah tersimpan di database agar muncul di tabel
    const existingKPI = allKPIs.find(k => k.userId === selectedStaff && k.month === selectedMonth);
    if (existingKPI) {
      existingKPI.taskScores.forEach(s => {
        if (!combined.includes(s.task)) {
          combined.push(s.task);
        }
      });
    }

    return combined;
  }, [selectedUser, selectedStaff, allStaffTasks, getCombinedTasks, allKPIs, selectedMonth]);

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
    } else {
      const initialScores: Record<string, number> = {};
      tasks.forEach(task => {
        const reportsForTask = allTaskReports.filter(r =>
          r.userId === selectedStaff &&
          r.taskName === task &&
          r.date.startsWith(selectedMonth)
        );

        const ratedReports = reportsForTask.filter(r => r.averageScore || r.score);

        if (ratedReports.length > 0) {
          const totalScore = ratedReports.reduce((sum, r) => sum + Number(r.averageScore || r.score || 0), 0);
          initialScores[task] = Number((totalScore / ratedReports.length).toFixed(1));
        } else {
          initialScores[task] = 0; // Default score 0
        }
      });
      setTaskScores(initialScores);
    }
  }, [selectedStaff, selectedMonth, allKPIs, tasks]);




  // Helper untuk hitung rata-rata tersimpan per staff untuk bulan terpilih (menyamakan persis dengan Detail Penilaian KPI)
  const getSavedAverage = (staffId: string) => {
    let totalScore = 0;
    let count = 0;

    const userObj = staff.find(s => s.id === staffId);
    const userTasks = allStaffTasks.filter(t => t.userId === staffId);
    const tasksForUser = getCombinedTasks(userObj, userTasks);

    const kpi = allKPIs.find(k => k.userId === staffId && k.month === selectedMonth);
    if (kpi) {
      kpi.taskScores.forEach(s => {
        if (!tasksForUser.includes(s.task)) {
          tasksForUser.push(s.task);
        }
      });
    }

    tasksForUser.forEach(task => {
      let score = 0;
      let hasScore = false;

      if (task.toLowerCase().includes('absensi')) {
        const monthRecords = allAttendance.filter(r => r.date.startsWith(selectedMonth));
        if (monthRecords.length > 0) {
          const uniqueDates = new Set(monthRecords.map(r => r.date));
          const totalWorkingDays = uniqueDates.size || 1;
          const staffRecords = monthRecords.filter(r => r.userId === staffId);
          const totalHadir = staffRecords.filter(r => r.status === 'present').length;
          score = (totalHadir / totalWorkingDays) * 5.0;
          if (score > 5.0) score = 5.0;
          hasScore = true;
        }
      } else {
        const kpi = allKPIs.find(k => k.userId === staffId && k.month === selectedMonth);
        const savedTask = kpi?.taskScores.find(s => s.task === task);
        if (savedTask) {
          score = savedTask.score;
          hasScore = true;
        } else {
          const reportsForTask = allTaskReports.filter(r =>
            r.userId === staffId &&
            r.taskName === task &&
            r.date.startsWith(selectedMonth)
          );
          const ratedReports = reportsForTask.filter(r => r.averageScore || r.score);
          if (ratedReports.length > 0) {
            const sumScore = ratedReports.reduce((sum, r) => sum + Number(r.averageScore || r.score || 0), 0);
            score = sumScore / ratedReports.length;
            hasScore = true;
          }
        }
      }

      if (hasScore) {
        totalScore += score;
        count += 1;
      }
    });

    if (count === 0) return null;
    return (totalScore / count).toFixed(1);
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.position || '').toLowerCase().includes(searchTerm.toLowerCase());

    let matchesDate = true;
    if (filterStartDate || filterEndDate) {
      const kpi = allKPIs.find(k => k.userId === s.id && k.month === selectedMonth);
      if (kpi && kpi.createdAt) {
        const kpiDate = new Date(kpi.createdAt).toISOString().split('T')[0];
        if (filterStartDate && kpiDate < filterStartDate) matchesDate = false;
        if (filterEndDate && kpiDate > filterEndDate) matchesDate = false;
      } else {
        matchesDate = false; // Exclude if no KPI data exists to match dates
      }
    }

    return matchesSearch && matchesDate;
  });

  const openEvaluationPanel = (staffId: string) => {
    setSelectedStaff(staffId);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 dark:text-slate-50 mb-1 sm:mb-2 tracking-tight">Penilaian KPI</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base lg:text-lg">Rekapitulasi evaluasi total kinerja secara keseluruhan</p>
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
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pr-4 pl-10 text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-medium text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAddManualForm(!showAddManualForm);
              if (showAddManualForm) {
                setManualStaffId('');
                setManualCategory('Umum');
                setManualIndicatorName('');
                setManualIndicatorScore(0);
              }
            }}
            className={`px-8 py-2 text-white font-bold border border-transparent rounded-xl transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 whitespace-nowrap ${showAddManualForm
              ? 'bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700'
              : 'bg-gradient-to-r from-school-blue to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              }`}
          >
            {showAddManualForm ? 'Tutup Form' : <><Plus size={18} /> <span>Tambah Penilaian</span></>}
          </button>
        </div>
      </div>

      {showAddManualForm && (
        <div ref={formRef} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-in slide-in-from-top-4 fade-in duration-300 scroll-mt-24">
          <h2 className="font-bold text-slate-800 dark:text-slate-50 text-lg mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
            <Plus size={20} className="text-school-blue dark:text-white" />
            Tambah Penilaian Manual
          </h2>

          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-end">
              <div className="lg:col-span-3 space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Nama Indikator / Tugas <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={manualIndicatorName}
                  onChange={(e) => setManualIndicatorName(e.target.value)}
                  placeholder="Masukkan indikator..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-[46px] text-sm text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-medium"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="block text-right mr-2 text-lg font-black bg-gradient-to-r from-amber-500 to-orange-500 text-transparent bg-clip-text uppercase tracking-wider">
                  Beri Penilaian
                </label>
                <div className="w-full h-[46px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 flex items-center justify-between shadow-sm">
                  <div className={`font-black text-xl transition-colors ${manualIndicatorScore > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
                    {manualIndicatorScore > 0 ? `${manualIndicatorScore}.0` : '0.0'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={28}
                        onClick={() => setManualIndicatorScore(star)}
                        className={`cursor-pointer transition-transform hover:scale-110 ${(manualIndicatorScore > 0 && star <= manualIndicatorScore)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-transparent text-slate-300 hover:text-amber-400'
                          }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700/60 pb-3">
                  <div className="bg-school-blue/10 p-2 rounded-lg text-school-blue dark:text-white">
                    <UserIcon size={18} />
                  </div>
                  <h3 className="font-bold text-sm">Ditugaskan Kepada <span className="text-rose-500">*</span></h3>
                </div>

                <div className="relative" ref={staffDropdownRef}>
                  <div
                    className={`w-full h-[42px] bg-white dark:bg-slate-800 border ${isStaffDropdownOpen ? 'border-school-blue ring-4 ring-school-blue/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'} rounded-xl px-3 text-slate-700 dark:text-slate-200 flex justify-between items-center cursor-pointer transition-all font-medium shadow-sm`}
                    onClick={() => setIsStaffDropdownOpen(!isStaffDropdownOpen)}
                  >
                    <span className={manualStaffId ? 'text-slate-800 dark:text-slate-50 text-sm truncate pr-2' : 'text-slate-400 text-sm'}>
                      {manualStaffId ? staff.find(s => s.id === manualStaffId)?.name || 'Pilih Staf...' : '-- Pilih Staf --'}
                    </span>
                    <ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform duration-300 ${isStaffDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isStaffDropdownOpen && (
                    <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="p-2 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                            <Search size={14} />
                          </div>
                          <input
                            type="text"
                            placeholder="Cari nama staf..."
                            value={staffSearch}
                            onChange={(e) => setStaffSearch(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pr-3 pl-8 text-slate-700 dark:text-slate-200 text-xs focus:ring-2 focus:ring-school-blue/20 focus:border-school-blue outline-none transition-all"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto py-1 custom-scrollbar">
                        {staff.filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase()) || (s.position || '').toLowerCase().includes(staffSearch.toLowerCase())).map(s => (
                          <div
                            key={s.id}
                            className={`px-3 py-2 mx-1.5 mb-1 rounded-lg cursor-pointer flex flex-col justify-center transition-colors group ${manualStaffId === s.id ? 'bg-school-blue/10' : 'hover:bg-school-blue/5'}`}
                            onClick={() => {
                              setManualStaffId(s.id);
                              setIsStaffDropdownOpen(false);
                              setStaffSearch('');
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-sm transition-colors truncate pr-2 ${manualStaffId === s.id ? 'font-bold text-school-blue dark:text-white' : 'text-slate-700 dark:text-slate-200 font-bold group-hover:text-school-blue dark:text-white'}`}>{s.name}</span>
                              {manualStaffId === s.id && <Check size={16} className="text-school-blue dark:text-white shrink-0" />}
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.position || 'Tidak ada jabatan'}</span>
                          </div>
                        ))}
                        {staff.filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase()) || (s.position || '').toLowerCase().includes(staffSearch.toLowerCase())).length === 0 && (
                          <div className="px-4 py-4 text-center text-slate-500 dark:text-slate-400 text-xs">
                            Pencarian tidak ditemukan.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700/60 pb-3">
                  <div className="bg-school-blue/10 p-2 rounded-lg text-school-blue dark:text-white">
                    <Layers size={18} />
                  </div>
                  <h3 className="font-bold text-sm">Kategori Penilaian <span className="text-rose-500">*</span></h3>
                </div>

                <div className="relative" ref={categoryDropdownRef}>
                  <div
                    className={`w-full h-[42px] bg-white dark:bg-slate-800 border ${isCategoryDropdownOpen ? 'border-school-blue ring-4 ring-school-blue/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'} rounded-xl px-3 text-slate-700 dark:text-slate-200 flex justify-between items-center cursor-pointer transition-all font-medium shadow-sm`}
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  >
                    <span className={manualCategory ? 'text-slate-800 dark:text-slate-50 text-sm' : 'text-slate-400 text-sm'}>
                      {manualCategory || '-- Pilih Kategori --'}
                    </span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isCategoryDropdownOpen && (
                    <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="p-2 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                            <Search size={14} />
                          </div>
                          <input
                            type="text"
                            placeholder="Cari atau tambah..."
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pr-3 pl-8 text-slate-700 dark:text-slate-200 text-xs focus:ring-2 focus:ring-school-blue/20 focus:border-school-blue outline-none transition-all"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && categorySearch.trim()) {
                                e.preventDefault();
                                const newCat = categorySearch.trim();
                                if (!categories.includes(newCat)) {
                                  setCategories([...categories, newCat]);
                                }
                                setManualCategory(newCat);
                                setIsCategoryDropdownOpen(false);
                                setCategorySearch('');
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="max-h-[160px] overflow-y-auto py-1 custom-scrollbar p-1">
                        {categories.filter(c => c.toLowerCase().includes(categorySearch.toLowerCase())).map((cat) => (
                          <div
                            key={cat}
                            className={`px-3 py-2 mx-0.5 mb-1 rounded-lg cursor-pointer flex justify-between items-center transition-colors group ${manualCategory === cat ? 'bg-school-blue/10' : 'hover:bg-school-blue/5'}`}
                            onClick={() => {
                              setManualCategory(cat);
                              setIsCategoryDropdownOpen(false);
                              setCategorySearch('');
                            }}
                          >
                            <span className={`text-sm transition-colors truncate pr-2 ${manualCategory === cat ? 'font-bold text-school-blue dark:text-white' : 'text-slate-700 dark:text-slate-200 font-bold group-hover:text-school-blue dark:text-white'}`}>{cat}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {manualCategory === cat && <Check size={16} className="text-school-blue dark:text-white" />}
                              {!['Umum', 'Tugas', 'Absensi'].includes(cat) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCategories(categories.filter(c => c !== cat));
                                    if (manualCategory === cat) setManualCategory('');
                                  }}
                                  className="p-1 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                  title="Hapus kategori"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        {categorySearch.trim() && !categories.some(c => c.toLowerCase() === categorySearch.trim().toLowerCase()) && (
                          <div
                            className="px-3 py-2.5 mx-0.5 mt-1 rounded-lg cursor-pointer flex items-center gap-2 text-orange-500 hover:bg-orange-50 transition-colors"
                            onClick={() => {
                              const newCat = categorySearch.trim();
                              setCategories([...categories, newCat]);
                              setManualCategory(newCat);
                              setIsCategoryDropdownOpen(false);
                              setCategorySearch('');
                            }}
                          >
                            <Plus size={16} className="shrink-0" />
                            <span className="text-sm font-bold truncate">Tambah "{categorySearch.trim()}"</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-5 mt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={async () => {
                  if (!manualStaffId || !manualIndicatorName || manualIndicatorScore === 0) {
                    alert("Mohon lengkapi semua data (Staf, Indikator, dan Skor)");
                    return;
                  }
                  let baseScores: Record<string, number> = {};
                  let baseCategories: Record<string, string> = {};
                  const existingKPI = allKPIs.find(k => k.userId === manualStaffId && k.month === selectedMonth);

                  // Gunakan input pencarian jika user mengetik kategori baru tapi lupa menekan enter/tambah
                  const finalCategory = categorySearch.trim() ? categorySearch.trim() : manualCategory;

                  if (categorySearch.trim() && !categories.includes(categorySearch.trim())) {
                    setCategories([...categories, categorySearch.trim()]);
                  }

                  if (existingKPI) {
                    existingKPI.taskScores.forEach(s => {
                      baseScores[s.task] = s.score;
                      if (s.category) {
                        baseCategories[s.task] = s.category;
                      } else {
                        const isAbs = s.task.toLowerCase().includes('absensi');
                        const isSpec = allStaffTasks.some(t => t.userId === manualStaffId && t.namaTugas === s.task);
                        baseCategories[s.task] = isAbs ? 'Absensi' : isSpec ? 'Tugas' : 'Umum';
                      }
                    });
                  } else {
                    const staffTasks = allStaffTasks.filter(t => t.userId === manualStaffId);
                    const manualStaffObj = staff.find(s => s.id === manualStaffId);
                    const combinedTasks = getCombinedTasks(manualStaffObj, staffTasks);

                    combinedTasks.forEach(task => {
                      const isAbs = task.toLowerCase().includes('absensi');
                      const isSpec = staffTasks.some(t => t.namaTugas === task);
                      baseCategories[task] = isAbs ? 'Absensi' : isSpec ? 'Tugas' : 'Umum';
                      if (isAbs) {
                        const monthRecords = allAttendance.filter(r => r.date.startsWith(selectedMonth));
                        if (monthRecords.length > 0) {
                          const uniqueDates = new Set(monthRecords.map(r => r.date));
                          const totalWorkingDays = uniqueDates.size || 1;
                          const staffRecords = monthRecords.filter(r => r.userId === manualStaffId);
                          const totalHadir = staffRecords.filter(r => r.status === 'present').length;
                          let val = (totalHadir / totalWorkingDays) * 5.0;
                          if (val > 5.0) val = 5.0;
                          baseScores[task] = Number(val.toFixed(1));
                        } else {
                          baseScores[task] = 0;
                        }
                      } else {
                        const reportsForTask = allTaskReports.filter(r =>
                          r.userId === manualStaffId &&
                          r.taskName === task &&
                          r.date.startsWith(selectedMonth)
                        );
                        const ratedReports = reportsForTask.filter(r => r.averageScore || r.score);
                        if (ratedReports.length > 0) {
                          const totalScore = ratedReports.reduce((sum, r) => sum + Number(r.averageScore || r.score || 0), 0);
                          baseScores[task] = Number((totalScore / ratedReports.length).toFixed(1));
                        } else {
                          baseScores[task] = 0;
                        }
                      }
                    });
                  }

                  baseScores[manualIndicatorName] = manualIndicatorScore;
                  baseCategories[manualIndicatorName] = finalCategory;

                  const taskScoresArray = Object.entries(baseScores).map(([task, score]) => ({
                    task,
                    score,
                    category: baseCategories[task] || 'Umum'
                  }));

                  const newKPI: KPIEvaluation = {
                    id: existingKPI?.id || crypto.randomUUID(),
                    userId: manualStaffId,
                    evaluatorId: currentUser.id,
                    month: selectedMonth,
                    taskScores: taskScoresArray,
                    notes: existingKPI?.notes || '',
                    createdAt: existingKPI?.createdAt || new Date().toISOString()
                  };

                  try {
                    await saveKPI(newKPI);
                    const newAllKPIs = allKPIs.filter(k => k.id !== newKPI.id);
                    newAllKPIs.push(newKPI);
                    setAllKPIs(newAllKPIs);

                    alert("Penilaian manual berhasil disimpan!");
                    setShowAddManualForm(false);
                    setManualStaffId('');
                    setManualCategory('Umum');
                    setCategorySearch('');
                    setManualIndicatorName('');
                    setManualIndicatorScore(0);
                  } catch (error) {
                    console.error("Gagal menyimpan KPI:", error);
                    alert("Gagal menyimpan penilaian.");
                  }
                }}
                className="w-full sm:w-auto px-10 py-2.5 text-white font-bold border border-transparent rounded-xl transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 whitespace-nowrap bg-gradient-to-r from-school-blue to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shrink-0"
              >
                Simpan Penilaian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      {!selectedStaff ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-visible animate-in fade-in slide-in-from-bottom-4">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-row items-center justify-between bg-white dark:bg-slate-800 gap-3 relative">
            <div className="flex items-center space-x-2 truncate">
              <Award size={20} className="text-slate-600 dark:text-slate-300 shrink-0" />
              <h2 className="font-bold text-slate-800 dark:text-slate-50 text-lg truncate">Data Kinerja Staf & Guru</h2>
            </div>

            <div className="flex items-center gap-2 relative" ref={filterPopupRef}>
              <button
                onClick={() => setShowFilterPopup(!showFilterPopup)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border transition-all ${showFilterPopup || filterStartDate || filterEndDate
                  ? 'bg-school-blue/10 border-school-blue text-school-blue dark:text-white shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 shadow-sm'
                  }`}
              >
                <SlidersHorizontal size={16} />
                Filter
              </button>

              {/* Pop-up Filter */}
              {showFilterPopup && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-[60] animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-50 text-sm">Filter Data</h3>
                    <button onClick={() => setShowFilterPopup(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 p-1 rounded-md transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Tanggal Mulai</label>
                      <input
                        type={filterStartDate ? "date" : "text"}
                        placeholder="Tanggal Mulai"
                        onFocus={(e) => {
                          e.target.type = 'date';
                          e.target.showPicker && e.target.showPicker();
                        }}
                        onBlur={(e) => {
                          if (!e.target.value) e.target.type = 'text';
                        }}
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-school-blue/20 outline-none text-slate-700 dark:text-slate-200 font-bold text-center cursor-pointer transition-all hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Tanggal Akhir</label>
                      <input
                        type={filterEndDate ? "date" : "text"}
                        placeholder="Tanggal Akhir"
                        onFocus={(e) => {
                          e.target.type = 'date';
                          e.target.showPicker && e.target.showPicker();
                        }}
                        onBlur={(e) => {
                          if (!e.target.value) e.target.type = 'text';
                        }}
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-school-blue/20 outline-none text-slate-700 dark:text-slate-200 font-bold text-center cursor-pointer transition-all hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                      />
                    </div>
                    {(filterStartDate || filterEndDate) && (
                      <button
                        onClick={() => {
                          setFilterStartDate('');
                          setFilterEndDate('');
                        }}
                        className="w-full mt-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold py-2 rounded-lg text-sm transition-colors"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            {/* Desktop Table View */}
            <table className="w-full text-left border-collapse min-w-[800px] hidden lg:table">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 w-12 text-center">NO</th>
                  <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700">NAMA LENGKAP</th>
                  <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700">PROFESI / JABATAN</th>
                  <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-[180px]">PENILAIAN</th>
                  <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-24">SKOR</th>
                  <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-32">AKSI</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      <div className="flex justify-center mb-3 text-school-blue dark:text-white">
                        <Loader2 size={32} className="animate-spin" />
                      </div>
                      <p className="font-bold text-lg text-slate-600 dark:text-slate-300 mb-1">Memuat Data...</p>
                    </td>
                  </tr>
                ) : filteredStaff.length > 0 ? (
                  filteredStaff.map((user, index) => {
                    const score = getSavedAverage(user.id);
                    return (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-50">
                          {user.name}
                        </td>
                        <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200">
                          {user.position || 'Belum ada jabatan'}
                        </td>
                        <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                          {score ? (
                            <div className="flex justify-center">
                              <StarRating score={Number(score)} size={16} />
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              Belum Dinilai
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center font-bold text-amber-500">
                          {score ? score : '-'}
                        </td>
                        <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                          <button
                            onClick={() => openEvaluationPanel(user.id)}
                            title="Periksa / Beri Nilai"
                            className="p-2 rounded-lg text-school-blue dark:text-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors mx-auto flex items-center justify-center"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
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
            <div className="lg:hidden flex flex-col divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex justify-center mb-3 text-school-blue dark:text-white">
                    <Loader2 size={32} className="animate-spin" />
                  </div>
                  <p className="font-bold text-lg text-slate-600 dark:text-slate-300 mb-1">Memuat Data...</p>
                </div>
              ) : filteredStaff.length > 0 ? (
                filteredStaff.map(user => {
                  const score = getSavedAverage(user.id);
                  return (
                    <div key={user.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <h3 className="font-extrabold text-slate-800 dark:text-slate-50 text-base">{user.name}</h3>
                          <p className="text-sm font-medium text-school-blue dark:text-white">{user.position || 'Belum ada jabatan'}</p>
                        </div>
                        <div>
                          {score ? (
                            <div className="flex flex-col items-end gap-1">
                              <StarRating score={Number(score)} size={14} />
                              <span className="text-sm font-bold text-amber-500">{score}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              Belum Dinilai
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end gap-2 mt-1">
                        <button
                          onClick={() => openEvaluationPanel(user.id)}
                          title="Periksa / Beri Nilai"
                          className="p-2 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-school-blue dark:text-white transition-colors flex items-center justify-center"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex justify-center mb-2 text-slate-300">
                    <Award size={32} />
                  </div>
                  Tidak ada staf yang ditemukan berdasarkan pencarian Anda.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Inline Evaluation Panel (Table View) */
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
            <div className="flex items-center space-x-2">
              <Award size={20} className="text-slate-600 dark:text-slate-300" />
              <h2 className="font-bold text-slate-800 dark:text-slate-50 text-lg">Detail Penilaian KPI</h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedStaff('')}
              className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            >
              Tutup
            </button>
          </div>

          <div className="flex flex-col">
            {(() => {
              const rowData = tasks.map((task, idx) => {
                const isSpecific = allStaffTasks.find(st => st.userId === selectedStaff && st.namaTugas === task);
                const isAbsensi = task.toLowerCase().includes('absensi');

                let val = taskScores[task] ?? 0;
                if (isAbsensi) {
                  const monthRecords = allAttendance.filter(r => r.date.startsWith(selectedMonth));
                  if (monthRecords.length > 0) {
                    const uniqueDates = new Set(monthRecords.map(r => r.date));
                    const totalWorkingDays = uniqueDates.size || 1;
                    const staffRecords = monthRecords.filter(r => r.userId === selectedStaff);
                    const totalHadir = staffRecords.filter(r => r.status === 'present').length;
                    val = (totalHadir / totalWorkingDays) * 5.0;
                    if (val > 5.0) val = 5.0;
                  } else {
                    val = 0;
                  }
                }

                let categoryBadge = (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Umum</span>
                );
                
                let origCat = 'Umum';

                if (isAbsensi) {
                  categoryBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white shadow-sm">Absensi</span>;
                  origCat = 'Absensi';
                } else if (isSpecific) {
                  categoryBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm">Tugas</span>;
                  origCat = 'Tugas';
                } else {
                  const existingKPI = allKPIs.find(k => k.userId === selectedStaff && k.month === selectedMonth);
                  const scoreObj = existingKPI?.taskScores.find(s => s.task === task);
                  if (scoreObj && scoreObj.category) {
                    const catName = scoreObj.category;
                    origCat = catName;
                    if (catName === 'Umum') {
                      categoryBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Umum</span>;
                    } else if (catName === 'Tugas') {
                      categoryBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm">Tugas</span>;
                    } else if (catName.toLowerCase() === 'absensi') {
                      categoryBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white shadow-sm">Absensi</span>;
                    } else {
                      categoryBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white shadow-sm">{catName}</span>;
                    }
                  } else {
                    if (existingKPI?.notes) {
                      try {
                        const parsed = JSON.parse(existingKPI.notes);
                        if (parsed[task]) {
                          const catName = parsed[task];
                          origCat = catName;
                          if (catName === 'Umum') {
                            categoryBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Umum</span>;
                          } else if (catName === 'Tugas') {
                            categoryBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm">Tugas</span>;
                          } else if (catName.toLowerCase() === 'absensi') {
                            categoryBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white shadow-sm">Absensi</span>;
                          } else {
                            categoryBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white shadow-sm">{catName}</span>;
                          }
                        }
                      } catch (e) { }
                    }
                  }
                }
                
                return { idx, task, isSpecific, isAbsensi, val, categoryBadge, origCat };
              });

              return (
                <>
                  <div className="overflow-x-auto hidden xl:block">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                          <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 w-12 text-center">NO</th>
                          <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 w-64">NAMA LENGKAP</th>
                          <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 w-72">PROFESI / JABATAN</th>
                          <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 uppercase">Indikator tugas / kinerja</th>
                          <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-32">KATEGORI</th>
                          <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-32">SKOR</th>
                          <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-[180px]">PENILAIAN</th>
                          <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-16">AKSI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowData.map((row) => (
                          <tr key={row.idx} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center text-sm font-medium text-slate-500 dark:text-slate-400">{row.idx + 1}</td>
                            <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-50">{selectedUser?.name}</td>
                            <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200">{selectedUser?.position || 'Belum ada jabatan'}</td>
                            <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-50">
                              <div className="line-clamp-2" title={row.task}>
                                {row.task}
                              </div>
                            </td>
                            <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                              {row.categoryBadge}
                            </td>
                            <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center font-bold text-amber-500">
                              {row.val > 0 ? row.val.toFixed(1) : "-"}
                            </td>
                            <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                              <StarRating score={row.val} />
                            </td>
                            <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                              {row.isAbsensi || row.isSpecific ? (
                                <div className="p-2 mx-auto flex items-center justify-center text-slate-300" title="Penilaian ini terhitung otomatis dan tidak dapat diedit manual">
                                  <AiOutlineStop size={18} />
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setManualStaffId(selectedStaff);
                                    setManualIndicatorName(row.task);
                                    setManualIndicatorScore(row.val);
                                    setManualCategory(row.origCat);
                                    setShowAddManualForm(true);
                                    setTimeout(() => {
                                      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }, 100);
                                  }}
                                  className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/50 transition-colors mx-auto flex items-center justify-center"
                                  title="Edit Penilaian Manual"
                                >
                                  <Edit size={18} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="xl:hidden flex flex-col divide-y divide-slate-100">
                    {rowData.map((row) => (
                      <div key={row.idx} className="p-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 pr-2">
                            <h3 className="font-bold text-slate-800 dark:text-slate-50 text-sm mb-1 line-clamp-2" title={row.task}>{row.task}</h3>
                          </div>
                          
                          <div className="shrink-0 flex flex-col items-end gap-2">
                            {row.categoryBadge}
                            {row.isAbsensi || row.isSpecific ? (
                              <div className="p-2 text-slate-300" title="Penilaian ini terhitung otomatis dan tidak dapat diedit manual">
                                <AiOutlineStop size={18} />
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setManualStaffId(selectedStaff);
                                  setManualIndicatorName(row.task);
                                  setManualIndicatorScore(row.val);
                                  setManualCategory(row.origCat);
                                  setShowAddManualForm(true);
                                  setTimeout(() => {
                                    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }, 100);
                                }}
                                className="p-2 rounded-lg text-amber-500 bg-amber-50/50 hover:bg-amber-100 dark:bg-amber-900/60 dark:hover:bg-amber-900/70 transition-colors"
                                title="Edit Penilaian Manual"
                              >
                                <Edit size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-2">
                            <div className="bg-amber-100 dark:bg-amber-900/60 p-1.5 rounded-full">
                              <Star size={14} className="text-amber-500 fill-amber-500" />
                            </div>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Skor</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-base font-extrabold text-amber-500">
                              {row.val > 0 ? row.val.toFixed(1) : "-"}
                            </span>
                            <div className="scale-75 origin-right">
                              <StarRating score={row.val} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

















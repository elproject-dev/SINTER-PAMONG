import React, { useState, useEffect, useRef } from 'react';
import { User, TaskReport, StaffTask } from '../../lib/types';
import { getUserTaskReports, saveTaskReport, getStaffTasks, updateTaskReport } from '../../lib/db';
import { KPIDictionary } from '../../lib/kpiDictionary';
import { ImagePlus, Search, Eye, ClipboardList, Edit, Star, Paperclip, MessageSquare, Loader2, SlidersHorizontal, X, Clock, CheckCircle2, XCircle, Layers, Download } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useRealtimeSubscription } from '../../lib/useRealtime';

interface BukuSakuProps {
  user: User;
}

export const BukuSaku: React.FC<BukuSakuProps> = ({ user }) => {
  const [taskReports, setTaskReports] = useState<TaskReport[]>([]);
  const [reportTaskName, setReportTaskName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLink, setReportLink] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showReportSuccess, setShowReportSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<TaskReport | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);

  // Filter States
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const filterPopupRef = useRef<HTMLDivElement>(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopupRef.current && !filterPopupRef.current.contains(event.target as Node)) {
        setShowFilterPopup(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToTop = () => {
    const container = document.getElementById('main-scroll-container');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDownload = async (url: string, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1].split('?')[0] || 'lampiran_tugas';
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      window.open(url, '_blank');
    }
  };

  const closeFormModal = () => {
    setEditingReportId(null);
    setReportTaskName('');
    setReportDescription('');
    setReportLink('');
    setShowForm(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [adminTasks, setAdminTasks] = useState<StaffTask[]>([]);

  const fetchReports = async () => {
    const reports = await getUserTaskReports(user.id);
    setTaskReports(reports);
  };

  const fetchAdminTasks = async () => {
    const tasks = await getStaffTasks(user.id);
    setAdminTasks(tasks);
  };

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        await fetchReports();
        await fetchAdminTasks();
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [user.id]);

  // Realtime: auto-refresh saat ada perubahan laporan atau tugas
  useRealtimeSubscription(['penilaian_tugas', 'tugas_staff'], () => {
    fetchReports();
    fetchAdminTasks();
  });


  const handleTaskReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTaskName || !reportDescription.trim()) return;

    if (editingReportId) {
      try {
        await updateTaskReport(editingReportId, reportTaskName, reportDescription, reportLink);
        setEditingReportId(null);
        setShowReportSuccess(true);
      } catch (err) {
        console.error(err);
        alert('Gagal memperbarui laporan.');
      }
    } else {
      const newReport: TaskReport = {
        id: crypto.randomUUID(),
        userId: user.id,
        date: new Date().toISOString().split('T')[0],
        taskName: reportTaskName,
        description: reportDescription,
        link: reportLink,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      await saveTaskReport(newReport);
      setShowReportSuccess(true);
    }

    // Reset form
    setReportTaskName('');
    setReportDescription('');
    setReportLink('');
    setShowForm(false);
    fetchReports();

    // Show success message briefly
    setTimeout(() => setShowReportSuccess(false), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024 || file.type.startsWith('video/')) {
        alert("Mohon maaf, unggah file/video secara langsung dibatasi maksimal 2MB. Untuk lampiran video atau dokumen besar, silakan unggah ke Google Drive / YouTube terlebih dahulu, lalu tempelkan (paste) tautannya di kolom yang tersedia.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      try {
        setIsUploading(true);
        const filePath = file.name;

        const { error: uploadError } = await supabase.storage
          .from('buku-saku-media')
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('buku-saku-media')
          .getPublicUrl(filePath);

        setReportLink(publicUrl);
      } catch (error) {
        console.error('Error uploading image: ', error);
        alert('Gagal mengunggah foto. Silakan coba lagi.');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  // Gabungkan tugas dari KPIDictionary dan tugas dari admin
  const kpiTasks = user.jobRoles?.length
    ? Array.from(new Set(user.jobRoles.flatMap(role => KPIDictionary[role] || [])))
    : [];

  const adminTaskNames = adminTasks.map(t => t.namaTugas);
  const availableTasks = Array.from(new Set([...adminTaskNames, ...kpiTasks]));

  if (availableTasks.length === 0) {
    availableTasks.push(...Array.from(new Set(Object.values(KPIDictionary).flat())));
  }

  const todayLocal = new Date().toLocaleDateString('en-CA');
  const todayUtc = new Date().toISOString().split('T')[0];

  const combinedTasks = [
    ...taskReports.map(r => ({ taskName: r.taskName, report: r, date: r.date })),
    ...availableTasks
      .filter(taskName => !taskReports.some(r => r.taskName === taskName && (r.date === todayLocal || r.date === todayUtc)))
      .map(taskName => ({ taskName, report: null, date: todayLocal }))
  ]
    .filter(t => {
      const matchesSearch = t.taskName.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      const statusForFilter = t.report ? (t.report.status || 'pending') : 'unassigned';

      if (filterStatus !== 'all') {
        matchesStatus = statusForFilter === filterStatus;
      }

      let matchesDate = true;
      const taskDate = new Date(t.date).toISOString().split('T')[0];
      if (filterStartDate && taskDate < filterStartDate) matchesDate = false;
      if (filterEndDate && taskDate > filterEndDate) matchesDate = false;

      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDetailClick = (report: TaskReport) => {
    setSelectedReport(report);
    setShowForm(false);
    scrollToTop();
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 mb-1 sm:mb-2 tracking-tight">Laporan KPI</h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-lg">Kirim dan pantau riwayat pelaporan kinerja harian Anda</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Cari tugas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-4 pl-10 text-slate-700 text-sm focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-medium"
            />
          </div>
        </div>
      </div>

      {showReportSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl flex items-center shadow-sm font-medium animate-in fade-in slide-in-from-top-4">
          <div className="mr-3 bg-emerald-100 p-1.5 rounded-full">✅</div>
          Laporan kegiatan berhasil dikirim!
        </div>
      )}

      {/* Form Inline Laporan Baru */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 animate-in fade-in slide-in-from-top-4">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <Edit size={18} className="text-school-blue" />
            <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">
              {editingReportId ? 'Revisi Laporan Kegiatan' : 'Input Laporan Baru'}
            </h3>
          </div>

          <form onSubmit={handleTaskReportSubmit} className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div className="space-y-4 flex flex-col h-full">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Jenis Tugas</label>
                  <input
                    type="text"
                    value={reportTaskName}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-500 font-bold text-sm outline-none cursor-not-allowed shadow-sm"
                  />
                </div>

                {(() => {
                  const matchingAdminTask = adminTasks.find(t => t.namaTugas === reportTaskName);
                  const label = <label className="block text-sm font-bold text-slate-700 mb-1.5">Instruksi & Lampiran Tugas</label>;

                  if (!matchingAdminTask || (!matchingAdminTask.deskripsi && !matchingAdminTask.lampiranUrl)) {
                    return (
                      <div className="flex flex-col">
                        {label}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-center items-center h-24 text-slate-400 text-sm font-medium">
                          <p className="text-xs text-slate-400 font-medium">Tidak ada instruksi khusus dari Admin</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="flex flex-col">
                      {label}
                      <div className={`bg-slate-50 border border-slate-200 rounded-xl p-3 h-24 overflow-y-auto custom-scrollbar text-sm text-slate-700 ${!matchingAdminTask.deskripsi ? 'flex items-center justify-start' : 'space-y-1.5'
                        }`}>
                        {matchingAdminTask.deskripsi && (
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{matchingAdminTask.deskripsi}</p>
                        )}
                        {matchingAdminTask.lampiranUrl && (
                          <div className={!matchingAdminTask.deskripsi ? 'shrink-0' : 'pt-1 shrink-0'}>
                            <a
                              href={matchingAdminTask.lampiranUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-school-blue font-bold hover:underline"
                            >
                              <Paperclip size={14} /> Lihat File Lampiran Tugas
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-4 flex flex-col h-full">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-bold text-slate-700">Tautan / Bukti Dokumen <span className="text-slate-400 font-medium">(Opsional)</span></label>
                    {reportLink && (
                      <a
                        href={reportLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-school-blue hover:text-blue-700 transition-colors p-1 rounded-full hover:bg-blue-50 flex items-center justify-center"
                        title="Periksa Bukti"
                      >
                        <Eye size={16} />
                      </a>
                    )}
                  </div>
                  <div className="relative group flex items-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute left-3 text-slate-400 hover:text-school-blue transition-colors cursor-pointer disabled:opacity-50"
                      title="Upload Foto"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <div className="w-5 h-5 border-2 border-school-blue border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <ImagePlus size={18} />
                      )}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*,video/*,application/pdf"
                      onChange={handleFileUpload}
                    />
                    <input
                      type="url"
                      value={reportLink}
                      onChange={(e) => setReportLink(e.target.value)}
                      placeholder="Link Drive, Dokumen, dll"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-4 pl-10 text-slate-700 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm text-sm"
                    />
                  </div>

                </div>

                <div className="flex flex-col">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Deskripsi Kegiatan <span className="text-rose-500">*</span></label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Ceritakan detail kegiatan yang dilakukan..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 h-24 resize-none focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={closeFormModal}
                className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className={`px-8 py-2 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 ${isUploading ? 'opacity-70 cursor-not-allowed bg-slate-400' :
                  editingReportId
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                    : 'bg-gradient-to-r from-school-blue to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  }`}
              >
                {isUploading ? 'Mengunggah...' : (editingReportId ? 'Simpan Revisi' : 'Kirim Laporan')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tampilan Detail Laporan (Inline Top-Level) */}
      {selectedReport && !showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
            <h2 className="font-bold text-slate-800 text-lg flex items-center">
              Detail Laporan Kegiatan
            </h2>
            <button
              onClick={() => setSelectedReport(null)}
              className="text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg"
            >
              Tutup Detail
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Kolom Kiri: Detail Laporan */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Status Laporan</p>
                  <span className={`inline-flex items-center px-3 py-1 mt-1 rounded-full text-xs font-bold ${selectedReport.status === 'reviewed' ? 'bg-emerald-500 text-white shadow-sm' :
                    selectedReport.status === 'rejected' ? 'bg-rose-500 text-white shadow-sm' :
                      'bg-orange-500 text-white shadow-sm'
                    }`}>
                    {selectedReport.status === 'reviewed' ? 'Disetujui' : selectedReport.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tanggal Kegiatan</p>
                  <p className="font-bold text-slate-700">{format(new Date(selectedReport.date), 'dd MMMM yyyy', { locale: id })}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Nama Laporan</p>
                <p className="font-bold text-slate-800 text-base">{selectedReport.taskName}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Deskripsi Kegiatan</p>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm text-slate-700 h-24 overflow-y-auto custom-scrollbar">
                  {selectedReport.description}
                </div>
              </div>

            </div>

            {/* Kolom Kanan: Tanggapan & Penilaian */}
            <div className="flex flex-col h-full">
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      <MessageSquare size={16} className="text-slate-400" /> Tanggapan Admin
                    </label>
                  </div>
                  <div className={`w-full h-[96px] text-sm bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-y-auto custom-scrollbar ${selectedReport.status === 'reviewed' ? 'text-emerald-700 font-medium' : selectedReport.status === 'rejected' ? 'text-rose-700 font-medium' : 'text-slate-500 italic'}`}>
                    {selectedReport.adminFeedback || 'Belum ada tanggapan dari admin.'}
                  </div>

                  {(selectedReport.link || (selectedReport.status === 'reviewed' && selectedReport.score)) && (
                    <div className="flex flex-col gap-3 pt-4 border-t border-slate-100 mt-4">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Lampiran Bukti</span>
                        {selectedReport.link ? (
                          <div className="flex items-center gap-3 mr-1">
                            <a
                              href={selectedReport.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-school-blue font-bold uppercase underline hover:text-blue-700 transition-colors"
                            >
                              <Paperclip size={12} /> Lihat Lampiran
                            </a>
                            <button
                              onClick={(e) => handleDownload(selectedReport.link!, e)}
                              className="inline-flex items-center gap-1 text-[10px] text-school-blue font-bold uppercase underline hover:text-blue-700 transition-colors cursor-pointer"
                            >
                              <Download size={12} /> Unduh
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold">-</span>
                        )}
                      </div>

                      {selectedReport.status === 'reviewed' && selectedReport.score && (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Penilaian Diberikan</span>
                          <div className="flex items-center gap-0.5 text-slate-300">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={`mod-${star}`}
                                size={14}
                                className={`${star <= selectedReport.score! ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300 stroke-current'}`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedReport.status === 'rejected' && (
                <div className="flex gap-3 pt-4 border-t border-slate-100 mt-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReportId(selectedReport.id);
                      setReportTaskName(selectedReport.taskName);
                      setReportDescription(selectedReport.description);
                      setReportLink(selectedReport.link || '');
                      setSelectedReport(null);
                      setShowForm(true);
                    }}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
                  >
                    <Edit size={16} /> Revisi Laporan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-row items-center justify-between gap-4 bg-white">
          <div className="flex items-center space-x-2 truncate">
            <ClipboardList size={20} className="text-slate-600 shrink-0" />
            <h2 className="font-bold text-slate-800 text-lg">Riwayat Pelaporan Hari Ini</h2>
          </div>

          <div className="flex items-center gap-2 relative" ref={filterPopupRef}>
            <button
              onClick={() => setShowFilterPopup(!showFilterPopup)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border transition-all ${showFilterPopup || filterStartDate || filterEndDate || filterStatus !== 'all'
                  ? 'bg-school-blue/10 border-school-blue text-school-blue shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm'
                }`}
            >
              <SlidersHorizontal size={16} />
              Filter
            </button>

            {/* Pop-up Filter */}
            {showFilterPopup && (
              <div className="absolute right-0 top-full mt-2 w-[calc(100vw-32px)] sm:w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 text-sm">Filter Data</h3>
                  <button onClick={() => setShowFilterPopup(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1 rounded-md transition-colors">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <input
                      type={filterStartDate ? "date" : "text"}
                      placeholder="Tanggal Mulai"
                      onFocus={(e) => {
                        e.target.type = 'date';
                        if ('showPicker' in e.target) {
                          (e.target as HTMLInputElement).showPicker();
                        }
                      }}
                      onBlur={(e) => {
                        if (!e.target.value) e.target.type = 'text';
                      }}
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-school-blue/20 outline-none text-slate-700 font-bold text-center cursor-pointer transition-all hover:bg-slate-100"
                    />
                  </div>
                  <div>
                    <input
                      type={filterEndDate ? "date" : "text"}
                      placeholder="Tanggal Akhir"
                      onFocus={(e) => {
                        e.target.type = 'date';
                        if ('showPicker' in e.target) {
                          (e.target as HTMLInputElement).showPicker();
                        }
                      }}
                      onBlur={(e) => {
                        if (!e.target.value) e.target.type = 'text';
                      }}
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-school-blue/20 outline-none text-slate-700 font-bold text-center cursor-pointer transition-all hover:bg-slate-100"
                    />
                  </div>
                  <div className="relative" ref={statusDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none text-slate-700 font-bold flex justify-center items-center transition-all hover:bg-slate-100 hover:border-slate-300 focus:ring-2 focus:ring-school-blue/20"
                    >
                      <span className="flex items-center gap-2">
                        {filterStatus === 'all' && 'Semua Status'}
                        {filterStatus === 'unassigned' && <><Clock size={16} className="text-slate-400" /> Tertunda</>}
                        {filterStatus === 'pending' && <><Clock size={16} className="text-amber-500" /> Menunggu</>}
                        {filterStatus === 'reviewed' && <><CheckCircle2 size={16} className="text-emerald-500" /> Disetujui</>}
                        {filterStatus === 'rejected' && <><XCircle size={16} className="text-rose-500" /> Ditolak</>}
                      </span>
                    </button>

                    {isStatusDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={() => { setFilterStatus('all'); setIsStatusDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-slate-50 ${filterStatus === 'all' ? 'text-school-blue bg-blue-50/50' : 'text-slate-700'}`}
                        >
                          <Layers size={16} className={filterStatus === 'all' ? 'text-school-blue' : 'text-slate-500'} /> Semua Status
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFilterStatus('unassigned'); setIsStatusDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-slate-50 ${filterStatus === 'unassigned' ? 'text-slate-700 bg-slate-100' : 'text-slate-700'}`}
                        >
                          <Clock size={16} className={filterStatus === 'unassigned' ? 'text-slate-500' : 'text-slate-400'} /> Tertunda
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFilterStatus('pending'); setIsStatusDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-slate-50 ${filterStatus === 'pending' ? 'text-amber-600 bg-amber-50/50' : 'text-slate-700'}`}
                        >
                          <Clock size={16} className={filterStatus === 'pending' ? 'text-amber-600' : 'text-amber-500'} /> Menunggu
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFilterStatus('reviewed'); setIsStatusDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-slate-50 ${filterStatus === 'reviewed' ? 'text-emerald-600 bg-emerald-50/50' : 'text-slate-700'}`}
                        >
                          <CheckCircle2 size={16} className={filterStatus === 'reviewed' ? 'text-emerald-600' : 'text-emerald-500'} /> Disetujui
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFilterStatus('rejected'); setIsStatusDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-slate-50 ${filterStatus === 'rejected' ? 'text-rose-600 bg-rose-50/50' : 'text-slate-700'}`}
                        >
                          <XCircle size={16} className={filterStatus === 'rejected' ? 'text-rose-600' : 'text-rose-500'} /> Ditolak
                        </button>
                      </div>
                    )}
                  </div>

                  {(filterStartDate || filterEndDate || filterStatus !== 'all') && (
                    <button
                      onClick={() => {
                        setFilterStartDate('');
                        setFilterEndDate('');
                        setFilterStatus('all');
                      }}
                      className="w-full mt-2 text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 py-2 rounded-lg transition-colors"
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
          <table className="w-full text-left border-collapse min-w-[800px] hidden md:table">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold border border-slate-200 w-12 text-center">NO</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-36">TANGGAL</th>
                <th className="px-4 py-3 font-bold border border-slate-200">NAMA TUGAS</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-44">STATUS</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-28">NILAI</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-28">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 border border-slate-200">
                    <div className="flex justify-center mb-3 text-school-blue">
                      <Loader2 size={32} className="animate-spin" />
                    </div>
                    <p className="font-bold text-lg text-slate-600 mb-1">Memuat Data...</p>
                  </td>
                </tr>
              ) : combinedTasks.length > 0 ? (
                combinedTasks.map((item, index) => {
                  const report = item.report;
                  const status = report ? report.status : 'not_done';

                  return (
                    <tr key={index} className={`transition-colors ${!report ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-50`}>
                      <td className="px-4 py-3 border border-slate-200 text-center text-sm font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center text-sm text-slate-700">
                        {format(new Date(item.date), 'dd MMM yyyy', { locale: id })}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-sm font-bold text-slate-800">
                        {item.taskName}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${status === 'pending' ? 'bg-orange-500 text-white shadow-sm' :
                          status === 'reviewed' ? 'bg-emerald-500 text-white shadow-sm' :
                            status === 'rejected' ? 'bg-rose-500 text-white shadow-sm' :
                              'bg-slate-500 text-white shadow-sm'
                          }`}>
                          {status === 'pending' ? 'Menunggu' :
                            status === 'reviewed' ? 'Disetujui' :
                              status === 'rejected' ? 'Ditolak' :
                                'Tertunda'}
                        </span>
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center">
                        <div className="flex items-center justify-center gap-0.5 text-slate-300" title={report?.score ? `Nilai: ${report.score} Bintang` : 'Belum Dinilai'}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={16}
                              className={`${report?.score && star <= report.score ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300'}`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center">
                        {report ? (
                          <button
                            onClick={() => handleDetailClick(report)}
                            title="Lihat Detail"
                            className="p-2 rounded-full text-school-blue hover:bg-blue-50 hover:text-blue-700 transition-colors inline-flex"
                          >
                            <Eye size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setReportTaskName(item.taskName);
                              setReportDescription('');
                              setReportLink('');
                              setShowForm(true);
                              setTimeout(scrollToTop, 50);
                            }}
                            title="Kerjakan Tugas"
                            className="p-2 rounded-full text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors inline-flex"
                          >
                            <Edit size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 border border-slate-200">
                    <div className="flex justify-center mb-2 text-slate-300">
                      <ClipboardList size={32} />
                    </div>
                    Belum ada tugas yang tersedia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">
                <div className="flex justify-center mb-3 text-school-blue">
                  <Loader2 size={32} className="animate-spin" />
                </div>
                <p className="font-bold text-lg text-slate-600 mb-1">Memuat Data...</p>
              </div>
            ) : combinedTasks.length > 0 ? (
              combinedTasks.map((item, index) => {
                const report = item.report;
                const status = report ? report.status : 'not_done';
                return (
                  <div key={index} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <h3 className="font-extrabold text-slate-800 text-sm leading-snug truncate" title={item.taskName}>{item.taskName}</h3>
                      
                      <div className="flex flex-col gap-1.5 mt-2">
                        <div className="flex items-center justify-between w-full">
                          <p className="text-[11px] font-bold text-slate-400">
                            {format(new Date(item.date), 'dd MMM yyyy', { locale: id })}
                          </p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nilai</span>
                        </div>
                        
                        <div className="flex items-center justify-between w-full mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${status === 'pending' ? 'bg-orange-500 text-white' :
                            status === 'reviewed' ? 'bg-emerald-500 text-white' :
                              status === 'rejected' ? 'bg-rose-500 text-white' :
                                'bg-slate-500 text-white'
                            }`}>
                            {status === 'pending' ? 'Menunggu' :
                              status === 'reviewed' ? 'Disetujui' :
                                status === 'rejected' ? 'Ditolak' :
                                  'Tertunda'}
                          </span>

                          <div className="flex items-center gap-0.5 text-slate-300" title={report?.score ? `Nilai: ${report.score} Bintang` : 'Belum Dinilai'}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={`mob-${star}`}
                                size={12}
                                className={`${report?.score && star <= report.score ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300 stroke-current'}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end w-full">
                      {report ? (
                        <button
                          onClick={() => {
                            handleDetailClick(report);
                            setTimeout(scrollToTop, 50);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-school-blue text-white shadow-sm hover:bg-blue-700 hover:shadow transition-all"
                        >
                          <Eye size={14} /> Lihat Detail Laporan
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setReportTaskName(item.taskName);
                            setReportDescription('');
                            setReportLink('');
                            setShowForm(true);
                            setTimeout(scrollToTop, 50);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 hover:shadow transition-all"
                        >
                          <Edit size={14} /> Kerjakan Sekarang
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-8 text-center text-slate-500">
                <div className="flex justify-center mb-2 text-slate-300">
                  <ClipboardList size={32} />
                </div>
                Belum ada tugas yang tersedia.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

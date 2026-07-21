import React, { useState, useEffect } from 'react';
import { TaskReport, User } from '../../lib/types';
import { getAllTaskReports, getUsers, updateTaskReportStatus, deleteTaskReport } from '../../lib/db';
import { CheckCircle2, XCircle, Clock, BookOpen, MessageSquare, Search, Eye, Star, Paperclip, User as UserIcon, Edit, Trash2, SlidersHorizontal, X, Layers, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useRealtimeSubscription } from '../../lib/useRealtime';

export const AdminReviewLaporanTugas: React.FC = () => {
  const [reports, setReports] = useState<(TaskReport & { user?: User })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const filterPopupRef = React.useRef<HTMLDivElement>(null);
  const statusDropdownRef = React.useRef<HTMLDivElement>(null);

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

  // States for Review Form
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState<number | ''>('');

  // State for Re-evaluating
  const [isReevaluating, setIsReevaluating] = useState(false);

  const handleEditClick = (report: TaskReport) => {
    setSelectedReportId(report.id);
    setFeedback(report.adminFeedback || '');
    setScore(report.score ?? '');
    setIsReevaluating(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteReport = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus laporan ini?')) {
      try {
        await deleteTaskReport(id);
        if (selectedReportId === id) setSelectedReportId(null);
        fetchData();
      } catch (err) {
        console.error(err);
        alert('Gagal menghapus laporan.');
      }
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const allUsers = await getUsers();
      const userMap: Record<string, User> = {};
      allUsers.forEach(u => userMap[u.id] = u);

      const allReports = await getAllTaskReports();
      const sortedReports = allReports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReports(sortedReports.map(r => ({ ...r, user: userMap[r.userId] })));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useRealtimeSubscription(['penilaian_tugas'], fetchData);

  const handleStatusUpdate = async (reportId: string, status: 'reviewed' | 'rejected') => {
    if (status === 'rejected' && !feedback.trim()) {
      alert('Mohon berikan komentar/alasan penolakan terlebih dahulu.');
      return;
    }

    if (status === 'reviewed' && (score === '' || score === 0)) {
      alert('Mohon berikan penilaian (1-5 Bintang) untuk laporan ini.');
      return;
    }

    const finalScore = status === 'reviewed' ? Number(score) : null;
    await updateTaskReportStatus(reportId, status, feedback, finalScore);

    setFeedback('');
    setScore('');
    setSelectedReportId(null);
    setIsReevaluating(false);
    fetchData();
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Gagal mengunduh file:', error);
      window.open(url, '_blank');
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = (r.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.taskName || '').toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    const currentStatus = r.status || 'pending';

    if (filterStatus !== 'all') {
      matchesStatus = currentStatus === filterStatus;
    }

    let matchesDate = true;
    if (r.date) {
      const taskDate = new Date(r.date).toISOString().split('T')[0];
      if (filterStartDate && taskDate < filterStartDate) matchesDate = false;
      if (filterEndDate && taskDate > filterEndDate) matchesDate = false;
    } else if (filterStartDate || filterEndDate) {
      matchesDate = false;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleReviewClick = (report: TaskReport & { user?: User }) => {
    if (selectedReportId === report.id) {
      setSelectedReportId(null);
      setIsReevaluating(false);
    } else {
      setSelectedReportId(report.id);
      setFeedback(report.adminFeedback || '');
      setScore(report.score ?? '');
      setIsReevaluating(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const selectedReport = reports.find(r => r.id === selectedReportId);

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 mb-1 sm:mb-2 tracking-tight">Penilaian Tugas</h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-lg">Berikan penilaian dan verifikasi laporan kegiatan harian staf</p>
        </div>

        <div className="relative w-full md:w-72 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Cari nama staf atau tugas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-4 pl-10 text-slate-700 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-medium text-sm"
          />
        </div>
      </div>

      {/* Form Review Compact */}
      {selectedReport && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
            <h2 className="font-bold text-slate-800 text-lg flex items-center">
              {isReevaluating ? 'Edit Penilaian Laporan' : 'Tinjau Laporan'}
            </h2>
            <button
              onClick={() => {
                setSelectedReportId(null);
                setIsReevaluating(false);
              }}
              className="text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg"
            >
              Tutup Form
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Kolom Kiri: Detail Laporan */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Dilaporkan Oleh</p>
                  <p className="font-bold text-school-blue">{selectedReport.user?.name || 'Staf Tidak Dikenal'}</p>
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

            {/* Kolom Kanan: Form Aksi */}
            <div className="flex flex-col h-full">
              {(selectedReport.status === 'pending' || isReevaluating) ? (
                <>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <MessageSquare size={16} className="text-slate-400" /> Catatan / Tanggapan Admin
                      </label>
                      <textarea
                        placeholder="Masukkan catatan persetujuan atau alasan penolakan..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full h-[74px] text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue transition-all resize-none"
                      />
                    </div>

                    <div className="flex items-start justify-between pt-3 border-t border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Lampiran Bukti</span>
                        {selectedReport.link ? (
                          <div className="flex items-center gap-2 mt-2">
                            <a
                              href={selectedReport.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-school-blue hover:text-blue-700 hover:underline transition-all"
                            >
                              <Eye size={14} /> Lihat
                            </a>
                            <span className="text-slate-300 mx-1">•</span>
                            <button
                              type="button"
                              onClick={() => {
                                const ext = selectedReport.link!.split('.').pop()?.split('?')[0] || 'jpg';
                                handleDownload(selectedReport.link!, `bukti-${selectedReport.id}.${ext}`);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 hover:underline transition-all"
                            >
                              <Download size={14} /> Unduh
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic mt-1">Tidak ada lampiran</span>
                        )}
                      </div>

                      <div className="flex flex-col items-end">
                        <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 text-right">
                          Penilaian Kinerja
                        </label>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 w-fit shadow-sm">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={24}
                              onClick={() => setScore(star)}
                              className={`cursor-pointer transition-transform hover:scale-110 ${(score !== '' && star <= (score as number))
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-transparent text-slate-300 hover:text-amber-400'
                                }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100 mt-auto">
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(selectedReport.id, 'reviewed')}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
                    >
                      <CheckCircle2 size={16} /> Setujui
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(selectedReport.id, 'rejected')}
                      className="flex-1 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
                    >
                      <XCircle size={16} /> Tolak
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col justify-center">
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Tanggapan Admin</p>
                    <p className="text-sm font-semibold text-slate-700">{selectedReport.adminFeedback || '-'}</p>
                  </div>

                  <div className="flex items-start justify-between pt-4 border-t border-slate-200">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Lampiran Bukti</span>
                      {selectedReport.link ? (
                        <div className="flex items-center gap-2 mt-2">
                          <a
                            href={selectedReport.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-school-blue hover:text-blue-700 hover:underline transition-all"
                          >
                            <Eye size={14} /> Lihat
                          </a>
                          <span className="text-slate-300 mx-1">•</span>
                          <button
                            type="button"
                            onClick={() => {
                              const ext = selectedReport.link!.split('.').pop()?.split('?')[0] || 'jpg';
                              handleDownload(selectedReport.link!, `bukti-${selectedReport.id}.${ext}`);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 hover:underline transition-all"
                          >
                            <Download size={14} /> Unduh
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic mt-1">Tidak ada lampiran</span>
                      )}
                    </div>

                    <div className="flex flex-col items-end">
                      {selectedReport.status === 'reviewed' && selectedReport.score && (
                        <div className="flex flex-col items-end mb-3">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Penilaian</p>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={16}
                                className={`${star <= selectedReport.score! ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300 stroke-current'}`}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider -mr-1 ${selectedReport.status === 'reviewed'
                        ? 'bg-emerald-500 text-white border border-emerald-600 shadow-sm'
                        : 'bg-rose-500 text-white border border-rose-600 shadow-sm'
                        }`}>
                        {selectedReport.status === 'reviewed' ? 'Telah Disetujui' : 'Telah Ditolak'}
                      </span>
                    </div>
                  </div>

                  {!isReevaluating && (
                    <div className="mt-5 pt-4 border-t border-slate-200 flex justify-end">
                      <button
                        onClick={() => setIsReevaluating(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-school-blue hover:text-blue-700 hover:underline transition-all"
                      >
                        <Edit size={14} /> Menilai Ulang
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-row items-center justify-between gap-4 bg-white">
          <div className="flex items-center space-x-2 truncate">
            <BookOpen size={20} className="text-slate-600 shrink-0" />
            <h2 className="font-bold text-slate-800 text-lg">Daftar Laporan</h2>
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
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 text-sm">
                    Filter Data
                  </h3>
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
                      min={filterStartDate}
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
                        {filterStatus === 'pending' && <><Clock size={16} className="text-amber-500" /> Menunggu Review</>}
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
                          onClick={() => { setFilterStatus('pending'); setIsStatusDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-slate-50 ${filterStatus === 'pending' ? 'text-amber-600 bg-amber-50/50' : 'text-slate-700'}`}
                        >
                          <Clock size={16} className={filterStatus === 'pending' ? 'text-amber-600' : 'text-amber-500'} /> Menunggu Review
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
                </div>

                <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setFilterStartDate('');
                      setFilterEndDate('');
                      setFilterStatus('all');
                    }}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 px-2 py-1.5 rounded-md hover:bg-rose-50 transition-colors"
                  >
                    Reset Filter
                  </button>
                  <button
                    onClick={() => setShowFilterPopup(false)}
                    className="bg-school-blue text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="w-full text-left border-collapse min-w-[900px] hidden md:table">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold border border-slate-200 w-12 text-center">NO</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-36">TANGGAL</th>
                <th className="px-4 py-3 font-bold border border-slate-200">NAMA LAPORAN</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-32">LAMPIRAN</th>
                <th className="px-4 py-3 font-bold border border-slate-200 w-1/4">DILAPORKAN OLEH</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-28">STATUS</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-[120px]">PENILAIAN</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-20">PERIKSA</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-28">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500 border border-slate-200">
                    <div className="flex justify-center mb-3 text-school-blue">
                      <Loader2 size={32} className="animate-spin" />
                    </div>
                    <p className="font-bold text-lg text-slate-600 mb-1">Memuat Data...</p>
                  </td>
                </tr>
              ) : filteredReports.length > 0 ? (
                filteredReports.map((report, index) => (
                  <tr
                    key={report.id}
                    className={`transition-colors ${selectedReportId === report.id ? 'bg-amber-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-4 py-3 border border-slate-200 text-center text-sm font-medium text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center text-sm text-slate-700">
                      {format(new Date(report.date), 'dd MMM yyyy', { locale: id })}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-sm font-bold text-slate-800 max-w-xs truncate" title={report.taskName}>
                      {report.taskName}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      {report.link ? (
                        <a href={report.link} target="_blank" rel="noopener noreferrer" className="text-school-blue hover:text-blue-700 transition-colors inline-block" title="Lihat Lampiran">
                          <Paperclip size={18} />
                        </a>
                      ) : (
                        <span className="text-slate-400 font-bold">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-sm text-slate-800">
                      <div className="font-bold text-school-blue">{report.user?.name || 'Staf Tidak Dikenal'}</div>
                      <div className="text-xs text-slate-500 font-medium">{report.user?.position || 'Belum ada jabatan'}</div>
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${report.status === 'reviewed'
                        ? 'bg-emerald-500 text-white shadow-sm border border-emerald-600'
                        : report.status === 'rejected'
                          ? 'bg-rose-500 text-white shadow-sm border border-rose-600'
                          : 'bg-orange-500 text-white shadow-sm border border-orange-600'
                        }`}>
                        {report.status === 'reviewed' ? 'Disetujui' : report.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                      </span>
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      <div className="flex items-center justify-center gap-0.5 text-slate-300">
                        {report.score ? (
                          [1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} size={16} className={`${star <= report.score! ? 'fill-amber-400 text-amber-400' : 'fill-transparent stroke-current'}`} />
                          ))
                        ) : (
                          [1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} size={16} className="fill-transparent stroke-current" />
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      <button
                        onClick={() => handleReviewClick(report)}
                        title={selectedReportId === report.id ? "Tutup Form" : "Tinjau Laporan"}
                        className={`p-2 transition-colors inline-flex justify-center items-center ${selectedReportId === report.id
                          ? 'text-amber-600'
                          : 'text-slate-400 hover:text-slate-700 bg-transparent'
                          }`}
                      >
                        <Eye size={20} />
                      </button>
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(report)}
                          title="Edit Laporan"
                          className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          title="Hapus Laporan"
                          className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500 border border-slate-200">
                    <div className="flex justify-center mb-3 text-slate-300">
                      <BookOpen size={48} strokeWidth={1} />
                    </div>
                    <p className="font-bold text-lg text-slate-600 mb-1">Tidak Ada Laporan</p>
                    <p className="text-sm">Tidak ada laporan yang ditemukan berdasarkan pencarian atau filter.</p>
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
            ) : filteredReports.length > 0 ? (
              filteredReports.map(report => (
                <div key={report.id} className={`p-4 transition-colors flex flex-col gap-3 ${selectedReportId === report.id ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col min-w-0">
                      <h3 className="font-extrabold text-slate-800 text-base leading-snug truncate">{report.taskName}</h3>
                      <p className="text-xs font-bold text-slate-400 mt-1 truncate">
                        {format(new Date(report.date), 'dd MMM yyyy', { locale: id })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider ${report.status === 'reviewed'
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                      : report.status === 'rejected'
                        ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                        : 'bg-orange-500 text-white border-orange-600 shadow-sm'
                      }`}>
                      {report.status === 'reviewed' ? 'Disetujui' : report.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Lampiran</span>
                    {report.link ? (
                      <a href={report.link} target="_blank" rel="noopener noreferrer" className="text-school-blue hover:text-blue-700 hover:underline transition-colors flex items-center gap-1 text-[10px] uppercase font-bold mr-1" title="Lihat Lampiran">
                        <Paperclip size={12} /> Lampiran
                      </a>
                    ) : (
                      <span className="text-slate-400 font-bold text-xs mr-1">-</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-lg border border-slate-200 mt-1">
                    <div>
                      <p className="text-sm font-bold text-school-blue leading-tight">{report.user?.name || 'Staf Tidak Dikenal'}</p>
                      <p className="text-xs text-slate-500">{report.user?.position || 'Belum ada jabatan'}</p>
                    </div>
                    <div className="bg-white p-2 rounded-full shadow-sm border border-slate-200 text-slate-400 shrink-0">
                      <UserIcon size={16} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Penilaian</span>
                      <div className="flex items-center gap-0.5 text-slate-300">
                        {report.score ? (
                          [1, 2, 3, 4, 5].map((star) => (
                            <Star key={`mobile-${star}`} size={14} className={`${star <= report.score! ? 'fill-amber-400 text-amber-400' : 'fill-transparent stroke-current'}`} />
                          ))
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/50">Belum Dinilai</span>
                        )}
                      </div>
                    </div>

                    {/* Tombol aksi dipindahkan ke samping penilaian */}
                    <div className="flex items-center shrink-0">
                      <button
                        onClick={() => handleEditClick(report)}
                        className="p-2 text-slate-400 hover:text-school-blue transition-colors rounded-full bg-slate-50"
                        title="Edit Laporan"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-full bg-slate-50 ml-1"
                        title="Hapus Laporan"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 mt-1">
                    <button
                      onClick={() => handleReviewClick(report)}
                      className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border ${selectedReportId === report.id
                        ? 'bg-school-blue text-white shadow-sm border-blue-600 hover:bg-blue-700'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      <Eye size={16} /> {selectedReportId === report.id ? 'Tutup Review' : 'Periksa Laporan'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                <div className="flex justify-center mb-2 text-slate-300">
                  <BookOpen size={32} />
                </div>
                Tidak ada laporan yang ditemukan berdasarkan filter pencarian Anda.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { TaskReport, User, TaskAttachment } from '../../lib/types';
import { getAllTaskReports, getUsers, updateTaskReportStatus, deleteTaskReport, getTaskAttachments, updateTaskAttachmentScore, updateTaskReportScore } from '../../lib/db';
import { CheckCircle2, XCircle, BookOpen, Search, Eye, Star, Paperclip, Edit, Trash2, SlidersHorizontal, X, Download, Loader2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useRealtimeSubscription } from '../../lib/useRealtime';
import { StarRating } from '../../components/StarRating';

export const AdminReviewLaporanTugas: React.FC = () => {
  const [reports, setReports] = useState<(TaskReport & { user?: User })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  // Filter States
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const filterPopupRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopupRef.current && !filterPopupRef.current.contains(event.target as Node)) {
        setShowFilterPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // States for Review Form
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // State for attachments
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isAttachmentsLoading, setIsAttachmentsLoading] = useState(false);

  // State for Attachment Review Modal
  type AttachmentToReview = TaskAttachment & { isPrimary?: boolean };
  const [selectedAttachmentForReview, setSelectedAttachmentForReview] = useState<AttachmentToReview | null>(null);
  const [modalScore, setModalScore] = useState<number | ''>('');
  const [modalFeedback, setModalFeedback] = useState('');
  const [isSavingAttachment, setIsSavingAttachment] = useState(false);

  const fetchAttachments = async (targetReport: TaskReport) => {
    setIsAttachmentsLoading(true);
    try {
      // Cari semua laporan dari user yang sama untuk tugas yang sama
      const relatedReports = reports.filter(r =>
        r.userId === targetReport.userId &&
        r.taskName === targetReport.taskName
      );

      const allHistory: TaskAttachment[] = [];

      // Kumpulkan semua link laporan utama dan lampiran tambahannya
      for (const r of relatedReports) {
        // Tambahkan laporan lain sebagai lampiran (kecuali laporan yang sedang dipilih)
        if (r.link && r.id !== targetReport.id) {
          allHistory.push({
            id: r.id,
            reportId: r.id,
            userId: r.userId,
            link: r.link,
            catatan: `Update Laporan Utama`,
            createdAt: r.createdAt,
            score: r.score ?? undefined,
            status: r.status,
            isPrimary: true
          });
        }

        // Ambil lampiran_tugas dari masing-masing laporan
        const data = await getTaskAttachments(r.id);
        allHistory.push(...data);
      }

      // Urutkan berdasarkan waktu (lama ke baru)
      allHistory.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      setAttachments(allHistory);
    } finally {
      setIsAttachmentsLoading(false);
    }
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

  useRealtimeSubscription(['penilaian_tugas', 'lampiran_tugas'], () => {
    fetchData();
    if (selectedReportId) {
      const currentReport = reports.find(r => r.id === selectedReportId);
      if (currentReport) fetchAttachments(currentReport);
    }
  });



  const handleSaveAttachmentStatus = async (status: 'reviewed' | 'rejected') => {
    if (!selectedAttachmentForReview) return;

    if (status === 'rejected' && !modalFeedback.trim()) {
      alert('Mohon berikan komentar/alasan penolakan terlebih dahulu.');
      return;
    }

    if (status === 'reviewed' && (modalScore === '' || modalScore === 0)) {
      alert('Mohon berikan penilaian (1-5 Bintang) untuk lampiran ini.');
      return;
    }

    setIsSavingAttachment(true);
    try {
      const finalScore = status === 'reviewed' ? Number(modalScore) : null;

      if (selectedAttachmentForReview.isPrimary) {
        // Update laporan utama
        if (finalScore !== null) {
          await updateTaskReportScore(selectedAttachmentForReview.id, finalScore);
        }
        await updateTaskReportStatus(selectedAttachmentForReview.id, status, modalFeedback, finalScore);
      } else {
        // Update lampiran_tugas
        await updateTaskAttachmentScore(selectedAttachmentForReview.id, finalScore, modalFeedback, status);
      }

      // Refresh
      if (selectedReportId) {
        const currentReport = reports.find(r => r.id === selectedReportId);
        if (currentReport) await fetchAttachments(currentReport);
      }
      fetchData();
      setSelectedAttachmentForReview(null);
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan status lampiran.');
    } finally {
      setIsSavingAttachment(false);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    if (downloadingUrl) return;
    setDownloadingUrl(url);
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
    } finally {
      setDownloadingUrl(null);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = (r.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.taskName || '').toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;

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

  const handleReviewClick = async (report: TaskReport & { user?: User }) => {
    if (selectedReportId === report.id) {
      setSelectedReportId(null);
      setAttachments([]);
    } else {
      setSelectedReportId(report.id);
      await fetchAttachments(report);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const selectedReport = reports.find(r => r.id === selectedReportId);

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 dark:text-slate-50 mb-1 sm:mb-2 tracking-tight">Penilaian Tugas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base lg:text-lg">Berikan penilaian dan verifikasi laporan kegiatan harian staf</p>
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
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pr-4 pl-10 text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-medium text-sm"
          />
        </div>
      </div>

      {/* Form Review Compact */}
      {selectedReport && (
        <>
          {/* Tabel Riwayat Lampiran - Card Terpisah */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-t-xl">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Paperclip size={20} className="text-slate-600 dark:text-slate-300" />
                <h2 className="font-bold text-slate-800 dark:text-slate-50 text-lg">Riwayat Lampiran ({(selectedReport.link ? 1 : 0) + attachments.length})</h2>
              </div>
              <button
                onClick={() => {
                  setSelectedReportId(null);
                }}
                className="w-full sm:w-auto text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg text-center"
              >
                Tutup Form
              </button>
            </div>

            {/* Inline Panel Penilaian */}
            {selectedAttachmentForReview && (
              <div id="panel-penilaian" className="bg-amber-50/30 p-6 border-b border-amber-100 animate-in fade-in slide-in-from-top-2 relative">
                <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 dark:text-slate-50 flex items-center gap-2 text-base sm:text-lg mb-1">
                      <Edit size={20} className="text-amber-500 shrink-0" />
                      <span className="truncate">Panel Penilaian Lampiran</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Beri nilai dan tanggapan untuk pembaruan tanggal <span className="font-bold text-slate-700 dark:text-slate-200">{format(new Date(selectedAttachmentForReview.createdAt), 'dd MMMM yyyy, HH:mm', { locale: id })}</span>
                    </p>
                  </div>
                  
                  {selectedAttachmentForReview.link && (
                    <div className="flex items-center gap-2 shrink-0">
                      <a 
                        href={selectedAttachmentForReview.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-school-blue dark:text-white hover:text-blue-700 dark:hover:text-slate-300 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors rounded-xl shadow-sm flex items-center justify-center" 
                        title="Lihat Lampiran"
                      >
                        <Paperclip size={18} />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          const link = selectedAttachmentForReview.link!;
                          const fileName = decodeURIComponent(link.split('/').pop()?.split('?')[0] || `lampiran-${selectedAttachmentForReview.id}`);
                          handleDownload(link, fileName);
                        }}
                        disabled={downloadingUrl === selectedAttachmentForReview.link}
                        className={`p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors rounded-xl shadow-sm flex items-center justify-center ${downloadingUrl === selectedAttachmentForReview.link ? 'text-school-blue dark:text-white cursor-wait' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700'}`}
                        title="Unduh Lampiran"
                      >
                        {downloadingUrl === selectedAttachmentForReview.link ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 mb-5">
                  {/* Kolom Kiri: Catatan Guru */}
                  <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      Catatan Guru
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                      {selectedAttachmentForReview.catatan || '-'}
                    </p>
                  </div>

                  {/* Kolom Kanan: Bintang Penilaian */}
                  <div className="flex flex-col justify-center items-start md:items-end shrink-0 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Beri Penilaian</p>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={28}
                          onClick={() => setModalScore(star)}
                          className={`cursor-pointer transition-transform hover:scale-110 ${(modalScore !== '' && star <= (modalScore as number))
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-transparent text-slate-300 hover:text-amber-400'
                            }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                     Tanggapan Admin (Opsional)
                  </label>
                  <textarea
                    placeholder="Tuliskan alasan penolakan atau tanggapan Anda di sini..."
                    value={modalFeedback}
                    onChange={(e) => setModalFeedback(e.target.value)}
                    className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:bg-white dark:bg-slate-800 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue transition-all resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => handleSaveAttachmentStatus('rejected')}
                    disabled={isSavingAttachment}
                    className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    {isSavingAttachment ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />} 
                    Tolak
                  </button>
                  <button
                    onClick={() => handleSaveAttachmentStatus('reviewed')}
                    disabled={isSavingAttachment}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    {isSavingAttachment ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} 
                    Setujui
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto hidden lg:block">
              <table className="w-full text-left border-collapse text-sm min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 w-12 text-center">NO</th>
                    <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-36">TANGGAL</th>
                    <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-28">JAM</th>
                    <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700">NAMA TUGAS</th>
                    <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 w-80">CATATAN</th>
                    <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-28">STATUS</th>
                    <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-32">NILAI</th>
                    <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-16">SKOR</th>
                    <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-24">AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {isAttachmentsLoading ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-center mb-3 text-school-blue dark:text-white">
                          <Loader2 size={32} className="animate-spin" />
                        </div>
                        <p className="font-bold text-lg text-slate-600 dark:text-slate-300 mb-1">Memuat Lampiran...</p>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {selectedReport.link && (
                        <tr className={`transition-all ${selectedAttachmentForReview?.isPrimary ? 'bg-blue-50/80 dark:bg-blue-900/40 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800'}`}>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center text-sm font-medium text-slate-500 dark:text-slate-400">1</td>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center text-sm text-slate-700 dark:text-slate-200">{format(new Date(selectedReport.createdAt), 'dd MMM yyyy', { locale: id })}</td>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center text-sm font-bold text-slate-600 dark:text-slate-300">{format(new Date(selectedReport.createdAt), 'HH:mm', { locale: id })}</td>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-50">{selectedReport.taskName}</td>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm w-80 text-center">-</td>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                            <div className="flex items-center justify-center">
                              {selectedReport.status === 'reviewed' ? (
                                <span title="Disetujui"><CheckCircle2 size={20} className="fill-emerald-500 text-white" /></span>
                              ) : selectedReport.status === 'rejected' ? (
                                <span title="Ditolak"><XCircle size={20} className="fill-rose-500 text-white" /></span>
                              ) : (
                                <span title="Tertunda"><Clock size={20} className="fill-slate-400 text-white" /></span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <StarRating score={selectedReport.score} size={16} className="flex items-center gap-0.5" />
                            </div>
                          </td>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center font-bold text-amber-500">
                            {selectedReport.score ? Number(selectedReport.score).toFixed(1) : '-'}
                          </td>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAttachmentForReview({
                                  id: selectedReport.id,
                                  reportId: selectedReport.id,
                                  userId: selectedReport.userId,
                                  link: selectedReport.link!,
                                  catatan: '',
                                  score: selectedReport.score ?? undefined,
                                  adminFeedback: selectedReport.adminFeedback,
                                  createdAt: selectedReport.createdAt,
                                  isPrimary: true
                                });
                                setModalScore(selectedReport.score || '');
                                setModalFeedback(selectedReport.adminFeedback || '');
                                setTimeout(() => document.getElementById('panel-penilaian')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
                              }}
                              className="text-amber-500 hover:text-amber-600 transition-colors inline-block"
                              title="Beri Penilaian"
                            >
                              <Edit size={18} />
                            </button>
                          </td>
                        </tr>
                      )}
                      {attachments.map((att, idx) => (
                        <tr key={att.id} className={`transition-all ${(!selectedAttachmentForReview?.isPrimary && selectedAttachmentForReview?.id === att.id) ? 'bg-blue-50/80 dark:bg-blue-900/40 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800'}`}>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center text-sm font-medium text-slate-500 dark:text-slate-400">{(selectedReport.link ? 1 : 0) + idx + 1}</td>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center text-sm text-slate-700 dark:text-slate-200">{format(new Date(att.createdAt), 'dd MMM yyyy', { locale: id })}</td>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center text-sm font-bold text-slate-600 dark:text-slate-300">{format(new Date(att.createdAt), 'HH:mm', { locale: id })}</td>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-50">{selectedReport.taskName}</td>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm w-80 max-w-[320px] truncate" title={att.catatan}>{att.catatan || '-'}</td>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                            <div className="flex items-center justify-center">
                              {att.status === 'reviewed' ? (
                                <span title="Disetujui"><CheckCircle2 size={20} className="fill-emerald-500 text-white" /></span>
                              ) : att.status === 'rejected' ? (
                                <span title="Ditolak"><XCircle size={20} className="fill-rose-500 text-white" /></span>
                              ) : (
                                <span title="Tertunda"><Clock size={20} className="fill-slate-400 text-white" /></span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <StarRating score={att.score} size={16} className="flex items-center gap-0.5" />
                            </div>
                          </td>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center font-bold text-amber-500">
                            {att.score ? Number(att.score).toFixed(1) : '-'}
                          </td>
                          <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAttachmentForReview({
                                    ...att,
                                    isPrimary: false
                                  });
                                  setModalScore(att.score || '');
                                  setModalFeedback(att.adminFeedback || '');
                                  setTimeout(() => document.getElementById('panel-penilaian')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
                                }}
                                className="text-amber-500 hover:text-amber-600 transition-colors inline-block"
                                title="Beri Penilaian"
                              >
                                <Edit size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!selectedReport.link && attachments.length === 0 && (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            Belum ada lampiran.
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View for Lampiran */}
            <div className="lg:hidden flex flex-col divide-y divide-slate-100">
              {isAttachmentsLoading ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex justify-center mb-3 text-school-blue dark:text-white">
                    <Loader2 size={32} className="animate-spin" />
                  </div>
                  <p className="font-bold text-lg text-slate-600 dark:text-slate-300 mb-1">Memuat Lampiran...</p>
                </div>
              ) : (
                <>
                  {selectedReport.link && (
                    <div className={`p-4 transition-colors flex flex-col gap-3 ${selectedAttachmentForReview?.isPrimary ? 'bg-blue-50/80 dark:bg-blue-900/40 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800'}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col min-w-0">
                          <p className="text-xs font-bold text-slate-400 truncate">
                            {format(new Date(selectedReport.createdAt), 'dd MMM yyyy, HH:mm', { locale: id })}
                          </p>
                          <h3 className="font-extrabold text-slate-800 dark:text-slate-50 text-sm mt-1 leading-snug">{selectedReport.taskName}</h3>
                        </div>
                        <div className="shrink-0 flex items-center justify-center">
                          {selectedReport.status === 'reviewed' ? (
                            <CheckCircle2 size={20} className="text-emerald-500" />
                          ) : selectedReport.status === 'rejected' ? (
                            <XCircle size={20} className="text-rose-500" />
                          ) : (
                            <Clock size={20} className="text-slate-400" />
                          )}
                        </div>
                      </div>

                      <div className="mt-1 border-b border-slate-100 dark:border-slate-700 pb-2">
                         <p className="text-sm text-slate-700 dark:text-slate-200 italic">-</p>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Penilaian</span>
                          <div className="flex items-center gap-0.5 text-slate-300">
                            {selectedReport.score ? (
                              <>
                                <StarRating score={selectedReport.score} size={14} className="flex items-center gap-0.5 text-slate-300" />
                                <span className="ml-1 text-xs font-bold text-amber-500">{Number(selectedReport.score).toFixed(1)}</span>
                              </>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700/50">Belum Dinilai</span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAttachmentForReview({
                              id: selectedReport.id,
                              reportId: selectedReport.id,
                              userId: selectedReport.userId,
                              link: selectedReport.link!,
                              catatan: '',
                              score: selectedReport.score ?? undefined,
                              adminFeedback: selectedReport.adminFeedback,
                              createdAt: selectedReport.createdAt,
                              isPrimary: true
                            });
                            setModalScore(selectedReport.score || '');
                            setModalFeedback(selectedReport.adminFeedback || '');
                            setTimeout(() => document.getElementById('panel-penilaian')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
                          }}
                          className="p-2 transition-colors rounded-full text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/50 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          title="Beri Penilaian"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {attachments.map((att) => (
                    <div key={att.id} className={`p-4 transition-colors flex flex-col gap-3 ${(!selectedAttachmentForReview?.isPrimary && selectedAttachmentForReview?.id === att.id) ? 'bg-blue-50/80 dark:bg-blue-900/40 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800'}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col min-w-0">
                          <p className="text-xs font-bold text-slate-400 truncate">
                            {format(new Date(att.createdAt), 'dd MMM yyyy, HH:mm', { locale: id })}
                          </p>
                          <h3 className="font-extrabold text-slate-800 dark:text-slate-50 text-sm mt-1 leading-snug">{selectedReport.taskName}</h3>
                        </div>
                        <div className="shrink-0 flex items-center justify-center">
                          {att.status === 'reviewed' ? (
                            <CheckCircle2 size={20} className="text-emerald-500" />
                          ) : att.status === 'rejected' ? (
                            <XCircle size={20} className="text-rose-500" />
                          ) : (
                            <Clock size={20} className="text-slate-400" />
                          )}
                        </div>
                      </div>

                      <div className="mt-1 border-b border-slate-100 dark:border-slate-700 pb-2">
                         <p className="text-sm text-slate-700 dark:text-slate-200">{att.catatan || '-'}</p>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Penilaian</span>
                          <div className="flex items-center gap-0.5 text-slate-300">
                            {att.score ? (
                              <>
                                <StarRating score={att.score} size={14} className="flex items-center gap-0.5 text-slate-300" />
                                <span className="ml-1 text-xs font-bold text-amber-500">{Number(att.score).toFixed(1)}</span>
                              </>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700/50">Belum Dinilai</span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAttachmentForReview({
                              ...att,
                              isPrimary: false
                            });
                            setModalScore(att.score || '');
                            setModalFeedback(att.adminFeedback || '');
                            setTimeout(() => document.getElementById('panel-penilaian')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
                          }}
                          className="p-2 transition-colors rounded-full text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/50 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          title="Beri Penilaian"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {!selectedReport.link && attachments.length === 0 && (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                      Belum ada lampiran.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {!selectedReport && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800">
            <div className="flex items-center space-x-2 truncate">
              <BookOpen size={20} className="text-slate-600 dark:text-slate-300 shrink-0" />
              <h2 className="font-bold text-slate-800 dark:text-slate-50 text-lg">Daftar Laporan</h2>
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
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-50 text-sm">
                      Filter Data
                    </h3>
                    <button onClick={() => setShowFilterPopup(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 p-1 rounded-md transition-colors">
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
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-school-blue/20 outline-none text-slate-700 dark:text-slate-200 font-bold text-center cursor-pointer transition-all hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
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
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-school-blue/20 outline-none text-slate-700 dark:text-slate-200 font-bold text-center cursor-pointer transition-all hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                      />
                    </div>


                  </div>

                  <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => {
                        setFilterStartDate('');
                        setFilterEndDate('');
                      }}
                      className="text-xs font-bold text-rose-500 hover:text-rose-600 px-2 py-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/50 transition-colors"
                    >
                      Reset Filter
                    </button>
                    <button
                      onClick={() => setShowFilterPopup(false)}
                      className="bg-school-blue dark:bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 dark:hover:bg-blue-500 dark:hover:bg-slate-600 transition-colors"
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
            <table className="w-full text-left border-collapse min-w-[900px] hidden lg:table">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 w-12 text-center">NO</th>
                  <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-36">TANGGAL</th>
                  <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700">NAMA TUGAS</th>
                  <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 w-1/4">DITUGASKAN UNTUK</th>
                  <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-32 whitespace-nowrap">TOTAL TUGAS</th>
                  <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-24">MENUNGGU</th>
                  <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-[120px]">PENILAIAN</th>
                  <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-20">SKOR</th>
                  <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-20">PERIKSA</th>
                  <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-20">AKSI</th>
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
                ) : filteredReports.length > 0 ? (
                  filteredReports.map((report, index) => (
                    <tr
                      key={report.id}
                      className={`transition-colors ${selectedReportId === report.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center text-sm text-slate-700 dark:text-slate-200">
                        {format(new Date(report.date), 'dd MMM yyyy', { locale: id })}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-50 max-w-md truncate" title={report.taskName}>
                        {report.taskName}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-50">
                        <div className="font-bold text-school-blue dark:text-white">{report.user?.name || 'Staf Tidak Dikenal'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{report.user?.position || 'Belum ada jabatan'}</div>
                      </td>
                      <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                        <span className="font-bold text-school-blue dark:text-white text-sm">
                          {report.totalUpdates || 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                        <span className="font-bold text-orange-500 text-sm">
                          {report.totalMenunggu || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                        <StarRating score={report.averageScore ?? report.score} />
                      </td>
                      <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center font-bold text-amber-500">
                        {(report.averageScore ?? report.score) ? Number(report.averageScore ?? report.score).toFixed(1) : '-'}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                        <button
                          onClick={() => handleReviewClick(report)}
                          title="Periksa Lampiran"
                          className={`p-1.5 rounded-lg transition-colors inline-block ${selectedReportId === report.id
                            ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700'
                            : 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/50'
                            }`}
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                      <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            title="Hapus Laporan"
                            className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      <div className="flex justify-center mb-3 text-slate-300">
                        <BookOpen size={48} strokeWidth={1} />
                      </div>
                      <p className="font-bold text-lg text-slate-600 dark:text-slate-300 mb-1">Tidak Ada Laporan</p>
                      <p className="text-sm">Tidak ada laporan yang ditemukan berdasarkan pencarian atau filter.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="lg:hidden flex flex-col divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex justify-center mb-3 text-school-blue dark:text-white">
                    <Loader2 size={32} className="animate-spin" />
                  </div>
                  <p className="font-bold text-lg text-slate-600 dark:text-slate-300 mb-1">Memuat Data...</p>
                </div>
              ) : filteredReports.length > 0 ? (
                filteredReports.map(report => (
                  <div key={report.id} className={`p-4 transition-colors flex flex-col gap-3 ${selectedReportId === report.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-col min-w-0">
                        <h3 className="font-extrabold text-slate-800 dark:text-slate-50 text-base leading-snug truncate">{report.taskName}</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1 truncate">
                          {format(new Date(report.date), 'dd MMM yyyy', { locale: id })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Tugas:</span>
                      <span className="font-bold text-school-blue dark:text-white text-sm">
                        {report.totalUpdates || 1}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Menunggu:</span>
                      <span className="font-bold text-orange-500 text-sm">
                        {report.totalMenunggu || 0}
                      </span>
                    </div>

                      <div className="mt-1 border-b border-slate-100 dark:border-slate-700 pb-2">
                        <p className="text-sm font-bold text-school-blue dark:text-white leading-tight">{report.user?.name || 'Staf Tidak Dikenal'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{report.user?.position || 'Belum ada jabatan'}</p>
                      </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Penilaian</span>
                        <div className="flex items-center gap-0.5 text-slate-300">
                          {(report.averageScore || report.score) ? (
                            <>
                              <StarRating score={report.averageScore ?? report.score} size={14} className="flex items-center gap-0.5 text-slate-300" />
                              <span className="ml-1 text-xs font-bold text-amber-500">{Number(report.averageScore ?? report.score).toFixed(1)}</span>
                            </>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700/50">Belum Dinilai</span>
                          )}
                        </div>
                      </div>

                      {/* Tombol aksi dipindahkan ke samping penilaian */}
                      <div className="flex items-center shrink-0">
                        <button
                          onClick={() => handleReviewClick(report)}
                          className={`p-2 transition-colors rounded-full mr-1 ${selectedReportId === report.id ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700' : 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/50 bg-slate-50 dark:bg-slate-900'}`}
                          title="Periksa Lampiran"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-full bg-slate-50 dark:bg-slate-900 ml-1"
                          title="Hapus Laporan"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex justify-center mb-2 text-slate-300">
                    <BookOpen size={32} />
                  </div>
                  Tidak ada laporan yang ditemukan berdasarkan filter pencarian Anda.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

















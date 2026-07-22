import React, { useState, useEffect, useRef } from 'react';
import { User, TaskReport, StaffTask, TaskAttachment } from '../../lib/types';
import { getUserTaskReports, saveTaskReport, getStaffTasks, updateTaskReport, getTaskAttachments, addTaskAttachment, reviseTaskAttachment } from '../../lib/db';

import { Search, Eye, ClipboardList, Edit, Paperclip, MessageSquareMore, Loader2, SlidersHorizontal, X, Clock, CheckCircle2, XCircle, Layers, Download, Plus, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useRealtimeSubscription } from '../../lib/useRealtime';
import { StarRating } from '../../components/StarRating';

interface DaftarTugasProps {
  user: User;
}

export const DaftarTugas: React.FC<DaftarTugasProps> = ({ user }) => {
  const [taskReports, setTaskReports] = useState<TaskReport[]>([]);
  const [reportTaskName, setReportTaskName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLink, setReportLink] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');
  const [showReportSuccess, setShowReportSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<TaskReport | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);

  // Attachment States
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isAttachmentsLoading, setIsAttachmentsLoading] = useState(false);
  const [showAttachmentForm, setShowAttachmentForm] = useState(false);
  const [attachmentLink, setAttachmentLink] = useState('');
  const [attachmentCatatan, setAttachmentCatatan] = useState('');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentUploadProgress, setAttachmentUploadProgress] = useState(0);
  const [showAttachmentSubmitSuccess, setShowAttachmentSubmitSuccess] = useState(false);
  const [attachmentReportId, setAttachmentReportId] = useState<string | null>(null);
  const attachmentFileRef = useRef<HTMLInputElement>(null);

  // Revision States
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionItem, setRevisionItem] = useState<{ id: string, isPrimary: boolean, taskName: string, description: string } | null>(null);
  const [revisionLink, setRevisionLink] = useState('');
  const [revisionCatatan, setRevisionCatatan] = useState('');
  const [isUploadingRevision, setIsUploadingRevision] = useState(false);
  const [revisionUploadProgress, setRevisionUploadProgress] = useState(0);
  const revisionFileRef = useRef<HTMLInputElement>(null);

  // Feedback Modal State
  const [feedbackModal, setFeedbackModal] = useState<{ show: boolean, taskName: string, catatan: string, adminFeedback: string }>({ show: false, taskName: '', catatan: '', adminFeedback: '' });

  // Filter States
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const filterPopupRef = useRef<HTMLDivElement>(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  // Unread feedback state
  const [readFeedbacks, setReadFeedbacks] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = localStorage.getItem('sinter_pamong_read_feedbacks');
    if (saved) {
      try {
        setReadFeedbacks(JSON.parse(saved));
      } catch (e) { }
    }
  }, []);

  const markFeedbackAsRead = (id: string, feedback: string) => {
    const newReads = { ...readFeedbacks, [id]: feedback };
    setReadFeedbacks(newReads);
    localStorage.setItem('sinter_pamong_read_feedbacks', JSON.stringify(newReads));
  };

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
    if (downloadingUrl) return; // Mencegah klik berulang saat loading
    setDownloadingUrl(url);
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
    } finally {
      setDownloadingUrl(null);
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

  const fetchAttachments = async (reportId: string) => {
    setIsAttachmentsLoading(true);
    try {
      const data = await getTaskAttachments(reportId);
      setAttachments(data);
    } finally {
      setIsAttachmentsLoading(false);
    }
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
  useRealtimeSubscription(['penilaian_tugas', 'tugas_staff', 'lampiran_tugas'], () => {
    fetchReports();
    fetchAdminTasks();
    if (selectedReport) fetchAttachments(selectedReport.id);
  });

  useEffect(() => {
    if (selectedReport) {
      const updatedReport = taskReports.find(r => r.id === selectedReport.id);
      if (updatedReport && JSON.stringify(updatedReport) !== JSON.stringify(selectedReport)) {
        setSelectedReport(updatedReport);
      }
    }
  }, [taskReports]);


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
      if (file.size > 20 * 1024 * 1024) {
        alert("Mohon maaf, unggah file/video secara langsung dibatasi maksimal 20MB. Untuk lampiran video atau dokumen besar, silakan unggah ke Google Drive / YouTube terlebih dahulu, lalu tempelkan (paste) tautannya di kolom yang tersedia.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      let progressInterval: any;
      try {
        setIsUploading(true);
        setUploadProgress(0);
        progressInterval = setInterval(() => {
          setUploadProgress(prev => prev >= 90 ? prev : prev + 15);
        }, 300);

        // Buat nama folder yang aman dari nama tugas
        const safeTaskName = reportTaskName.replace(/[^a-zA-Z0-9-_\s]/g, '').trim().replace(/\s+/g, '_') || 'Lainnya';
        // Tambahkan format tanggal DDMMMYYYY sebagai prefix
        const datePrefix = format(new Date(), 'ddMMMyyyy').toUpperCase();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9-_\.]/g, '_');
        const filePath = `${safeTaskName}/${datePrefix}_${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media_tugas')
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('media_tugas')
          .getPublicUrl(filePath);

        clearInterval(progressInterval);
        setUploadProgress(100);
        setReportLink(publicUrl);
        setUploadSuccessMsg('Bukti berhasil diunggah!');
        setTimeout(() => {
          setUploadSuccessMsg('');
          setUploadProgress(0);
        }, 4000);
      } catch (error) {
        clearInterval(progressInterval);
        setUploadProgress(0);
        console.error('Error uploading image: ', error);
        alert('Gagal mengunggah foto. Silakan coba lagi.');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } finally {
        setIsUploading(false);
      }
    }
  };

  // Hanya tampilkan tugas dari admin
  const availableTasks = Array.from(new Set(adminTasks.map(t => t.namaTugas)));

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

  const handleDetailClick = async (report: TaskReport) => {
    setSelectedReport(report);
    setShowForm(false);
    setShowAttachmentForm(false);
    setAttachmentReportId(null);
    await fetchAttachments(report.id);
    scrollToTop();
  };

  const handleAttachmentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert("File dibatasi maksimal 20MB. Untuk file besar, gunakan link Google Drive.");
        if (attachmentFileRef.current) attachmentFileRef.current.value = '';
        return;
      }
      let progressInterval: any;
      try {
        setIsUploadingAttachment(true);
        setAttachmentUploadProgress(0);
        progressInterval = setInterval(() => {
          setAttachmentUploadProgress(prev => prev >= 90 ? prev : prev + 15);
        }, 300);

        // Cari nama tugas dari report yang sedang diupdate
        const targetReport = taskReports.find(r => r.id === attachmentReportId);
        const taskName = targetReport ? targetReport.taskName : 'Lainnya';

        // Buat nama folder yang aman dari nama tugas
        const safeTaskName = taskName.replace(/[^a-zA-Z0-9-_\s]/g, '').trim().replace(/\s+/g, '_') || 'Lainnya';
        const datePrefix = format(new Date(), 'ddMMMyyyy').toUpperCase();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9-_\.]/g, '_');
        const filePath = `${safeTaskName}/${datePrefix}_${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media_tugas')
          .upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('media_tugas')
          .getPublicUrl(filePath);

        clearInterval(progressInterval);
        setAttachmentUploadProgress(100);
        setAttachmentLink(publicUrl);
        setUploadSuccessMsg('Lampiran berhasil diunggah!');
        setTimeout(() => {
          setUploadSuccessMsg('');
          setAttachmentUploadProgress(0);
        }, 4000);
      } catch (error) {
        clearInterval(progressInterval);
        setAttachmentUploadProgress(0);
        console.error('Error uploading:', error);
        alert('Gagal mengunggah file.');
        if (attachmentFileRef.current) attachmentFileRef.current.value = '';
      } finally {
        setIsUploadingAttachment(false);
      }
    }
  };

  const handleAttachmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachmentReportId || !attachmentLink.trim()) return;
    try {
      await addTaskAttachment({
        reportId: attachmentReportId,
        userId: user.id,
        link: attachmentLink.trim(),
        catatan: attachmentCatatan.trim() || undefined
      });
      setAttachmentLink('');
      setAttachmentCatatan('');
      setShowAttachmentForm(false);
      setShowAttachmentSubmitSuccess(true);
      setTimeout(() => setShowAttachmentSubmitSuccess(false), 4000);
      await fetchAttachments(attachmentReportId);
      fetchReports();
    } catch (err) {
      console.error(err);
      alert('Gagal menambahkan lampiran.');
    }
  };

  const handleRevisionFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert("File dibatasi maksimal 20MB. Untuk file besar, gunakan link Google Drive.");
        if (revisionFileRef.current) revisionFileRef.current.value = '';
        return;
      }
      let progressInterval: any;
      try {
        setIsUploadingRevision(true);
        setRevisionUploadProgress(0);
        progressInterval = setInterval(() => {
          setRevisionUploadProgress(prev => prev >= 90 ? prev : prev + 15);
        }, 300);

        const taskName = revisionItem ? revisionItem.taskName : 'Revisi';
        const safeTaskName = taskName.replace(/[^a-zA-Z0-9-_\s]/g, '').trim().replace(/\s+/g, '_') || 'Lainnya';
        const datePrefix = format(new Date(), 'ddMMMyyyy').toUpperCase();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9-_\.]/g, '_');
        const filePath = `${safeTaskName}/REVISI_${datePrefix}_${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media_tugas')
          .upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('media_tugas')
          .getPublicUrl(filePath);

        clearInterval(progressInterval);
        setRevisionUploadProgress(100);
        setRevisionLink(publicUrl);
        setUploadSuccessMsg('File revisi berhasil diunggah!');
        setTimeout(() => {
          setUploadSuccessMsg('');
          setRevisionUploadProgress(0);
        }, 4000);
      } catch (error) {
        clearInterval(progressInterval);
        setRevisionUploadProgress(0);
        console.error('Error uploading revision:', error);
        alert('Gagal mengunggah file revisi.');
        if (revisionFileRef.current) revisionFileRef.current.value = '';
      } finally {
        setIsUploadingRevision(false);
      }
    }
  };

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionItem || !revisionLink.trim()) return;
    try {
      if (revisionItem.isPrimary) {
        await updateTaskReport(revisionItem.id, revisionItem.taskName, revisionCatatan.trim() || revisionItem.description, revisionLink.trim());
      } else {
        await reviseTaskAttachment(revisionItem.id, revisionLink.trim(), revisionCatatan.trim() || undefined);
      }
      setRevisionLink('');
      setRevisionCatatan('');
      setShowRevisionModal(false);
      setShowAttachmentSubmitSuccess(true);
      setTimeout(() => setShowAttachmentSubmitSuccess(false), 4000);
      fetchReports();
    } catch (err) {
      console.error(err);
      alert('Gagal mengirimkan revisi.');
    }
  };

  const openRevisionModal = (id: string, isPrimary: boolean, taskName: string, description: string) => {
    setRevisionItem({ id, isPrimary, taskName, description });
    setRevisionLink('');
    setRevisionCatatan('');
    setShowRevisionModal(true);
  };

  const openAttachmentForm = (reportId: string) => {
    setAttachmentReportId(reportId);
    setAttachmentLink('');
    setAttachmentCatatan('');
    setShowAttachmentForm(true);
    setShowForm(false);
    scrollToTop();
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 relative">
      {/* Toast Notification */}
      {showAttachmentSubmitSuccess && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-3 rounded-xl shadow-lg flex items-center font-bold animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="mr-2 text-sm">✅</div>
          Data lampiran berhasil dikirim!
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <MessageSquareMore size={18} className="text-school-blue" /> Detail Catatan
              </h2>
              <button
                onClick={() => setFeedbackModal({ ...feedbackModal, show: false })}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Tugas</p>
                <p className="text-sm font-bold text-slate-800">{feedbackModal.taskName}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Catatan Staf</p>
                <div className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-3">
                  {feedbackModal.catatan || <span className="italic text-slate-400">Tidak ada catatan staf</span>}
                </div>
              </div>

              <div>
                <p className="text-xs text-school-blue font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  Balasan Admin
                </p>
                <div className="text-sm font-medium text-school-blue bg-blue-50 border border-blue-100 rounded-xl p-3 whitespace-pre-wrap">
                  {feedbackModal.adminFeedback}
                </div>
              </div>
            </div>

            <div className="flex justify-end p-4 border-t border-slate-100">
              <button onClick={() => setFeedbackModal({ ...feedbackModal, show: false })} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <RefreshCw size={18} className="text-amber-500" /> Revisi Laporan
              </h2>
              <button
                onClick={() => setShowRevisionModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRevisionSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <p className="text-sm font-bold text-slate-700 mb-1">Tugas yang Direvisi:</p>
                <p className="text-sm text-slate-600 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {revisionItem?.taskName}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Upload File Revisi <span className="text-rose-500">*</span></label>
                <input
                  type="file"
                  ref={revisionFileRef}
                  className="w-full h-16 block pt-4 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500/10 file:text-amber-600 hover:file:bg-amber-500/20 transition-all text-slate-600 cursor-pointer focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none"
                  accept="image/*,video/*,application/pdf"
                  onChange={handleRevisionFileUpload}
                  disabled={isUploadingRevision}
                  required={!revisionLink}
                />
                {isUploadingRevision && (
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${revisionUploadProgress}%` }}></div>
                  </div>
                )}
                {uploadSuccessMsg && <p className="text-emerald-500 text-xs mt-1.5 font-bold animate-in fade-in">{uploadSuccessMsg}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Catatan <span className="text-slate-400 font-medium">(Opsional)</span></label>
                <textarea
                  value={revisionCatatan}
                  onChange={(e) => setRevisionCatatan(e.target.value)}
                  placeholder="Tambahkan catatan untuk admin..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 h-20 resize-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all shadow-sm text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowRevisionModal(false)} className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm">Batal</button>
                <button type="submit" disabled={isUploadingRevision || !revisionLink} className={`px-6 py-2 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 ${isUploadingRevision || !revisionLink ? 'opacity-70 cursor-not-allowed bg-slate-400' : 'bg-amber-500 hover:bg-amber-600'}`}>
                  {isUploadingRevision ? 'Mengunggah...' : <><RefreshCw size={16} /> Kirim Revisi</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 mb-1 sm:mb-2 tracking-tight">Daftar Tugas</h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-lg">Kerjakan, kelola, dan pantau riwayat penyelesaian tugas</p>
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
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="w-full h-16 block pt-4 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-school-blue/10 file:text-school-blue hover:file:bg-school-blue/20 transition-all text-slate-600 cursor-pointer focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none"
                    accept="image/*,video/*,application/pdf"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  {isUploading && (
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div className="bg-school-blue h-1.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  )}
                  {uploadSuccessMsg && <p className="text-emerald-500 text-xs mt-1.5 font-bold animate-in fade-in">{uploadSuccessMsg}</p>}
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

      {/* Form Update Lampiran */}
      {showAttachmentForm && attachmentReportId && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 animate-in fade-in slide-in-from-top-4">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <Plus size={18} className="text-school-blue" />
            <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">Update Lampiran Baru</h3>
          </div>
          <form onSubmit={handleAttachmentSubmit} className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-bold text-slate-700">File / Tautan Lampiran <span className="text-rose-500">*</span></label>
                    {attachmentLink && (
                      <a href={attachmentLink} target="_blank" rel="noopener noreferrer" className="text-school-blue hover:text-blue-700 transition-colors p-1 rounded-full hover:bg-blue-50 flex items-center justify-center" title="Periksa">
                        <Eye size={16} />
                      </a>
                    )}
                  </div>
                  <input type="file" ref={attachmentFileRef} className="w-full h-16 block pt-4 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-school-blue/10 file:text-school-blue hover:file:bg-school-blue/20 transition-all text-slate-600 cursor-pointer focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none" accept="image/*,video/*,application/pdf" onChange={handleAttachmentFileUpload} disabled={isUploadingAttachment} required={!attachmentLink} />
                  {isUploadingAttachment && (
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div className="bg-school-blue h-1.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${attachmentUploadProgress}%` }}></div>
                    </div>
                  )}
                  {uploadSuccessMsg && <p className="text-emerald-500 text-xs mt-1.5 font-bold animate-in fade-in">{uploadSuccessMsg}</p>}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Catatan <span className="text-slate-400 font-medium">(Opsional)</span></label>
                  <textarea value={attachmentCatatan} onChange={(e) => setAttachmentCatatan(e.target.value)} placeholder="Catatan untuk update lampiran ini..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 h-16 resize-none focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowAttachmentForm(false)} className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm">Batal</button>
              <button type="submit" disabled={isUploadingAttachment} className={`px-8 py-2 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 ${isUploadingAttachment ? 'opacity-70 cursor-not-allowed bg-slate-400' : 'bg-gradient-to-r from-school-blue to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}`}>
                {isUploadingAttachment ? 'Mengunggah...' : <><Plus size={16} /> Kirim Lampiran</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tampilan Detail Laporan (Inline Top-Level) */}
      {selectedReport && !showForm && !showAttachmentForm && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-800 text-lg flex items-center">
                Detail Laporan Kegiatan
              </h2>
              <button
                onClick={() => { setSelectedReport(null); setAttachments([]); }}
                className="text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg"
              >
                Tutup Detail
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Kolom Kiri: Detail Laporan */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Tanggal Kegiatan</p>
                  <p className="font-bold text-slate-700">{format(new Date(selectedReport.date), 'dd MMMM yyyy', { locale: id })}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Nama Laporan</p>
                  <p className="font-bold text-slate-800 text-base">{selectedReport.taskName}</p>
                </div>

                {(() => {
                  const matchingAdminTask = adminTasks.find(t => t.namaTugas === selectedReport.taskName);
                  if (!matchingAdminTask) return null;
                  return (
                    <div className="mt-2 border-l-2 border-school-blue pl-3 py-1">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <h4 className="text-xs font-bold text-school-blue uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                          <ClipboardList size={14} /> Instruksi Tugas
                        </h4>
                      </div>

                      {matchingAdminTask.deskripsi ? (
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{matchingAdminTask.deskripsi}</p>
                      ) : (
                        <p className="text-sm text-slate-400 italic">Tidak ada instruksi khusus.</p>
                      )}
                    </div>
                  );
                })()}

              </div>

              {/* Kolom Kanan: Tanggapan & Penilaian */}
              <div className="flex flex-col h-full">
                <div className="flex flex-col gap-3 flex-1">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquareMore size={14} /> Tanggapan Admin
                      </label>
                      {(() => {
                        const matchingAdminTask = adminTasks.find(t => t.namaTugas === selectedReport.taskName);
                        if (matchingAdminTask?.lampiranUrl) {
                          return (
                            <button
                              onClick={(e) => handleDownload(matchingAdminTask.lampiranUrl!, e)}
                              disabled={downloadingUrl === matchingAdminTask.lampiranUrl}
                              className="text-xs font-bold text-school-blue hover:text-blue-700 transition-colors flex items-center gap-1 underline underline-offset-2"
                            >
                              {downloadingUrl === matchingAdminTask.lampiranUrl ? <><Loader2 size={12} className="animate-spin" /> Mengunduh...</> : <><Paperclip size={12} /> Unduh Lampiran Admin</>}
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className={`w-full flex-1 min-h-[48px] text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-y-auto custom-scrollbar ${selectedReport.status === 'reviewed' ? 'text-emerald-700 font-medium' : selectedReport.status === 'rejected' ? 'text-rose-700 font-medium' : 'text-slate-500 italic'}`}>
                      {selectedReport.adminFeedback || 'Belum ada tanggapan dari admin.'}
                    </div>

                    {(selectedReport.status === 'reviewed' && selectedReport.score) && (
                      <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 mt-3">
                        <div className="flex items-center justify-between w-full pr-1.5">
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Penilaian</span>
                          <div className="flex items-center gap-1.5 text-slate-300" title={`Nilai Rata-rata: ${selectedReport.averageScore ?? selectedReport.score} Bintang`}>
                            <StarRating score={selectedReport.averageScore ?? selectedReport.score!} size={14} />
                            <span className="text-xs font-bold text-amber-500 ml-1">{selectedReport.averageScore ?? selectedReport.score} Bintang</span>
                          </div>
                        </div>
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

          {/* Tabel Riwayat Lampiran - Card Terpisah */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-t-xl">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Paperclip size={20} className="text-slate-600" />
                <h2 className="font-bold text-slate-800 text-lg">Riwayat Lampiran ({(selectedReport.link ? 1 : 0) + attachments.length})</h2>
              </div>
              <button
                onClick={() => openAttachmentForm(selectedReport.id)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-sm font-bold text-school-blue hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors shadow-sm"
              >
                <Plus size={16} /> Tambah Lampiran
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-bold border border-slate-200 w-12 text-center">NO</th>
                    <th className="px-4 py-3 font-bold border border-slate-200 text-center w-36">TANGGAL</th>
                    <th className="px-4 py-3 font-bold border border-slate-200 text-center w-28">JAM</th>
                    <th className="px-4 py-3 font-bold border border-slate-200 w-64">NAMA TUGAS</th>
                    <th className="px-4 py-3 font-bold border border-slate-200 w-80">CATATAN</th>
                    <th className="px-4 py-3 font-bold border border-slate-200 text-center w-32">STATUS</th>
                    <th className="px-4 py-3 font-bold border border-slate-200 text-center w-28">NILAI</th>
                    <th className="px-4 py-3 font-bold border border-slate-200 text-center w-16">SKOR</th>
                    <th className="px-4 py-3 font-bold border border-slate-200 text-center w-24">LAMPIRAN</th>
                    <th className="px-4 py-3 font-bold border border-slate-200 text-center w-24">UNDUH</th>
                  </tr>
                </thead>
                <tbody>
                  {isAttachmentsLoading ? (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-slate-500 border border-slate-200">
                        <div className="flex justify-center mb-3 text-school-blue">
                          <Loader2 size={32} className="animate-spin" />
                        </div>
                        <p className="font-bold text-lg text-slate-600 mb-1">Memuat Lampiran...</p>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {selectedReport.link && (
                        <tr className="hover:bg-slate-50 transition-colors bg-white">
                          <td className="px-4 py-3 border border-slate-200 text-center text-sm font-medium text-slate-500">1</td>
                          <td className="px-4 py-3 border border-slate-200 text-center text-sm text-slate-700">{format(new Date(selectedReport.createdAt), 'dd MMM yyyy', { locale: id })}</td>
                          <td className="px-4 py-3 border border-slate-200 text-center text-sm font-bold text-slate-600">{format(new Date(selectedReport.createdAt), 'HH:mm', { locale: id })}</td>
                          <td className="px-4 py-3 border border-slate-200 text-sm font-bold text-slate-800 max-w-[200px] truncate" title={selectedReport.taskName}>{selectedReport.taskName}</td>
                          <td className="px-4 py-3 border border-slate-200">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm text-slate-700 truncate max-w-[260px]">-</span>
                              {selectedReport.adminFeedback && (
                                <button
                                  onClick={() => {
                                    setFeedbackModal({ show: true, taskName: selectedReport.taskName, catatan: '-', adminFeedback: selectedReport.adminFeedback! });
                                    markFeedbackAsRead(selectedReport.id, selectedReport.adminFeedback!);
                                  }}
                                  className="text-school-blue hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-lg transition-colors shrink-0 relative"
                                  title="Lihat Balasan Admin"
                                >
                                  <MessageSquareMore size={16} />
                                  {readFeedbacks[selectedReport.id] !== selectedReport.adminFeedback && (
                                    <span className="absolute top-1 right-1 flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                    </span>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 border border-slate-200 text-center">
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
                          <td className="px-4 py-3 border border-slate-200 text-center">
                            <div className="flex items-center justify-center gap-1 text-slate-300" title={selectedReport?.score ? `Nilai: ${Math.round(selectedReport.score)} Bintang` : 'Belum Dinilai'}>
                              <StarRating score={selectedReport?.score ? Math.round(selectedReport.score) : 0} size={16} />
                            </div>
                          </td>
                          <td className="px-4 py-3 border border-slate-200 text-center font-bold text-amber-500">
                            {selectedReport?.score ? Math.round(selectedReport.score) : '-'}
                          </td>
                          <td className="px-4 py-3 border border-slate-200 text-center">
                            <div className="flex items-center justify-center">
                              <a href={selectedReport.link} target="_blank" rel="noopener noreferrer" className="text-school-blue hover:text-blue-700 transition-colors inline-block" title="Lihat Lampiran">
                                <Paperclip size={18} />
                              </a>
                            </div>
                          </td>
                          <td className="px-4 py-3 border border-slate-200 text-center">
                            <div className="flex items-center justify-center">
                              {selectedReport.status === 'rejected' ? (
                                <button onClick={() => openRevisionModal(selectedReport.id, true, selectedReport.taskName, selectedReport.description)} className="text-amber-500 hover:text-amber-600 transition-colors inline-block cursor-pointer" title="Revisi Lampiran">
                                  <RefreshCw size={18} />
                                </button>
                              ) : (
                                <button onClick={(e) => handleDownload(selectedReport.link!, e)} disabled={downloadingUrl === selectedReport.link} className={`${downloadingUrl === selectedReport.link ? 'text-school-blue' : 'text-slate-500 hover:text-slate-700'} transition-colors inline-block cursor-pointer`} title="Unduh Lampiran">
                                  {downloadingUrl === selectedReport.link ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      {attachments.map((att, idx) => (
                        <tr key={att.id} className="hover:bg-slate-50 transition-colors bg-white">
                          <td className="px-4 py-3 border border-slate-200 text-center text-sm font-medium text-slate-500">{(selectedReport.link ? 1 : 0) + idx + 1}</td>
                          <td className="px-4 py-3 border border-slate-200 text-center text-sm text-slate-700">{format(new Date(att.createdAt), 'dd MMM yyyy', { locale: id })}</td>
                          <td className="px-4 py-3 border border-slate-200 text-center text-sm font-bold text-slate-600">{format(new Date(att.createdAt), 'HH:mm', { locale: id })}</td>
                          <td className="px-4 py-3 border border-slate-200 text-sm font-bold text-slate-800 max-w-[200px] truncate" title={selectedReport.taskName}>{selectedReport.taskName}</td>
                          <td className="px-4 py-3 border border-slate-200">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm text-slate-700 truncate max-w-[260px]" title={att.catatan}>{att.catatan || '-'}</span>
                              {att.adminFeedback && (
                                <button
                                  onClick={() => {
                                    setFeedbackModal({ show: true, taskName: selectedReport.taskName, catatan: att.catatan || '-', adminFeedback: att.adminFeedback! });
                                    markFeedbackAsRead(att.id, att.adminFeedback!);
                                  }}
                                  className="text-school-blue hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-lg transition-colors shrink-0 relative"
                                  title="Lihat Balasan Admin"
                                >
                                  <MessageSquareMore size={16} />
                                  {readFeedbacks[att.id] !== att.adminFeedback && (
                                    <span className="absolute top-1 right-1 flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                    </span>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 border border-slate-200 text-center">
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
                          <td className="px-4 py-3 border border-slate-200 text-center">
                            <div className="flex items-center justify-center gap-1 text-slate-300" title={att?.score ? `Nilai: ${Math.round(att.score)} Bintang` : 'Belum Dinilai'}>
                              <StarRating score={att?.score ? Math.round(att.score) : 0} size={16} />
                            </div>
                          </td>
                          <td className="px-4 py-3 border border-slate-200 text-center font-bold text-amber-500">
                            {att?.score ? Math.round(att.score) : '-'}
                          </td>
                          <td className="px-4 py-3 border border-slate-200 text-center">
                            <div className="flex items-center justify-center">
                              <a href={att.link} target="_blank" rel="noopener noreferrer" className="text-school-blue hover:text-blue-700 transition-colors inline-block" title="Lihat Lampiran">
                                <Paperclip size={18} />
                              </a>
                            </div>
                          </td>
                          <td className="px-4 py-3 border border-slate-200 text-center">
                            <div className="flex items-center justify-center">
                              {att.status === 'rejected' ? (
                                <button onClick={() => openRevisionModal(att.id, false, selectedReport.taskName, selectedReport.description)} className="text-amber-500 hover:text-amber-600 transition-colors inline-block cursor-pointer" title="Revisi Lampiran">
                                  <RefreshCw size={18} />
                                </button>
                              ) : (
                                <button onClick={(e) => handleDownload(att.link, e)} disabled={downloadingUrl === att.link} className={`${downloadingUrl === att.link ? 'text-school-blue' : 'text-slate-500 hover:text-slate-700'} transition-colors inline-block cursor-pointer`} title="Unduh Lampiran">
                                  {downloadingUrl === att.link ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!selectedReport.link && attachments.length === 0 && (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-500 border border-slate-200">
                            Belum ada lampiran.
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-row items-center justify-between gap-4 bg-white">
          <div className="flex items-center space-x-2 truncate">
            <ClipboardList size={20} className="text-slate-600 shrink-0" />
            <h2 className="font-bold text-slate-800 text-lg">Riwayat Tugas Laporan</h2>
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
                <th className="px-4 py-3 font-bold border border-slate-200 w-1/3">NAMA TUGAS</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-24">MENUNGGU</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-24">DISETUJUI</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-24">DITOLAK</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-28">NILAI</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-16">SKOR</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-20">PERIKSA</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-20">UPDATE</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-500 border border-slate-200">
                    <div className="flex justify-center mb-3 text-school-blue">
                      <Loader2 size={32} className="animate-spin" />
                    </div>
                    <p className="font-bold text-lg text-slate-600 mb-1">Memuat Data...</p>
                  </td>
                </tr>
              ) : combinedTasks.length > 0 ? (
                combinedTasks.map((item, index) => {
                  const report = item.report;

                  return (
                    <tr key={index} className={`transition-colors ${!report ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-50`}>
                      <td className="px-4 py-3 border border-slate-200 text-center text-sm font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center text-sm text-slate-700">
                        {format(new Date(item.date), 'dd MMM yyyy', { locale: id })}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-sm font-bold text-slate-800 max-w-sm truncate" title={item.taskName}>
                        {item.taskName}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center">
                        <span className="font-bold text-orange-500">{report?.totalMenunggu || 0}</span>
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center">
                        <span className="font-bold text-emerald-500">{report?.totalDisetujui || 0}</span>
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center">
                        <span className="font-bold text-rose-500">{report?.totalDitolak || 0}</span>
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center">
                        <div className="flex items-center justify-center gap-0.5 text-slate-300" title={(report?.averageScore ?? report?.score) ? `Nilai: ${report?.averageScore ?? report?.score} Bintang` : 'Belum Dinilai'}>
                          <StarRating score={report?.averageScore ?? report?.score} size={16} />
                        </div>
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center font-bold text-amber-500">
                        {(report?.averageScore ?? report?.score) ? (report?.averageScore ?? report?.score) : '-'}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center">
                        <div className="flex items-center justify-center gap-1">
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
                        </div>
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {report && (
                            <button
                              onClick={() => openAttachmentForm(report.id)}
                              title="Update Lampiran"
                              className="p-2 rounded-full text-amber-500 hover:bg-amber-50 hover:text-amber-600 transition-colors inline-flex"
                            >
                              <Plus size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 border border-slate-200">
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
                return (
                  <div key={index} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <h3 className="font-extrabold text-slate-800 text-sm leading-snug truncate" title={item.taskName}>{item.taskName}</h3>

                      <div className="flex flex-col gap-1.5 mt-2">
                        <div className="flex items-center justify-between w-full">
                          <p className="text-[11px] font-bold text-slate-400">
                            {format(new Date(item.date), 'dd MMM yyyy', { locale: id })}
                          </p>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nilai</span>
                            <div className="flex items-center gap-0.5 text-slate-300" title={(report?.averageScore ?? report?.score) ? `Nilai: ${report?.averageScore ?? report?.score} Bintang` : 'Belum Dinilai'}>
                              <StarRating score={report?.averageScore ?? report?.score} size={12} />
                              {(report?.averageScore ?? report?.score) ? (
                                <span className="ml-1 text-xs font-bold text-amber-500">{report?.averageScore ?? report?.score}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-start gap-4 mt-1 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1.5" title="Menunggu">
                            <span className="text-[10px] font-bold text-slate-400">⏳</span>
                            <span className="text-xs font-bold text-orange-500">{report?.totalMenunggu || 0}</span>
                          </div>
                          <div className="flex items-center gap-1.5" title="Disetujui">
                            <span className="text-[10px] font-bold text-slate-400">✅</span>
                            <span className="text-xs font-bold text-emerald-500">{report?.totalDisetujui || 0}</span>
                          </div>
                          <div className="flex items-center gap-1.5" title="Ditolak">
                            <span className="text-[10px] font-bold text-slate-400">❌</span>
                            <span className="text-xs font-bold text-rose-500">{report?.totalDitolak || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 w-full">
                      {report ? (
                        <>
                          <button
                            onClick={() => {
                              handleDetailClick(report);
                              setTimeout(scrollToTop, 50);
                            }}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-school-blue text-white shadow-sm hover:bg-blue-700 hover:shadow transition-all"
                          >
                            <Eye size={14} /> Lihat Detail Laporan
                          </button>
                          <button
                            onClick={() => openAttachmentForm(report.id)}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white shadow-sm hover:bg-amber-600 hover:shadow transition-all"
                          >
                            <Plus size={14} /> Update Lampiran
                          </button>
                        </>
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

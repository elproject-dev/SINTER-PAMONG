import React, { useState, useEffect, useRef } from 'react';
import { User, TaskReport, StaffTask } from '../../lib/types';
import { getUserTaskReports, saveTaskReport, getStaffTasks, updateTaskReport } from '../../lib/db';
import { KPIDictionary } from '../../lib/kpiDictionary';
import { ImagePlus, XCircle, ChevronDown, Check, Plus, Search, Eye, ClipboardList, Edit } from 'lucide-react';
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<TaskReport | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);

  const closeFormModal = () => {
    setEditingReportId(null);
    setReportTaskName('');
    setReportDescription('');
    setReportLink('');
    setIsFormModalOpen(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [adminTasks, setAdminTasks] = useState<StaffTask[]>([]);

  const fetchReports = async () => {
    const reports = await getUserTaskReports(user.id);
    setTaskReports(reports);
  };

  const fetchAdminTasks = async () => {
    const tasks = await getStaffTasks(user.id);
    setAdminTasks(tasks);
  };

  useEffect(() => {
    fetchReports();
    fetchAdminTasks();
  }, [user.id]);

  // Realtime: auto-refresh saat ada perubahan laporan atau tugas
  useRealtimeSubscription(['laporan_tugas', 'tugas_staff'], () => {
    fetchReports();
    fetchAdminTasks();
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setIsFormModalOpen(false);
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
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('buku-saku-media')
          .upload(filePath, file);

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

  const filteredReports = taskReports.filter(report => {
    const todayLocal = new Date().toLocaleDateString('en-CA');
    const todayUtc = new Date().toISOString().split('T')[0];
    const isToday = report.date === todayLocal || report.date === todayUtc;
    const matchesSearch = report.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    return isToday && matchesSearch;
  });

  const openDetailModal = (report: TaskReport) => {
    setSelectedReport(report);
    setIsDetailModalOpen(true);
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
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-4 pl-9 text-slate-700 text-sm focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-medium"
            />
          </div>

          <button
            onClick={() => {
              setReportTaskName('');
              setReportDescription('');
              setReportLink('');
              setIsFormModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-school-blue text-white rounded-xl text-sm font-bold hover:bg-blue-700 hover:shadow-lg transition-all"
          >
            <Plus size={16} />
            Tulis Laporan
          </button>
        </div>
      </div>

      {showReportSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl flex items-center shadow-sm font-medium animate-in fade-in slide-in-from-top-4">
          <div className="mr-3 bg-emerald-100 p-1.5 rounded-full">✅</div>
          Laporan kegiatan berhasil dikirim!
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2">
            <ClipboardList size={20} className="text-slate-600" />
            <h2 className="font-bold text-slate-800 text-lg">Riwayat Pelaporan Hari Ini</h2>
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
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-28">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report, index) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 border border-slate-200 text-center text-sm font-medium text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center text-sm text-slate-700">
                      {format(new Date(report.date), 'dd MMM yyyy', { locale: id })}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-sm font-bold text-slate-800">
                      {report.taskName}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${report.status === 'pending' ? 'bg-orange-500 text-white shadow-sm' :
                          report.status === 'reviewed' ? 'bg-emerald-500 text-white shadow-sm' :
                            'bg-rose-500 text-white shadow-sm'
                        }`}>
                        {report.status === 'pending' ? 'Menunggu' :
                          report.status === 'reviewed' ? 'Disetujui' :
                            'Ditolak'}
                      </span>
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      <button
                        onClick={() => openDetailModal(report)}
                        title="Lihat Detail"
                        className="p-2 rounded-full text-school-blue hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 border border-slate-200">
                    <div className="flex justify-center mb-2 text-slate-300">
                      <ClipboardList size={32} />
                    </div>
                    Belum ada riwayat laporan yang dikirim.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y divide-slate-100">
            {filteredReports.length > 0 ? (
              filteredReports.map(report => (
                <div key={report.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <h3 className="font-extrabold text-slate-800 text-base">{report.taskName}</h3>
                      <p className="text-xs font-bold text-slate-400 mt-1">
                        {format(new Date(report.date), 'dd MMM yyyy', { locale: id })}
                      </p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${report.status === 'pending' ? 'bg-orange-500 text-white shadow-sm' :
                          report.status === 'reviewed' ? 'bg-emerald-500 text-white shadow-sm' :
                            'bg-rose-500 text-white shadow-sm'
                        }`}>
                        {report.status === 'pending' ? 'Menunggu' :
                          report.status === 'reviewed' ? 'Disetujui' :
                            'Ditolak'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2 mt-1">
                    <button
                      onClick={() => openDetailModal(report)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold bg-blue-50 text-school-blue hover:bg-blue-100 transition-all"
                    >
                      <Eye size={16} /> Lihat Detail
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                <div className="flex justify-center mb-2 text-slate-300">
                  <ClipboardList size={32} />
                </div>
                Belum ada riwayat laporan yang dikirim.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Input Laporan Baru */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl shrink-0">
              <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">
                {editingReportId ? '📝 Revisi Laporan Kegiatan' : '📝 Input Laporan Baru'}
              </h3>
              <button
                onClick={closeFormModal}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTaskReportSubmit} className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Jenis Tugas <span className="text-rose-500">*</span></label>
                <div className="relative" ref={dropdownRef}>
                  <select
                    value={reportTaskName}
                    onChange={(e) => setReportTaskName(e.target.value)}
                    className="absolute opacity-0 w-0 h-0 pointer-events-none"
                    required
                    tabIndex={-1}
                  >
                    <option value="" disabled></option>
                    {availableTasks.map((task, idx) => (
                      <option key={idx} value={task}>{task}</option>
                    ))}
                  </select>

                  <div
                    className={`w-full bg-white border ${isDropdownOpen ? 'border-school-blue ring-4 ring-school-blue/10' : 'border-slate-200 hover:border-slate-300'} rounded-2xl p-4 text-slate-700 flex justify-between items-center cursor-pointer transition-all shadow-sm font-medium`}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <span className={reportTaskName ? 'text-slate-800 text-sm' : 'text-slate-400 text-sm'}>
                      {reportTaskName || 'Pilih tugas yang dikerjakan...'}
                    </span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="max-h-56 overflow-y-auto py-2 custom-scrollbar">
                        {availableTasks.map((task, idx) => (
                          <div
                            key={idx}
                            className={`px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors ${reportTaskName === task ? 'bg-blue-50/50' : ''}`}
                            onClick={() => {
                              setReportTaskName(task);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <span className={`text-sm ${reportTaskName === task ? 'font-bold text-school-blue' : 'text-slate-700 font-medium'}`}>{task}</span>
                            {reportTaskName === task && <Check size={16} className="text-school-blue" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Deskripsi Kegiatan <span className="text-rose-500">*</span></label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Ceritakan detail kegiatan yang dilakukan..."
                  className="w-full bg-white border border-slate-200 rounded-2xl p-4 h-28 resize-none focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tautan / Bukti Dokumen <span className="text-slate-400 font-medium">(Opsional)</span></label>
                <div className="relative group flex items-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute left-4 text-slate-400 hover:text-school-blue transition-colors cursor-pointer disabled:opacity-50"
                    title="Upload Foto"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-school-blue border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <ImagePlus size={20} />
                    )}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                  />
                  <input
                    type="url"
                    value={reportLink}
                    onChange={(e) => setReportLink(e.target.value)}
                    placeholder="Link Drive, Dokumen, dll"
                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 pr-4 pl-12 text-slate-700 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm text-sm"
                  />
                </div>
                {reportLink && (
                  <div className="mt-4 relative inline-block group/img">
                    {reportLink.match(/\.(jpeg|jpg|gif|png)$/i) || reportLink.startsWith('https://') ? (
                      <img src={reportLink} alt="Preview Lampiran" className="h-28 w-28 object-cover rounded-2xl border-2 border-slate-100 shadow-sm" />
                    ) : (
                      <div className="h-28 w-28 bg-slate-100 rounded-2xl border-2 border-slate-200 flex items-center justify-center shadow-sm">
                        <span className="text-xs font-medium text-slate-500">Tautan Dokumen</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setReportLink('')}
                      className="absolute -top-2.5 -right-2.5 bg-white text-rose-500 rounded-full p-1.5 shadow-lg border border-slate-100 hover:bg-rose-500 hover:text-white transition-all"
                      title="Hapus foto"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-school-blue text-white py-3 rounded-xl font-bold transition-all hover:bg-blue-700 hover:shadow-lg"
                >
                  {editingReportId ? 'Simpan Revisi' : 'Kirim Laporan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Laporan */}
      {isDetailModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl shrink-0">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">Detail Laporan Kegiatan</h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Dikirim pada {format(new Date(selectedReport.createdAt), 'dd MMMM yyyy HH:mm', { locale: id })}</p>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 scrollbar-none">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tanggal Kegiatan</p>
                  <p className="font-bold text-slate-700 mt-0.5">
                    {format(new Date(selectedReport.date), 'EEEE, dd MMMM yyyy', { locale: id })}
                  </p>
                </div>
                <div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${selectedReport.status === 'reviewed' ? 'bg-emerald-500 text-white shadow-sm' :
                      selectedReport.status === 'rejected' ? 'bg-rose-500 text-white shadow-sm' :
                        'bg-orange-500 text-white shadow-sm'
                    }`}>
                    {selectedReport.status === 'reviewed' ? 'Disetujui' : selectedReport.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Nama Tugas / Laporan</p>
                <p className="font-bold text-slate-800 text-base">{selectedReport.taskName}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Deskripsi Kegiatan</p>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedReport.description}
                </p>
              </div>

              {selectedReport.link && (
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Lampiran Bukti</p>
                  {selectedReport.link.match(/\.(jpeg|jpg|gif|png)$/i) || selectedReport.link.includes('supabase.co') ? (
                    <img
                      src={selectedReport.link}
                      alt="Bukti Lampiran"
                      className="max-h-56 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(selectedReport.link, '_blank')}
                    />
                  ) : (
                    <a
                      href={selectedReport.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-school-blue font-bold hover:underline"
                    >
                      Lihat Dokumen Terlampir
                    </a>
                  )}
                </div>
              )}

              {selectedReport.adminFeedback && (
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Komentar / Tanggapan Admin</p>
                  <p className={`text-sm leading-relaxed font-semibold ${selectedReport.status === 'reviewed' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedReport.adminFeedback}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-3xl shrink-0">
              {selectedReport.status === 'rejected' && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingReportId(selectedReport.id);
                    setReportTaskName(selectedReport.taskName);
                    setReportDescription(selectedReport.description);
                    setReportLink(selectedReport.link || '');
                    setIsDetailModalOpen(false);
                    setIsFormModalOpen(true);
                  }}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 text-sm"
                >
                  <Edit size={16} /> Revisi Laporan
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

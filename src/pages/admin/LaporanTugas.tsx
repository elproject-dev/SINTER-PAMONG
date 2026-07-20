import React, { useState, useEffect } from 'react';
import { TaskReport, User } from '../../lib/types';
import { getAllTaskReports, getUsers, updateTaskReportStatus } from '../../lib/db';
import { CheckCircle2, XCircle, Clock, BookOpen, MessageSquare, Search, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useRealtimeSubscription } from '../../lib/useRealtime';

export const AdminReviewLaporanTugas: React.FC = () => {
  const [reports, setReports] = useState<(TaskReport & { user?: User })[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<(TaskReport & { user?: User }) | null>(null);
  const [modalFeedback, setModalFeedback] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    const allUsers = await getUsers();
    const userMap: Record<string, User> = {};
    allUsers.forEach(u => userMap[u.id] = u);

    const allReports = await getAllTaskReports();
    const sortedReports = allReports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setReports(sortedReports.map(r => ({ ...r, user: userMap[r.userId] })));
  };

  useEffect(() => {
    fetchData();
  }, []);

  useRealtimeSubscription(['laporan_tugas'], fetchData);

  const handleStatusUpdate = async (reportId: string, status: 'reviewed' | 'rejected') => {
    if (status === 'rejected' && !modalFeedback.trim()) {
      alert('Mohon berikan komentar/alasan penolakan terlebih dahulu.');
      return;
    }

    await updateTaskReportStatus(reportId, status, modalFeedback);
    setModalFeedback('');
    setIsModalOpen(false);
    setSelectedReport(null);
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

  const filteredReports = reports
    .filter(r => (r.status || 'pending') === activeTab)
    .filter(r =>
      (r.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.taskName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

  const openReviewModal = (report: TaskReport & { user?: User }) => {
    setSelectedReport(report);
    setModalFeedback(report.adminFeedback || '');
    setIsModalOpen(true);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 mb-1 sm:mb-2 tracking-tight">Laporan Tugas</h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-lg">Tinjau dan verifikasi laporan kegiatan harian staf</p>
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
            className="w-full bg-white border border-slate-200 rounded-xl py-3 pr-4 pl-10 text-slate-700 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-medium"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
          <div className="flex items-center space-x-2">
            <BookOpen size={20} className="text-slate-600" />
            <h2 className="font-bold text-slate-800 text-lg">Daftar Laporan</h2>
          </div>

          <div className="flex gap-5 w-fit shrink-0 items-center">
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-1 px-1 font-bold text-xs transition-all flex items-center gap-1.5 border-b-2 ${
                activeTab === 'pending'
                  ? 'border-school-blue text-school-blue'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Clock size={14} />
              Menunggu Review
            </button>
            <button
              onClick={() => setActiveTab('reviewed')}
              className={`pb-1 px-1 font-bold text-xs transition-all flex items-center gap-1.5 border-b-2 ${
                activeTab === 'reviewed'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <CheckCircle2 size={14} />
              Disetujui
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`pb-1 px-1 font-bold text-xs transition-all flex items-center gap-1.5 border-b-2 ${
                activeTab === 'rejected'
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <XCircle size={14} />
              Ditolak
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="w-full text-left border-collapse min-w-[800px] hidden md:table">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold border border-slate-200 w-12 text-center">NO</th>
                <th className="px-4 py-3 font-bold border border-slate-200">NAMA STAF</th>
                <th className="px-4 py-3 font-bold border border-slate-200">JABATAN</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-36">TANGGAL</th>
                <th className="px-4 py-3 font-bold border border-slate-200">NAMA TUGAS</th>
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
                    <td className="px-4 py-3 border border-slate-200 text-sm font-bold text-slate-800">
                      {report.user?.name || 'Staf Tidak Dikenal'}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-sm text-slate-700">
                      {report.user?.position || 'Belum ada jabatan'}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center text-sm text-slate-700">
                      {format(new Date(report.date), 'dd MMM yyyy', { locale: id })}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-sm text-slate-800 font-medium">
                      {report.taskName}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => openReviewModal(report)}
                          title="Tinjau Laporan"
                          className="p-2 rounded-full text-school-blue hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 border border-slate-200">
                    <div className="flex justify-center mb-2 text-slate-300">
                      <BookOpen size={32} />
                    </div>
                    Tidak ada laporan yang ditemukan berdasarkan filter pencarian Anda.
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
                      <h3 className="font-extrabold text-slate-800 text-base">{report.user?.name || 'Staf Tidak Dikenal'}</h3>
                      <p className="text-sm font-medium text-school-blue">{report.user?.position || 'Belum ada jabatan'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                        {format(new Date(report.date), 'dd MMM yyyy', { locale: id })}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm font-semibold text-slate-700 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    {report.taskName}
                  </div>

                  <div className="pt-2 flex justify-end gap-2 mt-1">
                    <button
                      onClick={() => openReviewModal(report)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold bg-blue-50 text-school-blue hover:bg-blue-100 transition-all"
                    >
                      <Eye size={16} /> Tinjau Laporan
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

      {/* Modal Review Laporan */}
      {isModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl shrink-0">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">Detail Review Laporan</h3>
                <p className="text-sm text-slate-500 mt-1 font-semibold">
                  {selectedReport.user?.name || 'Staf Tidak Dikenal'} • {selectedReport.user?.position || 'Belum ada jabatan'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
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
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${selectedReport.status === 'reviewed'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : selectedReport.status === 'rejected'
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                    {selectedReport.status === 'reviewed' ? 'Disetujui' : selectedReport.status === 'rejected' ? 'Ditolak' : 'Menunggu Review'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Nama Tugas / Laporan</p>
                <p className="font-bold text-slate-800 text-lg">{selectedReport.taskName}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Deskripsi Kegiatan</p>
                <p className="text-slate-700 text-sm leading-relaxed">
                  {selectedReport.description}
                </p>
              </div>

              {selectedReport.link && (
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Lampiran Bukti</p>
                  {selectedReport.link.match(/\.(jpeg|jpg|gif|png)$/i) || selectedReport.link.includes('supabase.co') ? (
                    <div className="relative w-fit">
                      <img
                        src={selectedReport.link}
                        alt="Bukti Lampiran"
                        className="max-h-64 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(selectedReport.link!, '_blank')}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const ext = selectedReport.link!.split('.').pop()?.split('?')[0] || 'jpg';
                          handleDownload(selectedReport.link!, `bukti-laporan-${selectedReport.id}.${ext}`);
                        }}
                        className="absolute bottom-3 right-3 bg-slate-900/70 hover:bg-slate-900 text-white p-2.5 rounded-xl shadow-lg backdrop-blur-sm transition-all flex items-center justify-center gap-1.5 text-xs font-bold"
                      >
                        <Download size={14} /> Unduh
                      </button>
                    </div>
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

              {selectedReport.status !== 'pending' && selectedReport.adminFeedback && (
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Komentar / Tanggapan Admin</p>
                  <p className={`text-sm leading-relaxed font-semibold ${selectedReport.status === 'reviewed' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedReport.adminFeedback}
                  </p>
                </div>
              )}

              {selectedReport.status === 'pending' && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <MessageSquare size={16} className="text-slate-400" /> Catatan / Tanggapan Admin
                    </label>
                    <textarea
                      placeholder="Masukkan catatan persetujuan atau alasan penolakan..."
                      value={modalFeedback}
                      onChange={(e) => setModalFeedback(e.target.value)}
                      rows={3}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue transition-all"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(selectedReport.id, 'reviewed')}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={18} /> Setujui Laporan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(selectedReport.id, 'rejected')}
                      className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <XCircle size={18} /> Tolak Laporan
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-3xl shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
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

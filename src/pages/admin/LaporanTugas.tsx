import React, { useState, useEffect } from 'react';
import { TaskReport, User } from '../../lib/types';
import { getAllTaskReports, getUsers, updateTaskReportStatus } from '../../lib/db';
import { CheckCircle2, XCircle, Clock, BookOpen, MessageSquare, Search, Eye, Download, Star, Paperclip, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useRealtimeSubscription } from '../../lib/useRealtime';

export const AdminReviewLaporanTugas: React.FC = () => {
  const [reports, setReports] = useState<(TaskReport & { user?: User })[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // States for Review Form
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState<number | ''>('');

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

  const handleReviewClick = (report: TaskReport & { user?: User }) => {
    if (selectedReportId === report.id) {
      setSelectedReportId(null);
    } else {
      setSelectedReportId(report.id);
      setFeedback(report.adminFeedback || '');
      setScore(report.score ?? '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const selectedReport = reports.find(r => r.id === selectedReportId);

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-10">
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
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-4 pl-10 text-slate-700 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-medium text-sm"
          />
        </div>
      </div>

      {/* Form Review Compact */}
      {selectedReport && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
            <h2 className="font-bold text-slate-800 text-lg flex items-center">
              Tinjau Laporan
            </h2>
            <button
              onClick={() => setSelectedReportId(null)}
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
              {selectedReport.status === 'pending' ? (
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
                              className="inline-flex items-center gap-1.5 text-xs text-school-blue font-bold hover:bg-blue-100 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
                            >
                              <Eye size={13} /> Periksa
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                const ext = selectedReport.link!.split('.').pop()?.split('?')[0] || 'jpg';
                                handleDownload(selectedReport.link!, `bukti-${selectedReport.id}.${ext}`);
                              }}
                              className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-bold hover:bg-slate-200 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
                            >
                              <Download size={13} /> Unduh
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
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mb-3 ${selectedReport.status === 'reviewed'
                      ? 'bg-emerald-500 text-white shadow-sm border border-emerald-600'
                      : 'bg-rose-100 text-rose-700 border border-rose-200'
                      }`}>
                      {selectedReport.status === 'reviewed' ? 'Telah Disetujui' : 'Telah Ditolak'}
                    </span>
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
                            className="inline-flex items-center gap-1.5 text-xs text-school-blue font-bold hover:bg-blue-100 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
                          >
                            <Eye size={13} /> Periksa
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              const ext = selectedReport.link!.split('.').pop()?.split('?')[0] || 'jpg';
                              handleDownload(selectedReport.link!, `bukti-${selectedReport.id}.${ext}`);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-bold hover:bg-slate-200 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
                          >
                            <Download size={13} /> Unduh
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic mt-1">Tidak ada lampiran</span>
                      )}
                    </div>

                    {selectedReport.status === 'reviewed' && selectedReport.score && (
                      <div className="flex flex-col items-end">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Penilaian Diberikan</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={20}
                              className={`${star <= selectedReport.score! ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
          <div className="flex items-center space-x-2">
            <BookOpen size={20} className="text-slate-600" />
            <h2 className="font-bold text-slate-800 text-lg">Daftar Laporan</h2>
          </div>

          <div className="flex gap-5 w-fit shrink-0 items-center">
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-1 px-1 font-bold text-xs transition-all flex items-center gap-1.5 border-b-2 ${activeTab === 'pending'
                ? 'border-school-blue text-school-blue'
                : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
            >
              <Clock size={14} />
              Menunggu Review
            </button>
            <button
              onClick={() => setActiveTab('reviewed')}
              className={`pb-1 px-1 font-bold text-xs transition-all flex items-center gap-1.5 border-b-2 ${activeTab === 'reviewed'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
            >
              <CheckCircle2 size={14} />
              Disetujui
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`pb-1 px-1 font-bold text-xs transition-all flex items-center gap-1.5 border-b-2 ${activeTab === 'rejected'
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
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-28">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
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
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
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
                        className={`p-2.5 rounded-lg transition-colors ${selectedReportId === report.id
                          ? 'text-amber-600 bg-amber-100 hover:bg-amber-200'
                          : 'text-school-blue bg-blue-50 hover:bg-blue-100'
                          }`}
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 border border-slate-200">
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
            {filteredReports.length > 0 ? (
              filteredReports.map(report => (
                <div key={report.id} className={`p-4 transition-colors flex flex-col gap-3 ${selectedReportId === report.id ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                  <div className="flex flex-col">
                    <div className="flex justify-between items-start gap-4">
                      <h3 className="font-extrabold text-slate-800 text-base">{report.taskName}</h3>
                      <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${report.status === 'reviewed'
                        ? 'bg-emerald-500 text-white shadow-sm border border-emerald-600'
                        : report.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-orange-500 text-white shadow-sm border border-orange-600'
                        }`}>
                        {report.status === 'reviewed' ? 'Disetujui' : report.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 mt-1">
                      {format(new Date(report.date), 'dd MMM yyyy', { locale: id })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Lampiran:</span>
                    {report.link ? (
                      <a href={report.link} target="_blank" rel="noopener noreferrer" className="text-school-blue hover:text-blue-700 transition-colors flex items-center gap-1 text-xs font-bold" title="Lihat Lampiran">
                        <Paperclip size={14} /> Lihat Bukti
                      </a>
                    ) : (
                      <span className="text-slate-400 font-bold">-</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                    <UserIcon size={16} className="text-slate-400" />
                    <div>
                      <p className="text-sm font-bold text-school-blue leading-tight">{report.user?.name || 'Staf Tidak Dikenal'}</p>
                      <p className="text-xs text-slate-500">{report.user?.position || 'Belum ada jabatan'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Penilaian:</span>
                    <div className="flex items-center gap-0.5 text-slate-300">
                      {report.score ? (
                        [1, 2, 3, 4, 5].map((star) => (
                          <Star key={`mobile-${star}`} size={16} className={`${star <= report.score! ? 'fill-amber-400 text-amber-400' : 'fill-transparent stroke-current'}`} />
                        ))
                      ) : (
                        [1, 2, 3, 4, 5].map((star) => (
                          <Star key={`mobile-${star}`} size={16} className="fill-transparent stroke-current" />
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end mt-1">
                    <button
                      onClick={() => handleReviewClick(report)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border ${selectedReportId === report.id
                        ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
                        : 'bg-blue-50 text-school-blue border-blue-100 hover:bg-blue-100'
                        }`}
                    >
                      <Eye size={16} /> {selectedReportId === report.id ? 'Tutup Review' : 'Tinjau Laporan'}
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

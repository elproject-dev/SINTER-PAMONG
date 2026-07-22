import React, { useState, useEffect, useCallback } from 'react';
import { getAttendance, getUsers } from '../../lib/db';
import { AttendanceRecord, User } from '../../lib/types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Download, List, Eye, Loader2, X, Camera } from 'lucide-react';
import { useRealtimeSubscription } from '../../lib/useRealtime';

export const AttendanceList: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const recordsData = await getAttendance();
      const staffData = await getUsers();
      
      // Filter out admin users
      const nonAdminStaff = staffData.filter(s => s.role !== 'admin');
      const nonAdminIds = new Set(nonAdminStaff.map(s => s.id));
      const filteredRecords = recordsData.filter(r => nonAdminIds.has(r.userId));
      
      setRecords(filteredRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setStaff(nonAdminStaff);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeSubscription(['data_absensi', 'profil_pengguna'], fetchData);

  const getStaffName = (userId: string) => {
    return staff.find(s => s.id === userId)?.name || 'Unknown';
  };

  const getStaffPosition = (userId: string) => {
    return staff.find(s => s.id === userId)?.position || null;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return <span className="px-2.5 py-1 bg-green-500 text-white rounded-full text-xs font-bold shadow-sm">Hadir</span>;
      case 'leave': return <span className="px-2.5 py-1 bg-amber-500 text-white rounded-full text-xs font-bold shadow-sm">Izin</span>;
      case 'sick': return <span className="px-2.5 py-1 bg-amber-500 text-white rounded-full text-xs font-bold shadow-sm">Sakit</span>;
      default: return <span className="px-2.5 py-1 bg-red-500 text-white rounded-full text-xs font-bold shadow-sm">Absen</span>;
    }
  };

  const handleExport = () => {
    // Simple CSV export
    let csv = 'Tanggal,Nama,Status,Jam Masuk,Jam Keluar,Catatan\n';
    records.forEach(r => {
      csv += `${r.date},${getStaffName(r.userId)},${r.status},${r.checkIn ? format(new Date(r.checkIn), 'HH:mm') : '-'},${r.checkOut ? format(new Date(r.checkOut), 'HH:mm') : '-'},${r.note || '-'}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Absensi_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 mb-1 sm:mb-2 tracking-tight">Daftar Absensi</h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-lg">Rekapitulasi kehadiran seluruh staff dan guru</p>
        </div>
        <button
          onClick={handleExport}
          className="bg-white border-2 border-slate-200 hover:border-school-blue hover:text-school-blue text-slate-700 px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 w-full sm:w-auto justify-center"
        >
          <Download size={18} />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center space-x-2 bg-white">
          <List size={20} className="text-slate-600" />
          <h2 className="font-bold text-slate-800 text-lg">Data Kehadiran</h2>
        </div>
        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="w-full text-left border-collapse min-w-[900px] hidden md:table">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold border border-slate-200 w-12 text-center">NO</th>
                <th className="px-4 py-3 font-bold border border-slate-200 w-36 text-center">TANGGAL</th>
                <th className="px-4 py-3 font-bold border border-slate-200">NAMA LENGKAP</th>
                <th className="px-4 py-3 font-bold border border-slate-200">PROFESI / JABATAN</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center">STATUS</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-28">JAM MASUK</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-28">JAM KELUAR</th>
                <th className="px-4 py-3 font-bold border border-slate-200 w-64">CATATAN</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-20">FOTO</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center">LOKASI (GPS)</th>
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
              ) : records.length > 0 ? (
                records.map((record, index) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 border border-slate-200 text-center text-sm font-medium text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-sm text-slate-700 text-center">
                      {format(new Date(record.date), 'dd MMM yyyy', { locale: id })}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-sm">
                      <div className="font-bold text-school-blue">{getStaffName(record.userId)}</div>
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-sm text-slate-600">
                      {getStaffPosition(record.userId) || <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center text-sm text-slate-600">
                      {record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '-'}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center text-sm text-slate-600">
                      {record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '-'}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-sm text-slate-500 max-w-[200px] truncate" title={record.note}>
                      {record.note || '-'}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      {record.selfieUrl ? (
                        <button
                          onClick={() => setLightboxUrl(record.selfieUrl!)}
                          className="inline-block"
                          title="Lihat Foto Selfie"
                        >
                          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-school-blue/30 hover:border-school-blue transition-colors shadow-sm mx-auto cursor-pointer hover:scale-110 transform duration-200">
                            <img src={record.selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                          </div>
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs"><Camera size={16} className="mx-auto text-slate-300" /></span>
                      )}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      {record.latitude && record.longitude ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${record.latitude},${record.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs font-bold text-white bg-[#00bcd4] hover:bg-cyan-500 px-3 py-1.5 rounded-md transition-colors shadow-sm"
                        >
                          <Eye size={14} className="mr-1.5" /> Lihat
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 border border-slate-200">
                    Belum ada data absensi.
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
            ) : records.length > 0 ? (
              records.map(record => (
                <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {record.selfieUrl ? (
                        <button onClick={() => setLightboxUrl(record.selfieUrl!)} className="shrink-0">
                          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-school-blue/30 shadow-sm">
                            <img src={record.selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                          </div>
                        </button>
                      ) : null}
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 mb-0.5">{format(new Date(record.date), 'dd MMM yyyy', { locale: id })}</span>
                        <h3 className="font-extrabold text-school-blue text-base">{getStaffName(record.userId)}</h3>
                        {getStaffPosition(record.userId) && (
                          <span className="text-xs text-slate-500 font-medium">{getStaffPosition(record.userId)}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(record.status)}
                    </div>
                  </div>

                  <div className="text-sm flex flex-col gap-1.5 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Jam Masuk</span>
                      <span className="font-semibold text-slate-700">{record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Jam Keluar</span>
                      <span className="font-semibold text-slate-700">{record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '-'}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center mt-1">
                    <div className="text-xs text-slate-500 italic max-w-[50%] truncate">
                      {record.note ? `Catatan: ${record.note}` : 'Tidak ada catatan'}
                    </div>
                    {record.latitude && record.longitude ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${record.latitude},${record.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-bold text-white bg-[#00bcd4] hover:bg-cyan-500 px-3 py-1.5 rounded-md transition-colors shadow-sm"
                      >
                        <Eye size={14} className="mr-1.5" /> Lihat Lokasi
                      </a>
                    ) : (
                      <span className="text-slate-400 text-xs">Tanpa Lokasi GPS</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                <div className="flex justify-center mb-2 text-slate-300">
                  <List size={32} />
                </div>
                Belum ada data absensi.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Selfie */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-w-sm w-full animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 z-10 bg-white rounded-full p-1.5 shadow-lg hover:bg-slate-100 transition-colors"
            >
              <X size={20} className="text-slate-600" />
            </button>
            <div className="w-72 h-72 mx-auto rounded-full overflow-hidden border-4 border-white shadow-2xl">
              <img src={lightboxUrl} alt="Foto Selfie Absensi" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

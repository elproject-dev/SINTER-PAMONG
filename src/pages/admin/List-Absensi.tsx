import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAttendance, getUsers } from '../../lib/db';
import { AttendanceRecord, User } from '../../lib/types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Download, List, Eye, Loader2, MapPin, SlidersHorizontal, X, Layers, CheckCircle2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useRealtimeSubscription } from '../../lib/useRealtime';

export const ListAbsensi: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const todayString = format(new Date(), 'yyyy-MM-dd');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'leave' | 'sick' | 'absent'>('all');
  
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  
  const filterPopupRef = useRef<HTMLDivElement>(null);
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

  const displayRecords = records.filter(r => {
    let matchesDate = true;
    const isDefaultDateFilter = !filterStartDate && !filterEndDate;

    if (isDefaultDateFilter) {
      // If no date is selected, show only today's data to prevent huge lists
      if (r.date !== todayString) matchesDate = false;
    } else {
      if (filterStartDate && r.date < filterStartDate) matchesDate = false;
      if (filterEndDate && r.date > filterEndDate) matchesDate = false;
    }
    
    let matchesStatus = true;
    if (filterStatus !== 'all' && r.status !== filterStatus) matchesStatus = false;
    
    return matchesDate && matchesStatus;
  });

  const handleExport = () => {
    // Simple CSV export
    let csv = 'Tanggal,Nama,Status,Jam Masuk,Jam Keluar,Catatan\n';
    displayRecords.forEach(r => {
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-row items-center justify-between bg-white gap-3 relative">
          <div className="flex items-center space-x-2 truncate">
            <List size={20} className="text-slate-600 shrink-0" />
            <h2 className="font-bold text-slate-800 text-lg">Data Kehadiran ({displayRecords.length})</h2>
          </div>
          <div className="flex items-center gap-2 relative" ref={filterPopupRef}>
            <button
              onClick={() => setShowFilterPopup(!showFilterPopup)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border transition-all ${
                showFilterPopup || filterStartDate !== '' || filterEndDate !== '' || filterStatus !== 'all'
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
                  <h3 className="font-bold text-slate-800 text-sm">Filter Data</h3>
                  <button onClick={() => setShowFilterPopup(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1 rounded-md transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Tanggal Mulai</label>
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-school-blue/20 outline-none text-slate-700 font-bold text-center cursor-pointer transition-all hover:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Tanggal Akhir</label>
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
                        {filterStatus === 'present' && <><CheckCircle size={16} className="text-emerald-500" /> Hadir</>}
                        {filterStatus === 'leave' && <><Clock size={16} className="text-amber-500" /> Izin</>}
                        {filterStatus === 'sick' && <><CheckCircle2 size={16} className="text-amber-500" /> Sakit</>}
                        {filterStatus === 'absent' && <><XCircle size={16} className="text-red-500" /> Absen</>}
                      </span>
                    </button>

                    {isStatusDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <button onClick={() => { setFilterStatus('all'); setIsStatusDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-slate-50 ${filterStatus === 'all' ? 'text-school-blue bg-blue-50/50' : 'text-slate-700'}`}>
                          <Layers size={16} className={filterStatus === 'all' ? 'text-school-blue' : 'text-slate-500'} /> Semua Status
                        </button>
                        <button onClick={() => { setFilterStatus('present'); setIsStatusDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-slate-50 ${filterStatus === 'present' ? 'text-emerald-600 bg-emerald-50/50' : 'text-slate-700'}`}>
                          <CheckCircle size={16} className={filterStatus === 'present' ? 'text-emerald-600' : 'text-emerald-500'} /> Hadir
                        </button>
                        <button onClick={() => { setFilterStatus('leave'); setIsStatusDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-slate-50 ${filterStatus === 'leave' ? 'text-amber-600 bg-amber-50/50' : 'text-slate-700'}`}>
                          <Clock size={16} className={filterStatus === 'leave' ? 'text-amber-600' : 'text-amber-500'} /> Izin
                        </button>
                        <button onClick={() => { setFilterStatus('sick'); setIsStatusDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-slate-50 ${filterStatus === 'sick' ? 'text-amber-600 bg-amber-50/50' : 'text-slate-700'}`}>
                          <CheckCircle2 size={16} className={filterStatus === 'sick' ? 'text-amber-600' : 'text-amber-500'} /> Sakit
                        </button>
                        <button onClick={() => { setFilterStatus('absent'); setIsStatusDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-slate-50 ${filterStatus === 'absent' ? 'text-red-600 bg-red-50/50' : 'text-slate-700'}`}>
                          <XCircle size={16} className={filterStatus === 'absent' ? 'text-red-600' : 'text-red-500'} /> Absen
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                    {displayRecords.length} Data
                  </span>
                  <button
                    onClick={() => {
                      setFilterStartDate('');
                      setFilterEndDate('');
                      setFilterStatus('all');
                    }}
                    className="text-school-blue hover:text-blue-700 font-bold text-sm bg-blue-50 hover:bg-blue-100 px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Reset Filter
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
              ) : displayRecords.length > 0 ? (
                displayRecords.map((record, index) => (
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
                        <a
                          href={record.selfieUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-school-blue hover:text-blue-700 hover:underline font-bold text-sm"
                          title="Lihat Foto Selfie di Tab Baru"
                        >
                          Lihat
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
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
          <div className="lg:hidden flex flex-col divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500">
                <div className="flex justify-center mb-3 text-school-blue">
                  <Loader2 size={32} className="animate-spin" />
                </div>
                <p className="font-bold text-lg text-slate-600 mb-1">Memuat Data...</p>
              </div>
            ) : displayRecords.length > 0 ? (
              displayRecords.map(record => (
                <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {/* Removed image thumbnail from here */}
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
                    <div className="flex items-center gap-3">
                      {record.selfieUrl && (
                        <a
                          href={record.selfieUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-school-blue hover:text-blue-700 hover:underline text-xs font-bold"
                        >
                          Lihat Foto
                        </a>
                      )}
                      {record.latitude && record.longitude ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${record.latitude},${record.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs font-bold text-white bg-[#00bcd4] hover:bg-cyan-500 px-3 py-1.5 rounded-md transition-colors shadow-sm"
                        >
                          <MapPin size={14} className="mr-1.5" /> Lokasi
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">Tanpa GPS</span>
                      )}
                    </div>
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

    </div>
  );
};

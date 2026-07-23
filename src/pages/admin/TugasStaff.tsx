import React, { useState, useEffect, useRef } from 'react';
import { User, StaffTask, TaskReport } from '../../lib/types';
import { getStaff, getStaffTasks, addStaffTask, deleteStaffTask, updateStaffTask, uploadTaskAttachment, getAllTaskReports } from '../../lib/db';
import { Plus, Trash2, Search, ListChecks, User as UserIcon, Edit, Check, ChevronDown, Paperclip, X, SlidersHorizontal, Layers, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useRealtimeSubscription } from '../../lib/useRealtime';
import { StarRating } from '../../components/StarRating';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export const AdminTugasStaff: React.FC = () => {
  const [staff, setStaff] = useState<User[]>([]);
  const [allTasks, setAllTasks] = useState<StaffTask[]>([]);
  const [taskReports, setTaskReports] = useState<TaskReport[]>([]);

  // Form State
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newMedia, setNewMedia] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterPopupRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setStaffSearch('');
      }
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

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterPenilaian, setFilterPenilaian] = useState<'all' | 'sudah' | 'belum'>('all');
  const [showSuccess, setShowSuccess] = useState('');

  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const staffData = await getStaff();
      setStaff(staffData);
      const tasks = await getStaffTasks();
      setAllTasks(tasks);
      const reports = await getAllTaskReports();
      setTaskReports(reports);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useRealtimeSubscription(['tugas_staff', 'profil_pengguna'], fetchData);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId || !newTaskName.trim()) return;

    try {
      setIsUploading(true);
      let lampiranUrl: string | undefined = undefined;

      if (newMedia) {
        lampiranUrl = await uploadTaskAttachment(newMedia, newTaskName.trim());
      }

      if (editingTaskId) {
        await updateStaffTask(editingTaskId, {
          namaTugas: newTaskName.trim(),
          deskripsi: newTaskDesc.trim() || undefined,
          lampiranUrl
        });
        setEditingTaskId(null);
        setShowSuccess('Tugas berhasil diubah!');
      } else {
        await addStaffTask({
          userId: selectedStaffId,
          namaTugas: newTaskName.trim(),
          deskripsi: newTaskDesc.trim() || undefined,
          lampiranUrl
        });
        setShowSuccess('Tugas berhasil ditambahkan!');
      }
      setNewTaskName('');
      setNewTaskDesc('');
      setNewMedia(null);
      if (!editingTaskId) {
        // Biarkan staf tetap terpilih jika ingin menambah tugas lain untuk staf yang sama
      } else {
        setSelectedStaffId('');
        setShowForm(false);
      }
      await fetchData();
      setTimeout(() => setShowSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan tugas. Pastikan file tidak terlalu besar.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditClick = (task: StaffTask) => {
    setEditingTaskId(task.id);
    setSelectedStaffId(task.userId || '');
    setNewTaskName(task.namaTugas || '');
    setNewTaskDesc(task.deskripsi || '');
    setShowForm(true);
    setTimeout(() => document.getElementById('form-tugas-staff')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setSelectedStaffId('');
    setNewTaskName('');
    setNewTaskDesc('');
    setNewMedia(null);
    setShowForm(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Yakin ingin menghapus tugas ini?')) return;
    try {
      await deleteStaffTask(taskId);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus tugas.');
    }
  };

  // Combine Task with Staff Data for Table Display
  const tasksWithStaff = allTasks.map(task => {
    const assignedStaff = staff.find(s => s.id === task.userId);
    return {
      ...task,
      staffName: assignedStaff?.name || 'Staf tidak ditemukan',
      staffPosition: assignedStaff?.position || 'Belum ada jabatan'
    };
  });

  const filteredTasks = tasksWithStaff.filter(t => {
    const matchesSearch = t.namaTugas.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.deskripsi || '').toLowerCase().includes(searchQuery.toLowerCase());

    let matchesDate = true;
    if (t.createdAt) {
      const taskDate = new Date(t.createdAt).toISOString().split('T')[0];
      if (filterStartDate && taskDate < filterStartDate) matchesDate = false;
      if (filterEndDate && taskDate > filterEndDate) matchesDate = false;
    } else if (filterStartDate || filterEndDate) {
      matchesDate = false;
    }

    let matchesPenilaian = true;
    if (filterPenilaian !== 'all') {
      const relatedReports = taskReports.filter(
        r => r.userId === t.userId && r.taskName === t.namaTugas && r.score
      );
      const isDinilai = relatedReports.length > 0;
      if (filterPenilaian === 'sudah' && !isDinilai) matchesPenilaian = false;
      if (filterPenilaian === 'belum' && isDinilai) matchesPenilaian = false;
    }

    return matchesSearch && matchesDate && matchesPenilaian;
  });

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 mb-1 sm:mb-2 tracking-tight">Daftar Semua Tugas</h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-lg">Atur dan pantau daftar tugas laporan seluruh staf</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <div className="relative w-full sm:w-64 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Cari tugas atau nama staf..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-4 pl-10 text-slate-700 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-medium text-sm"
            />
          </div>

          <button
            onClick={() => {
              setShowForm(!showForm);
              if (!showForm && !editingTaskId) {
                setNewTaskName('');
                setNewTaskDesc('');
              }
            }}
            className={`px-8 py-2 text-white font-bold border border-transparent rounded-xl transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 whitespace-nowrap ${showForm && !editingTaskId
              ? 'bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700'
              : 'bg-gradient-to-r from-school-blue to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              }`}
          >
            {showForm && !editingTaskId ? 'Tutup Form' : <><Plus size={18} /> <span>Tambah Tugas</span></>}
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl flex items-center shadow-sm font-medium animate-in fade-in slide-in-from-top-4">
          <div className="mr-3 bg-emerald-100 p-1.5 rounded-full">✅</div>
          {showSuccess}
        </div>
      )}

      {/* Form Tambah/Edit Tugas */}
      {showForm && (
        <div id="form-tugas-staff" className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in slide-in-from-top-4 fade-in duration-300">
          <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            {editingTaskId ? <Edit size={20} className="text-emerald-500" /> : <Plus size={20} className="text-school-blue" />}
            {editingTaskId ? 'Edit Tugas' : 'Tambah Tugas Baru'}
          </h2>

          <form onSubmit={handleAddTask} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Pilih Staf <span className="text-rose-500">*</span></label>
                <div className="relative" ref={dropdownRef}>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="absolute opacity-0 w-0 h-0 pointer-events-none"
                    required
                    disabled={!!editingTaskId} // Do not allow changing staff when editing task
                    tabIndex={-1}
                  >
                    <option value="" disabled></option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.position || 'Tidak ada jabatan'})</option>
                    ))}
                  </select>

                  <div
                    className={`w-full bg-slate-50 border ${isDropdownOpen ? 'border-school-blue ring-4 ring-school-blue/10' : 'border-slate-200 hover:border-slate-300'} rounded-xl px-4 py-2 text-slate-700 flex justify-between items-center cursor-pointer transition-all font-medium ${!!editingTaskId ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`}
                    onClick={() => {
                      if (!editingTaskId) setIsDropdownOpen(!isDropdownOpen);
                    }}
                  >
                    <span className={selectedStaffId ? 'text-slate-800 text-sm' : 'text-slate-400 text-sm'}>
                      {selectedStaffId ? staff.find(s => s.id === selectedStaffId)?.name || 'Pilih Staf...' : '-- Pilih Staf --'}
                    </span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isDropdownOpen && !editingTaskId && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="p-2 border-b border-slate-100 sticky top-0 bg-white z-10">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                            <Search size={14} />
                          </div>
                          <input
                            type="text"
                            placeholder="Cari nama staf..."
                            value={staffSearch}
                            onChange={(e) => setStaffSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pr-3 pl-8 text-slate-700 text-xs focus:ring-2 focus:ring-school-blue/20 focus:border-school-blue outline-none transition-all"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="max-h-[260px] overflow-y-auto py-1 custom-scrollbar">
                        {staff.filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase()) || (s.position || '').toLowerCase().includes(staffSearch.toLowerCase())).map(s => (
                          <div
                            key={s.id}
                            className={`px-3 py-2.5 mx-1.5 mb-1 rounded-lg cursor-pointer flex flex-col justify-center transition-colors group ${selectedStaffId === s.id ? 'bg-school-blue/10' : 'hover:bg-school-blue/5'}`}
                            onClick={() => {
                              setSelectedStaffId(s.id);
                              setIsDropdownOpen(false);
                              setStaffSearch('');
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-sm transition-colors ${selectedStaffId === s.id ? 'font-bold text-school-blue' : 'text-slate-700 font-bold group-hover:text-school-blue'}`}>{s.name}</span>
                              {selectedStaffId === s.id && <Check size={16} className="text-school-blue" />}
                            </div>
                            <span className="text-xs text-slate-500">{s.position || 'Tidak ada jabatan'}</span>
                          </div>
                        ))}
                        {staff.filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase()) || (s.position || '').toLowerCase().includes(staffSearch.toLowerCase())).length === 0 && (
                          <div className="px-4 py-6 text-center text-slate-500 text-xs">
                            Pencarian tidak ditemukan.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Ditugaskan Untuk</label>
                <input
                  type="text"
                  value={selectedStaffId ? staff.find(s => s.id === selectedStaffId)?.position || 'Tidak ada jabatan' : ''}
                  placeholder="Otomatis terisi setelah memilih staf..."
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-500 font-medium outline-none cursor-not-allowed"
                  disabled
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Nama Tugas <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="misal: Membuat RPP, Piket Harian"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Upload Media <span className="text-slate-400 font-medium">(Opsional)</span></label>
                {newMedia ? (
                  <div className="w-full h-12 flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm transition-all shadow-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Paperclip size={16} className="text-school-blue shrink-0" />
                      <span className="truncate text-slate-700 font-bold max-w-[120px] sm:max-w-[180px]" title={newMedia.name}>
                        {newMedia.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => window.open(URL.createObjectURL(newMedia), '_blank')}
                        className="text-[10px] sm:text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-2.5 py-1.5 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md uppercase tracking-wider"
                      >
                        Periksa
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewMedia(null)}
                        className="text-[10px] sm:text-xs font-bold bg-gradient-to-r from-rose-500 to-red-600 text-white px-2.5 py-1.5 rounded-lg hover:from-rose-600 hover:to-red-700 transition-all shadow-sm hover:shadow-md uppercase tracking-wider"
                      >
                        Ganti
                      </button>
                    </div>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*,video/*,application/pdf"
                    onChange={(e) => setNewMedia(e.target.files?.[0] || null)}
                    className="w-full h-12 block bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-school-blue/10 file:text-school-blue hover:file:bg-school-blue/20 transition-all text-slate-600 cursor-pointer focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none py-2"
                  />
                )}
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">Instruksi Khusus / Catatan <span className="text-slate-400 font-medium">(Opsional)</span></label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Tambahkan instruksi detail tentang tugas ini..."
                  className="w-full h-20 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all resize-none custom-scrollbar"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-2">
              {editingTaskId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                disabled={isUploading}
                className={`px-8 py-2 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 ${isUploading ? 'opacity-70 cursor-not-allowed bg-slate-400' :
                  editingTaskId
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                    : 'bg-gradient-to-r from-school-blue to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  }`}
              >
                {isUploading ? 'Mengunggah...' : (editingTaskId ? 'Simpan Perubahan' : <><Plus size={16} /> Tambah Tugas</>)}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-row items-center justify-between bg-white gap-3 relative">
          <div className="flex items-center space-x-2 truncate">
            <ListChecks size={20} className="text-slate-600 shrink-0" />
            <h2 className="font-bold text-slate-800 text-lg">Semua Data Tugas ({filteredTasks.length})</h2>
          </div>
          <div className="flex items-center gap-2 relative" ref={filterPopupRef}>
            <button
              onClick={() => setShowFilterPopup(!showFilterPopup)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border transition-all ${showFilterPopup || filterStartDate || filterEndDate || filterPenilaian !== 'all'
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
                        {filterPenilaian === 'all' && 'Semua Penilaian'}
                        {filterPenilaian === 'sudah' && <><CheckCircle2 size={16} className="text-emerald-500" /> Sudah Dinilai</>}
                        {filterPenilaian === 'belum' && <><Clock size={16} className="text-amber-500" /> Belum Dinilai</>}
                      </span>
                    </button>

                    {isStatusDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={() => { setFilterPenilaian('all'); setIsStatusDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-slate-50 ${filterPenilaian === 'all' ? 'text-school-blue bg-blue-50/50' : 'text-slate-700'}`}
                        >
                          <Layers size={16} className={filterPenilaian === 'all' ? 'text-school-blue' : 'text-slate-500'} /> Semua Penilaian
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFilterPenilaian('sudah'); setIsStatusDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-slate-50 ${filterPenilaian === 'sudah' ? 'text-emerald-600 bg-emerald-50/50' : 'text-slate-700'}`}
                        >
                          <CheckCircle2 size={16} className={filterPenilaian === 'sudah' ? 'text-emerald-600' : 'text-emerald-500'} /> Sudah Dinilai
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFilterPenilaian('belum'); setIsStatusDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-slate-50 ${filterPenilaian === 'belum' ? 'text-amber-600 bg-amber-50/50' : 'text-slate-700'}`}
                        >
                          <Clock size={16} className={filterPenilaian === 'belum' ? 'text-amber-600' : 'text-amber-500'} /> Belum Dinilai
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
                      setFilterPenilaian('all');
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
          <table className="w-full text-left border-collapse min-w-[900px] hidden xl:table">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold border border-slate-200 w-12 text-center">NO</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-36">TANGGAL</th>
                <th className="px-4 py-3 font-bold border border-slate-200">NAMA TUGAS</th>
                <th className="px-4 py-3 font-bold border border-slate-200 w-1/4">DITUGASKAN KEPADA</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-32">LAMPIRAN</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-[120px]">PENILAIAN</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-24">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 border border-slate-200">
                    <div className="flex justify-center mb-3 text-school-blue">
                      <Loader2 size={32} className="animate-spin" />
                    </div>
                    <p className="font-bold text-lg text-slate-600 mb-1">Memuat Data...</p>
                  </td>
                </tr>
              ) : filteredTasks.length > 0 ? (
                filteredTasks.map((task, index) => (
                  <tr key={task.id} className={`transition-colors ${editingTaskId === task.id ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3 border border-slate-200 text-center text-sm font-medium text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center text-sm text-slate-700">
                      {task.createdAt ? format(new Date(task.createdAt), 'dd MMM yyyy', { locale: id }) : '-'}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-sm font-bold text-slate-800">
                      {task.namaTugas}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-sm text-slate-800">
                      <div className="font-bold text-school-blue">{task.staffName}</div>
                      <div className="text-xs text-slate-500 font-medium">{task.staffPosition}</div>
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      {task.lampiranUrl ? (
                        <a href={task.lampiranUrl} target="_blank" rel="noopener noreferrer" className="text-school-blue hover:text-blue-700 transition-colors inline-block" title="Lihat Lampiran">
                          <Paperclip size={18} />
                        </a>
                      ) : (
                        <span className="text-slate-400 font-bold">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      {(() => {
                        const relatedReports = taskReports.filter(
                          r => r.userId === task.userId && r.taskName === task.namaTugas && (r.averageScore || r.score)
                        );
                        const totalScore = relatedReports.reduce((sum, r) => sum + (r.averageScore ?? r.score ?? 0), 0);
                        const score = relatedReports.length > 0 ? Number((totalScore / relatedReports.length).toFixed(1)) : 0;
                        return (
                          <StarRating score={score} />
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEditClick(task)}
                          title="Edit Tugas"
                          className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          title="Hapus Tugas"
                          className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 border border-slate-200">
                    <div className="flex justify-center mb-3 text-slate-300">
                      <ListChecks size={48} strokeWidth={1} />
                    </div>
                    <p className="font-bold text-lg text-slate-600 mb-1">Tidak Ada Tugas</p>
                    <p className="text-sm">Belum ada data tugas yang ditambahkan atau tidak sesuai pencarian.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="xl:hidden flex flex-col divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">
                <div className="flex justify-center mb-3 text-school-blue">
                  <Loader2 size={32} className="animate-spin" />
                </div>
                <p className="font-bold text-lg text-slate-600 mb-1">Memuat Data...</p>
              </div>
            ) : filteredTasks.length > 0 ? (
              filteredTasks.map(task => (
                <div key={task.id} className={`p-4 transition-colors flex flex-col gap-3 ${editingTaskId === task.id ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col min-w-0">
                      <h3 className="font-extrabold text-slate-800 text-base leading-snug truncate">{task.namaTugas}</h3>
                      {task.createdAt && (
                        <p className="text-xs font-bold text-slate-400 mt-1 truncate">
                          {format(new Date(task.createdAt), 'dd MMM yyyy', { locale: id })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Lampiran</span>
                    {task.lampiranUrl ? (
                      <a href={task.lampiranUrl} target="_blank" rel="noopener noreferrer" className="text-school-blue hover:text-blue-700 transition-colors flex items-center gap-1 text-xs font-bold mr-1" title="Lihat Lampiran">
                        <Paperclip size={14} /> Lihat File
                      </a>
                    ) : (
                      <span className="text-slate-400 font-bold mr-1">-</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                    <div>
                      <p className="text-sm font-bold text-school-blue leading-tight">{task.staffName}</p>
                      <p className="text-xs text-slate-500">{task.staffPosition}</p>
                    </div>
                    <div className="bg-white p-2 rounded-full shadow-sm border border-slate-200 text-slate-400 shrink-0">
                      <UserIcon size={16} />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Penilaian</span>
                      {(() => {
                        const relatedReports = taskReports.filter(
                          r => r.userId === task.userId && r.taskName === task.namaTugas && r.score
                        );
                        const totalScore = relatedReports.reduce((sum, r) => sum + (r.score || 0), 0);
                        const score = relatedReports.length > 0 ? (Math.round((totalScore / relatedReports.length) * 2) / 2) : 0;
                        return (
                          <StarRating score={score} size={16} className="flex items-center gap-0.5" />
                        );
                      })()}
                    </div>
                    
                    {/* Tombol aksi dipindahkan ke samping penilaian */}
                    <div className="flex items-center shrink-0">
                      <button
                        onClick={() => handleEditClick(task)}
                        className="p-2 text-slate-400 hover:text-school-blue transition-colors rounded-full bg-slate-50"
                        title="Edit Tugas"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-full bg-slate-50 ml-1"
                        title="Hapus Tugas"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                <div className="flex justify-center mb-2 text-slate-300">
                  <ListChecks size={32} />
                </div>
                Belum ada data tugas.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

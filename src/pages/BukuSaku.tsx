import React, { useState, useEffect, useRef } from 'react';
import { User, MediaBukuSaku } from '../lib/types';
import { getMediaBukuSaku, uploadMediaFile, addMediaBukuSaku, deleteMediaBukuSaku, getStaffList, updateMediaBukuSaku } from '../lib/db';
import { useRealtimeSubscription } from '../lib/useRealtime';
import { BookOpen, Search, Plus, Trash2, FileText, Loader2, Users, ChevronDown, Check, Paperclip, User as UserIcon, Edit, Download } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface BukuSakuProps {
  user: User;
}

export const BukuSaku: React.FC<BukuSakuProps> = ({ user }) => {
  const [mediaList, setMediaList] = useState<MediaBukuSaku[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Upload state
  const [showForm, setShowForm] = useState(false);
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  
  // Target staff state
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [staffList, setStaffList] = useState<{id: string, name: string, position?: string}[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await getMediaBukuSaku();
      setMediaList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (user.role === 'admin') {
      getStaffList().then(setStaffList);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setStaffSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [user.role]);

  useRealtimeSubscription(['media_buku_saku'], fetchData);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert("Ukuran file maksimal 20MB.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setFileToUpload(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul) return;
    if (!editingMediaId && !fileToUpload) return;
    
    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      let progressInterval = setInterval(() => {
        setUploadProgress(prev => prev >= 90 ? prev : prev + 10);
      }, 300);

      let fileUrl = '';
      if (fileToUpload) {
        let folderName = 'Global';
        if (targetUserId) {
          const staff = staffList.find(s => s.id === targetUserId);
          if (staff) folderName = staff.name;
        }
        fileUrl = await uploadMediaFile(fileToUpload, folderName);
      }

      if (editingMediaId) {
        await updateMediaBukuSaku(editingMediaId, {
          judul,
          deskripsi,
          fileUrl: fileUrl || undefined,
          targetUserId: targetUserId || undefined
        });
      } else {
        await addMediaBukuSaku({
          judul,
          deskripsi,
          fileUrl,
          uploaderId: user.id,
          targetUserId: targetUserId || undefined
        });
      }
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setShowForm(false);
      setEditingMediaId(null);
      setJudul('');
      setDeskripsi('');
      setTargetUserId('');
      setFileToUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      fetchData();
    } catch (error) {
      console.error('Error uploading media:', error);
      alert('Gagal menyimpan media.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditClick = (media: MediaBukuSaku) => {
    setEditingMediaId(media.id);
    setJudul(media.judul);
    setDeskripsi(media.deskripsi || '');
    setTargetUserId(media.targetUserId || '');
    setShowForm(true);
    setFileToUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus media ini?')) {
      try {
        await deleteMediaBukuSaku(id, fileUrl);
        fetchData();
      } catch (error) {
        console.error('Error deleting media:', error);
        alert('Gagal menghapus file.');
      }
    }
  };

  const handleDownload = async (url: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (downloadingUrl) return; 
    setDownloadingUrl(url);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;

      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1].split('?')[0] || 'media_buku_saku';

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

  const filteredMedia = mediaList.filter(media => 
    media.judul.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (media.deskripsi && media.deskripsi.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 mb-1 sm:mb-2 tracking-tight">Buku Saku (Media Tugas)</h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-lg">Kumpulan referensi, panduan, dan data media tugas</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <div className="relative w-full sm:w-64 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Cari media..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-4 pl-10 text-slate-700 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-medium text-sm"
            />
          </div>
          
          {user.role === 'admin' && (
            <button
              onClick={() => {
                setShowForm(!showForm);
                if (showForm) {
                  setEditingMediaId(null);
                  setJudul('');
                  setDeskripsi('');
                  setTargetUserId('');
                  setFileToUpload(null);
                }
              }}
              className={`px-8 py-2 text-white font-bold border border-transparent rounded-xl transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 whitespace-nowrap ${showForm
                ? 'bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700'
                : 'bg-gradient-to-r from-school-blue to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                }`}
            >
              {showForm ? (editingMediaId ? 'Batal Edit' : 'Batal Upload') : <><Plus size={18} /> <span>Upload Media</span></>}
            </button>
          )}
        </div>
      </div>

      {showForm && user.role === 'admin' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in slide-in-from-top-4 fade-in duration-300">
          <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <BookOpen size={20} className="text-school-blue" />
            {editingMediaId ? 'Edit Media Buku Saku' : 'Upload Media Baru'}
          </h2>
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Judul Media <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Masukkan judul media"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all"
                  required
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">File Upload {editingMediaId ? <span className="text-slate-400 font-medium">(Opsional)</span> : <span className="text-rose-500">*</span>}</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="w-full h-12 block bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-school-blue/10 file:text-school-blue hover:file:bg-school-blue/20 transition-all text-slate-600 cursor-pointer focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none py-2"
                  required={!editingMediaId}
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Deskripsi Singkat</label>
                <textarea
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Keterangan isi file..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 h-20 text-sm focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all resize-none custom-scrollbar"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Target Penerima <span className="text-slate-400 font-medium">(Opsional)</span></label>
                <div className="relative" ref={dropdownRef}>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="absolute opacity-0 w-0 h-0 pointer-events-none"
                    tabIndex={-1}
                  >
                    <option value="">Semua Staf (Global)</option>
                    {staffList.map(staff => (
                      <option key={staff.id} value={staff.id}>{staff.name}</option>
                    ))}
                  </select>

                  <div
                    className={`w-full h-12 bg-slate-50 border ${isDropdownOpen ? 'border-school-blue ring-4 ring-school-blue/10' : 'border-slate-200 hover:border-slate-300'} rounded-xl px-4 text-slate-700 flex justify-between items-center cursor-pointer transition-all font-medium`}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <span className={targetUserId ? 'text-slate-800 text-sm' : 'text-slate-500 text-sm'}>
                      {targetUserId ? staffList.find(s => s.id === targetUserId)?.name || 'Pilih Staf...' : 'Semua Staf (Global)'}
                    </span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isDropdownOpen && (
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
                      <div className="max-h-[200px] overflow-y-auto py-1 custom-scrollbar">
                        <div
                          className={`px-3 py-2.5 mx-1.5 mb-1 rounded-lg cursor-pointer flex flex-col justify-center transition-colors group ${targetUserId === '' ? 'bg-school-blue/10' : 'hover:bg-school-blue/5'}`}
                          onClick={() => {
                            setTargetUserId('');
                            setIsDropdownOpen(false);
                            setStaffSearch('');
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-sm transition-colors ${targetUserId === '' ? 'font-bold text-school-blue' : 'text-slate-700 font-bold group-hover:text-school-blue'}`}>Semua Staf (Global)</span>
                            {targetUserId === '' && <Check size={16} className="text-school-blue" />}
                          </div>
                          <span className="text-xs text-slate-500">Media informasi untuk semua pengguna</span>
                        </div>

                        {staffList.filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase()) || (s.position || '').toLowerCase().includes(staffSearch.toLowerCase())).map(s => (
                          <div
                            key={s.id}
                            className={`px-3 py-2.5 mx-1.5 mb-1 rounded-lg cursor-pointer flex flex-col justify-center transition-colors group ${targetUserId === s.id ? 'bg-school-blue/10' : 'hover:bg-school-blue/5'}`}
                            onClick={() => {
                              setTargetUserId(s.id);
                              setIsDropdownOpen(false);
                              setStaffSearch('');
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-sm transition-colors ${targetUserId === s.id ? 'font-bold text-school-blue' : 'text-slate-700 font-bold group-hover:text-school-blue'}`}>{s.name}</span>
                              {targetUserId === s.id && <Check size={16} className="text-school-blue" />}
                            </div>
                            <span className="text-xs text-slate-500">{s.position || 'Tidak ada jabatan'}</span>
                          </div>
                        ))}
                        {staffList.filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase()) || (s.position || '').toLowerCase().includes(staffSearch.toLowerCase())).length === 0 && (
                          <div className="px-4 py-6 text-center text-slate-500 text-xs">
                            Pencarian tidak ditemukan.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {isUploading && (
              <div className="w-full bg-slate-200 rounded-full h-2 mt-4 overflow-hidden">
                <div className="bg-school-blue h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}
            
            <div className="flex gap-3 justify-end mt-2">
              <button
                type="submit"
                disabled={isUploading}
                className={`px-8 py-2 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 ${isUploading ? 'opacity-70 cursor-not-allowed bg-slate-400' : 'bg-gradient-to-r from-school-blue to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}`}
              >
                {isUploading ? (
                  <><Loader2 size={16} className="animate-spin" /> Mengunggah...</>
                ) : (
                  <><Plus size={16} /> Simpan Media</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-row items-center justify-between bg-white gap-3 relative">
          <div className="flex items-center space-x-2 truncate">
            <BookOpen size={20} className="text-slate-600 shrink-0" />
            <h2 className="font-bold text-slate-800 text-lg">Daftar Media Buku Saku ({filteredMedia.length})</h2>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="w-full text-left border-collapse min-w-[900px] hidden xl:table">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold border border-slate-200 w-12 text-center">NO</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-36">TANGGAL</th>
                <th className="px-4 py-3 font-bold border border-slate-200">JUDUL MEDIA</th>
                <th className="px-4 py-3 font-bold border border-slate-200 w-1/4">TARGET PENERIMA</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-32">LAMPIRAN</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-32">AKSI</th>
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
              ) : filteredMedia.length > 0 ? (
                filteredMedia.map((media, index) => (
                  <tr key={media.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 border border-slate-200 text-center text-sm font-medium text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center text-sm text-slate-700">
                      {media.createdAt ? format(new Date(media.createdAt), 'dd MMM yyyy', { locale: id }) : '-'}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-sm">
                      <div className="font-bold text-slate-800">{media.judul}</div>
                      {media.deskripsi && <div className="text-xs text-slate-500 mt-1 line-clamp-2">{media.deskripsi}</div>}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-sm text-slate-800">
                      {media.targetUserId ? (
                        <>
                          <div className="font-bold text-school-blue">{media.targetUserName}</div>
                          <div className="text-xs text-slate-500 font-medium">{media.targetUserPosition || 'Tidak ada jabatan'}</div>
                        </>
                      ) : (
                        <>
                          <div className="font-bold text-school-blue">Semua Staf (Global)</div>
                          <div className="text-xs text-slate-500 font-medium">Media informasi untuk semua pengguna</div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      <a
                        href={media.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-school-blue hover:text-blue-700 transition-colors inline-block"
                        title="Buka Lampiran"
                      >
                        <Paperclip size={18} />
                      </a>
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {user.role !== 'admin' && (
                          <button
                            onClick={(e) => handleDownload(media.fileUrl, e)}
                            disabled={downloadingUrl === media.fileUrl}
                            title="Unduh File"
                            className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors relative"
                          >
                            {downloadingUrl === media.fileUrl ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                          </button>
                        )}
                        {(media.uploaderId === user.id || user.role === 'admin') && (
                          <>
                            <button
                              onClick={() => handleEditClick(media)}
                              title="Edit Media"
                              className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(media.id, media.fileUrl)}
                              title="Hapus Media"
                              className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 border border-slate-200">
                    <div className="flex justify-center mb-3 text-slate-300">
                      <FileText size={48} strokeWidth={1} />
                    </div>
                    <p className="font-bold text-lg text-slate-600 mb-1">Tidak Ada Media</p>
                    <p className="text-sm">Belum ada data media yang ditambahkan atau tidak sesuai pencarian.</p>
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
            ) : filteredMedia.length > 0 ? (
              filteredMedia.map((media) => (
                <div key={media.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col min-w-0">
                      <h3 className="font-extrabold text-slate-800 text-base leading-snug truncate">{media.judul}</h3>
                      {media.createdAt && (
                        <p className="text-xs font-bold text-slate-400 mt-1 truncate">
                          {format(new Date(media.createdAt), 'dd MMM yyyy', { locale: id })}
                        </p>
                      )}
                    </div>
                  </div>

                  {media.deskripsi && (
                    <div className="text-sm text-slate-600 font-medium">
                      {media.deskripsi}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Lampiran</span>
                    <a 
                      href={media.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-school-blue hover:text-blue-700 transition-colors flex items-center gap-1 text-xs font-bold mr-1" 
                      title="Buka File Lampiran"
                    >
                      <Paperclip size={14} /> Buka File
                    </a>
                  </div>

                  <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-lg border border-slate-200 mt-1">
                    <div>
                      <p className="text-sm font-bold text-school-blue leading-tight">
                        {media.targetUserId ? media.targetUserName : 'Semua Staf (Global)'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {media.targetUserId ? (media.targetUserPosition || 'Tidak ada jabatan') : 'Media informasi untuk semua pengguna'}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded-full shadow-sm border border-slate-200 text-slate-400 shrink-0">
                      {media.targetUserId ? <UserIcon size={16} /> : <Users size={16} />}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <div className="flex items-center shrink-0">
                      {user.role !== 'admin' && (
                        <button
                          onClick={(e) => handleDownload(media.fileUrl, e)}
                          disabled={downloadingUrl === media.fileUrl}
                          className="p-2 text-slate-400 hover:text-emerald-600 transition-colors rounded-full bg-slate-50 relative"
                          title="Unduh Media"
                        >
                          {downloadingUrl === media.fileUrl ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        </button>
                      )}
                      {(media.uploaderId === user.id || user.role === 'admin') && (
                        <>
                          <button
                            onClick={() => handleEditClick(media)}
                            className="p-2 text-slate-400 hover:text-amber-500 transition-colors rounded-full bg-slate-50 ml-1"
                            title="Edit Media"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(media.id, media.fileUrl)}
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-full bg-slate-50 ml-1"
                            title="Hapus Media"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                <div className="flex justify-center mb-2 text-slate-300">
                  <FileText size={32} />
                </div>
                Belum ada data media.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { User, KPIEvaluation } from '../../lib/types';
import { getUserKPIs, getUsers } from '../../lib/db';
import { Star, Award, Eye, Search, ClipboardList, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useRealtimeSubscription } from '../../lib/useRealtime';

interface KPIProps {
  user: User;
}

const formatMonth = (monthStr: string) => {
  if (!monthStr) return 'Belum Tersedia';
  try {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, 'MMMM yyyy', { locale: id });
  } catch {
    return monthStr;
  }
};

export const KPI: React.FC<KPIProps> = ({ user }) => {
  const [kpis, setKpis] = useState<KPIEvaluation[]>([]);
  const [evaluatorMap, setEvaluatorMap] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKPI, setSelectedKPI] = useState<KPIEvaluation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const fetchKpis = async () => {
    setIsLoading(true);
    try {
      const data = await getUserKPIs(user.id);
      const sortedData = data.sort((a, b) => b.month.localeCompare(a.month));
      setKpis(sortedData);

      const allUsers = await getUsers();
      const map: Record<string, string> = {};
      allUsers.forEach(u => map[u.id] = u.name);
      setEvaluatorMap(map);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
  }, [user.id]);

  useRealtimeSubscription(['penilaian_kpi', 'nilai_kpi', 'profil_pengguna'], fetchKpis);

  const getKPIAverage = (kpi: KPIEvaluation) => {
    const totalTasks = kpi.taskScores?.length || 0;
    if (totalTasks === 0) return '-';
    const totalScore = kpi.taskScores?.reduce((sum, item) => sum + item.score, 0) || 0;
    return (totalScore / totalTasks).toFixed(1);
  };

  const filteredKpis = kpis.filter(k =>
    formatMonth(k.month).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (evaluatorMap[k.evaluatorId] || 'Admin').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openDetailModal = (kpi: KPIEvaluation) => {
    setSelectedKPI(kpi);
    setIsModalOpen(true);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 mb-1 sm:mb-2 tracking-tight">Penilaian KPI</h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-lg">Pantau evaluasi kinerja dan skor penilaian bulanan Anda</p>
        </div>

        <div className="relative w-full md:w-72 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Cari periode atau penilai..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-4 pl-10 text-slate-700 text-sm focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-medium"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center space-x-2 bg-white">
          <Award size={20} className="text-slate-600" />
          <h2 className="font-bold text-slate-800 text-lg">Daftar Penilaian Kinerja</h2>
        </div>
        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="w-full text-left border-collapse min-w-[700px] hidden md:table">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold border border-slate-200 w-12 text-center">NO</th>
                <th className="px-4 py-3 font-bold border border-slate-200">PERIODE BULAN</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-40">SKOR KPI</th>
                <th className="px-4 py-3 font-bold border border-slate-200">PENILAI (EVALUATOR)</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-28">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 border border-slate-200">
                    <div className="flex justify-center mb-3 text-school-blue">
                      <Loader2 size={32} className="animate-spin" />
                    </div>
                    <p className="font-bold text-lg text-slate-600 mb-1">Memuat Data...</p>
                  </td>
                </tr>
              ) : filteredKpis.length > 0 ? (
                filteredKpis.map((kpi, index) => {
                  const score = getKPIAverage(kpi);
                  return (
                    <tr key={kpi.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 border border-slate-200 text-center text-sm font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-sm font-bold text-slate-800">
                        {formatMonth(kpi.month)}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          ⭐ {score} / 5
                        </span>
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-sm text-slate-700">
                        {evaluatorMap[kpi.evaluatorId] || 'Admin / Manajemen'}
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center">
                        <button
                          onClick={() => openDetailModal(kpi)}
                          title="Lihat Rincian Penilaian"
                          className="p-2 rounded-full text-school-blue hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 border border-slate-200">
                    <div className="flex justify-center mb-2 text-slate-300">
                      <Award size={32} />
                    </div>
                    Belum ada data penilaian KPI.
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
            ) : filteredKpis.length > 0 ? (
              filteredKpis.map(kpi => {
                const score = getKPIAverage(kpi);
                return (
                  <div key={kpi.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <h3 className="font-extrabold text-slate-800 text-base">{formatMonth(kpi.month)}</h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">Penilai: {evaluatorMap[kpi.evaluatorId] || 'Admin'}</p>
                      </div>
                      <div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          ⭐ {score} / 5
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-2 flex justify-end gap-2 mt-1">
                      <button
                        onClick={() => openDetailModal(kpi)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold bg-blue-50 text-school-blue hover:bg-blue-100 transition-all"
                      >
                        <Eye size={16}/> Lihat Rincian
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500">
                <div className="flex justify-center mb-2 text-slate-300">
                  <Award size={32} />
                </div>
                Belum ada data penilaian KPI.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Detail Penilaian KPI */}
      {isModalOpen && selectedKPI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl shrink-0">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">Rincian Penilaian KPI</h3>
                <p className="text-sm text-slate-500 mt-1 font-semibold">
                  Evaluator: {evaluatorMap[selectedKPI.evaluatorId] || 'Admin / Manajemen'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 scrollbar-none">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Periode Penilaian</p>
                  <p className="font-bold text-slate-700 mt-0.5">
                    {formatMonth(selectedKPI.month)}
                  </p>
                </div>
                <div className="bg-school-blue text-white px-3.5 py-1.5 rounded-xl shadow-md border border-blue-500 flex items-center gap-1.5 font-bold shrink-0 text-sm">
                  <Star size={16} fill="currentColor" className="text-amber-300" />
                  Rata-rata: {getKPIAverage(selectedKPI)} / 5
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-base mb-3 flex items-center gap-2">
                  <ClipboardList size={18} className="text-school-blue" />
                  Rincian Penilaian Tugas
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedKPI.taskScores?.map((item, idx) => (
                    <div key={idx} className="flex flex-col justify-between p-4 border border-slate-200 rounded-2xl gap-3 bg-white">
                      <span className="text-slate-700 font-bold text-xs sm:text-sm leading-relaxed">{item.task}</span>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex space-x-1 shrink-0">
                          {[1, 2, 3, 4, 5].map(num => (
                            <Star 
                              key={num} 
                              size={16} 
                              className={item.score >= num ? "text-amber-400" : "text-slate-200"} 
                              fill={item.score >= num ? "currentColor" : "none"} 
                            />
                          ))}
                        </div>
                        <span className="text-xs font-extrabold bg-slate-100 px-2 py-0.5 rounded-lg text-slate-500">{item.score}/5</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedKPI.notes && (
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Catatan Evaluasi / Umpan Balik</p>
                  <p className="text-slate-700 text-sm italic leading-relaxed whitespace-pre-wrap">
                    "{selectedKPI.notes}"
                  </p>
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

import React, { useState, useEffect } from 'react';
import { User, KPIEvaluation, StaffTask } from '../../lib/types';
import { getUserKPIs, getUsers, getStaffTasks } from '../../lib/db';
import { Award, Eye, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useRealtimeSubscription } from '../../lib/useRealtime';
import { StarRating } from '../../components/StarRating';

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
  const [userTasks, setUserTasks] = useState<StaffTask[]>([]);

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

      const tasksData = await getStaffTasks(user.id);
      setUserTasks(tasksData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
  }, [user.id]);

  useRealtimeSubscription(['penilaian_kpi', 'nilai_kpi', 'profil_pengguna', 'tugas_staff'], fetchKpis);

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

      {!selectedKPI ? (
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
                  <th className="px-4 py-3 font-bold border border-slate-200 text-center w-32">TOTAL TUGAS</th>
                  <th className="px-4 py-3 font-bold border border-slate-200 text-center w-48">PENILAIAN</th>
                  <th className="px-4 py-3 font-bold border border-slate-200 text-center w-32">SKOR</th>
                  <th className="px-4 py-3 font-bold border border-slate-200">PENILAI (EVALUATOR)</th>
                  <th className="px-4 py-3 font-bold border border-slate-200 text-center w-28">AKSI</th>
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
                        <td className="px-4 py-3 border border-slate-200 text-center font-bold text-slate-700">
                          {kpi.taskScores?.length || 0}
                        </td>
                        <td className="px-4 py-3 border border-slate-200 text-center">
                          <div className="flex justify-center scale-90">
                            <StarRating score={score === '-' ? 0 : Number(score)} />
                          </div>
                        </td>
                        <td className="px-4 py-3 border border-slate-200 text-center">
                          <span className="text-base font-extrabold text-amber-500">
                            {score}
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
                    <td colSpan={7} className="p-8 text-center text-slate-500 border border-slate-200">
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
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-slate-800 text-base">{formatMonth(kpi.month)}</h3>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">{kpi.taskScores?.length || 0} Tugas</span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium mt-1">Penilai : {evaluatorMap[kpi.evaluatorId] || 'Admin'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold text-amber-500">
                              {score}
                            </span>
                            <div className="scale-75 origin-right">
                              <StarRating score={score === '-' ? 0 : Number(score)} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end gap-2 mt-1">
                        <button
                          onClick={() => openDetailModal(kpi)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold bg-blue-50 text-school-blue hover:bg-blue-100 transition-all"
                        >
                          <Eye size={16} /> Lihat Rincian
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
      ) : (
        /* Inline Evaluation Panel (Table View) */
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
            <div className="flex items-center space-x-2">
              <Award size={20} className="text-slate-600" />
              <h2 className="font-bold text-slate-800 text-lg">Detail Penilaian KPI</h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedKPI(null)}
              className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-100 transition-colors"
            >
              Tutup
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6 scrollbar-none">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Periode Penilaian</p>
                <p className="font-bold text-slate-700 mt-0.5">
                  {formatMonth(selectedKPI.month)}
                </p>
                <p className="text-xs text-slate-500 mt-1 font-semibold">
                  Penilai : {evaluatorMap[selectedKPI.evaluatorId] || 'Admin / Manajemen'}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex flex-col items-end text-right">
                  <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">TOTAL SKOR</span>
                  <div className="mt-1 origin-right">
                    <StarRating score={Number(getKPIAverage(selectedKPI)) || 0} size={22} />
                  </div>
                </div>
                <div className="flex items-center justify-center w-16 h-16 rounded-full border-[5px] border-amber-500 bg-amber-50/30 text-amber-500 font-black text-xl shadow-sm">
                  {getKPIAverage(selectedKPI)}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 text-base mb-3">
                Rincian Penilaian Tugas
              </h4>
              <div className="border-t border-slate-100 pt-2">
                {(() => {
                  const detailRows = selectedKPI.taskScores?.map((item, idx) => {
                    let resolvedCategory = item.category;

                    // Fallback parsing jika category null/undefined
                    if (!resolvedCategory) {
                      if (item.task.toLowerCase().includes('absensi')) {
                        resolvedCategory = 'Absensi';
                      } else if (userTasks.some(t => t.namaTugas === item.task)) {
                        resolvedCategory = 'Tugas';
                      } else if (selectedKPI.notes) {
                        try {
                          const parsed = JSON.parse(selectedKPI.notes);
                          if (parsed[item.task]) {
                            resolvedCategory = parsed[item.task];
                          }
                        } catch (e) {}
                      }
                    }

                    // Jika resolvedCategory adalah 'Umum' atau undefined/null, tapi nama tugasnya ada di userTasks (untuk sinkronisasi tambahan)
                    if ((!resolvedCategory || resolvedCategory === 'Umum') && userTasks.some(t => t.namaTugas === item.task)) {
                      resolvedCategory = 'Tugas';
                    }

                    // Jika tetap tidak terdefinisi, default ke 'Umum'
                    if (!resolvedCategory) {
                      resolvedCategory = 'Umum';
                    }

                    let categoryBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">Umum</span>;

                    if (resolvedCategory === 'Tugas') {
                      categoryBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm">Tugas</span>;
                    } else if (resolvedCategory.toLowerCase() === 'absensi') {
                      categoryBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white shadow-sm">Absensi</span>;
                    } else if (resolvedCategory !== 'Umum') {
                      categoryBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white shadow-sm">{resolvedCategory}</span>;
                    }

                    return { item, idx, categoryBadge, resolvedCategory };
                  }) || [];

                  return (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                              <th className="px-4 py-3 font-bold border border-slate-200 w-12 text-center">NO</th>
                              <th className="px-4 py-3 font-bold border border-slate-200">Indikator Tugas / Kinerja</th>
                              <th className="px-4 py-3 font-bold border border-slate-200 text-center w-40">KATEGORI</th>
                              <th className="px-4 py-3 font-bold border border-slate-200 w-48 text-center">PENILAIAN</th>
                              <th className="px-4 py-3 font-bold border border-slate-200 w-32 text-center">SKOR</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {detailRows.map((row) => (
                              <tr key={row.idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 border border-slate-200 text-sm font-medium text-slate-500 text-center">{row.idx + 1}</td>
                                <td className="px-4 py-3 border border-slate-200 text-sm font-bold text-slate-700">
                                  <div className="line-clamp-1" title={row.item.task}>
                                    {row.item.task}
                                  </div>
                                </td>
                                <td className="px-4 py-3 border border-slate-200 text-center">{row.categoryBadge}</td>
                                <td className="px-4 py-3 border border-slate-200 text-center">
                                  <div className="flex justify-center scale-90">
                                    <StarRating score={row.item.score} />
                                  </div>
                                </td>
                                <td className="px-4 py-3 border border-slate-200 text-sm font-extrabold text-amber-500 text-center">
                                  {row.item.score > 0 ? row.item.score.toFixed(1) : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden flex flex-col divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        {detailRows.map((row) => (
                          <div key={row.idx} className="p-4 flex flex-col gap-3 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 pr-2">
                                <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2" title={row.item.task}>
                                  {row.item.task}
                                </h3>
                              </div>
                              <div className="shrink-0">
                                {row.categoryBadge}
                              </div>
                            </div>

                            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-100">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Penilaian</span>
                              <div className="flex items-center gap-3">
                                <span className="text-base font-extrabold text-amber-500">
                                  {row.item.score > 0 ? row.item.score.toFixed(1) : "-"}
                                </span>
                                <div className="scale-75 origin-right">
                                  <StarRating score={row.item.score} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
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

        </div>
      )}
    </div>
  );
};

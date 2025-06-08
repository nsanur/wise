import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, addMonths, subMonths, isWeekend, isWithinInterval, endOfWeek, endOfMonth, startOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Coffee } from 'lucide-react';
import { foodNameMap } from '../foodNameMap';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;



const categories = ['corba', 'ana-yemek', 'yan-yemek', 'ek-yemek'];

const categoryNameMap: Record<string, string> = {
  'corba': 'Çorba',
  'ana-yemek': 'Ana Yemek',
  'yan-yemek': 'Yan Yemek',
  'ek-yemek': 'Ek Yemek',
};

interface AnalysisData {
  category: string;
  food_type: string;
  waste_count: number;
  no_waste_count: number;
  waste_ratio: number;
  analysis_date: string; // YYYY-MM-DD
}

const Results: React.FC = () => {
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<AnalysisData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const accessToken = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/food/results/`, {
          headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
        });
        if (!res.ok) {
          throw new Error(
            (await res.json())?.message || 'Veriler alınırken hata oluştu.'
          );
        }
        const stats = await res.json();
        setData(stats);
      } catch (e: any) {
        setData([]);
        setError(e?.message || 'Veriler alınırken hata oluştu.');
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  // Takvim aralığını belirle
  const startDate = viewMode === 'weekly'
    ? startOfWeek(currentDate, { weekStartsOn: 1 })
    : startOfMonth(currentDate);

  const endDate = viewMode === 'weekly'
    ? endOfWeek(currentDate, { weekStartsOn: 1 })
    : endOfMonth(currentDate);

  // Aralıktaki günlerin dizisi
  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  // Filtrelenmiş veri (takvim aralığına göre)
  const filteredData = data.filter(item => {
    const d = new Date(item.analysis_date);
    return isWithinInterval(d, { start: startDate, end: endDate });
  });

  // GRUPLAMA: Aynı gün, kategori ve yemek türünü birleştir
  function groupByDateCategoryType(data: AnalysisData[]) {
    const map = new Map<string, AnalysisData>();
    data.forEach(item => {
      const key = `${item.analysis_date}_${item.category}_${item.food_type}`;
      if (map.has(key)) {
        const old = map.get(key)!;
        const waste_count = old.waste_count + item.waste_count;
        const no_waste_count = old.no_waste_count + item.no_waste_count;
        const total = waste_count + no_waste_count;
        const waste_ratio = total > 0 ? waste_count / total : 0;
        map.set(key, {
          ...old,
          waste_count,
          no_waste_count,
          waste_ratio,
        });
      } else {
        map.set(key, { ...item });
      }
    });
    return Array.from(map.values());
  }

  const groupedData = groupByDateCategoryType(filteredData);

  // Gün bazında grupla
  const dataByDay: { [key: string]: AnalysisData[] } = {};
  groupedData.forEach(item => {
    if (!dataByDay[item.analysis_date]) dataByDay[item.analysis_date] = [];
    dataByDay[item.analysis_date].push(item);
  });

  // Kategori bazında haftalık/aylık toplu istatistikler
  function getCategoryStats(category: string) {
    const items = groupedData.filter(d => d.category === category);
    const total = items.reduce((sum, i) => sum + i.waste_count + i.no_waste_count, 0);
    const waste = items.reduce((sum, i) => sum + i.waste_count, 0);
    const wasteRatio = total > 0 ? (waste / total) * 100 : 0;
    return { total, wasteRatio };
  }

  // En az/çok israf edilen yemekler
  function getMostWasted(category: string) {
    const items = groupedData.filter(d => d.category === category && (d.waste_count + d.no_waste_count) > 0);
    if (items.length === 0) return null;
    return items.reduce((prev, curr) =>
      curr.waste_ratio > prev.waste_ratio ? curr : prev
    );
  }
  function getLeastWasted(category: string) {
    const items = groupedData.filter(d => d.category === category && (d.waste_count + d.no_waste_count) > 0);
    if (items.length === 0) return null;
    return items.reduce((prev, curr) =>
      curr.waste_ratio < prev.waste_ratio ? curr : prev
    );
  }

  const handlePrevious = () => {
    if (viewMode === 'weekly') setCurrentDate(prev => addDays(prev, -7));
    else setCurrentDate(prev => subMonths(prev, 1));
  };
  const handleNext = () => {
    if (viewMode === 'weekly') setCurrentDate(prev => addDays(prev, 7));
    else setCurrentDate(prev => addMonths(prev, 1));
  };

  const renderDateCell = (date: Date) => {
    if (isWeekend(date)) {
      return (
        <td className="px-6 py-4 bg-gray-50" colSpan={5}>
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Coffee className="w-5 h-5" />
            <span className="font-medium">Tatil</span>
          </div>
        </td>
      );
    }
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = dataByDay[dateStr] || [];
    return (
      <>
        <td className="px-6 py-4">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">
              {format(date, 'EEEE', { locale: tr })}
            </span>
            <span className="text-sm text-gray-500">
              {format(date, 'd MMMM', { locale: tr })}
            </span>
          </div>
        </td>
        {categories.map((cat, idx) => {
          const catItems = dayData.filter(i => i.category === cat);
          if (catItems.length === 0) {
            return (
              <td key={idx} className="px-6 py-4 text-gray-400 italic">Veri yok</td>
            );
          }
          return (
            <td key={idx} className="px-6 py-4">
              <div className="space-y-2">
                {catItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {item.waste_ratio > 0.6 ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    <span className="text-sm text-gray-600">{Math.round(item.waste_ratio * 100)}%</span>
                    <span className="text-xs text-gray-500">{foodNameMap[item.food_type] || item.food_type}</span>
                  </div>
                ))}
              </div>
            </td>
          );
        })}
      </>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Sonuçlar</h1>
          {/* Açıklama: AlertCircle ve CheckCircle anlamı */}
          <div className="flex items-center gap-3 bg-gray-100 px-3 py-1 rounded-lg text-sm">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-gray-700">: %60'tan yüksek israf oranı</span>
            </span>
            <span className="mx-2">|</span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-gray-700">: %60'tan düşük israf oranı</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                viewMode === 'weekly'
                  ? 'bg-[#7BC47F] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Haftalık
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                viewMode === 'monthly'
                  ? 'bg-[#7BC47F] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Aylık
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-medium">
              {format(currentDate, 'MMMM yyyy', { locale: tr })}
            </span>
            <button
              onClick={handleNext}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Yükleniyor…</div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">{error}</div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tarih</th>
                    {categories.map(cat => (
                      <th key={cat} className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{categoryNameMap[cat] || cat}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days.map(date => (
                    <tr key={date.toISOString()} className="border-b border-gray-200 hover:bg-gray-50">
                      {renderDateCell(date)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {categories.map(category => {
              const { total, wasteRatio } = getCategoryStats(category);
              return (
                <div key={category} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-700 mb-4">{categoryNameMap[category] || category}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">{viewMode === 'weekly' ? 'Haftalık Toplam' : 'Aylık Toplam'}</span>
                      <span className="font-medium">{total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">İsraf Oranı</span>
                      <span className="font-medium text-red-500">{wasteRatio.toFixed(2)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${wasteRatio}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-700 mb-4">En Az İsraf Edilen Yemekler</h3>
              <div className="space-y-4">
                {categories.map(category => {
                  const item = getLeastWasted(category);
                  return (
                    <div key={category} className="flex justify-between items-center">
                      <div className="flex justify-start items-center space-x-2">
                        <span className="text-gray-600 font-semibold">{categoryNameMap[category] || category}:</span>
                        {item ? (
                          <span className="text-gray-600">{foodNameMap[item.food_type] || item.food_type}</span>
                        ) : (
                          <span className="text-gray-400 italic">Veri yok</span>
                        )}
                      </div>
                      <span className="font-medium text-green-500">
                        {item ? `${Math.round(item.waste_ratio * 100)}%` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-700 mb-4">En Çok İsraf Edilen Yemekler</h3>
              <div className="space-y-4">
                {categories.map(category => {
                  const item = getMostWasted(category);
                  return (
                    <div key={category} className="flex justify-between items-center">
                      <div className="flex justify-start items-center space-x-2">
                        <span className="text-gray-600 font-semibold">{categoryNameMap[category] || category}:</span>
                        {item ? (
                          <span className="text-gray-600">{foodNameMap[item.food_type] || item.food_type}</span>
                        ) : (
                          <span className="text-gray-400 italic">Veri yok</span>
                        )}
                      </div>
                      <span className="font-medium text-red-500">
                        {item ? `${Math.round(item.waste_ratio * 100)}%` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Results;
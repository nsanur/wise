import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isWithinInterval
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { foodNameMap } from '../foodNameMap';

// Kategorilere göre foodNameMap anahtarlarını filtrele
const soupKeys = Object.keys(foodNameMap).filter(key => key.endsWith('-corbasi'));
const mainsKeys = Object.keys(foodNameMap).filter(key =>
  [
    'barbunya',
    'bezelye',
    'et-sote',
    'kabak',
    'kasarli-köfte',
    'kuru-fasulye',
    'sebzeli-tavuk'
  ].includes(key)
);
const sidesKeys = Object.keys(foodNameMap).filter(key =>
  [
    'bulgur-pilavi',
    'pirinc-pilavi',
    'burgu-makarna',
    'eriste',
    'fettucini',
    'spagetti'
  ].includes(key)
);
const extrasKeys = Object.keys(foodNameMap).filter(key =>
  ['havuc-salatasi', 'mor-yogurt', 'yogurt'].includes(key)
);

const categories = [
  { key: 'corba', label: 'Çorba', foodTypeKeys: soupKeys },
  { key: 'ana-yemek', label: 'Ana Yemek', foodTypeKeys: mainsKeys },
  { key: 'yan-yemek', label: 'Yan Yemek', foodTypeKeys: sidesKeys },
  { key: 'ek-yemek', label: 'Ek Yemek', foodTypeKeys: extrasKeys },
];

interface AnalysisData {
  category: string;
  food_type: string;
  waste_count: number;
  no_waste_count: number;
  waste_ratio: number;
  analysis_date: string; // YYYY-MM-DD
}

const weekDaysTr = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const Statistics: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [data, setData] = useState<AnalysisData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const accessToken = localStorage.getItem('token');
        const res = await fetch('http://localhost:8000/api/food/results/', {
          headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
        });
        if (!res.ok) {
          let errMsg = 'Veriler alınırken hata oluştu.';
          try {
            const errJson = await res.json();
            errMsg = errJson?.message || errJson?.detail || errMsg;
          } catch {}
          throw new Error(errMsg);
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

  // Tarih aralıkları
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Haftaları bul
  const getWeeksOfMonth = () => {
    let weeks: { start: Date; end: Date; label: string }[] = [];
    let firstDay = monthStart;
    let weekIndex = 1;
    while (firstDay <= monthEnd) {
      let weekStart = startOfWeek(firstDay, { weekStartsOn: 1 });
      let weekEnd = endOfWeek(firstDay, { weekStartsOn: 1 });
      if (weekStart < monthStart) weekStart = monthStart;
      if (weekEnd > monthEnd) weekEnd = monthEnd;
      weeks.push({
        start: weekStart,
        end: weekEnd,
        label: `${weekIndex}. Hafta`,
      });
      firstDay = addDays(weekEnd, 1);
      weekIndex++;
    }
    return weeks;
  };

  // Aylık için: Haftalara göre grupla
  const getMonthlyData = () => {
    const weeks = getWeeksOfMonth();
    return weeks.map((week) => {
      const weekData = data.filter(d => {
        const date = new Date(d.analysis_date);
        return isWithinInterval(date, { start: week.start, end: week.end });
      });
      const waste = weekData.reduce((sum, d) => sum + d.waste_count, 0);
      const noWaste = weekData.reduce((sum, d) => sum + d.no_waste_count, 0);
      return {
        name: week.label,
        waste,
        noWaste,
      };
    });
  };

  // Haftalık için: Pazartesi-Cuma (hafta içi) günlerine göre grupla
  const getWeeklyData = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    return weekDaysTr.slice(0, 5).map((dayName, idx) => {
      const day = addDays(weekStart, idx);
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayData = data.filter(d => d.analysis_date === dayStr);
      const waste = dayData.reduce((sum, d) => sum + d.waste_count, 0);
      const noWaste = dayData.reduce((sum, d) => sum + d.no_waste_count, 0);
      return {
        name: dayName,
        waste,
        noWaste,
      };
    });
  };

  // Her yemek türü için israf oranı (bu ay)
  const getFoodTypeStats = (foodTypeKeys: string[]) => {
    return foodTypeKeys.map(type => {
      const items = data.filter(d =>
        d.food_type === type &&
        isWithinInterval(new Date(d.analysis_date), { start: monthStart, end: monthEnd })
      );
      const waste = items.reduce((sum, d) => sum + d.waste_count, 0);
      const total = items.reduce((sum, d) => sum + d.waste_count + d.no_waste_count, 0);
      const wastePercent = total > 0 ? Math.round((waste / total) * 100) : 0;
      return { name: type, waste: wastePercent };
    });
  };

  const handlePreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const weeklyData = getWeeklyData();
  const monthlyData = getMonthlyData();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">İstatistikler</h1>
        <div className="flex items-center gap-2">
          <button onClick={handlePreviousMonth} className="p-1 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium">
            {format(currentDate, 'MMMM yyyy', { locale: tr })}
          </span>
          <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-gray-100">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Yükleniyor…</div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Haftalık İsraf Oranları</h2>
              <div className="h-[400px] w-full">
                <ResponsiveContainer>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      minTickGap={10}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="waste" name="İsraf Var" fill="#EF4444" />
                    <Bar dataKey="noWaste" name="İsraf Yok" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Aylık İsraf Oranları</h2>
              <div className="h-[400px] w-full">
                <ResponsiveContainer>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      minTickGap={10}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="waste" name="İsraf Var" fill="#EF4444" />
                    <Bar dataKey="noWaste" name="İsraf Yok" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Çorba Türlerine Göre İsraf</h2>
              <div className="h-[400px] w-full">
                <ResponsiveContainer>
                  <BarChart data={getFoodTypeStats(soupKeys)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tickFormatter={name => foodNameMap[name] || name}
                      angle={-25}
                      textAnchor="end"
                      tick={{ fontSize: 12 }}
                      height={60}
                    />
                    <YAxis />
                    <Tooltip formatter={(value: any, name: any, props: any) =>
                      [`${value}%`, foodNameMap[props.payload.name] || props.payload.name]} />
                    <Bar dataKey="waste" name="İsraf Oranı (%)" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Ana Yemek Türlerine Göre İsraf</h2>
              <div className="h-[400px] w-full">
                <ResponsiveContainer>
                  <BarChart data={getFoodTypeStats(mainsKeys)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tickFormatter={name => foodNameMap[name] || name}
                      angle={-25}
                      textAnchor="end"
                      tick={{ fontSize: 12 }}
                      height={60}
                    />
                    <YAxis />
                    <Tooltip formatter={(value: any, name: any, props: any) =>
                      [`${value}%`, foodNameMap[props.payload.name] || props.payload.name]} />
                    <Bar dataKey="waste" name="İsraf Oranı (%)" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Yan Yemek Türlerine Göre İsraf</h2>
              <div className="h-[400px] w-full">
                <ResponsiveContainer>
                  <BarChart data={getFoodTypeStats(sidesKeys)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tickFormatter={name => foodNameMap[name] || name}
                      angle={-25}
                      textAnchor="end"
                      tick={{ fontSize: 12 }}
                      height={60}
                    />
                    <YAxis />
                    <Tooltip formatter={(value: any, name: any, props: any) =>
                      [`${value}%`, foodNameMap[props.payload.name] || props.payload.name]} />
                    <Bar dataKey="waste" name="İsraf Oranı (%)" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Ek Yemek Türlerine Göre İsraf</h2>
              <div className="h-[400px] w-full">
                <ResponsiveContainer>
                  <BarChart data={getFoodTypeStats(extrasKeys)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tickFormatter={name => foodNameMap[name] || name}
                      angle={-25}
                      textAnchor="end"
                      tick={{ fontSize: 12 }}
                      height={60}
                    />
                    <YAxis />
                    <Tooltip formatter={(value: any, name: any, props: any) =>
                      [`${value}%`, foodNameMap[props.payload.name] || props.payload.name]} />
                    <Bar dataKey="waste" name="İsraf Oranı (%)" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Statistics;
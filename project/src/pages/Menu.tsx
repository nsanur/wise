import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { foodNameMap } from '../foodNameMap';

import "react-datepicker/dist/react-datepicker.css";

// Türkçe ay adları
const MONTHS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const foodCategories = {
  'corba': 'soups',
  'ana-yemek': 'mains',
  'yan-yemek': 'sides',
  'ek-yemek': 'extras'
} as const;

interface FoodData {
  category: string;
  food_type: string;
  waste_count: number;
  no_waste_count: number;
  waste_ratio: number;
  analysis_date: string;
}

interface MenuDay {
  soups: string[];
  mains: string[];
  sides: string[];
  extras: string[];
}

type CategoryKey = keyof typeof foodCategories;
type EngCategory = typeof foodCategories[CategoryKey];

// Dönemleri elde et
function getPeriods(foodData: FoodData[], menuType: 'daily' | 'weekly') {
  const dateSet = new Set(foodData.map(f => f.analysis_date));
  const dates = Array.from(dateSet).sort();
  if (!dates.length) return [];

  if (menuType === 'weekly') {
    // Ay bazında grupla
    const months = Array.from(new Set(
      dates.map(date => date.slice(0, 7))
    ));
    return months.map(m => {
      const [year, month] = m.split('-');
      return {
        label: `${MONTHS_TR[parseInt(month, 10) - 1]}`,
        value: m,
      };
    });
  } else {
    // Hafta bazında grupla
    const weekMap = new Map<string, string[]>();
    dates.forEach(dateStr => {
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const day = d.getDay();
      if (day < 1 || day > 5) return;
      // ISO hafta bul
      const janFirst = new Date(year, 0, 1);
      // @ts-ignore
      const weekNum = Math.ceil((((d - janFirst) / 86400000) + janFirst.getDay() + 1) / 7);
      const key = `${year}-W${String(weekNum).padStart(2, "0")}`;
      if (!weekMap.has(key)) weekMap.set(key, []);
      weekMap.get(key)!.push(dateStr);
    });
    return Array.from(weekMap.entries()).map(([key, dateArr]) => {
      const sorted = dateArr.sort();
      const first = new Date(sorted[0]);
      const last = new Date(sorted[sorted.length - 1]);
      const startDay = first.getDate();
      const endDay = last.getDate();
      const monthName = MONTHS_TR[first.getMonth()];
      return {
        label: `${startDay}-${endDay} ${monthName}`,
        value: key,
      };
    });
  }
}

// Dönem filtrele
function filterFoodDataByPeriod(
  allData: FoodData[],
  menuType: 'daily' | 'weekly',
  selectedPeriod: string
) {
  if (!selectedPeriod) return [];
  if (menuType === 'weekly') {
    return allData.filter(f => f.analysis_date.startsWith(selectedPeriod));
  } else {
    return allData.filter(f => {
      const d = new Date(f.analysis_date);
      const onejan = new Date(d.getFullYear(), 0, 1);
      // @ts-ignore
      const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
      const weekStr = `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
      return weekStr === selectedPeriod;
    });
  }
}

function groupFoodByCategory(data: FoodData[]) {
  const groupedFood: Record<EngCategory, string[]> = {
    soups: [],
    mains: [],
    sides: [],
    extras: []
  };
  data.forEach(item => {
    const category = foodCategories[item.category as CategoryKey];
    if (category && !groupedFood[category].includes(item.food_type)) {
      groupedFood[category].push(item.food_type);
    }
  });
  Object.keys(groupedFood).forEach((cat) => {
    if (groupedFood[cat as EngCategory].length === 0)
      groupedFood[cat as EngCategory] = ['Bu kategoride yemek bulunmamaktadır.'];
  });
  return groupedFood;
}

// Belirli kategori ve gün için en düşük israf oranlı yemek seç
function getOptimalFoodForCategory(
  category: EngCategory,
  dayIndex: number,
  sortedFoodByCategory: Record<EngCategory, FoodData[]>,
  groupedFood: Record<EngCategory, string[]>
): string {
  if (sortedFoodByCategory[category] && sortedFoodByCategory[category].length > dayIndex) {
    return sortedFoodByCategory[category][dayIndex].food_type;
  } else if (sortedFoodByCategory[category] && sortedFoodByCategory[category].length > 0) {
    return sortedFoodByCategory[category][dayIndex % sortedFoodByCategory[category].length].food_type;
  } else if (groupedFood[category].length > 0) {
    return groupedFood[category][dayIndex % groupedFood[category].length];
  } else {
    return "Alternatif yemek";
  }
}

// Haftalık menü oluştur
function generateWeeklyMenu(periodFoodData: FoodData[]) {
  const menu: Record<string, MenuDay> = {};
  const groupedFood = groupFoodByCategory(periodFoodData);

  const sortedFoodByCategory: Record<EngCategory, FoodData[]> = {
    soups: [],
    mains: [],
    sides: [],
    extras: [],
  };
  (Object.keys(foodCategories) as CategoryKey[]).forEach(categoryKey => {
    const englishCategory = foodCategories[categoryKey];
    sortedFoodByCategory[englishCategory] = periodFoodData
      .filter(item => item.category === categoryKey)
      .sort((a, b) => a.waste_ratio - b.waste_ratio);
  });

  const weekdays = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  weekdays.forEach((day, index) => {
    menu[day] = {
      soups: [getOptimalFoodForCategory('soups', index, sortedFoodByCategory, groupedFood)],
      mains: [getOptimalFoodForCategory('mains', index, sortedFoodByCategory, groupedFood)],
      sides: [getOptimalFoodForCategory('sides', index, sortedFoodByCategory, groupedFood)],
      extras: [getOptimalFoodForCategory('extras', index, sortedFoodByCategory, groupedFood)]
    };
  });

  return menu;
}

// Günlük menü oluştur
function generateDailyMenu(periodFoodData: FoodData[]) {
  const menu: Record<string, MenuDay> = {};
  const groupedFood = groupFoodByCategory(periodFoodData);
  const sortedFoodByCategory: Record<EngCategory, FoodData[]> = {
    soups: [],
    mains: [],
    sides: [],
    extras: [],
  };
  (Object.keys(foodCategories) as CategoryKey[]).forEach(categoryKey => {
    const englishCategory = foodCategories[categoryKey];
    sortedFoodByCategory[englishCategory] = periodFoodData
      .filter(item => item.category === categoryKey)
      .sort((a, b) => a.waste_ratio - b.waste_ratio);
  });
  menu['Bugün'] = {
    soups: [getOptimalFoodForCategory('soups', 0, sortedFoodByCategory, groupedFood)],
    mains: [getOptimalFoodForCategory('mains', 0, sortedFoodByCategory, groupedFood)],
    sides: [getOptimalFoodForCategory('sides', 0, sortedFoodByCategory, groupedFood)],
    extras: [getOptimalFoodForCategory('extras', 0, sortedFoodByCategory, groupedFood)]
  };
  return menu;
}

// Haftalık menü için: seçilen ayda en az 20 iş günü (Pazartesi-Cuma) yüklemesi yapılmış mı?
function isEnoughWorkDaysInMonth(periodFoodData: FoodData[]) {
  const workDaySet = new Set<string>();
  periodFoodData.forEach(fd => {
    const dateObj = new Date(fd.analysis_date);
    const day = dateObj.getDay();
    if (day >= 1 && day <= 5) {
      workDaySet.add(fd.analysis_date);
    }
  });
  return workDaySet.size >= 20;
}

// Günlük menü için: seçilen haftada Pazartesi~Cuma günlerinin her birinde en az 10 kayıt var mı?
function isFullWorkWeek(periodFoodData: FoodData[]) {
  const dayMap: Record<string, number> = {};
  periodFoodData.forEach(fd => {
    const dateObj = new Date(fd.analysis_date);
    const day = dateObj.getDay();
    if (day >= 1 && day <= 5) {
      dayMap[fd.analysis_date] = (dayMap[fd.analysis_date] || 0) + 1;
    }
  });
  const workDays = Object.keys(dayMap);
  return workDays.length === 5 && workDays.every(d => dayMap[d] >= 10);
}

const Menu: React.FC = () => {
  const [menuType, setMenuType] = useState<'daily' | 'weekly'>('weekly');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [generatedMenu, setGeneratedMenu] = useState<Record<string, MenuDay> | null>(null);
  const [foodData, setFoodData] = useState<FoodData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Verileri çek
  useEffect(() => {
    const fetchFoodData = async () => {
      try {
        setLoading(true);
        setError(null);
        const accessToken = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/food/results/', {
          headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
        });
        if (!response.ok) {
          let errMsg = 'Veri yüklenirken hata oluştu.';
          try {
            const errJson = await response.json();
            errMsg = errJson?.message || errJson?.detail || errMsg;
          } catch {}
          throw new Error(errMsg);
        }
        const data = await response.json();
        setFoodData(data);
      } catch (err: any) {
        setError(err?.message || 'Veri yüklenirken hata oluştu. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };
    fetchFoodData();
  }, []);

  const periodOptions = getPeriods(foodData, menuType);

  const handleGenerateMenu = () => {
    if (!selectedPeriod) {
      setError('Lütfen bir dönem seçin.');
      return;
    }
    const periodFoodData = filterFoodDataByPeriod(foodData, menuType, selectedPeriod);

    if (menuType === 'weekly') {
      if (!isEnoughWorkDaysInMonth(periodFoodData)) {
        setError('Haftalık menü oluşturmak için seçtiğiniz ayda en az 20 farklı iş gününde yükleme yapılmış olmalıdır.');
        setGeneratedMenu(null);
        return;
      }
      setGeneratedMenu(generateWeeklyMenu(periodFoodData));
      setError(null);
    } else {
      if (!isFullWorkWeek(periodFoodData)) {
        setError('Günlük menü oluşturmak için seçtiğiniz haftada Pazartesi~Cuma her bir gün için en az 10 kayıt olmalıdır.');
        setGeneratedMenu(null);
        return;
      }
      setGeneratedMenu(generateDailyMenu(periodFoodData));
      setError(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Menü Oluştur</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Menü Tipi</h2>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setMenuType('weekly');
                  setSelectedPeriod('');
                  setGeneratedMenu(null);
                  setError(null);
                }}
                className={`px-4 py-2 rounded-lg ${
                  menuType === 'weekly'
                    ? 'bg-[#7BC47F] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Haftalık Menü
              </button>
              <button
                onClick={() => {
                  setMenuType('daily');
                  setSelectedPeriod('');
                  setGeneratedMenu(null);
                  setError(null);
                }}
                className={`px-4 py-2 rounded-lg ${
                  menuType === 'daily'
                    ? 'bg-[#7BC47F] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Günlük Menü
              </button>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              {menuType === 'weekly' ? 'Ay Seçin' : 'Hafta Seçin'}
            </h2>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7BC47F] focus:border-transparent"
            >
              <option value="">Seçiniz</option>
              {periodOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {loading && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-blue-700">Veri yükleniyor, lütfen bekleyin...</p>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-amber-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleGenerateMenu}
              disabled={loading}
              className={`px-6 py-2 ${
                loading ? 'bg-gray-400' : 'bg-[#7BC47F] hover:bg-[#6AB36E]'
              } text-white rounded-lg transition-colors`}
            >
              {loading ? 'Yükleniyor...' : 'Menü Oluştur'}
            </button>
          </div>
        </div>
      </div>
      {generatedMenu && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-700">Önerilen Menü</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarIcon className="w-4 h-4" />
                <span>{selectedPeriod}</span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Gün</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Çorba</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Ana Yemek</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Yan Yemek</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Ek Yemek</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(generatedMenu).map(([day, meals]) => (
                  <tr key={day} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{day}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{meals.soups.map(f => foodNameMap[f] || f).join(', ')}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{meals.mains.map(f => foodNameMap[f] || f).join(', ')}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{meals.sides.map(f => foodNameMap[f] || f).join(', ')}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{meals.extras.map(f => foodNameMap[f] || f).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
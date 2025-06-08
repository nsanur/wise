import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { tr } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";
import { foodNameMap } from '../foodNameMap';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


registerLocale('tr', tr);

interface UploadedImage {
    file: File;
    preview: string;
}

interface FoodType {
    type_name: string;
    total_samples: number;
    waste_count: number;
    no_waste_count: number;
    waste_ratio_formatted: string;
}

interface CategoryData {
    total_samples: number;
    waste_count: number;
    no_waste_count: number;
    waste_ratio_formatted: string;
    types: FoodType[];
}

const groupDataByCategory = (data: any[], selectedDate: Date): Record<string, CategoryData> => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const filtered = data.filter(item => item.analysis_date === dateStr);

    const groupedData: Record<string, CategoryData> = {};

    filtered.forEach(item => {
        if (!groupedData[item.category]) {
            groupedData[item.category] = {
                total_samples: 0,
                waste_count: 0,
                no_waste_count: 0,
                waste_ratio_formatted: "0%",
                types: []
            };
        }

        const category = groupedData[item.category];

        category.total_samples += item.waste_count + item.no_waste_count;
        category.waste_count += item.waste_count;
        category.no_waste_count += item.no_waste_count;

        let type = category.types.find(t => t.type_name === item.food_type);
        if (!type) {
            type = {
                type_name: item.food_type,
                total_samples: 0,
                waste_count: 0,
                no_waste_count: 0,
                waste_ratio_formatted: "0%"
            };
            category.types.push(type);
        }

        type.waste_count += item.waste_count;
        type.no_waste_count += item.no_waste_count;
        type.total_samples += item.waste_count + item.no_waste_count;
    });

    // Format waste ratios after aggregation
    for (const categoryKey in groupedData) {
        const category = groupedData[categoryKey];
        const total = category.total_samples;
        category.waste_ratio_formatted = total > 0 ? `${((category.waste_count / total) * 100).toFixed(2)}%` : "0%";

        category.types.forEach(type => {
            const typeTotal = type.total_samples;
            type.waste_ratio_formatted = typeTotal > 0 ? `${((type.waste_count / typeTotal) * 100).toFixed(2)}%` : "0%";
        });
    }

    return groupedData;
};

const foodTypes = {
    corba: ['mercimek-corbasi', 'sebze-corbasi', 'tarhana-corbasi', 'yarma-corbasi'],
    'ana-yemek': ['barbunya', 'bezelye', 'et-sote', 'kabak', 'kuru-fasulye', 'sebzeli-tavuk'],
    'yan-yemek': ['bulgur-pilavi', 'burgu-makarna', 'eriste', 'fettucini', 'pirinc-pilavi', 'spagetti'],
    'ek-yemek': ['havuc-salatasi', 'mor-yogurt', 'yogurt']
};

const Dashboard = () => {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [foodWasteStats, setFoodWasteStats] = useState<any | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const accessToken = localStorage.getItem('token');
                const statsResponse = await fetch(`${API_BASE_URL}/api/food/results/`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                if (statsResponse.ok) {
                    const stats = await statsResponse.json();
                    const groupedData = groupDataByCategory(stats, selectedDate);
                    setFoodWasteStats(groupedData);
                } else {
                    console.error('Failed to fetch initial stats:', statsResponse.statusText);
                }
            } catch (err) {
                console.error('Error fetching initial stats:', err);
            }
        };
        fetchStats();
    }, [selectedDate]);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newImages: UploadedImage[] = [];
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                newImages.push({
                    file,
                    preview: URL.createObjectURL(file)
                });
            }
        });

        setUploadedImages(prev => [...prev, ...newImages]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeImage = (index: number) => {
        setUploadedImages(prev => {
            const newImages = [...prev];
            URL.revokeObjectURL(newImages[index].preview);
            newImages.splice(index, 1);
            return newImages;
        });
    };

    const handleUpload = async () => {
        if (uploadedImages.length === 0) {
            setError('Lütfen en az bir görsel seçin.');
            return;
        }

        if (uploadedImages.length < 10) {
            setError('Her gün için en az 10 görsel yüklemeniz gerekmektedir.');
            return;
        }

        const today = selectedDate.getDay();
        if (today === 0 || today === 6) {
            setError('Hafta sonu için görsel yüklemesi yapılamaz.');
            return;
        }

        setIsUploading(true);
        setError(null);
        setUploadSuccess(false);

        const formData = new FormData();
        uploadedImages.forEach(image => {
            formData.append('images', image.file);
        });

        const pad = (n: number) => n < 10 ? '0' + n : n.toString();
        const dateString = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;
        formData.append('date', dateString);

        const accessToken = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_BASE_URL}/api/food/upload/`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                let errorMessage = 'Görseller yüklenirken bir hata oluştu.';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {}
                throw new Error(errorMessage);
            }

            const result = await response.json();
            setUploadedImages([]);
            setUploadSuccess(true);
            setError(null);

            // Fetch stats immediately after successful upload
            const statsResponse = await fetch(`${API_BASE_URL}/api/food/results/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            if (statsResponse.ok) {
                const stats = await statsResponse.json();
                const groupedData = groupDataByCategory(stats, selectedDate);
                setFoodWasteStats(groupedData);
            } else {
                console.error('Failed to fetch stats after upload:', statsResponse.statusText);
            }

        } catch (err: any) {
            setError(err.message || 'Yükleme sırasında bir hata oluştu.');
            setUploadSuccess(false);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Görsel Analiz</h1>

            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-amber-700">
                            Menü oluşturmak için en az beş gün veri yüklemeniz gerekmektedir. Her gün için minimum 10 görsel gereklidir.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tarih Seçin
                    </label>
                    <DatePicker
                        selected={selectedDate}
                        onChange={(date: Date) => setSelectedDate(date)}
                        locale="tr"
                        dateFormat="dd MMMM yyyy"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#7BC47F] focus:border-[#7BC47F]"
                    />
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        multiple
                        accept="image/*"
                    />

                    {uploadedImages.length === 0 ? (
                        <>
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-700 mb-2">
                                Görsel Yükle
                            </h3>
                            <p className="text-gray-500 mb-4">
                                Analiz etmek istediğiniz tabak fotoğraflarını sürükleyip bırakın veya seçin
                            </p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-[#7BC47F] text-white px-6 py-2 rounded-lg hover:bg-[#6AB36E] transition-colors"
                                disabled={isUploading}
                            >
                                Dosya Seç
                            </button>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {uploadedImages.map((image, index) => (
                                    <div key={index} className="relative">
                                        <img
                                            src={image.preview}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-32 object-cover rounded-lg"
                                        />
                                        <button
                                            onClick={() => removeImage(index)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                                    disabled={isUploading}
                                >
                                    Daha Fazla Ekle
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={isUploading}
                                    className="bg-[#7BC47F] text-white px-6 py-2 rounded-lg hover:bg-[#6AB36E] transition-colors flex items-center gap-2"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Yükleniyor...
                                        </>
                                    ) : (
                                        'Yükle ve Analiz Et'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div className={`mt-4 p-3 rounded-md ${uploadSuccess ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {error}
                    </div>
                )}
            </div>

            {uploadSuccess && foodWasteStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[{ title: 'Çorba', data: foodWasteStats.corba, types: foodTypes.corba },
                        { title: 'Ana Yemek', data: foodWasteStats['ana-yemek'], types: foodTypes['ana-yemek'] },
                        { title: 'Yan Yemek', data: foodWasteStats['yan-yemek'], types: foodTypes['yan-yemek'] },
                        { title: 'Ek Yemek', data: foodWasteStats['ek-yemek'], types: foodTypes['ek-yemek'] }].map(({ title, data, types }) => {
                        if (!data) {
                            return (
                                <div key={title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-medium text-gray-700 mb-4">{title}</h3>
                                    <p>Veri Yok</p>
                                </div>
                            )
                        }
                        return (
                            <div key={title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                <h3 className="text-lg font-medium text-gray-700 mb-4">{title}</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Toplam</span>
                                        <span className="font-medium">{data.total_samples}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">İsraf Var</span>
                                        <span className="font-medium text-red-500">{data.waste_count}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">İsraf Yok</span>
                                        <span className="font-medium text-green-500">{data.no_waste_count}</span>
                                    </div>
                                    <div className="mt-4">
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-red-500 rounded-full"
                                                style={{ width: `${data.waste_ratio_formatted.slice(0,-1)}%` }}
                                            ></div>
                                        </div>
                                        <div className="mt-2 text-sm text-gray-500">
                                            İsraf Oranı: {data.waste_ratio_formatted}
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Tespit Edilen Türler</h4>
                                        <div className="space-y-2">
                                            {data.types.map((item: FoodType, index: number) => (
                                                <div key={index} className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-600">{foodNameMap[item.type_name] || item.type_name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-500">({item.total_samples})</span>
                                                        <span className="text-red-500">{item.waste_ratio_formatted} İsraf</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
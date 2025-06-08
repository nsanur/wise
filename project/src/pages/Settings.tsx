import React, { useState, useEffect } from 'react';
import { Bell, Lock, User, Globe } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


interface SettingsProps {
  userName: string;
  onUpdateProfile: (name: string) => void;
}

interface UserData {
  first_name: string;
  last_name: string;
  email: string;
}

const Settings: React.FC<SettingsProps> = ({ userName, onUpdateProfile }) => {
  const [userData, setUserData] = useState<UserData>({
    first_name: '',
    last_name: '',
    email: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [originalData, setOriginalData] = useState<UserData | null>(null);

  // Kullanıcı verisini çek
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/food/auth/me/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        });
        if (!res.ok) {
          let errMsg = 'Kullanıcı bilgisi alınamadı.';
          try {
            const errJson = await res.json();
            errMsg = errJson?.message || errJson?.detail || errMsg;
          } catch {}
          throw new Error(errMsg);
        }
        const data = await res.json();
        setUserData({
          first_name: data.first_name || data.firstName || '',
          last_name: data.last_name || data.lastName || '',
          email: data.email || ''
        });
        setOriginalData({
          first_name: data.first_name || data.firstName || '',
          last_name: data.last_name || data.lastName || '',
          email: data.email || ''
        });
      } catch (err: any) {
        setError(err.message);
        // Eğer hata olursa, inputlar boş kalsın (backend'den veri gelmediği için)
        setUserData({
          first_name: '',
          last_name: '',
          email: ''
        });
        setOriginalData({
          first_name: '',
          last_name: '',
          email: ''
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // KAYDET butonuna basınca backend’e PATCH isteği at
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/food/auth/me/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
        }),
      });
      if (!res.ok) {
        let errMsg = 'Değişiklikler kaydedilirken bir hata oluştu.';
        try {
          const errJson = await res.json();
          errMsg = errJson?.message || errJson?.detail || errMsg;
        } catch {}
        throw new Error(errMsg);
      }
      setSuccess('Değişiklikler başarıyla kaydedildi.');
      setOriginalData({ ...userData });
      onUpdateProfile(`${userData.first_name} ${userData.last_name}`);
    } catch (error: any) {
      setError(error.message || 'Değişiklikler kaydedilirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (originalData) {
      setUserData({ ...originalData });
    }
    setError(null);
    setSuccess(null);
  };

  if (loading) {
    return <div className="text-center text-gray-600 py-10">Yükleniyor...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {userData.first_name} {userData.last_name}
              </h2>
              <p className="text-gray-600">{userData.email}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-200">
          {/* Hesap Bilgileri */}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-800">Hesap Bilgileri</h2>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ad
                  </label>
                  <input
                    type="text"
                    value={userData.first_name}
                    onChange={(e) => setUserData({ ...userData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Soyad
                  </label>
                  <input
                    type="text"
                    value={userData.last_name}
                    onChange={(e) => setUserData({ ...userData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta
                </label>
                <input
                  type="email"
                  value={userData.email}
                  onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>
          {/* Güvenlik */}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-800">Güvenlik</h2>
            </div>
            <button 
              onClick={() => setSuccess('Demo modunda şifre değiştirme devre dışı.')}
              className="text-primary hover:text-primary-dark font-medium"
              type="button"
            >
              Şifre Değiştir
            </button>
          </div>
          {/* Bildirimler */}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-800">Bildirimler</h2>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-primary" defaultChecked disabled />
                <span className="text-gray-700">E-posta Bildirimleri</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-primary" defaultChecked disabled />
                <span className="text-gray-700">Haftalık Rapor</span>
              </label>
            </div>
          </div>
          {/* Dil */}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-800">Dil</h2>
            </div>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" defaultValue="tr" disabled>
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        {(error || success) && (
          <div className={`p-4 rounded-lg mt-2 ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {error || success}
          </div>
        )}
        <div className="flex justify-end gap-4">
          <button 
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={handleCancel}
            type="button"
            disabled={isSaving}
          >
            İptal
          </button>
          <button 
            className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50"
            onClick={handleSave}
            disabled={isSaving}
            type="button"
          >
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
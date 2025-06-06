import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Leaf, BarChart3, PieChart, Calendar, Settings as SettingsIcon, LogOut, User } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Results from './pages/Results';
import Statistics from './pages/Statistics';
import Menu from './pages/Menu';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import Landing from './pages/Landing';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedName = localStorage.getItem("userName");
    if (token) {
      setIsAuthenticated(true);
      if (savedName) setUserName(savedName);
    }
  }, []);

  // Düzeltilmiş handleLogin fonksiyonu:
  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/food/auth/login/', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Giriş başarısız");
      setIsAuthenticated(true);
      setUserName(data.user.fullName || data.user.email);
      localStorage.setItem("token", data.access);
      localStorage.setItem("userName", data.user.fullName || data.user.email);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Register fonksiyonunun tam ve doğru hali:
  const handleRegister = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<boolean> => {
    try {
      const response = await fetch("http://localhost:8000/api/food/auth/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kayıt başarısız");
      return true;
    } catch (err: unknown) {
      // ... hata yönetimi ...
      return false;
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserName('');
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
  };

  const menuItems = [
    { id: 'dashboard', label: 'Ana Menü', icon: <Leaf className="w-5 h-5" /> },
    { id: 'results', label: 'Sonuçlar', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'stats', label: 'İstatistikler', icon: <PieChart className="w-5 h-5" /> },
    { id: 'menu', label: 'Menü Oluştur', icon: <Calendar className="w-5 h-5" /> },
    { id: 'settings', label: 'Ayarlar', icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  const DashboardLayout = () => {
    if (!isAuthenticated) {
      return <Navigate to="/auth" />;
    }

    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar 
          menuItems={menuItems} 
          currentPage={currentPage} 
          onPageChange={setCurrentPage} 
        />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar 
            userIcon={<User className="w-6 h-6" />}
            logoutIcon={<LogOut className="w-6 h-6" />}
            onLogout={handleLogout}
            userName={userName}
          />
          
          <main className="flex-1 overflow-y-auto p-6">
            {(() => {
              switch (currentPage) {
                case 'dashboard':
                  return <Dashboard />;
                case 'results':
                  return <Results />;
                case 'stats':
                  return <Statistics />;
                case 'menu':
                  return <Menu />;
                case 'settings':
                  return <Settings userName={userName} onUpdateProfile={(name: string) => setUserName(name)} />;
                default:
                  return <Dashboard />;
              }
            })()}
          </main>
        </div>
      </div>
    );
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={
          isAuthenticated ? 
            <Navigate to="/dashboard" /> : 
            <Auth onLogin={handleLogin} onRegister={handleRegister} />
        } />
        <Route path="/dashboard/*" element={<DashboardLayout />} />
      </Routes>
    </Router>
  );
}

export default App;
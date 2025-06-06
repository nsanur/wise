import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';

interface AuthProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, firstName: string, lastName: string) => Promise<boolean>;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    if (!isLogin && (!firstName.trim() || !lastName.trim())) {
      setError('Lütfen adınızı ve soyadınızı girin.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await onLogin(email, password);
      } else {
        const registerSuccess = await onRegister(
          email,
          password,
          firstName.trim(),
          lastName.trim()
        );
        if (registerSuccess) {
          setIsLogin(true);
          setError(null);
          setEmail('');
          setPassword('');
          setFirstName('');
          setLastName('');
          navigate('/auth');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // WISE yazısına veya leafa tıklayınca landing page'e yönlendir
  const handleLogoClick = () => {
    navigate('/'); // ana sayfaya yönlendirir
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2">
          <button
            type="button"
            onClick={handleLogoClick}
            className="focus:outline-none group flex items-center gap-2"
            aria-label="Ana sayfa"
            tabIndex={0}
          >
            <Leaf className="w-10 h-10 text-[#7BC47F] transition-colors duration-200" />
            <span
              className="text-4xl font-extrabold text-black group-hover:text-[#222] transition-colors duration-200"
              style={{ letterSpacing: '0.1em' }}
            >
              WISE
            </span>
          </button>
        </div>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sürdürülebilir Beslenme Sistemi
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleAuth}>
            {!isLogin && (
              <div className="flex gap-2">
                <div className="w-1/2">
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    Ad
                  </label>
                  <div className="mt-1">
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required={!isLogin}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#7BC47F] focus:border-[#7BC47F] sm:text-sm"
                    />
                  </div>
                </div>
                <div className="w-1/2">
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Soyad
                  </label>
                  <div className="mt-1">
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required={!isLogin}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#7BC47F] focus:border-[#7BC47F] sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-posta
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#7BC47F] focus:border-[#7BC47F] sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Şifre
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#7BC47F] focus:border-[#7BC47F] sm:text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#7BC47F] hover:bg-[#6AB36E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7BC47F] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'İşleniyor...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="w-full text-center text-sm text-[#7BC47F] hover:text-[#6AB36E]"
            >
              {isLogin ? 'Hesap oluştur' : 'Giriş yap'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
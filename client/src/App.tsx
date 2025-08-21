import { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { trpc } from './utils/trpc';
import type { AuthResponse } from '../../server/src/schema';

interface AppState {
  isAuthenticated: boolean;
  user: AuthResponse['user'] | null;
  isLoading: boolean;
}

function App() {
  const [appState, setAppState] = useState<AppState>({
    isAuthenticated: false,
    user: null,
    isLoading: true
  });

  // Check for existing session on app load
  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('sekolah-absenku-user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          setAppState({
            isAuthenticated: true,
            user,
            isLoading: false
          });
        } catch (error) {
          console.error('Failed to parse stored user:', error);
          localStorage.removeItem('sekolah-absenku-user');
          setAppState({ isAuthenticated: false, user: null, isLoading: false });
        }
      } else {
        setAppState({ isAuthenticated: false, user: null, isLoading: false });
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (user: AuthResponse['user']) => {
    if (user) {
      localStorage.setItem('sekolah-absenku-user', JSON.stringify(user));
      setAppState({
        isAuthenticated: true,
        user,
        isLoading: false
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sekolah-absenku-user');
    setAppState({
      isAuthenticated: false,
      user: null,
      isLoading: false
    });
  };

  if (appState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600 font-medium">Memuat Sekolah Absenku...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {!appState.isAuthenticated ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <Dashboard user={appState.user!} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
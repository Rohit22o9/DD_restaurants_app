import React, { useEffect, useState } from 'react';
import { adminApi } from './services/api';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Restaurants } from './pages/Restaurants';
import { Updates } from './pages/Updates';
import { CreateUpdate } from './pages/CreateUpdate';
import { UpdateTracking } from './pages/UpdateTracking';

export function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('dd_admin_token'));
  const [user, setUser] = useState<any | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [trackingUpdateId, setTrackingUpdateId] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const storedToken = localStorage.getItem('dd_admin_token');
      if (!storedToken) {
        setCheckingAuth(false);
        return;
      }

      try {
        const res = await adminApi.getMe();
        if (res.user.role === 'admin') {
          setUser(res.user);
          setToken(storedToken);
        } else {
          handleLogout();
        }
      } catch (err) {
        handleLogout();
      } finally {
        setCheckingAuth(false);
      }
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (newToken: string, loggedUser: any) => {
    setToken(newToken);
    setUser(loggedUser);
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('dd_admin_token');
    setToken(null);
    setUser(null);
    setCurrentTab('dashboard');
  };

  const handleNavigate = (tab: string, updateId?: string) => {
    if (tab === 'tracking' && updateId) {
      setTrackingUpdateId(updateId);
      setCurrentTab('tracking');
    } else {
      setTrackingUpdateId(null);
      setCurrentTab(tab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-forest border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col font-sans">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="flex flex-1">
        <Sidebar currentTab={currentTab} onTabChange={tab => handleNavigate(tab)} />

        <main className="flex-1 min-w-0 pb-16">
          {currentTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {currentTab === 'restaurants' && <Restaurants />}
          {currentTab === 'updates' && <Updates onNavigate={handleNavigate} />}
          {currentTab === 'create-update' && (
            <CreateUpdate
              onSuccess={id => handleNavigate('tracking', id)}
              onCancel={() => handleNavigate('dashboard')}
            />
          )}
          {currentTab === 'tracking' && trackingUpdateId && (
            <UpdateTracking
              updateId={trackingUpdateId}
              onBack={() => handleNavigate('updates')}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

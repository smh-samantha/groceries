import { useCallback, useEffect, useMemo, useState } from 'react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import MealBank from './pages/MealBank';
import Rotation from './pages/Rotation';
import GroceryList from './pages/GroceryList';
import { apiClient } from './services/apiClient';
import './App.css';

const App = () => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('meals-user');
    return stored ? JSON.parse(stored) : null;
  });
  const [activePage, setActivePage] = useState(() => {
    const stored = localStorage.getItem('meals-active-page');
    return stored || 'meals';
  });
  const [meals, setMeals] = useState([]);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 700 : false,
  );

  const fetchMeals = useCallback(async () => {
    if (!user) return;
    setLoadingMeals(true);
    setError('');
    try {
      const data = await apiClient.getMeals(user);
      setMeals(data.meals || []);
    } catch (err) {
      setError(err.message || 'Unable to load meals');
    } finally {
      setLoadingMeals(false);
    }
  }, [user]);

  const handleLogin = async (username) => {
    setAuthLoading(true);
    setError('');
    try {
      const data = await apiClient.login(username);
      setUser(data.user);
      localStorage.setItem('meals-user', JSON.stringify(data.user));
      const mealsResponse = await apiClient.getMeals(data.user);
      setMeals(mealsResponse.meals || []);
    } catch (err) {
      setError(err.message || 'Unable to log in');
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSelectPage = (page) => {
    setActivePage(page);
    if (isMobileView) {
      setMobileNavOpen(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('meals-user');
    setMeals([]);
    setMobileNavOpen(false);
  };

  const currentPage = useMemo(() => {
    if (activePage === 'rotation') {
      return <Rotation user={user} meals={meals} />;
    }
    if (activePage === 'groceries') {
      return <GroceryList user={user} />;
    }
    return <MealBank user={user} meals={meals} onRefresh={fetchMeals} />;
  }, [activePage, user, meals, fetchMeals]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  useEffect(() => {
    localStorage.setItem('meals-active-page', activePage);
  }, [activePage]);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      const mobile = window.innerWidth <= 700;
      setIsMobileView(mobile);
      if (!mobile) {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user) {
    return <Login onLogin={handleLogin} isLoading={authLoading} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        active={activePage}
        onSelect={handleSelectPage}
        username={user.username}
        onLogout={handleLogout}
        mobileOpen={mobileNavOpen}
        onToggleMobile={() => setMobileNavOpen((prev) => !prev)}
        isMobile={isMobileView}
      />
      {mobileNavOpen && (
        <div className="mobile-overlay" onClick={() => setMobileNavOpen(false)} />
      )}
      <main>
        {isMobileView && (
          <button
            type="button"
            className="ghost mobile-menu-button"
            onClick={() => setMobileNavOpen(true)}
          >
            ☰ Menu
          </button>
        )}
        {loadingMeals && <div className="loading">Syncing meals…</div>}
        {error && <p className="error">{error}</p>}
        {currentPage}
      </main>
    </div>
  );
};

export default App;

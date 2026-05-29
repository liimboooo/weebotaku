import { lazy, Suspense, useEffect } from "react";
import AuthPage from "./pages/AuthPage";
import './App.css';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import { syncFromBackend } from "./services/storage";
import ScrollToTop from "./components/ScrollToTop";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ToastContainer from "./components/Toast";
import { LoadingProvider } from "./components/LoadingProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import AnimatedPage from "./components/AnimatedPage";
import ErrorBoundary from "./components/ErrorBoundary";
import Loader from "./components/Loader";

import { AnimatePresence } from "framer-motion";
import { LanguageProvider } from "./contexts/LanguageContext";

const Home = lazy(() => import("./pages/Home"));
const AnimeDetail = lazy(() => import("./pages/AnimeDetail"));
const AnimeInfo = lazy(() => import("./pages/AnimeInfo"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const WatchlistPage = lazy(() => import("./pages/WatchlistPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const Browse = lazy(() => import("./pages/Browse"));
const NotFound = lazy(() => import("./pages/NotFound"));

const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const SyncCallbackMAL = lazy(() => import("./pages/SyncCallbackMAL"));
const SyncCallbackAniList = lazy(() => import("./pages/SyncCallbackAniList"));



function RouteShell({ children }) {
  return (
    <AnimatedPage>
      <ErrorBoundary>
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><Loader /></div>}>
          <main className="route-content">{children}</main>
        </Suspense>
      </ErrorBoundary>
    </AnimatedPage>
  );
}

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage = location.pathname === "/auth" || location.pathname.startsWith("/auth/sync/");
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token) syncFromBackend();
  }, [token]);

  useEffect(() => {
    const onAuthLogout = () => navigate('/home', { replace: true });
    window.addEventListener('auth-logout', onAuthLogout);
    return () => window.removeEventListener('auth-logout', onAuthLogout);
  }, [navigate]);

  useEffect(() => {
    const api = process.env.REACT_APP_API_URL;
    if (!api) return;
    const ping = () => { if (!document.hidden) fetch(`${api}/health`).catch(() => {}); };
    ping();
    const interval = setInterval(ping, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <ScrollToTop />
      {!isAuthPage && <Header />}
      {!isAuthPage && <Sidebar />}
      <div className="app-main">
      <ToastContainer />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/auth" element={token ? <Navigate to="/home" replace /> : <AuthPage />} />
          <Route path="/auth/verify-email/:token" element={<RouteShell><VerifyEmailPage /></RouteShell>} />
          <Route path="/auth/forgot-password" element={<RouteShell><ForgotPasswordPage /></RouteShell>} />
          <Route path="/auth/reset-password/:token" element={<RouteShell><ResetPasswordPage /></RouteShell>} />
          <Route path="/auth/sync/mal/callback" element={<Suspense fallback={null}><SyncCallbackMAL /></Suspense>} />
          <Route path="/auth/sync/anilist/callback" element={<Suspense fallback={null}><SyncCallbackAniList /></Suspense>} />
          <Route path="/home" element={<RouteShell><Home /></RouteShell>} />
          <Route path="/browse/anime" element={<RouteShell><Browse /></RouteShell>} />
          <Route path="/settings" element={<RouteShell><SettingsPage /></RouteShell>} />
          <Route path="/anime/:id" element={<RouteShell><AnimeDetail /></RouteShell>} />
          <Route path="/anime/:id/info" element={<RouteShell><AnimeInfo /></RouteShell>} />
          <Route path="/search" element={<RouteShell><SearchPage /></RouteShell>} />
          <Route path="/watchlist" element={<RouteShell><WatchlistPage /></RouteShell>} />
          <Route path="/profile" element={<RouteShell><ProtectedRoute><ProfilePage /></ProtectedRoute></RouteShell>} />
          <Route path="/profile/:username" element={<RouteShell><ProfilePage /></RouteShell>} />
          <Route path="/history" element={<RouteShell><HistoryPage /></RouteShell>} />
          <Route path="*" element={<RouteShell><NotFound /></RouteShell>} />
        </Routes>
      </AnimatePresence>
      </div>
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <LoadingProvider>
        <Router>
          <AppLayout />
        </Router>
      </LoadingProvider>
    </LanguageProvider>
  );
}

export default App;

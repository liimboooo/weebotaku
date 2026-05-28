import { lazy, Suspense, useEffect } from "react";
import AuthPage from "./pages/AuthPage";
import './App.css';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { syncFromBackend } from "./services/storage";
import ScrollToTop from "./components/ScrollToTop";
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
const MangaVault = lazy(() => import("./pages/MangaVault"));
const MangaDetail = lazy(() => import("./pages/MangaDetail"));
const News = lazy(() => import("./pages/News"));
const NotFound = lazy(() => import("./pages/NotFound"));
const FriendsPage = lazy(() => import("./pages/Friends/FriendsPage"));
const LeaderboardPage = lazy(() => import("./pages/Leaderboard/LeaderboardPage"));
const AMVsEdits = lazy(() => import("./pages/Feeds/AMVsEdits"));
const WatchTogetherCreative = lazy(() => import("./pages/Community/WatchTogetherCreative"));
const Rankings = lazy(() => import("./pages/Rankings/Rankings"));
const BestAnime = lazy(() => import("./pages/Rankings/BestAnime"));
const TierLists = lazy(() => import("./pages/Rankings/TierLists"));
const TierListView = lazy(() => import("./pages/Rankings/TierListView"));
const Rules = lazy(() => import("./pages/System/Rules"));
const Report = lazy(() => import("./pages/System/Report"));
const GenericRoutePage = lazy(() => import("./components/GenericRoutePage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const SyncCallbackMAL = lazy(() => import("./pages/SyncCallbackMAL"));
const SyncCallbackAniList = lazy(() => import("./pages/SyncCallbackAniList"));

const simplePage = (eyebrow, title, description, items) => ({
  eyebrow,
  title,
  description,
  sections: items ? [{ heading: "Overview", items }] : [],
});

const routePageMap = {
  settings: simplePage(
    "Preferences",
    "Settings",
    "Tune the experience, manage your account, and keep the interface aligned with how you browse.",
    [
      { title: "Playback", description: "Autoplay, episode order, and progress sync preferences.", meta: "Streaming" },
      { title: "Notifications", description: "Choose the alerts you want to see for releases, comments, and rooms.", meta: "Alerts" },
      { title: "Appearance", description: "Control compact mode, motion, and accent density.", meta: "UI" },
    ]
  ),
  help: simplePage(
    "Support",
    "Help & Support",
    "Find the quick answers first, then escalate to the moderation and support flow if needed.",
    [
      { title: "FAQ", description: "How watch history, watchlists, and ratings work in this app.", meta: "Docs" },
      { title: "Contact moderators", description: "Reach the team for account, content, or community issues.", meta: "Support" },
      { title: "Report a bug", description: "Log layout issues, playback problems, or broken links.", meta: "Fast track" },
    ]
  ),

};

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
  const isAuthPage = location.pathname === "/" || location.pathname.startsWith("/auth/sync/");
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token) syncFromBackend();
  }, [token]);

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
      <ToastContainer />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={token ? <Navigate to="/home" replace /> : <AuthPage />} />
          <Route path="/auth/verify-email/:token" element={<RouteShell><VerifyEmailPage /></RouteShell>} />
          <Route path="/auth/forgot-password" element={<RouteShell><ForgotPasswordPage /></RouteShell>} />
          <Route path="/auth/reset-password/:token" element={<RouteShell><ResetPasswordPage /></RouteShell>} />
          <Route path="/auth/sync/mal/callback" element={<Suspense fallback={null}><SyncCallbackMAL /></Suspense>} />
          <Route path="/auth/sync/anilist/callback" element={<Suspense fallback={null}><SyncCallbackAniList /></Suspense>} />
          <Route path="/home" element={<RouteShell><Home /></RouteShell>} />
          <Route path="/browse/anime" element={<RouteShell><Browse /></RouteShell>} />
          <Route path="/browse/manga" element={<RouteShell><MangaVault /></RouteShell>} />
          <Route path="/watch-together" element={<RouteShell><WatchTogetherCreative /></RouteShell>} />
          <Route path="/watch-together/new" element={<RouteShell><WatchTogetherCreative /></RouteShell>} />
          <Route path="/feeds/amvs" element={<RouteShell><AMVsEdits /></RouteShell>} />
          <Route path="/arena" element={<RouteShell><Rankings /></RouteShell>} />
          <Route path="/rankings/anime" element={<RouteShell><BestAnime /></RouteShell>} />
          <Route path="/rankings/manga" element={<RouteShell><TierLists /></RouteShell>} />
          <Route path="/arena/tier-lists" element={<RouteShell><TierLists /></RouteShell>} />
          <Route path="/arena/tier-lists/:id" element={<RouteShell><TierListView /></RouteShell>} />
          <Route path="/tierlist/:id" element={<RouteShell><TierListView /></RouteShell>} />
          <Route path="/settings" element={<RouteShell><SettingsPage /></RouteShell>} />
          <Route path="/help" element={<RouteShell><GenericRoutePage {...routePageMap.help} /></RouteShell>} />
          <Route path="/system/rules" element={<RouteShell><Rules /></RouteShell>} />
          <Route path="/report" element={<RouteShell><Report /></RouteShell>} />
          <Route path="/anime/:id" element={<RouteShell><AnimeDetail /></RouteShell>} />
          <Route path="/anime/:id/info" element={<RouteShell><AnimeInfo /></RouteShell>} />
          <Route path="/manga/:id" element={<RouteShell><MangaDetail /></RouteShell>} />
          <Route path="/search" element={<RouteShell><SearchPage /></RouteShell>} />
          <Route path="/news" element={<RouteShell><News /></RouteShell>} />
          <Route path="/watchlist" element={<RouteShell><ProtectedRoute><WatchlistPage /></ProtectedRoute></RouteShell>} />
          <Route path="/profile" element={<RouteShell><ProtectedRoute><ProfilePage /></ProtectedRoute></RouteShell>} />
          <Route path="/profile/:username" element={<RouteShell><ProfilePage /></RouteShell>} />
          <Route path="/history" element={<RouteShell><ProtectedRoute><HistoryPage /></ProtectedRoute></RouteShell>} />
          <Route path="/friends" element={<RouteShell><ProtectedRoute><FriendsPage /></ProtectedRoute></RouteShell>} />
          <Route path="/leaderboard" element={<RouteShell><LeaderboardPage /></RouteShell>} />
          <Route path="/following" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<RouteShell><NotFound /></RouteShell>} />
        </Routes>
      </AnimatePresence>
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

import { useEffect } from "react";
import AuthPage from "./pages/AuthPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SyncCallbackMAL from "./pages/SyncCallbackMAL";
import SyncCallbackAniList from "./pages/SyncCallbackAniList";
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
import Home from "./pages/Home";
import AnimeDetail from "./pages/AnimeDetail";
import AnimeInfo from "./pages/AnimeInfo";
import SearchPage from "./pages/SearchPage";
import WatchlistPage from "./pages/WatchlistPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import HistoryPage from "./pages/HistoryPage";

import { AnimatePresence } from "framer-motion";
import GenericRoutePage from "./components/GenericRoutePage";
import Browse from "./pages/Browse";
import MangaVault from "./pages/MangaVault";
import MangaDetail from "./pages/MangaDetail";
import News from "./pages/News";
import NotFound from "./pages/NotFound";

import ChatPage from "./pages/Chat/ChatPage";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import FriendsPage from "./pages/Friends/FriendsPage";
import LeaderboardPage from "./pages/Leaderboard/LeaderboardPage";
import DiscoverPage from "./pages/Discover/DiscoverPage";
import AMVsEdits from "./pages/Feeds/AMVsEdits";
import WatchTogetherCreative from "./pages/Community/WatchTogetherCreative";
import CommunityPage from "./pages/Community/CommunityPage";
import Rankings from "./pages/Rankings/Rankings";
import BestAnime from "./pages/Rankings/BestAnime";
import TierLists from "./pages/Rankings/TierLists";
import TierListView from "./pages/Rankings/TierListView";
import Rules from "./pages/System/Rules";
import Report from "./pages/System/Report";

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
        <main className="route-content">{children}</main>
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
          <Route path="/auth/sync/mal/callback" element={<SyncCallbackMAL />} />
          <Route path="/auth/sync/anilist/callback" element={<SyncCallbackAniList />} />
          <Route path="/home" element={<RouteShell><Home /></RouteShell>} />
          <Route path="/browse/anime" element={<RouteShell><Browse /></RouteShell>} />
          <Route path="/browse/manga" element={<RouteShell><MangaVault /></RouteShell>} />
          <Route path="/watch-together" element={<RouteShell><WatchTogetherCreative /></RouteShell>} />
          <Route path="/watch-together/new" element={<RouteShell><WatchTogetherCreative /></RouteShell>} />
          <Route path="/community" element={<RouteShell><CommunityPage /></RouteShell>} />
          <Route path="/chat" element={<RouteShell><ProtectedRoute><ChatPage /></ProtectedRoute></RouteShell>} />
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
          <Route path="/notifications" element={<RouteShell><ProtectedRoute><NotificationsPage /></ProtectedRoute></RouteShell>} />
          <Route path="/history" element={<RouteShell><ProtectedRoute><HistoryPage /></ProtectedRoute></RouteShell>} />
          <Route path="/admin" element={<RouteShell><ProtectedRoute><AdminDashboard /></ProtectedRoute></RouteShell>} />
          <Route path="/friends" element={<RouteShell><ProtectedRoute><FriendsPage /></ProtectedRoute></RouteShell>} />
          <Route path="/leaderboard" element={<RouteShell><LeaderboardPage /></RouteShell>} />
          <Route path="/discover" element={<RouteShell><DiscoverPage /></RouteShell>} />
          <Route path="/following" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<RouteShell><NotFound /></RouteShell>} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

function App() {
  return (
    <LoadingProvider>
      <Router>
        <AppLayout />
      </Router>
    </LoadingProvider>
  );
}

export default App;

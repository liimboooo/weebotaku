import AuthPage from "./pages/AuthPage";
import './App.css';
import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import Header from "./components/Header";
import ToastContainer from "./components/Toast";
import { LoadingProvider, useLoading } from "./components/LoadingProvider";
import Home from "./pages/Home";
import AnimeDetail from "./pages/AnimeDetail";
import SearchPage from "./pages/SearchPage";
import WatchlistPage from "./pages/WatchlistPage";
import ProfilePage from "./pages/ProfilePage";
import HistoryPage from "./pages/HistoryPage";
import { Navigate } from "react-router-dom";

import { AnimatePresence } from "framer-motion";
import GenericRoutePage from "./components/GenericRoutePage";
import Browse from "./pages/Browse";
import MangaVault from "./pages/MangaVault";
import News from "./pages/News";
import NotFound from "./pages/NotFound";
import AMVsEdits from "./pages/Feeds/AMVsEdits";
import WatchTogetherCreative from "./pages/Community/WatchTogetherCreative";
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

function AppLayout() {
  const location = useLocation();
  const isAuthPage = location.pathname === "/";
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    showLoading();
    const t = setTimeout(() => hideLoading(), 600);
    return () => { clearTimeout(t); hideLoading(); };
  }, [location]);

  return (
    <>
      <ScrollToTop />
      {!isAuthPage && <Header />}
      <ToastContainer />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/home" element={<Home />} />
          <Route path="/browse/anime" element={<Browse />} />
          <Route path="/browse/manga" element={<MangaVault />} />
          <Route path="/watch-together" element={<WatchTogetherCreative />} />
          <Route path="/watch-together/new" element={<WatchTogetherCreative />} />
          <Route path="/feeds/amvs" element={<AMVsEdits />} />
          <Route path="/arena" element={<Rankings />} />
          <Route path="/rankings/anime" element={<BestAnime />} />
          <Route path="/rankings/manga" element={<TierLists />} />
          <Route path="/arena/tier-lists" element={<TierLists />} />
          <Route path="/arena/tier-lists/:id" element={<TierListView />} />
          <Route path="/tierlist/:id" element={<TierListView />} />
          <Route path="/settings" element={<GenericRoutePage {...routePageMap.settings} />} />
          <Route path="/help" element={<GenericRoutePage {...routePageMap.help} />} />
          <Route path="/system/rules" element={<Rules />} />
          <Route path="/report" element={<Report />} />
          <Route path="/anime/:id" element={<AnimeDetail />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/news" element={<News />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/following" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<NotFound />} />
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

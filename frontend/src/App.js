import AuthPage from "./pages/AuthPage";
import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import AnimeDetail from "./pages/AnimeDetail";
import SearchPage from "./pages/SearchPage";
import News from "./pages/News";
import WatchlistPage from "./pages/WatchlistPage";
import ProfilePage from "./pages/ProfilePage";
import HistoryPage from "./pages/HistoryPage";
import { Navigate } from "react-router-dom";

import { motion, AnimatePresence } from "framer-motion";

function App() {
  return (
    <ToastProvider>
      <Router>
        <ScrollToTop />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<AuthPage />} />
            <Route path="/home" element={<Home />} />
            <Route path="/news" element={<News />} />
            <Route path="/anime/:id" element={<AnimeDetail />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/following" element={<Navigate to="/home" replace />} />
          </Routes>
        </AnimatePresence>
      </Router>
    </ToastProvider>
  );
}

export default App;

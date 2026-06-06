import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { fetchDailySchedule } from "../services/anilistApi";
import "./Schedule.css";

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const COLLAPSED = 7;
const EXPANDED_MAX = 20;

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

function fmtTime(unix) {
  const d = new Date(unix * 1000);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m} ${ampm}`;
}

const rowVariants = {
  hidden: { opacity: 0, x: -12, scale: 0.97 },
  visible: (i) => ({
    opacity: 1, x: 0, scale: 1,
    transition: { delay: 0.03 * i, duration: 0.3, ease: "easeOut" },
  }),
};

const wrapperVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function Schedule() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(new Date());
  const [animKey, setAnimKey] = useState(0);
  const cache = useRef({});

  const selected = addDays(startOfDay(new Date()), offset);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const dStart = startOfDay(selected);
    const startUnix = Math.floor(dStart.getTime() / 1000);
    const endUnix = Math.floor(addDays(dStart, 1).getTime() / 1000);
    const key = dayKey(dStart);
    setExpanded(false);
    if (cache.current[key]) {
      setItems(cache.current[key]);
      setLoading(false);
      setAnimKey((k) => k + 1);
      return;
    }
    setLoading(true);
    fetchDailySchedule(startUnix, endUnix)
      .then((list) => {
        if (cancelled) return;
        cache.current[key] = list;
        setItems(list);
        setAnimKey((k) => k + 1);
      })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [offset]);

  const chips = [-1, 0, 1].map((delta) => {
    const d = addDays(selected, delta);
    return { delta, day: DAY_NAMES[d.getDay()], date: d.getDate() };
  });

  const colon = now.getSeconds() % 2 === 0 ? ":" : " ";
  const fmtNow = `${String(now.getHours()).padStart(2, "0")}${colon}${String(now.getMinutes()).padStart(2, "0")}`;
  const visible = expanded ? items.slice(0, EXPANDED_MAX) : items.slice(0, COLLAPSED);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    <motion.div
      className="sched"
      variants={wrapperVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="sched-header">
        <span className="sched-header-title">Schedule</span>
        <span className="sched-header-clock">{fmtNow}</span>
      </div>
      <div className="sched-days">
        <motion.button
          className="sched-arrow"
          aria-label="Previous day"
          whileTap={{ scale: 0.85 }}
          onClick={() => setOffset((o) => o - 1)}
        >
          <ChevronLeft size={16} />
        </motion.button>
        <div className="sched-chips">
          {chips.map((c) => (
            <motion.button
              key={c.delta}
              className={`sched-chip${c.delta === 0 ? " sched-chip--active" : ""}`}
              whileTap={{ scale: 0.92 }}
              onClick={() => setOffset((o) => o + c.delta)}
            >
              <span className="sched-chip-day">{c.day}</span>
              <span className="sched-chip-date">{c.date}</span>
            </motion.button>
          ))}
        </div>
        <motion.button
          className="sched-arrow"
          aria-label="Next day"
          whileTap={{ scale: 0.85 }}
          onClick={() => setOffset((o) => o + 1)}
        >
          <ChevronRight size={16} />
        </motion.button>
      </div>

      <div className="sched-list">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div className="sched-row sched-row--skeleton" key={`sk-${i}`}>
              <span className="sched-time-skeleton sched-shimmer" />
              <span className="sched-node-skeleton" />
              <span className="sched-title-skeleton sched-shimmer" />
              <span className="sched-badge-skeleton sched-shimmer" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="sched-empty">No episodes scheduled for this day.</div>
        ) : (
          <AnimatePresence mode="popLayout" key={animKey}>
            {visible.map((s, i) => {
              const airH = new Date(s.airingAt * 1000).getHours();
              const airM = new Date(s.airingAt * 1000).getMinutes();
              const itemMinutes = airH * 60 + airM;
              const isNow = itemMinutes <= nowMinutes && itemMinutes + 25 >= nowMinutes;

              return (
                <motion.div
                  className={`sched-row${isNow ? " sched-row--now" : ""}`}
                  key={s.id}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, x: 12, transition: { duration: 0.15 } }}
                  custom={i}
                  whileHover={{ x: 4, transition: { duration: 0.15 } }}
                  onClick={() => s.animeId && navigate(`/anime/${s.animeId}/info`)}
                >
                  <span className="sched-time">{fmtTime(s.airingAt)}</span>
                  <span className="sched-node" aria-hidden="true" />
                  <span className="sched-title">{s.name}</span>
                  <span className="sched-type">{s.format === "TV" ? "TV" : s.format}</span>
                  <span className="sched-ep">EP {s.episode}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <div className="sched-footer">
        <motion.button
          className="sched-view-all"
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/schedule")}
        >
          View full schedule
        </motion.button>
        {items.length > COLLAPSED && (
          <motion.button
            className="sched-more"
            whileTap={{ scale: 0.95 }}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Less" : `${Math.min(items.length, EXPANDED_MAX) - COLLAPSED} more`}
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{ display: "inline-flex" }}
            >
              <ChevronDown size={13} />
            </motion.span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

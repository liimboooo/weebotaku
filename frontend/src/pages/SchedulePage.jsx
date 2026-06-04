import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, RotateCcw, Star, Clock, Play } from "lucide-react";
import { fetchDailySchedule } from "../services/anilistApi";

const SECOND = 1000;
const DAY_MS = 86400000;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function getMonday(d) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return startOfDay(x);
}

function fmtTime(unix) {
  const d = new Date(unix * 1000);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m} ${ampm}`;
}

function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 280, damping: 22 },
  },
};

const nodeVariants = {
  hidden: { scale: 0 },
  visible: {
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 15 },
  },
};

/* ─── Timeline Node ──────────────────────────── */
function TimelineNode({ active }) {
  return (
    <motion.div className="relative flex items-center justify-center" style={{ width: 14, height: 14 }}>
      {active && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 rounded-full bg-white/20"
          style={{ animation: "ping 2s ease-in-out infinite" }}
        />
      )}
      <motion.div
        variants={nodeVariants}
        className={`absolute z-10 w-2.5 h-2.5 rounded-full border transition-shadow ${
          active
            ? "bg-white border-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
            : "bg-black border-neutral-600 group-hover:border-neutral-400"
        }`}
      />
      {active && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-10 bg-white text-black text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
        >
          Airing Next
        </motion.span>
      )}
    </motion.div>
  );
}

/* ─── Timestamp Block ────────────────────────── */
function TimestampBlock({ time, episode, alignRight }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: alignRight ? 8 : -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`flex flex-col ${alignRight ? "items-end" : "items-start"}`}
    >
      <span className="text-xl font-black text-white tracking-tight">{time}</span>
      <span className="text-[9px] tracking-[0.18em] text-neutral-500 font-semibold uppercase mt-0.5">
        Episode {episode}
      </span>
    </motion.div>
  );
}

/* ─── Anime Card ─────────────────────────────── */
function AnimeCard({ item }) {
  const navigate = useNavigate();
  const synopsis = item?.synopsis?.trim();
  const genres = item?.genres?.length ? item.genres.slice(0, 4) : [];
  const rating = item?.rating;
  const status = item?.status;
  const isAiring = status === "RELEASING";

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -3, transition: { type: "spring", stiffness: 300, damping: 18 } }}
      className="group/card relative bg-[#0e0f12] border border-white/[0.06] rounded-2xl p-4 flex gap-4 w-full max-w-lg cursor-pointer transition-shadow duration-300 hover:shadow-[0_0_24px_rgba(255,255,255,0.03)] hover:border-white/[0.12]"
      onClick={() => item?.animeId && navigate(`/anime/${item.animeId}/info`)}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {item?.img && (
        <div className="relative shrink-0 overflow-hidden rounded-lg">
          <motion.img
            src={item.img}
            alt={item?.name}
            className="w-20 lg:w-24 aspect-[3/4] object-cover"
            loading="lazy"
            whileHover={{ scale: 1.06 }}
            transition={{ type: "spring", stiffness: 250, damping: 16 }}
          />
          {isAiring && (
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-green-500/90 text-black text-[7px] font-bold px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              AIRING
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5 min-w-0 flex-1 relative z-10">
        <h3 className="text-sm font-bold text-white leading-snug group-hover/card:text-white transition-colors">
          {item?.name}
        </h3>

        {/* Synopsis — always present */}
        <p className="text-[11px] text-neutral-400 line-clamp-3 leading-relaxed group-hover/card:text-neutral-300 transition-colors">
          {synopsis || (
            <span className="italic text-neutral-600">
              No synopsis available
            </span>
          )}
        </p>

        {/* Meta info — always visible */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500 mt-0.5">
          {rating ? (
            <span className="inline-flex items-center gap-1">
              <Star size={10} className="text-amber-500/80" fill="currentColor" />
              {rating.toFixed(1)}
            </span>
          ) : null}
          {item?.totalEpisodes ? (
            <span className="inline-flex items-center gap-1">
              <Play size={10} className="text-neutral-600" />
              {item.totalEpisodes} ep
            </span>
          ) : null}
          {status ? (
            <span className={`inline-flex items-center gap-1 ${isAiring ? "text-green-500" : "text-neutral-500"}`}>
              <Clock size={10} />
              {isAiring ? "Airing" : status.charAt(0) + status.slice(1).toLowerCase()}
            </span>
          ) : null}
        </div>

        {/* Tags / genres */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
            {genres.map((tag) => (
              <span
                key={tag}
                className="bg-neutral-900/60 border border-white/[0.07] rounded-full px-2.5 py-0.5 text-[8px] text-neutral-500 font-semibold tracking-wide uppercase transition-colors group-hover/card:border-white/[0.14] group-hover/card:text-neutral-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Skeleton ───────────────────────────────── */
function SkeletonRow({ side }) {
  return (
    <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-start gap-4 md:gap-6 pb-14 last:pb-0">
      <div className={`hidden md:flex ${side === "left" ? "justify-end pr-4" : "justify-end pr-4 pt-2"}`}>
        <div className="bg-[#0e0f12] border border-white/5 rounded-2xl p-4 flex gap-4 w-full max-w-lg">
          <div className="w-20 lg:w-24 aspect-[3/4] rounded-lg shrink-0 bg-neutral-900 animate-pulse" />
          <div className="flex flex-col gap-3 flex-1 justify-center">
            <div className="h-3 w-3/4 bg-neutral-900 rounded animate-pulse" />
            <div className="h-2 w-full bg-neutral-900 rounded animate-pulse" />
            <div className="h-2 w-2/3 bg-neutral-900 rounded animate-pulse" />
            <div className="h-5 w-16 bg-neutral-900 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
      <div className="relative flex justify-center md:block">
        <div className="w-2.5 h-2.5 rounded-full bg-neutral-800" />
      </div>
      <div className="hidden md:flex pl-4 pt-2">
        <div className="flex flex-col gap-1.5">
          <div className="h-6 w-20 bg-neutral-900 rounded animate-pulse" />
          <div className="h-3 w-14 bg-neutral-900 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────── */
export default function SchedulePage() {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeDay, setActiveDay] = useState(() => {
    const d = new Date();
    return d.getDay() === 0 ? 6 : d.getDay() - 1;
  });
  const [itemsMap, setItemsMap] = useState({});
  const [loading, setLoading] = useState({});
  const [formatFilter, setFormatFilter] = useState(null);
  const cache = useRef({});

  const monday = useMemo(() => addDays(getMonday(new Date()), weekOffset * 7), [weekOffset]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);
  const selectedDate = weekDays[activeDay];
  const selectedKey = dayKey(selectedDate);
  const rawItems = itemsMap[selectedKey] ?? [];
  const todayKey = dayKey(startOfDay(new Date()));
  const isToday = selectedKey === todayKey;

  const formats = useMemo(() => {
    const s = new Set();
    Object.values(itemsMap).forEach((arr) => arr.forEach((it) => s.add(it.format)));
    return ["All", ...s].filter(Boolean);
  }, [itemsMap]);

  const items = useMemo(() => {
    let list = rawItems;
    if (formatFilter) list = list.filter((it) => it.format === formatFilter);
    return list.sort((a, b) => a.airingAt - b.airingAt);
  }, [rawItems, formatFilter]);

  const totalEpisodes = useMemo(
    () => Object.values(itemsMap).reduce((sum, arr) => sum + arr.length, 0),
    [itemsMap]
  );

  const goToday = useCallback(() => {
    const todayStart = startOfDay(new Date());
    const todayMon = getMonday(todayStart);
    const diffWeeks = Math.round((todayMon.getTime() - getMonday(monday).getTime()) / DAY_MS / 7);
    setWeekOffset((o) => o + diffWeeks);
    setActiveDay(todayStart.getDay() === 0 ? 6 : todayStart.getDay() - 1);
  }, [monday]);

  useEffect(() => {
    const fetchDay = (d) => {
      const key = dayKey(d);
      if (cache.current[key] || loading[key]) return;
      setLoading((prev) => ({ ...prev, [key]: true }));
      const dStart = startOfDay(d);
      const startUnix = Math.floor(dStart.getTime() / SECOND);
      const endUnix = Math.floor(addDays(dStart, 1).getTime() / SECOND);
      fetchDailySchedule(startUnix, endUnix).then((list) => {
        cache.current[key] = list;
        setItemsMap((prev) => ({ ...prev, [key]: list }));
      }).finally(() => {
        setLoading((prev) => ({ ...prev, [key]: false }));
      });
    };

    fetchDay(weekDays[activeDay]);

    let timers = [];
    weekDays.forEach((d, i) => {
      if (i === activeDay) return;
      const key = dayKey(d);
      if (cache.current[key] || loading[key]) return;
      const delay = 400 * Math.abs(i - activeDay);
      const timer = setTimeout(() => fetchDay(d), delay);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [weekOffset, weekDays, activeDay]);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), SECOND);
    return () => clearInterval(t);
  }, []);

  const dayData = weekDays.map((d) => {
    const key = dayKey(d);
    return { date: d, key, count: itemsMap[key]?.length };
  });

  const isLoading = loading[selectedKey];
  const isEmpty = rawItems.length === 0 && !isLoading;

  return (
    <div className="bg-black min-h-screen text-white font-sans">
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* ─── Header ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 24 }}
          className="flex items-center justify-between flex-wrap gap-4 mb-6"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Calendar size={16} className="text-neutral-400" />
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight">Schedule</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-neutral-600 font-medium">
              {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={goToday}
              disabled={isToday}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-30 disabled:cursor-default"
            >
              <RotateCcw size={11} />
              Today
            </motion.button>
            <span className="text-[11px] text-neutral-600 font-medium">{totalEpisodes} ep.</span>
          </div>
        </motion.div>

        {/* ─── Week bar ────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 200, damping: 24 }}
          className="flex items-center gap-2 mb-6"
        >
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setWeekOffset((o) => o - 1); setActiveDay(0); }}
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl border border-white/[0.06] bg-white/[0.02] text-neutral-500 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.12] transition-colors"
          >
            <ChevronLeft size={16} />
          </motion.button>

          <div className="flex flex-1 gap-1.5">
            {dayData.map((d, i) => {
              const isActive = i === activeDay;
              const isTodayDay = d.key === todayKey;
              return (
                <motion.button
                  key={d.key}
                  layout
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveDay(i)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl border font-sans transition-colors text-[11px] ${
                    isActive
                      ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.06)]"
                      : isTodayDay
                      ? "bg-white/[0.04] text-neutral-400 border-white/[0.12] font-semibold hover:bg-white/[0.06]"
                      : "bg-white/[0.02] text-neutral-500 border-white/[0.06] font-semibold hover:bg-white/[0.06]"
                  }`}
                >
                  <span className={`tracking-wider ${isActive ? "opacity-80" : "opacity-70"}`}>
                    {d.date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
                  </span>
                  <span className="text-lg font-black leading-none">{d.date.getDate()}</span>
                  {d.count !== undefined && (
                    <span className={`text-[8px] ${isActive ? "text-black/50" : "text-neutral-600"}`}>
                      {d.count || "\u2014"}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setWeekOffset((o) => o + 1); setActiveDay(0); }}
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl border border-white/[0.06] bg-white/[0.02] text-neutral-500 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.12] transition-colors"
          >
            <ChevronRight size={16} />
          </motion.button>
        </motion.div>

        {/* ─── Format filter ───────────────────────── */}
        <AnimatePresence mode="wait">
          {formats.length > 1 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 mb-6 flex-wrap overflow-hidden"
            >
              {formats.map((f) => {
                const isOn = (f === "All" && !formatFilter) || f === formatFilter;
                return (
                  <motion.button
                    key={f}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFormatFilter(f === "All" ? null : f)}
                    className={`text-[10px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                      isOn
                        ? "bg-white text-black border-white"
                        : "bg-white/[0.03] text-neutral-500 border-white/[0.08] hover:bg-white/[0.06] hover:text-neutral-300"
                    }`}
                  >
                    {f}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Timeline ────────────────────────────── */}
        <div className="relative">
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-neutral-800 to-transparent -translate-x-1/2 pointer-events-none" />
          <div className="md:hidden absolute left-2.5 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-neutral-800 to-transparent pointer-events-none" />

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} side={i % 2 === 0 ? "left" : "right"} />
                ))}
              </motion.div>
            ) : isEmpty ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ type: "spring", stiffness: 200, damping: 22 }}
                className="flex flex-col items-center gap-3 py-24 text-neutral-600"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                  <Calendar size={28} strokeWidth={1} className="text-neutral-600" />
                </div>
                <p className="text-sm font-medium text-neutral-500">No episodes scheduled for this day.</p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedKey + (formatFilter || "")}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
              >
                {items.map((s, idx) => {
                  const isLeft = idx % 2 === 0;
                  const timeStr = fmtTime(s.airingAt);
                  const isFirst = idx === 0;

                  return (
                    <div key={s.id} className="relative grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-start gap-4 md:gap-6 pb-12 last:pb-0 group">
                      {isLeft ? (
                        <>
                          <div className="hidden md:flex justify-end pr-5">
                            <AnimeCard item={s} />
                          </div>
                          <div className="hidden md:block relative pt-1">
                            <div className="flex justify-center">
                              <TimelineNode active={isFirst} />
                            </div>
                          </div>
                          <div className="hidden md:flex pl-5 pt-3">
                            <TimestampBlock time={timeStr} episode={s.episode} />
                          </div>
                          <div className="flex md:hidden flex-col gap-3 col-span-2">
                            <div className="flex items-start gap-3">
                              <div className="relative shrink-0 w-5 flex justify-center pt-1">
                                <div className="w-5 flex justify-center">
                                  <TimelineNode active={isFirst} />
                                </div>
                              </div>
                              <TimestampBlock time={timeStr} episode={s.episode} />
                            </div>
                            <div className="pl-8">
                              <AnimeCard item={s} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="hidden md:flex justify-end pr-5 pt-3">
                            <TimestampBlock time={timeStr} episode={s.episode} alignRight />
                          </div>
                          <div className="hidden md:block relative pt-1">
                            <div className="flex justify-center">
                              <TimelineNode active={isFirst} />
                            </div>
                          </div>
                          <div className="hidden md:flex pl-5">
                            <AnimeCard item={s} />
                          </div>
                          <div className="flex md:hidden flex-col gap-3 col-span-2">
                            <div className="flex items-start gap-3">
                              <div className="relative shrink-0 w-5 flex justify-center pt-1">
                                <div className="w-5 flex justify-center">
                                  <TimelineNode active={isFirst} />
                                </div>
                              </div>
                              <TimestampBlock time={timeStr} episode={s.episode} />
                            </div>
                            <div className="pl-8">
                              <AnimeCard item={s} />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

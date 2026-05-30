import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { fetchDailySchedule } from "../services/anilistApi";
import "./Schedule.css";

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const COLLAPSED = 9;

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

function fmtTime(unix) {
  const d = new Date(unix * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Schedule() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0); // days from today (the selected/center day)
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(new Date());
  const cache = useRef({});

  const selected = addDays(startOfDay(new Date()), offset);

  // live clock in the footer
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
      return;
    }
    setLoading(true);
    fetchDailySchedule(startUnix, endUnix)
      .then((list) => {
        if (cancelled) return;
        cache.current[key] = list;
        setItems(list);
      })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [offset]); // eslint-disable-line react-hooks/exhaustive-deps

  const chips = [-1, 0, 1].map((delta) => {
    const d = addDays(selected, delta);
    return { delta, day: DAY_NAMES[d.getDay()], date: d.getDate() };
  });

  const fmtNow = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

  const visible = expanded ? items : items.slice(0, COLLAPSED);

  return (
    <div className="sched">
      {/* Day selector */}
      <div className="sched-days">
        <button className="sched-arrow" aria-label="Previous day" onClick={() => setOffset((o) => o - 1)}>
          <ChevronLeft size={18} />
        </button>
        <div className="sched-chips">
          {chips.map((c) => (
            <button
              key={c.delta}
              className={`sched-chip${c.delta === 0 ? " sched-chip--active" : ""}`}
              onClick={() => setOffset((o) => o + c.delta)}
            >
              <span className="sched-chip-day">{c.day}</span>
              <span className="sched-chip-date">{c.date}</span>
            </button>
          ))}
        </div>
        <button className="sched-arrow" aria-label="Next day" onClick={() => setOffset((o) => o + 1)}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Timeline */}
      <div className="sched-list">
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div className="sched-row sched-row--skeleton" key={`sk-${i}`}>
              <span className="sched-time sched-shimmer" />
              <span className="sched-node" />
              <span className="sched-title sched-shimmer" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="sched-empty">No episodes scheduled for this day.</div>
        ) : (
          visible.map((s) => (
            <div
              className="sched-row"
              key={s.id}
              onClick={() => s.animeId && navigate(`/anime/${s.animeId}/info`)}
            >
              <span className="sched-time">{fmtTime(s.airingAt)}</span>
              <span className="sched-node" aria-hidden="true" />
              <span className="sched-title">{s.name}</span>
              <span className="sched-type">{s.format}</span>
              <span className="sched-ep">EP {s.episode}</span>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="sched-footer">
        <span className="sched-clock">{fmtNow}</span>
        {items.length > COLLAPSED && (
          <button className="sched-more" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "Less" : "More"} <ChevronDown size={14} className={expanded ? "sched-more-icon--up" : ""} />
          </button>
        )}
      </div>
    </div>
  );
}

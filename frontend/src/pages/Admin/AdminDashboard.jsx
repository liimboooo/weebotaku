import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import adminService from "../../services/adminService";
import authService from "../../services/authService";
import {
  Users, MessageCircle, FileText, AlertTriangle, Shield,
  Trash2, Search, ChevronLeft, ChevronRight, Check, X,
  BarChart3, MessageSquare, Flag, Crown, Ban,
} from "lucide-react";
import "./AdminDashboard.css";

const TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "users", label: "Users", icon: Users },
  { key: "reports", label: "Reports", icon: Flag },
  { key: "posts", label: "Posts", icon: FileText },
  { key: "rooms", label: "Rooms", icon: MessageSquare },
];

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="ad-stat-card">
      <div className="ad-stat-icon" style={{ background: accent + "15", color: accent }}>
        <Icon size={18} />
      </div>
      <div>
        <div className="ad-stat-value">{value}</div>
        <div className="ad-stat-label">{label}</div>
      </div>
    </div>
  );
}

function OverviewTab({ stats }) {
  if (!stats) return null;
  return (
    <div className="ad-overview">
      <div className="ad-stat-grid">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} accent="#4ade80" />
        <StatCard icon={Users} label="New Today" value={stats.newUsersToday} accent="#60a5fa" />
        <StatCard icon={FileText} label="Posts" value={stats.totalPosts} accent="#a78bfa" />
        <StatCard icon={MessageSquare} label="Chat Rooms" value={stats.totalRooms} accent="#f472b6" />
        <StatCard icon={MessageCircle} label="Messages" value={stats.totalMessages} accent="#fbbf24" />
        <StatCard icon={Flag} label="Pending Reports" value={stats.pendingReports} accent="#f87171" />
      </div>

      <div className="ad-section">
        <h3 className="ad-section-title">Recent Users</h3>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentUsers?.map(u => (
                <tr key={u._id}>
                  <td>
                    <div className="ad-user-cell">
                      {u.avatar ? (
                        <img src={u.avatar} alt="" className="ad-user-avatar" />
                      ) : (
                        <div className="ad-user-avatar ad-user-avatar--fallback">
                          {(u.username || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <span>{u.username}</span>
                    </div>
                  </td>
                  <td className="ad-muted">{u.email}</td>
                  <td><span className={`ad-role-badge ad-role-badge--${u.role}`}>{u.role}</span></td>
                  <td className="ad-muted">{timeAgo(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({ page, search, limit: 20 });
      setUsers(res.data || []);
      setPagination(res.pagination || {});
    } catch {}
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleRoleChange = async (id, role) => {
    try {
      await adminService.updateUserRole(id, role);
      load();
    } catch {}
  };

  const handleBan = async (id) => {
    if (!window.confirm("Ban this user?")) return;
    try {
      await adminService.banUser(id);
      load();
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this user? This cannot be undone.")) return;
    try {
      await adminService.deleteUser(id);
      load();
    } catch {}
  };

  return (
    <div>
      <div className="ad-toolbar">
        <div className="ad-search-wrap">
          <Search size={14} className="ad-search-icon" />
          <input
            className="ad-search"
            placeholder="Search users..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !users.length ? (
              <tr><td colSpan={6} className="ad-table-empty">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="ad-table-empty">No users found</td></tr>
            ) : users.map(u => (
              <tr key={u._id}>
                <td>
                  <div className="ad-user-cell">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="ad-user-avatar" />
                    ) : (
                      <div className="ad-user-avatar ad-user-avatar--fallback">
                        {(u.username || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <span>{u.username}</span>
                  </div>
                </td>
                <td className="ad-muted">{u.email}</td>
                <td>
                  <select
                    className="ad-role-select"
                    value={u.role}
                    onChange={e => handleRoleChange(u._id, e.target.value)}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>{u.emailVerified ? <Check size={14} className="ad-check" /> : <X size={14} className="ad-x" />}</td>
                <td className="ad-muted">{timeAgo(u.createdAt)}</td>
                <td>
                  <div className="ad-actions">
                    <button className="ad-action-btn ad-action-btn--warn" onClick={() => handleBan(u._id)} title="Ban">
                      <Ban size={14} />
                    </button>
                    <button className="ad-action-btn ad-action-btn--danger" onClick={() => handleDelete(u._id)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="ad-pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
          <span>{page} / {pagination.pages}</span>
          <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getReports({ page, status, limit: 20 });
      setReports(res.data || []);
      setPagination(res.pagination || {});
    } catch {}
    setLoading(false);
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async (id, newStatus) => {
    try {
      await adminService.updateReport(id, newStatus);
      load();
    } catch {}
  };

  return (
    <div>
      <div className="ad-toolbar">
        <div className="ad-filter-group">
          {["", "pending", "resolved", "dismissed"].map(s => (
            <button
              key={s}
              className={`ad-filter-btn ${status === s ? "active" : ""}`}
              onClick={() => { setStatus(s); setPage(1); }}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Reporter</th>
              <th>Category</th>
              <th>Details</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !reports.length ? (
              <tr><td colSpan={6} className="ad-table-empty">Loading...</td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={6} className="ad-table-empty">No reports</td></tr>
            ) : reports.map(r => (
              <tr key={r._id}>
                <td>{r.user?.username || "Anonymous"}</td>
                <td><span className="ad-cat-badge">{r.category}</span></td>
                <td className="ad-details-cell">{r.details}</td>
                <td><span className={`ad-status-badge ad-status-badge--${r.status}`}>{r.status}</span></td>
                <td className="ad-muted">{timeAgo(r.createdAt)}</td>
                <td>
                  <div className="ad-actions">
                    {r.status !== "resolved" && (
                      <button className="ad-action-btn ad-action-btn--ok" onClick={() => handleUpdate(r._id, "resolved")} title="Resolve">
                        <Check size={14} />
                      </button>
                    )}
                    {r.status !== "dismissed" && (
                      <button className="ad-action-btn ad-action-btn--warn" onClick={() => handleUpdate(r._id, "dismissed")} title="Dismiss">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="ad-pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
          <span>{page} / {pagination.pages}</span>
          <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}

function PostsTab() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getPosts({ page, limit: 20 });
      setPosts(res.data || []);
      setPagination(res.pagination || {});
    } catch {}
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await adminService.deletePost(id);
      load();
    } catch {}
  };

  return (
    <div>
      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Author</th>
              <th>Title</th>
              <th>Category</th>
              <th>Likes</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !posts.length ? (
              <tr><td colSpan={6} className="ad-table-empty">Loading...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan={6} className="ad-table-empty">No posts</td></tr>
            ) : posts.map(p => (
              <tr key={p._id} className={p.deletedAt ? "ad-row-deleted" : ""}>
                <td>{p.user?.username || "Deleted"}</td>
                <td className="ad-title-cell">{p.title}</td>
                <td><span className="ad-cat-badge">{p.category}</span></td>
                <td>{p.likes?.length || 0}</td>
                <td className="ad-muted">{timeAgo(p.createdAt)}</td>
                <td>
                  {!p.deletedAt && (
                    <button className="ad-action-btn ad-action-btn--danger" onClick={() => handleDelete(p._id)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  )}
                  {p.deletedAt && <span className="ad-muted">Deleted</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="ad-pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
          <span>{page} / {pagination.pages}</span>
          <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}

function RoomsTab() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getChatRooms();
      setRooms(res.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm("Deactivate this room?")) return;
    try {
      await adminService.deleteChatRoom(id);
      load();
    } catch {}
  };

  return (
    <div>
      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Creator</th>
              <th>Members</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !rooms.length ? (
              <tr><td colSpan={6} className="ad-table-empty">Loading...</td></tr>
            ) : rooms.length === 0 ? (
              <tr><td colSpan={6} className="ad-table-empty">No rooms</td></tr>
            ) : rooms.map(r => (
              <tr key={r._id} className={!r.isActive ? "ad-row-deleted" : ""}>
                <td>{r.name}</td>
                <td><span className="ad-cat-badge">{r.type}</span></td>
                <td>{r.creator?.username || "—"}</td>
                <td>{r.members?.length || 0}</td>
                <td>{r.isActive ? <Check size={14} className="ad-check" /> : <X size={14} className="ad-x" />}</td>
                <td>
                  {r.isActive && (
                    <button className="ad-action-btn ad-action-btn--danger" onClick={() => handleDelete(r._id)} title="Deactivate">
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentUser = authService.getUser?.() || JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (currentUser?.role !== "admin") {
      navigate("/home");
      return;
    }
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await adminService.getStats();
      setStats(res.data);
    } catch {}
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="ad-page">
        <div className="ad-container">
          <div className="ad-loading">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ad-page">
      <div className="ad-container">
        <div className="ad-header">
          <div>
            <h1 className="ad-title">
              <Shield size={22} /> Admin Dashboard
            </h1>
            <p className="ad-subtitle">Manage users, content, and reports</p>
          </div>
        </div>

        <div className="ad-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`ad-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="ad-content">
          {tab === "overview" && <OverviewTab stats={stats} />}
          {tab === "users" && <UsersTab />}
          {tab === "reports" && <ReportsTab />}
          {tab === "posts" && <PostsTab />}
          {tab === "rooms" && <RoomsTab />}
        </div>
      </div>
    </div>
  );
}

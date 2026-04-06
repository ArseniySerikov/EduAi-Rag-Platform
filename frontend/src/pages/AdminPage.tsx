import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import LangSwitch from "../components/LangSwitch";
import * as adminApi from "../api/admin";
import * as docsApi from "../api/documents";
import * as newsApi from "../api/news";
import * as websitesApi from "../api/websites";
import type { User, Chat, Document, NewsItem, AdminStats, WebsiteSource } from "../types";
import "./AdminPage.css";

type Tab = "stats" | "users" | "documents" | "websites" | "news";

export default function AdminPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, dateLocale } = useLanguage();

  const [activeTab, setActiveTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [websites, setWebsites] = useState<WebsiteSource[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userChats, setUserChats] = useState<Chat[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // News form
  const [newsForm, setNewsForm] = useState({ title: "", content: "", is_published: true });
  const [newsFormOpen, setNewsFormOpen] = useState(false);
  const [websiteForm, setWebsiteForm] = useState({ url: "", title: "" });
  const [websiteBusyId, setWebsiteBusyId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStats();
    loadUsers();
    loadDocuments();
    loadWebsites();
    loadNews();
  }, []);

  const loadStats = async () => {
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch {}
  };

  const loadUsers = async () => {
    try {
      const data = await adminApi.listUsers();
      setUsers(data);
    } catch {}
  };

  const loadDocuments = async () => {
    try {
      const data = await docsApi.listDocuments();
      setDocuments(data);
    } catch {}
  };

  const loadNews = async () => {
    try {
      const data = await newsApi.listNews();
      setNews(data);
    } catch {}
  };

  const loadWebsites = async () => {
    try {
      const data = await websitesApi.listWebsites();
      setWebsites(data);
    } catch {}
  };

  const toggleUser = async (userId: number) => {
    try {
      const updated = await adminApi.toggleUserActive(userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch {}
  };

  const deleteUser = async (userId: number) => {
    if (!confirm(t("confirmDeleteUser"))) return;
    try {
      await adminApi.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (selectedUser?.id === userId) setSelectedUser(null);
    } catch {}
  };

  const viewUserChats = async (u: User) => {
    setSelectedUser(u);
    try {
      const data = await adminApi.getUserChats(u.id);
      setUserChats(data);
    } catch {
      setUserChats([]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const doc = await docsApi.uploadDocument(file);
      setDocuments((prev) => [doc, ...prev]);
      await loadStats();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || t("adminUploadError"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteDocument = async (docId: number) => {
    if (!confirm(t("confirmDeleteDoc"))) return;
    try {
      await docsApi.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      await loadStats();
    } catch {}
  };

  const createNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const item = await newsApi.createNews(newsForm);
      setNews((prev) => [item, ...prev]);
      setNewsForm({ title: "", content: "", is_published: true });
      setNewsFormOpen(false);
    } catch {}
  };

  const deleteNewsItem = async (id: number) => {
    if (!confirm(t("confirmDeleteNews"))) return;
    try {
      await newsApi.deleteNews(id);
      setNews((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  };

  const toggleNewsPublish = async (item: NewsItem) => {
    try {
      const updated = await newsApi.updateNews(item.id, { is_published: !item.is_published });
      setNews((prev) => prev.map((n) => (n.id === item.id ? updated : n)));
    } catch {}
  };

  const createWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteForm.url.trim()) return;
    try {
      const item = await websitesApi.createWebsite({
        url: websiteForm.url.trim(),
        title: websiteForm.title.trim() || undefined,
      });
      setWebsites((prev) => [item, ...prev]);
      setWebsiteForm({ url: "", title: "" });
      await loadStats();
    } catch {}
  };

  const toggleWebsiteEnabled = async (item: WebsiteSource) => {
    try {
      const updated = await websitesApi.updateWebsite(item.id, { is_enabled: !item.is_enabled });
      setWebsites((prev) => prev.map((w) => (w.id === item.id ? updated : w)));
    } catch {}
  };

  const toggleWebsiteParse = async (item: WebsiteSource) => {
    try {
      const updated = await websitesApi.updateWebsite(item.id, { should_parse: !item.should_parse });
      setWebsites((prev) => prev.map((w) => (w.id === item.id ? updated : w)));
    } catch {}
  };

  const parseWebsiteNow = async (item: WebsiteSource) => {
    setWebsiteBusyId(item.id);
    try {
      const updated = await websitesApi.parseWebsite(item.id);
      setWebsites((prev) => prev.map((w) => (w.id === item.id ? updated : w)));
      await loadDocuments();
      await loadStats();
    } catch {
    } finally {
      setWebsiteBusyId(null);
    }
  };

  const parseAllWebsites = async () => {
    setWebsiteBusyId(-1);
    try {
      await websitesApi.parseAllWebsites();
      await loadWebsites();
      await loadDocuments();
      await loadStats();
    } catch {
    } finally {
      setWebsiteBusyId(null);
    }
  };

  const deleteWebsite = async (id: number) => {
    if (!confirm("Delete website source and its parsed chunks?")) return;
    try {
      await websitesApi.deleteWebsite(id);
      setWebsites((prev) => prev.filter((w) => w.id !== id));
      await loadDocuments();
      await loadStats();
    } catch {}
  };

  const clearRagCompletely = async () => {
    if (!confirm("Clear all RAG data (documents, chunks, and parsed website data)?")) return;
    try {
      await websitesApi.clearRag();
      await loadWebsites();
      await loadDocuments();
      await loadStats();
    } catch {}
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <span className="admin-brand">🎓 EduAI</span>
          <span className="admin-role-badge">{t("adminBadge")}</span>
        </div>

        <nav className="admin-nav">
          {(
            [
              { id: "stats" as const, label: t("adminNavStats"), icon: "📊" },
              { id: "users" as const, label: t("adminNavUsers"), icon: "👥" },
              { id: "documents" as const, label: t("adminNavDocs"), icon: "📚" },
              { id: "websites" as const, label: "Websites", icon: "🌐" },
              { id: "news" as const, label: t("adminNavNews"), icon: "📰" },
            ] as { id: Tab; label: string; icon: string }[]
          ).map((item) => (
            <button
              key={item.id}
              className={`admin-nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-avatar">{user?.username?.charAt(0).toUpperCase()}</div>
            <span className="admin-username">{user?.username}</span>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
            <LangSwitch />
            <button className="sidebar-icon-btn" onClick={toggleTheme} title={t("chatToggleTheme")}>
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <button className="sidebar-icon-btn" onClick={logout} title={t("chatLogout")}>
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main">
        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="admin-content">
            <h1 className="admin-page-title">{t("adminPlatformStats")}</h1>
            {stats && (
              <div className="stats-grid">
                <StatCard icon="👥" label={t("statUsers")} value={stats.users} color="blue" />
                <StatCard icon="💬" label={t("statChats")} value={stats.chats} color="purple" />
                <StatCard icon="✉️" label={t("statMessages")} value={stats.messages} color="green" />
                <StatCard icon="📄" label={t("statDocuments")} value={stats.documents} color="orange" />
                <StatCard icon="🌐" label="Websites" value={stats.websites ?? 0} color="teal" />
                <StatCard icon="📚" label={t("statRag")} value={stats.rag_requests} color="teal" />
                <StatCard
                  icon="🔢"
                  label={t("statTokens")}
                  value={stats.total_tokens.toLocaleString(dateLocale)}
                  color="red"
                />
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="admin-content">
            <h1 className="admin-page-title">{t("adminUsersTitle")}</h1>
            <div className="admin-two-col">
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("thId")}</th>
                      <th>{t("thUser")}</th>
                      <th>{t("thEmail")}</th>
                      <th>{t("thRole")}</th>
                      <th>{t("thStatus")}</th>
                      <th>{t("thRegistered")}</th>
                      <th>{t("thActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className={selectedUser?.id === u.id ? "selected" : ""}>
                        <td className="td-muted">#{u.id}</td>
                        <td>
                          <button
                            className="user-link"
                            onClick={() => viewUserChats(u)}
                          >
                            {u.username}
                          </button>
                        </td>
                        <td className="td-muted">{u.email}</td>
                        <td>
                          <span className={`badge ${u.role === "admin" ? "badge-blue" : "badge-green"}`}>
                            {u.role === "admin" ? t("roleAdmin") : t("roleStudent")}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.is_active ? "badge-green" : "badge-red"}`}>
                            {u.is_active ? t("statusActive") : t("statusBlocked")}
                          </span>
                        </td>
                        <td className="td-muted">
                          {new Date(u.created_at).toLocaleDateString(dateLocale)}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => toggleUser(u.id)}
                            >
                              {u.is_active ? t("actionBlock") : t("actionUnblock")}
                            </button>
                            <button
                              className="btn btn-danger btn-xs"
                              onClick={() => deleteUser(u.id)}
                            >
                              {t("actionDelete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedUser && (
                <div className="user-chats-panel card">
                  <div className="user-chats-header">
                    <h3>
                      {t("userChatsTitle")} {selectedUser.username}
                    </h3>
                    <button className="btn-close" onClick={() => setSelectedUser(null)}>✕</button>
                  </div>
                  <div className="user-chats-list">
                    {userChats.length === 0 ? (
                      <p className="empty-text">{t("userChatsEmpty")}</p>
                    ) : (
                      userChats.map((chat) => (
                        <div key={chat.id} className="user-chat-item">
                          <span className="user-chat-title">{chat.title}</span>
                          <span className="user-chat-meta">
                            {chat.message_count} {t("chatMsgShort")}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div className="admin-content">
            <div className="admin-content-header">
              <h1 className="admin-page-title">{t("adminDocsTitle")}</h1>
              <button
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? t("adminUploading") : t("adminUploadDoc")}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
            </div>

            {uploadError && (
              <div className="admin-error">{uploadError}</div>
            )}

            <p className="admin-hint">{t("adminDocsHint")}</p>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                    <tr>
                    <th>{t("thId")}</th>
                    <th>{t("thFile")}</th>
                    <th>{t("thType")}</th>
                    <th>{t("thSize")}</th>
                    <th>{t("thUploaded")}</th>
                    <th>{t("thActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="td-empty">
                        {t("docsEmpty")}
                      </td>
                    </tr>
                  )}
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="td-muted">#{doc.id}</td>
                      <td className="doc-name">{doc.original_name}</td>
                      <td>
                        <span className="badge badge-blue">{doc.mime_type.split("/")[1]}</span>
                      </td>
                      <td className="td-muted">{formatBytes(doc.size_bytes)}</td>
                      <td className="td-muted">
                        {new Date(doc.created_at).toLocaleDateString(dateLocale)}
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-xs"
                          onClick={() => deleteDocument(doc.id)}
                        >
                          {t("actionDelete")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Websites Tab */}
        {activeTab === "websites" && (
          <div className="admin-content">
            <div className="admin-content-header">
              <h1 className="admin-page-title">Website sources</h1>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" onClick={parseAllWebsites} disabled={websiteBusyId !== null}>
                  {websiteBusyId === -1 ? "parsing..." : "parse all enabled"}
                </button>
                <button className="btn btn-danger" onClick={clearRagCompletely}>
                  clear rag
                </button>
              </div>
            </div>

            <form className="card" style={{ padding: 12, marginBottom: 12 }} onSubmit={createWebsite}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  className="form-input"
                  placeholder="https://example.com/page"
                  value={websiteForm.url}
                  onChange={(e) => setWebsiteForm((p) => ({ ...p, url: e.target.value }))}
                  style={{ minWidth: 280, flex: 2 }}
                  required
                />
                <input
                  className="form-input"
                  placeholder="optional title"
                  value={websiteForm.title}
                  onChange={(e) => setWebsiteForm((p) => ({ ...p, title: e.target.value }))}
                  style={{ minWidth: 180, flex: 1 }}
                />
                <button type="submit" className="btn btn-primary">
                  add website
                </button>
              </div>
            </form>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>URL</th>
                    <th>Title</th>
                    <th>Enabled</th>
                    <th>Parse</th>
                    <th>Status</th>
                    <th>Last parsed</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {websites.length === 0 && (
                    <tr>
                      <td colSpan={8} className="td-empty">No websites added</td>
                    </tr>
                  )}
                  {websites.map((w) => (
                    <tr key={w.id}>
                      <td className="td-muted">#{w.id}</td>
                      <td className="td-muted">{w.url}</td>
                      <td>{w.title}</td>
                      <td>
                        <button className="btn btn-ghost btn-xs" onClick={() => toggleWebsiteEnabled(w)}>
                          {w.is_enabled ? "on" : "off"}
                        </button>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-xs" onClick={() => toggleWebsiteParse(w)}>
                          {w.should_parse ? "yes" : "no"}
                        </button>
                      </td>
                      <td className="td-muted">{w.last_status ?? "-"}</td>
                      <td className="td-muted">
                        {w.last_parsed_at ? new Date(w.last_parsed_at).toLocaleString(dateLocale) : "-"}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn btn-primary btn-xs"
                            disabled={websiteBusyId === w.id || websiteBusyId === -1}
                            onClick={() => parseWebsiteNow(w)}
                          >
                            {websiteBusyId === w.id ? "parsing..." : "parse"}
                          </button>
                          <button className="btn btn-danger btn-xs" onClick={() => deleteWebsite(w.id)}>
                            delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* News Tab */}
        {activeTab === "news" && (
          <div className="admin-content">
            <div className="admin-content-header">
              <h1 className="admin-page-title">{t("adminNewsTitle")}</h1>
              <button
                className="btn btn-primary"
                onClick={() => setNewsFormOpen((p) => !p)}
              >
                {newsFormOpen ? t("adminNewsCancel") : t("adminNewsAdd")}
              </button>
            </div>

            {newsFormOpen && (
              <form className="news-form card" onSubmit={createNews}>
                <h3 className="news-form-title">{t("adminNewsFormTitle")}</h3>
                <div className="form-group">
                  <label className="form-label">{t("labelTitle")}</label>
                  <input
                    className="form-input"
                    placeholder={t("newsTitlePlaceholder")}
                    value={newsForm.title}
                    onChange={(e) => setNewsForm((p) => ({ ...p, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("labelContent")}</label>
                  <textarea
                    className="form-input"
                    placeholder={t("newsContentPlaceholder")}
                    rows={4}
                    value={newsForm.content}
                    onChange={(e) => setNewsForm((p) => ({ ...p, content: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-checkbox-group">
                  <input
                    type="checkbox"
                    id="published"
                    checked={newsForm.is_published}
                    onChange={(e) => setNewsForm((p) => ({ ...p, is_published: e.target.checked }))}
                  />
                  <label htmlFor="published">{t("newsPublishNow")}</label>
                </div>
                <div className="news-form-actions">
                  <button type="submit" className="btn btn-primary">
                    {t("newsSave")}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setNewsFormOpen(false)}>
                    {t("adminNewsCancel")}
                  </button>
                </div>
              </form>
            )}

            <div className="news-admin-list">
              {news.length === 0 && <p className="empty-text">{t("newsNoItems")}</p>}
              {news.map((item) => (
                <div key={item.id} className={`news-admin-item card ${!item.is_published ? "unpublished" : ""}`}>
                  <div className="news-admin-header">
                    <div>
                      <h4 className="news-admin-title">{item.title}</h4>
                      <span className="news-admin-date">
                        {new Date(item.created_at).toLocaleDateString(dateLocale, {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="news-admin-actions">
                      <span className={`badge ${item.is_published ? "badge-green" : "badge-red"}`}>
                        {item.is_published ? t("newsPublished") : t("newsDraft")}
                      </span>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => toggleNewsPublish(item)}
                      >
                        {item.is_published ? t("newsHide") : t("newsPublish")}
                      </button>
                      <button
                        className="btn btn-danger btn-xs"
                        onClick={() => deleteNewsItem(item.id)}
                      >
                        {t("actionDelete")}
                      </button>
                    </div>
                  </div>
                  <p className="news-admin-content">{item.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className={`stat-card card stat-${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

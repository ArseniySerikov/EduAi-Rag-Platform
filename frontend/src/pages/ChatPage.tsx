import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import LangSwitch from "../components/LangSwitch";
import * as chatsApi from "../api/chats";
import * as messagesApi from "../api/messages";
import * as newsApi from "../api/news";
import type { Chat, Message, NewsItem, Source } from "../types";
import type { MessageKey } from "../locales/messages";
import "./ChatPage.css";

export default function ChatPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, dateLocale } = useLanguage();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [editingChatId, setEditingChatId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    loadChats();
    loadNews();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChats = async () => {
    try {
      const data = await chatsApi.listChats();
      setChats(data);
      if (data.length > 0 && !activeChatId) {
        selectChat(data[0].id);
      }
    } catch {}
  };

  const loadNews = async () => {
    try {
      const data = await newsApi.listNews();
      setNews(data.slice(0, 10));
    } catch {}
  };

  const selectChat = async (chatId: number) => {
    setActiveChatId(chatId);
    setLoadingMessages(true);
    try {
      const data = await messagesApi.getMessages(chatId);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
    inputRef.current?.focus();
  };

  const createNewChat = async () => {
    try {
      const chat = await chatsApi.createChat(t("chatNewChat"));
      setChats((prev) => [chat, ...prev]);
      await selectChat(chat.id);
    } catch {}
  };

  const deleteChat = async (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatsApi.deleteChat(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
        const remaining = chats.filter((c) => c.id !== chatId);
        if (remaining.length > 0) selectChat(remaining[0].id);
      }
    } catch {}
  };

  const startEditChat = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const saveEditChat = async (chatId: number) => {
    if (!editingTitle.trim()) return;
    try {
      const updated = await chatsApi.updateChat(chatId, editingTitle.trim());
      setChats((prev) => prev.map((c) => (c.id === chatId ? updated : c)));
    } catch {}
    setEditingChatId(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeChatId || sending) return;
    const content = input.trim();
    setInput("");

    const optimistic: Message = {
      id: Date.now(),
      chat_id: activeChatId,
      role: "user",
      content,
      used_rag: false,
      tokens_used: 0,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);

    try {
      const response = await messagesApi.sendMessage(activeChatId, content);
      setMessages((prev) => [...prev, response]);
      // Refresh chat list to update title and timestamp
      const updatedChats = await chatsApi.listChats();
      setChats(updatedChats);
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id
            ? { ...m, content: m.content + t("chatSendError") }
            : m
        )
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startVoice = async () => {
    if (!activeChatId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        try {
          const result = await messagesApi.sendVoice(activeChatId, blob, "voice.webm");
          setInput(result.text);
        } catch {}
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {}
  };

  const stopVoice = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const activeChat = chats.find((c) => c.id === activeChatId);

  return (
    <div className="chat-layout">
      {/* ── Sidebar ── */}
      <aside className={`chat-sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-header">
          <span className="sidebar-brand">🎓 EduAI</span>
          <button className="sidebar-collapse-btn" onClick={() => setSidebarOpen((p) => !p)}>
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        {sidebarOpen && (
          <>
            <button className="new-chat-btn" onClick={createNewChat}>
              <span>+</span> {t("chatNewChat")}
            </button>

            <div className="chat-list">
              {chats.length === 0 && (
                <p className="chat-list-empty">{t("chatNoChats")}</p>
              )}
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`chat-list-item ${activeChatId === chat.id ? "active" : ""}`}
                  onClick={() => selectChat(chat.id)}
                >
                  {editingChatId === chat.id ? (
                    <input
                      className="chat-title-input"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => saveEditChat(chat.id)}
                      onKeyDown={(e) => e.key === "Enter" && saveEditChat(chat.id)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <div className="chat-item-icon">💬</div>
                      <div className="chat-item-content">
                        <span className="chat-item-title">{chat.title}</span>
                        <span className="chat-item-meta">
                          {chat.message_count} {t("chatMsgShort")}
                        </span>
                      </div>
                      <div className="chat-item-actions">
                        <button
                          className="chat-action-btn"
                          onClick={(e) => startEditChat(chat, e)}
                          title={t("chatRename")}
                        >
                          ✏️
                        </button>
                        <button
                          className="chat-action-btn danger"
                          onClick={(e) => deleteChat(chat.id, e)}
                          title={t("chatDelete")}
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="sidebar-footer">
              <div className="sidebar-user">
                <div className="sidebar-avatar">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div className="sidebar-user-info">
                  <span className="sidebar-username">{user?.username}</span>
                  <span className="sidebar-role">
                    {isAdmin ? t("chatAdmin") : t("chatStudent")}
                  </span>
                </div>
              </div>
              <div className="sidebar-footer-actions">
                {isAdmin && (
                  <Link to="/admin" className="sidebar-admin-link" title={t("navPanel")}>
                    {t("navPanel")}
                  </Link>
                )}
                <LangSwitch />
                <button className="sidebar-icon-btn" onClick={toggleTheme} title={t("chatToggleTheme")}>
                  {theme === "light" ? "🌙" : "☀️"}
                </button>
                <button className="sidebar-icon-btn" onClick={logout} title={t("chatLogout")}>
                  🚪
                </button>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* ── Main Chat Area ── */}
      <main className="chat-main">
        <div className="chat-topbar">
          <div className="chat-topbar-left">
            {!sidebarOpen && (
              <button className="topbar-btn" onClick={() => setSidebarOpen(true)}>
                ☰
              </button>
            )}
            <h2 className="chat-topbar-title">
              {activeChat ? activeChat.title : t("chatSelectChat")}
            </h2>
          </div>
          <div className="chat-topbar-right">
            {activeChat && (
              <span className="topbar-meta">
                {activeChat.message_count} {t("chatMessagesCount")}
              </span>
            )}
          </div>
        </div>

        <div className="chat-messages">
          {!activeChatId && (
            <div className="chat-empty">
              <div className="chat-empty-icon">💬</div>
              <h3>{t("chatStartTitle")}</h3>
              <p>{t("chatStartDesc")}</p>
              <button className="btn btn-primary" onClick={createNewChat}>
                {t("chatCreateChat")}
              </button>
            </div>
          )}

          {loadingMessages && (
            <div className="chat-loading">{t("chatLoadingMessages")}</div>
          )}

          {!loadingMessages && messages.map((msg) => (
            <div key={msg.id} className={`message-wrapper ${msg.role}`}>
              <div className={`message-bubble ${msg.role}`}>
                <div className="message-content">{msg.content}</div>
                {msg.sources && msg.sources.length > 0 && (
                  <SourcesList sources={msg.sources} t={t} />
                )}
                <div className="message-footer">
                  <span className="message-time">
                    {new Date(msg.created_at).toLocaleTimeString(dateLocale, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {msg.used_rag && (
                    <span className="rag-indicator" title={t("chatRagTitle")}>
                      📚 RAG
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="message-wrapper assistant">
              <div className="message-bubble assistant">
                <div className="typing-indicator">
                  <span className="dot" /><span className="dot" /><span className="dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {activeChatId && (
          <div className="chat-input-area">
            <div className="chat-input-wrapper">
              <button
                className={`voice-btn ${recording ? "recording" : ""}`}
                onClick={recording ? stopVoice : startVoice}
                title={recording ? t("chatVoiceStop") : t("chatVoiceStart")}
              >
                {recording ? "⏹" : "🎙️"}
              </button>
              <textarea
                ref={inputRef}
                className="chat-textarea"
                placeholder={t("chatPlaceholder")}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={sending}
              />
              <button
                className="send-btn"
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                title={t("chatSendTitle")}
              >
                ➤
              </button>
            </div>
            <p className="input-hint">{t("chatInputHint")}</p>
          </div>
        )}
      </main>

      {/* ── News Panel ── */}
      <aside className="news-panel">
        <div className="news-panel-header">
          <h3 className="news-panel-title">{t("chatNewsTitle")}</h3>
        </div>
        <div className="news-list">
          {news.length === 0 && (
            <p className="news-empty">{t("chatNoNews")}</p>
          )}
          {news.map((item) => (
            <div key={item.id} className="news-item">
              <h4 className="news-item-title">{item.title}</h4>
              <p className="news-item-content">{item.content}</p>
              <span className="news-item-date">
                {new Date(item.created_at).toLocaleDateString(dateLocale, {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function SourcesList({
  sources,
  t,
}: {
  sources: Source[];
  t: (key: MessageKey) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="sources-block">
      <button className="sources-toggle" onClick={() => setExpanded((p) => !p)}>
        {t("sourcesToggle")} ({sources.length})
        <span className={`sources-arrow ${expanded ? "open" : ""}`}>▾</span>
      </button>
      {expanded && (
        <div className="sources-list">
          {sources.map((s, i) => (
            <div key={i} className="source-item">
              <div className="source-header">
                <span className="source-doc">📄 {s.document}</span>
                <span className="source-sim">{(s.similarity * 100).toFixed(0)}%</span>
              </div>
              <p className="source-snippet">{s.snippet}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

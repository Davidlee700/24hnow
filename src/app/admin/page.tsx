'use client';

import { useState, useEffect, useCallback } from 'react';

interface BodyItem {
  id: number;
  title: string;
  content: string;
  date?: string;
}

interface PageContent {
  slug: string;
  title: string;
  subtitle: string;
  body_json: BodyItem[];
  updated_at: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const PAGE_LABELS: Record<string, string> = {
  notice: '공지사항',
  terms: '서비스 이용약관',
  privacy: '개인정보처리방침',
};

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'content' | 'messages'>('content');
  const [pages, setPages] = useState<PageContent[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<PageContent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  // Auth check on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('admin_token');
    if (stored) setToken(stored);
  }, []);

  const fetchPages = useCallback(async (t: string) => {
    const res = await fetch('/api/admin/pages', { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) {
      const data = await res.json();
      setPages(data.pages ?? []);
    }
  }, []);

  const fetchMessages = useCallback(async (t: string) => {
    const res = await fetch('/api/admin/messages', { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchPages(token);
    fetchMessages(token);
  }, [token, fetchPages, fetchMessages]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.token) {
        sessionStorage.setItem('admin_token', data.token);
        setToken(data.token);
      } else {
        setAuthError(data.error ?? '인증에 실패했어요.');
      }
    } catch {
      setAuthError('서버 오류가 발생했어요.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSelectPage = (slug: string) => {
    const page = pages.find(p => p.slug === slug);
    if (page) {
      setSelectedSlug(slug);
      setEditingPage(JSON.parse(JSON.stringify(page)));
      setSaveMsg(null);
    }
  };

  const updateSection = (index: number, field: keyof BodyItem, value: string) => {
    if (!editingPage) return;
    const updated = [...editingPage.body_json];
    updated[index] = { ...updated[index], [field]: value };
    setEditingPage({ ...editingPage, body_json: updated });
  };

  const addSection = () => {
    if (!editingPage) return;
    const newId = Math.max(0, ...editingPage.body_json.map(s => s.id)) + 1;
    const newItem: BodyItem = selectedSlug === 'notice'
      ? { id: newId, title: '', date: '', content: '' }
      : { id: newId, title: '', content: '' };
    setEditingPage({ ...editingPage, body_json: [...editingPage.body_json, newItem] });
  };

  const removeSection = (index: number) => {
    if (!editingPage) return;
    const updated = editingPage.body_json.filter((_, i) => i !== index);
    setEditingPage({ ...editingPage, body_json: updated });
  };

  const handleSave = async () => {
    if (!editingPage || !token) return;
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/admin/pages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editingPage),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg('저장되었습니다.');
        await fetchPages(token);
      } else {
        setSaveMsg('저장 실패: ' + (data.error ?? '알 수 없는 오류'));
      }
    } catch {
      setSaveMsg('네트워크 오류가 발생했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkRead = async (msg: ContactMessage) => {
    if (!token) return;
    await fetch('/api/admin/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: msg.id, is_read: true }),
    });
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    setSelectedMessage({ ...msg, is_read: true });
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  // ─── Password gate ───────────────────────────────────────
  if (!token) {
    return (
      <div className="admin-gate">
        <div className="admin-gate-card">
          <div className="admin-gate-logo">24시 <span>나우</span></div>
          <p className="admin-gate-sub">관리자 전용 페이지</p>
          <form onSubmit={handleLogin} className="admin-gate-form">
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="admin-gate-input"
              autoFocus
            />
            {authError && <p className="admin-gate-error">{authError}</p>}
            <button type="submit" className="admin-gate-btn" disabled={isAuthLoading}>
              {isAuthLoading ? '확인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Dashboard ───────────────────────────────────────────
  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-header-brand">24시 나우 <span>관리자</span></div>
        <button className="admin-logout-btn" onClick={() => { sessionStorage.removeItem('admin_token'); setToken(null); }}>
          로그아웃
        </button>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab${activeTab === 'content' ? ' active' : ''}`} onClick={() => setActiveTab('content')}>
          콘텐츠 관리
        </button>
        <button className={`admin-tab${activeTab === 'messages' ? ' active' : ''}`} onClick={() => setActiveTab('messages')}>
          문의 내역 {unreadCount > 0 && <span className="admin-badge">{unreadCount}</span>}
        </button>
      </div>

      {/* ── 콘텐츠 관리 탭 ── */}
      {activeTab === 'content' && (
        <div className="admin-content-panel">
          <div className="admin-page-list">
            {Object.entries(PAGE_LABELS).map(([slug, label]) => (
              <button
                key={slug}
                className={`admin-page-item${selectedSlug === slug ? ' active' : ''}`}
                onClick={() => handleSelectPage(slug)}
              >
                {label}
              </button>
            ))}
          </div>

          {editingPage && (
            <div className="admin-editor">
              <div className="admin-editor-meta">
                <div className="admin-field">
                  <label>페이지 제목</label>
                  <input
                    value={editingPage.title}
                    onChange={e => setEditingPage({ ...editingPage, title: e.target.value })}
                  />
                </div>
                <div className="admin-field">
                  <label>부제목</label>
                  <input
                    value={editingPage.subtitle}
                    onChange={e => setEditingPage({ ...editingPage, subtitle: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-sections">
                {editingPage.body_json.map((item, idx) => (
                  <div key={item.id} className="admin-section-card">
                    <div className="admin-section-header">
                      <span className="admin-section-num">{idx + 1}</span>
                      <button className="admin-remove-btn" onClick={() => removeSection(idx)}>삭제</button>
                    </div>
                    <div className="admin-field">
                      <label>제목</label>
                      <input value={item.title} onChange={e => updateSection(idx, 'title', e.target.value)} />
                    </div>
                    {selectedSlug === 'notice' && (
                      <div className="admin-field">
                        <label>날짜</label>
                        <input
                          value={item.date ?? ''}
                          placeholder="예: 2026.04.28"
                          onChange={e => updateSection(idx, 'date', e.target.value)}
                        />
                      </div>
                    )}
                    <div className="admin-field">
                      <label>내용</label>
                      <textarea
                        value={item.content}
                        onChange={e => updateSection(idx, 'content', e.target.value)}
                        rows={5}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="admin-editor-actions">
                <button className="admin-add-btn" onClick={addSection}>+ 항목 추가</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {saveMsg && <span className="admin-save-msg">{saveMsg}</span>}
                  <button className="admin-save-btn" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!editingPage && (
            <div className="admin-empty-hint">
              <p>왼쪽에서 편집할 페이지를 선택하세요</p>
            </div>
          )}
        </div>
      )}

      {/* ── 문의 내역 탭 ── */}
      {activeTab === 'messages' && (
        <div className="admin-messages-panel">
          <div className="admin-message-list">
            {messages.length === 0 && <p className="admin-empty-hint-text">아직 문의가 없어요.</p>}
            {messages.map(msg => (
              <button
                key={msg.id}
                className={`admin-message-item${!msg.is_read ? ' unread' : ''}${selectedMessage?.id === msg.id ? ' active' : ''}`}
                onClick={() => { setSelectedMessage(msg); if (!msg.is_read) handleMarkRead(msg); }}
              >
                <div className="admin-msg-top">
                  <span className="admin-msg-name">{msg.name}</span>
                  {!msg.is_read && <span className="admin-msg-dot" />}
                </div>
                <span className="admin-msg-preview">{msg.message.slice(0, 40)}{msg.message.length > 40 ? '...' : ''}</span>
                <span className="admin-msg-date">{new Date(msg.created_at).toLocaleDateString('ko-KR')}</span>
              </button>
            ))}
          </div>

          {selectedMessage && (
            <div className="admin-message-detail">
              <div className="admin-msg-detail-header">
                <h2>{selectedMessage.name}</h2>
                <a href={`mailto:${selectedMessage.email}`} className="admin-msg-email">{selectedMessage.email}</a>
                <span className="admin-msg-detail-date">{new Date(selectedMessage.created_at).toLocaleString('ko-KR')}</span>
              </div>
              <p className="admin-msg-detail-body">{selectedMessage.message}</p>
              <a href={`mailto:${selectedMessage.email}?subject=24시나우 문의 답변`} className="admin-reply-btn">
                이메일로 답장하기
              </a>
            </div>
          )}

          {!selectedMessage && messages.length > 0 && (
            <div className="admin-empty-hint">
              <p>왼쪽에서 문의를 선택하세요</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

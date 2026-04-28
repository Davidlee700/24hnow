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

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  is_banned: boolean;
  is_withdrawn: boolean;
  admin_memo: string;
  created_at: string;
}

type SelectedView = 'notice' | 'terms' | 'privacy' | 'messages' | 'users';

const NAV_CONTENT: { slug: SelectedView; label: string }[] = [
  { slug: 'notice', label: '공지사항' },
  { slug: 'terms', label: '서비스 이용약관' },
  { slug: 'privacy', label: '개인정보처리방침' },
];

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [selectedView, setSelectedView] = useState<SelectedView>('notice');
  const [pages, setPages] = useState<PageContent[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [editingPage, setEditingPage] = useState<PageContent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

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

  const fetchUsers = useCallback(async (t: string) => {
    const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchPages(token);
    fetchMessages(token);
    fetchUsers(token);
  }, [token, fetchPages, fetchMessages, fetchUsers]);

  // Sync editingPage when pages load or view changes
  useEffect(() => {
    if (selectedView === 'messages') return;
    const page = pages.find(p => p.slug === selectedView);
    if (page) setEditingPage(JSON.parse(JSON.stringify(page)));
  }, [pages, selectedView]);

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

  const handleSelectView = (view: SelectedView) => {
    setSelectedView(view);
    setSaveMsg(null);
    if (view !== 'messages') {
      const page = pages.find(p => p.slug === view);
      if (page) setEditingPage(JSON.parse(JSON.stringify(page)));
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
    const newItem: BodyItem = selectedView === 'notice'
      ? { id: newId, title: '', date: '', content: '' }
      : { id: newId, title: '', content: '' };
    setEditingPage({ ...editingPage, body_json: [...editingPage.body_json, newItem] });
  };

  const removeSection = (index: number) => {
    if (!editingPage) return;
    setEditingPage({ ...editingPage, body_json: editingPage.body_json.filter((_, i) => i !== index) });
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
        setTimeout(() => setSaveMsg(null), 3000);
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
    if (!token || msg.is_read) return;
    await fetch('/api/admin/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: msg.id, is_read: true }),
    });
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    setSelectedMessage({ ...msg, is_read: true });
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  // ─── Password gate ────────────────────────────────────────
  if (!token) {
    return (
      <div className="admin-gate">
        <div className="admin-gate-card">
          <div className="admin-gate-logo">24시 <span>나우</span></div>
          <p className="admin-gate-sub">관리자 전용 페이지입니다.</p>
          <form onSubmit={handleLogin} className="admin-gate-form">
            <input
              type="password"
              placeholder="비밀번호를 입력하세요"
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

  // ─── Dashboard ────────────────────────────────────────────
  return (
    <div className="admin-wrap">
      <div className="admin-page">

        {/* Header */}
        <header className="admin-header">
          <div className="admin-header-brand">
            <span className="admin-brand-text">24시 <em>나우</em></span>
            <span className="admin-brand-divider" />
            <span className="admin-brand-label">관리자</span>
          </div>
          <div className="admin-header-right">
            {saveMsg && (
              <span className={`admin-save-badge${saveMsg.includes('실패') ? ' error' : ''}`}>
                {saveMsg}
              </span>
            )}
            <button
              className="admin-logout-btn"
              onClick={() => { sessionStorage.removeItem('admin_token'); setToken(null); }}
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="admin-body">

          {/* Sidebar */}
          <aside className="admin-sidebar">
            <div className="admin-nav-section">
              <p className="admin-nav-label">콘텐츠 관리</p>
              {NAV_CONTENT.map(({ slug, label }) => (
                <button
                  key={slug}
                  className={`admin-nav-item${selectedView === slug ? ' active' : ''}`}
                  onClick={() => handleSelectView(slug)}
                >
                  <span className="admin-nav-dot" />
                  {label}
                </button>
              ))}
            </div>
            <div className="admin-nav-section">
              <p className="admin-nav-label">운영</p>
              <button
                className={`admin-nav-item${selectedView === 'messages' ? ' active' : ''}`}
                onClick={() => handleSelectView('messages')}
              >
                <span className="admin-nav-dot" />
                문의 내역
                {unreadCount > 0 && <span className="admin-badge">{unreadCount}</span>}
              </button>
              <button
                className={`admin-nav-item${selectedView === 'users' ? ' active' : ''}`}
                onClick={() => handleSelectView('users')}
              >
                <span className="admin-nav-dot" />
                회원 관리
              </button>
            </div>
          </aside>

          {/* Main */}
          <main className="admin-main">

            {/* 콘텐츠 에디터 */}
            {selectedView !== 'messages' && (
              <div className="admin-editor">
                {editingPage ? (
                  <>
                    <div className="admin-editor-header">
                      <div>
                        <h1 className="admin-editor-title">{editingPage.title}</h1>
                        <p className="admin-editor-updated">
                          최근 수정: {new Date(editingPage.updated_at).toLocaleString('ko-KR')}
                        </p>
                      </div>
                      <button className="admin-save-btn" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? '저장 중...' : '저장하기'}
                      </button>
                    </div>

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
                          <div className="admin-field-row">
                            <div className="admin-field" style={{ flex: 1 }}>
                              <label>제목</label>
                              <input value={item.title} onChange={e => updateSection(idx, 'title', e.target.value)} />
                            </div>
                            {selectedView === 'notice' && (
                              <div className="admin-field" style={{ width: '160px' }}>
                                <label>날짜</label>
                                <input
                                  value={item.date ?? ''}
                                  placeholder="2026.04.28"
                                  onChange={e => updateSection(idx, 'date', e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                          <div className="admin-field">
                            <label>내용</label>
                            <textarea
                              value={item.content}
                              onChange={e => updateSection(idx, 'content', e.target.value)}
                              rows={6}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button className="admin-add-btn" onClick={addSection}>
                      + 항목 추가
                    </button>
                  </>
                ) : (
                  <div className="admin-empty-hint">
                    <p>데이터를 불러오는 중이에요...</p>
                  </div>
                )}
              </div>
            )}

            {/* 문의 내역 */}
            {selectedView === 'messages' && (
              <div className="admin-messages-panel">
                <div className="admin-message-list">
                  <p className="admin-message-list-title">
                    전체 문의 <span>{messages.length}건</span>
                  </p>
                  {messages.length === 0 && (
                    <p className="admin-empty-hint-text">아직 문의가 없어요.</p>
                  )}
                  {messages.map(msg => (
                    <button
                      key={msg.id}
                      className={`admin-message-item${!msg.is_read ? ' unread' : ''}${selectedMessage?.id === msg.id ? ' active' : ''}`}
                      onClick={() => { setSelectedMessage(msg); handleMarkRead(msg); }}
                    >
                      <div className="admin-msg-top">
                        <span className="admin-msg-name">{msg.name}</span>
                        {!msg.is_read && <span className="admin-msg-dot" />}
                      </div>
                      <span className="admin-msg-preview">
                        {msg.message.slice(0, 50)}{msg.message.length > 50 ? '...' : ''}
                      </span>
                      <span className="admin-msg-date">
                        {new Date(msg.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </button>
                  ))}
                </div>

                {selectedMessage ? (
                  <div className="admin-message-detail">
                    <div className="admin-msg-detail-header">
                      <div className="admin-msg-detail-avatar">
                        {selectedMessage.name.slice(0, 1)}
                      </div>
                      <div>
                        <h2>{selectedMessage.name}</h2>
                        <a href={`mailto:${selectedMessage.email}`} className="admin-msg-email">
                          {selectedMessage.email}
                        </a>
                      </div>
                      <span className="admin-msg-detail-date">
                        {new Date(selectedMessage.created_at).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <p className="admin-msg-detail-body">{selectedMessage.message}</p>
                    <a
                      href={`mailto:${selectedMessage.email}?subject=24시나우 문의 답변`}
                      className="admin-reply-btn"
                    >
                      이메일로 답장하기 →
                    </a>
                  </div>
                ) : (
                  <div className="admin-empty-hint">
                    <p>문의를 선택하면 내용이 표시됩니다.</p>
                  </div>
                )}
              </div>
            )}

            {selectedView === 'users' && (
              <div className="admin-messages-panel">
                <div className="admin-message-list">
                  <p className="admin-message-list-title">
                    전체 회원 <span>{users.length}명</span>
                  </p>
                  {users.length === 0 && (
                    <p className="admin-empty-hint-text">가입된 회원이 없어요.</p>
                  )}
                  {users.map(u => (
                    <button
                      key={u.id}
                      className={`admin-message-item${u.is_banned ? ' unread' : ''}${selectedUser?.id === u.id ? ' active' : ''}`}
                      onClick={() => setSelectedUser(u)}
                    >
                      <div className="admin-msg-top">
                        <span className="admin-msg-name">{u.full_name}</span>
                        {u.is_banned && <span className="admin-msg-dot" style={{ backgroundColor: '#FF453A' }} />}
                      </div>
                      <span className="admin-msg-preview">{u.email}</span>
                      <span className="admin-msg-date">
                        {new Date(u.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </button>
                  ))}
                </div>

                {selectedUser ? (
                  <div className="admin-message-detail">
                    <div className="admin-msg-detail-header">
                      {selectedUser.avatar_url ? (
                        <img src={selectedUser.avatar_url} alt={selectedUser.full_name} className="admin-msg-detail-avatar" style={{ objectFit: 'cover' }} />
                      ) : (
                        <div className="admin-msg-detail-avatar">
                          {selectedUser.full_name.slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <h2>{selectedUser.full_name}</h2>
                        <span className="admin-msg-email">{selectedUser.email}</span>
                      </div>
                      <span className="admin-msg-detail-date">
                        가입일: {new Date(selectedUser.created_at).toLocaleString('ko-KR')}
                      </span>
                    </div>

                    <div className="admin-field" style={{ marginTop: '20px' }}>
                      <label>회원별 메모</label>
                      <textarea
                        value={selectedUser.admin_memo || ''}
                        onChange={e => setSelectedUser({ ...selectedUser, admin_memo: e.target.value })}
                        placeholder="회원에 대한 메모를 남겨주세요."
                        rows={4}
                      />
                      <button 
                        className="admin-save-btn" 
                        style={{ alignSelf: 'flex-end', marginTop: '8px' }}
                        onClick={async () => {
                          const res = await fetch('/api/admin/users', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ id: selectedUser.id, admin_memo: selectedUser.admin_memo }),
                          });
                          if (res.ok) {
                            setSaveMsg('메모가 저장되었습니다.');
                            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, admin_memo: selectedUser.admin_memo } : u));
                            setTimeout(() => setSaveMsg(null), 3000);
                          }
                        }}
                      >
                        메모 저장
                      </button>
                    </div>

                    <div className="confidence-divider" style={{ margin: '20px 0' }} />

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        className="confirm-vote-btn no"
                        style={{ flex: 'none', width: '120px', padding: '12px' }}
                        onClick={async () => {
                          const newStatus = !selectedUser.is_banned;
                          const res = await fetch('/api/admin/users', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ id: selectedUser.id, is_banned: newStatus }),
                          });
                          if (res.ok) {
                            setSaveMsg(newStatus ? '제재 처리되었습니다.' : '제재가 해제되었습니다.');
                            setSelectedUser({ ...selectedUser, is_banned: newStatus });
                            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, is_banned: newStatus } : u));
                            setTimeout(() => setSaveMsg(null), 3000);
                          }
                        }}
                      >
                        {selectedUser.is_banned ? '제재 해제' : '활동 제재'}
                      </button>

                      <button
                        className="confirm-vote-btn no"
                        style={{ flex: 'none', width: '120px', padding: '12px', borderColor: '#FF453A', color: '#FF453A' }}
                        onClick={async () => {
                          if (confirm('정말 탈퇴 처리하시겠습니까?')) {
                            const res = await fetch('/api/admin/users', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ id: selectedUser.id, is_withdrawn: true }),
                            });
                            if (res.ok) {
                              setSaveMsg('탈퇴 처리되었습니다.');
                              setSelectedUser(null);
                              setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
                              setTimeout(() => setSaveMsg(null), 3000);
                            }
                          }
                        }}
                      >
                        탈퇴 처리
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-empty-hint">
                    <p>회원을 선택하면 상세 정보가 표시됩니다.</p>
                  </div>
                )}
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}

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

interface StoreItem {
  id: string;
  name: string;
  road_address: string;
  category: string;
  operation_type: string;
  confidence_level: string;
  hours_source: string;
  raw_hours: string;
  trust_score: number;
  last_hours_verified_at: string;
  last_verified_at: string;
  google_place_id: string;
  inference_note: string;
  class_type: string;
}

interface ReportItem {
  id: string;
  store_id: string;
  report_type: string;
  comment: string;
  status: string;
  created_at: string;
  stores?: { name: string };
}

type SelectedView = 'stores' | 'reports' | 'notice' | 'terms' | 'privacy' | 'messages' | 'users';

const DEFAULT_PAGES: Partial<Record<SelectedView, PageContent>> = {
  notice: {
    slug: 'notice',
    title: '공지사항',
    subtitle: '24시나우의 새로운 소식을 전해드립니다.',
    updated_at: new Date().toISOString(),
    body_json: [
      { id: 1, title: '서비스 오픈 안내', date: '2026.05.01', content: '24시나우가 정식 오픈했습니다. 서울·경기·인천의 24시간 운영 매장을 지도에서 찾아보세요.' },
    ],
  },
  privacy: {
    slug: 'privacy',
    title: '개인정보처리방침',
    subtitle: '이용자님의 소중한 정보를 보호하기 위해 최선을 다하고 있습니다.',
    updated_at: new Date().toISOString(),
    body_json: [
      { id: 1, title: '1. 수집하는 개인정보 항목', content: '24시나우는 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.\n\n• 위치 정보(GPS): 주변 24시간 운영 장소 검색 기능 제공\n• IP 주소(해시 처리): 서비스 남용 방지 및 보안\n• 이름·이메일(문의 시): 문의 접수 및 답변 제공\n\n위치 정보는 이용자의 기기에서만 처리되며, 서버에 저장되지 않습니다.' },
      { id: 2, title: '2. 개인정보의 수집 및 이용 목적', content: '수집한 개인정보는 다음의 목적을 위해서만 이용합니다.\n\n• 위치 기반 서비스 제공: 현재 위치 주변의 24시간 운영 매장 안내\n• 서비스 품질 개선: 이용 패턴 분석 및 서비스 개선\n• 문의 응대: 이용자 문의 접수 및 답변' },
      { id: 3, title: '3. 개인정보의 보유 및 이용 기간', content: '24시나우는 원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 즉시 파기합니다.\n\n• 위치 정보: 서비스 이용 즉시 파기 (서버 미저장)\n• IP 해시: 수집 후 30일\n• 문의 이메일(이름·주소): 문의 처리 완료 후 1년\n\n단, 관계 법령의 규정에 의하여 보존할 필요가 있는 경우 법령에서 정한 기간 동안 보존합니다.' },
      { id: 4, title: '4. 개인정보의 제3자 제공', content: '24시나우는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.\n\n다만, 아래의 경우에는 예외로 합니다.\n\n• 이용자가 사전에 동의한 경우\n• 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우' },
      { id: 5, title: '5. 개인정보 처리 위탁', content: '24시나우는 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁하고 있습니다.\n\n• 수탁자: Supabase Inc.\n  위탁 업무: 데이터베이스 저장 및 운영\n  보유 기간: 위탁 계약 종료 시까지\n\n• 수탁자: Kakao Corp.\n  위탁 업무: 지도 서비스 SDK, 소셜 로그인\n  보유 기간: 위탁 계약 종료 시까지' },
      { id: 6, title: '6. 이용자의 권리 및 행사 방법', content: '이용자는 언제든지 다음의 권리를 행사할 수 있습니다.\n\n• 개인정보 열람 요구\n• 오류 정정 요구\n• 삭제 요구\n• 처리 정지 요구\n\n권리 행사는 이메일(contact@24now.kr)로 요청하시면 지체 없이 처리합니다.' },
      { id: 7, title: '7. 개인정보 보호책임자', content: '개인정보 보호책임자\n이메일: contact@24now.kr\n서비스명: 24시나우' },
      { id: 8, title: '8. 개인정보처리방침의 변경', content: '이 개인정보처리방침은 2026년 5월 6일부터 적용됩니다.\n\n법령, 정책 또는 보안 기술의 변경에 따라 내용의 추가·삭제 및 수정이 있을 경우, 시행일 7일 전부터 서비스 내 공지사항을 통해 고지합니다.' },
    ],
  },
  terms: {
    slug: 'terms',
    title: '서비스 이용약관',
    subtitle: '24시나우를 안전하게 이용하기 위한 약속입니다.',
    updated_at: new Date().toISOString(),
    body_json: [
      { id: 1, title: '제1조 (목적)', content: '이 약관은 24시나우(이하 "서비스")가 제공하는 24시간 운영 장소 정보 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.' },
      { id: 2, title: '제2조 (정의)', content: '• "서비스"란 24시나우가 제공하는 24시간 운영 장소 검색 및 관련 부가 기능 일체를 말합니다.\n• "이용자"란 서비스에 접속하여 이 약관에 따라 서비스를 이용하는 자를 말합니다.\n• "콘텐츠"란 이용자가 서비스에 등록하는 댓글, 평가, 제보 등 일체의 정보를 말합니다.' },
      { id: 3, title: '제3조 (서비스의 내용)', content: '• 서울·경기·인천 지역 24시간 운영 카페, 편의점, 셀프세차장 등의 위치 정보 제공\n• 지도 기반 주변 24시간 매장 검색\n• 매장별 이용자 댓글 및 정보 제보 기능\n• 심야 가이드 콘텐츠 제공' },
      { id: 4, title: '제4조 (이용자의 의무)', content: '• 서비스 이용 시 정확한 정보를 제공해야 합니다.\n• 타인의 개인정보, 저작권, 기타 권리를 침해하지 않아야 합니다.\n• 관련 법령 및 이 약관의 규정을 준수해야 합니다.\n• 서비스의 정상적인 운영을 방해하는 행위를 해서는 안 됩니다.' },
      { id: 5, title: '제5조 (금지 행위)', content: '• 허위 정보 제보 또는 허위 신고\n• 스팸성 댓글 반복 게시\n• 자동화된 프로그램을 이용한 데이터 크롤링 또는 수집\n• 서비스 데이터의 상업적 무단 이용\n• 타인을 사칭하거나 타인의 정보를 도용하는 행위\n• 서비스 서버나 시스템에 과부하를 유발하는 행위\n• 음란, 폭력적, 혐오적 콘텐츠 게시' },
      { id: 6, title: '제6조 (서비스 이용 제한)', content: '이용자가 이 약관을 위반하거나 다음에 해당하는 경우, 사전 통보 없이 서비스 이용을 제한하거나 계정을 삭제할 수 있습니다.\n\n• 제5조의 금지 행위를 한 경우\n• 서비스의 정상적인 운영을 방해한 경우\n• 법령 위반 행위를 한 경우' },
      { id: 7, title: '제7조 (면책 조항)', content: '• 서비스에 제공된 매장 정보의 정확성, 완전성, 최신성\n• 천재지변, 서버 장애, 인터넷 통신 장애 등 불가항력으로 인한 서비스 중단\n• 이용자 간 또는 이용자와 제3자 간에 발생한 분쟁\n• 이용자가 서비스를 이용하여 얻은 정보로 인해 발생한 손해' },
      { id: 8, title: '제8조 (분쟁 해결 및 관할)', content: '이 약관과 서비스 이용에 관한 분쟁은 대한민국 법률을 적용합니다.\n\n분쟁에 대해서는 서울중앙지방법원을 관할 법원으로 합니다.\n\n분쟁 발생 시 먼저 이메일(contact@24now.kr)로 문의해 주시면 신속히 처리하겠습니다.' },
      { id: 9, title: '제9조 (시행일)', content: '이 약관은 2026년 5월 6일부터 시행됩니다.\n\n약관이 변경되는 경우, 변경 내용과 시행일을 서비스 공지사항을 통해 사전 공지합니다.' },
    ],
  },
};

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

  const [selectedView, setSelectedView] = useState<SelectedView>('stores');
  const [pages, setPages] = useState<PageContent[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [editingPage, setEditingPage] = useState<PageContent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [storesData, setStoresData] = useState<StoreItem[]>([]);
  const [storesTotal, setStoresTotal] = useState(0);
  const [storesPage, setStoresPage] = useState(1);
  const [storeSearch, setStoreSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedOpType, setSelectedOpType] = useState('');
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [reportsFilter, setReportsFilter] = useState<'all' | 'hours'>('all');

  const CATEGORIES = ['', '카페', '편의점', '셀프세차장', '약국', 'PC방', '코인노래방', '셀프빨래방'];
  const OP_TYPES = ['', '24H', 'EXTENDED', 'UNKNOWN', 'REGULAR'];

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

  const fetchStoresData = useCallback(async (t: string, page = 1, search = '', category = '', opType = '') => {
    const params = new URLSearchParams({ page: String(page) });
    if (search)   params.set('search', search);
    if (category) params.set('category', category);
    if (opType)   params.set('operation_type', opType);
    const res = await fetch(`/api/admin/stores?${params}`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) {
      const data = await res.json();
      setStoresData(data.stores ?? []);
      setStoresTotal(data.total ?? 0);
      setStoresPage(page);
    }
  }, []);

  const fetchReports = useCallback(async (t: string) => {
    const res = await fetch('/api/admin/reports', { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) {
      const data = await res.json();
      setReports(data.reports ?? []);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchPages(token);
    fetchMessages(token);
    fetchUsers(token);
    fetchStoresData(token);
    fetchReports(token);
  }, [token, fetchPages, fetchMessages, fetchUsers, fetchStoresData, fetchReports]);

  // Sync editingPage when pages load or view changes
  useEffect(() => {
    if (selectedView === 'messages' || selectedView === 'users' || selectedView === 'stores' || selectedView === 'reports') return;
    const page = pages.find(p => p.slug === selectedView);
    if (page) {
      setEditingPage(JSON.parse(JSON.stringify(page)));
    } else if (DEFAULT_PAGES[selectedView]) {
      setEditingPage(JSON.parse(JSON.stringify(DEFAULT_PAGES[selectedView])));
    }
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
    if (view !== 'messages' && view !== 'users' && view !== 'stores' && view !== 'reports') {
      const page = pages.find(p => p.slug === view);
      if (page) {
        setEditingPage(JSON.parse(JSON.stringify(page)));
      } else if (DEFAULT_PAGES[view]) {
        setEditingPage(JSON.parse(JSON.stringify(DEFAULT_PAGES[view])));
      }
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
              <p className="admin-nav-label">매장 관리</p>
              <button
                className={`admin-nav-item${selectedView === 'stores' ? ' active' : ''}`}
                onClick={() => handleSelectView('stores')}
              >
                <span className="admin-nav-dot" />
                전체 매장 DB
              </button>
              <button
                className={`admin-nav-item${selectedView === 'reports' ? ' active' : ''}`}
                onClick={() => handleSelectView('reports')}
              >
                <span className="admin-nav-dot" />
                정보 수정 제보
              </button>
            </div>
            
            <div className="admin-nav-section">
              <p className="admin-nav-label">회원 및 소통</p>
              <button
                className={`admin-nav-item${selectedView === 'users' ? ' active' : ''}`}
                onClick={() => handleSelectView('users')}
              >
                <span className="admin-nav-dot" />
                회원 관리
              </button>
              <button
                className={`admin-nav-item${selectedView === 'messages' ? ' active' : ''}`}
                onClick={() => handleSelectView('messages')}
              >
                <span className="admin-nav-dot" />
                고객 문의
                {unreadCount > 0 && <span className="admin-badge">{unreadCount}</span>}
              </button>
            </div>

            <div className="admin-nav-section">
              <p className="admin-nav-label">운영 정책</p>
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
          </aside>

          {/* Main */}
          <main className="admin-main">

            {/* 콘텐츠 에디터 */}
            {(selectedView === 'notice' || selectedView === 'terms' || selectedView === 'privacy') && (
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

            {/* 매장 DB 관리 */}
            {selectedView === 'stores' && (
              <div className="admin-db-panel">
                <div className="admin-panel-header">
                  <h2 className="admin-panel-title">
                    전체 매장 DB <span>{storesTotal.toLocaleString()}개</span>
                  </h2>
                  <button className="admin-refresh-btn" onClick={() => token && fetchStoresData(token, 1, storeSearch, selectedCategory, selectedOpType)}>
                    새로고침
                  </button>
                </div>

                {/* 검색 + 필터 */}
                <div className="admin-filter-bar" style={{ flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                  <input
                    className="admin-gate-input"
                    style={{ width: '100%', maxWidth: '320px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                    placeholder="매장명 검색..."
                    value={storeSearch}
                    onChange={e => setStoreSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && token && fetchStoresData(token, 1, storeSearch, selectedCategory, selectedOpType)}
                  />
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {CATEGORIES.map(cat => (
                      <button key={cat} className={`admin-filter-btn${selectedCategory === cat ? ' active' : ''}`}
                        onClick={() => { setSelectedCategory(cat); token && fetchStoresData(token, 1, storeSearch, cat, selectedOpType); }}>
                        {cat || '전체 카테고리'}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {OP_TYPES.map(op => (
                      <button key={op} className={`admin-filter-btn${selectedOpType === op ? ' active' : ''}`}
                        style={op === 'EXTENDED' ? { borderColor: '#FF9F0A', color: selectedOpType === op ? '#000' : '#FF9F0A' }
                          : op === 'UNKNOWN' ? { borderColor: '#636366', color: selectedOpType === op ? '#000' : '#636366' } : {}}
                        onClick={() => { setSelectedOpType(op); token && fetchStoresData(token, 1, storeSearch, selectedCategory, op); }}>
                        {op || '전체 운영타입'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>매장명</th>
                        <th>카테고리</th>
                        <th>운영타입</th>
                        <th>신뢰도</th>
                        <th>시간소스</th>
                        <th>영업시간 (raw)</th>
                        <th>Google</th>
                        <th>주소</th>
                        <th>최근검증</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storesData.length === 0 && (
                        <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.3)' }}>
                          검색 결과가 없어요
                        </td></tr>
                      )}
                      {storesData.map(store => {
                        const opColor = store.operation_type === '24H' ? '#32D74B'
                          : store.operation_type === 'EXTENDED' ? '#FF9F0A'
                          : store.operation_type === 'REGULAR' ? '#A2A2A7'
                          : store.operation_type === 'UNKNOWN' ? '#636366' : '#fff';
                        const confColor = store.confidence_level === 'HIGH' ? '#32D74B'
                          : store.confidence_level === 'MEDIUM' ? '#FF9F0A' : '#636366';
                        return (
                          <tr key={store.id}>
                            <td className="td-name">
                              <a href={`/stores/${store.id}`} target="_blank" rel="noopener noreferrer"
                                style={{ color: 'var(--accent-brand)', textDecoration: 'none' }}>
                                {store.name}
                              </a>
                            </td>
                            <td><span className="badge-cat">{store.category}</span></td>
                            <td>
                              <span style={{ color: opColor, fontWeight: 600, fontSize: '12px' }}>
                                {store.operation_type ?? '-'}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: confColor, fontSize: '12px' }}>
                                {store.confidence_level ?? '-'}
                              </span>
                            </td>
                            <td style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                              {store.hours_source ?? '-'}
                            </td>
                            <td className="td-hours" style={{ fontSize: '11px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {store.raw_hours ?? '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {store.google_place_id
                                ? <span style={{ color: '#32D74B', fontSize: '13px' }}>✓</span>
                                : <span style={{ color: '#636366', fontSize: '13px' }}>✗</span>}
                            </td>
                            <td className="td-addr">{store.road_address}</td>
                            <td className="td-date" style={{ fontSize: '11px' }}>
                              {store.last_hours_verified_at
                                ? new Date(store.last_hours_verified_at).toLocaleDateString('ko-KR')
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 페이지네이션 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 0', justifyContent: 'center' }}>
                  <button className="admin-filter-btn" disabled={storesPage <= 1}
                    onClick={() => token && fetchStoresData(token, storesPage - 1, storeSearch, selectedCategory, selectedOpType)}>
                    ← 이전
                  </button>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                    {storesPage} / {Math.ceil(storesTotal / 50)}페이지
                  </span>
                  <button className="admin-filter-btn" disabled={storesPage >= Math.ceil(storesTotal / 50)}
                    onClick={() => token && fetchStoresData(token, storesPage + 1, storeSearch, selectedCategory, selectedOpType)}>
                    다음 →
                  </button>
                </div>
              </div>
            )}

            {/* 정보 수정 제보 */}
            {selectedView === 'reports' && (
              <div className="admin-db-panel">
                <div className="admin-panel-header">
                  <h2 className="admin-panel-title">정보 수정 제보 <span>{reports.length}건</span></h2>
                  <div className="admin-panel-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <button
                        onClick={() => setReportsFilter('all')}
                        style={{ padding: '6px 12px', fontSize: '12px', border: 'none', cursor: 'pointer', background: reportsFilter === 'all' ? 'rgba(10,132,255,0.3)' : 'transparent', color: reportsFilter === 'all' ? '#0A84FF' : 'var(--text-secondary)' }}
                      >전체</button>
                      <button
                        onClick={() => setReportsFilter('hours')}
                        style={{ padding: '6px 12px', fontSize: '12px', border: 'none', cursor: 'pointer', background: reportsFilter === 'hours' ? 'rgba(52,199,89,0.3)' : 'transparent', color: reportsFilter === 'hours' ? '#34C759' : 'var(--text-secondary)' }}
                      >⏱ 시간 제보</button>
                    </div>
                    <button className="admin-refresh-btn" onClick={() => token && fetchReports(token)}>새로고침</button>
                  </div>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>매장명</th>
                        <th>유형</th>
                        <th>내용</th>
                        <th>상태</th>
                        <th>제보일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports
                        .filter(r => reportsFilter === 'hours' ? r.report_type === 'HOURS_SUBMIT' : true)
                        .map(report => (
                        <tr key={report.id} style={report.report_type === 'HOURS_SUBMIT' ? { background: 'rgba(52,199,89,0.06)' } : undefined}>
                          <td className="td-name">{report.stores?.name || 'ID: ' + report.store_id.slice(0,8)}</td>
                          <td><span className="badge-type" style={report.report_type === 'HOURS_SUBMIT' ? { background: 'rgba(52,199,89,0.2)', color: '#34C759' } : undefined}>{report.report_type === 'HOURS_SUBMIT' ? '⏱ 시간제보' : report.report_type}</span></td>
                          <td className="td-comment" style={{ fontSize: '11px', maxWidth: '240px', wordBreak: 'break-all' }}>{report.comment}</td>
                          <td><span className={`badge-status ${report.status}`}>{report.status === 'pending' ? '대기중' : '처리완료'}</span></td>
                          <td className="td-date">{new Date(report.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

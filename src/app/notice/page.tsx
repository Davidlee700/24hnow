'use client';

export default function NoticePage() {
  return (
    <div className="legal-page">
      <div className="legal-page-header">
        <h1>공지사항</h1>
        <p>24시나우의 새로운 소식을 전해드립니다.</p>
      </div>
      <div className="legal-page-body">
        <div className="notice-item">
          <h2>서비스 정식 오픈 안내</h2>
          <span className="notice-date">2026. 04. 28</span>
          <p>안녕하세요, 24시나우입니다. 밤샘 공간을 찾는 모든 분들을 위한 서비스가 정식 오픈되었습니다. 카페, 편의점, 세차장, PC방, 약국 등 다양한 정보를 제공하니 많은 이용 부탁드립니다.</p>
        </div>
      </div>
    </div>
  );
}

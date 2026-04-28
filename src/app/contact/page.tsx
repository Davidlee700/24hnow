'use client';

export default function ContactPage() {
  return (
    <div className="legal-page">
      <div className="legal-page-header">
        <h1>문의하기</h1>
        <p>24시나우에 궁금한 점이 있으신가요?</p>
      </div>
      <div className="legal-page-body">
        <div className="legal-page-section">
          <h2>제휴 및 서비스 문의</h2>
          <p>서비스 제휴, 매장 정보 수정, 오류 제보 등 모든 문의는 아래 이메일로 보내주세요. Max님의 소중한 의견을 바탕으로 더 좋은 서비스를 만들어가겠습니다.</p>
          <p style={{ marginTop: '12px', fontWeight: 600, fontSize: '16px', color: 'var(--accent-neon)' }}>
            contact@24hnow.com
          </p>
        </div>
      </div>
    </div>
  );
}

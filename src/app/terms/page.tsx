'use client';

const TERMS_CONTENT = {
  title: '서비스 이용약관',
  subtitle: '24시나우를 즐겁고 안전하게 이용하기 위한 약속이에요.',
  sections: [
    {
      id: 1,
      title: '1. 서비스의 목적',
      content: '언제 어디서나 필요할 때 쉴 수 있는 24시간 공간 정보를 제공해요. 카페, 편의점, 세차장, PC방, 약국 등 Max님이 필요한 공간을 쉽게 찾을 수 있도록 도와드려요.',
    },
    {
      id: 2,
      title: '2. Max님과의 약속',
      content: '정확한 정보를 드리기 위해 최선을 다할게요. 다만, 매장의 사정으로 영업 시간이 변경될 수 있으니 방문 전 확인해 주시면 좋아요.',
    },
    {
      id: 3,
      title: '3. 지켜주셔야 할 점',
      content: '다른 분들을 위해 허위 정보를 제보하거나 서비스를 악용하는 행동은 삼가 주세요.',
    },
  ],
};

export default function TermsPage() {
  return (
    <div className="legal-page">
      <div className="legal-page-header">
        <h1>{TERMS_CONTENT.title}</h1>
        <p>{TERMS_CONTENT.subtitle}</p>
      </div>
      <div className="legal-page-body">
        {TERMS_CONTENT.sections.map(section => (
          <div key={section.id} className="legal-page-section">
            <h2>{section.title}</h2>
            <p>{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

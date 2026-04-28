'use client';

const PRIVACY_CONTENT = {
  title: '개인정보처리방침',
  subtitle: 'Max님의 소중한 정보를 보호하기 위해 노력하고 있어요.',
  sections: [
    {
      id: 1,
      title: '1. 어떤 정보를 수집하나요?',
      content: 'Max님의 현재 위치 정보와 기기 정보를 수집해요. 주변의 24시 공간을 정확하게 찾아드리기 위함이에요.',
    },
    {
      id: 2,
      title: '2. 수집한 정보는 어떻게 활용되나요?',
      content: 'Max님께 딱 맞는 밤샘 공간을 추천해 드리고, 서비스 사용성을 개선하는 데에만 소중히 사용할게요.',
    },
    {
      id: 3,
      title: '3. 정보는 언제까지 보관하나요?',
      content: 'Max님이 서비스를 이용하시는 동안 안전하게 보관되며, 서비스 탈퇴나 요청 시 지체 없이 파기돼요.',
    },
  ],
};

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-page-header">
        <h1>{PRIVACY_CONTENT.title}</h1>
        <p>{PRIVACY_CONTENT.subtitle}</p>
      </div>
      <div className="legal-page-body">
        {PRIVACY_CONTENT.sections.map(section => (
          <div key={section.id} className="legal-page-section">
            <h2>{section.title}</h2>
            <p>{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

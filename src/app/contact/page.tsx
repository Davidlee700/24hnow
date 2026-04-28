import ContactForm from './ContactForm';

export default function ContactPage() {
  return (
    <div className="legal-page">
      <div className="legal-page-header">
        <h1>문의하기</h1>
        <p>제휴, 오류 제보, 서비스 개선 의견을 보내주시면 소중히 검토하겠습니다.</p>
      </div>
      <div className="legal-page-body">
        <ContactForm />
      </div>
    </div>
  );
}

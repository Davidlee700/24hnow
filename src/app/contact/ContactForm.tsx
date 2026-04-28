'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();
      if (data.success) {
        setIsDone(true);
      } else {
        setError(data.error ?? '전송에 실패했어요. 잠시 후 다시 시도해 주세요.');
      }
    } catch {
      setError('네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <div className="contact-success">
        <div className="contact-success-icon">✓</div>
        <h2>문의가 접수되었어요</h2>
        <p>빠른 시일 내에 입력하신 이메일로 답변 드리겠습니다.<br />소중한 의견 감사드립니다.</p>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="contact-field">
        <label>이름</label>
        <input
          type="text"
          placeholder="홍길동"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          maxLength={20}
        />
      </div>
      <div className="contact-field">
        <label>회신받을 이메일</label>
        <input
          type="email"
          placeholder="example@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="contact-field">
        <label>문의 내용</label>
        <textarea
          placeholder="제휴, 오류 제보, 서비스 개선 의견 등 무엇이든 편하게 적어주세요."
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
          rows={5}
          maxLength={500}
        />
        <span className="contact-char-count">{message.length} / 500</span>
      </div>
      {error && <p className="contact-error">{error}</p>}
      <button
        type="submit"
        className={`contact-submit-btn${isSubmitting ? ' loading' : ''}`}
        disabled={isSubmitting}
      >
        {isSubmitting ? '전송 중...' : '문의 보내기'}
      </button>
    </form>
  );
}

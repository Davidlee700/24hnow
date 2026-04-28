import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface Section {
  id: number;
  title: string;
  content: string;
}

const FALLBACK = {
  title: '개인정보처리방침',
  subtitle: '이용자님의 소중한 정보를 보호하기 위해 노력하고 있어요.',
  body_json: [
    { id: 1, title: '1. 수집하는 개인정보 항목', content: '위치 정보(GPS), 기기 IP(해시), 문의 시 이름·이메일을 수집합니다.' },
  ] as Section[],
};

export default async function PrivacyPage() {
  const { data } = await supabase
    .from('page_content')
    .select('title, subtitle, body_json')
    .eq('slug', 'privacy')
    .single();

  const page = data ?? FALLBACK;
  const sections: Section[] = page.body_json ?? [];

  return (
    <div className="legal-page">
      <div className="legal-page-header">
        <h1>{page.title}</h1>
        <p>{page.subtitle}</p>
      </div>
      <div className="legal-page-body">
        {sections.map(section => (
          <div key={section.id} className="legal-page-section">
            <h2>{section.title}</h2>
            <p style={{ whiteSpace: 'pre-line' }}>{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

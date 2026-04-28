import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface Section {
  id: number;
  title: string;
  content: string;
}

const FALLBACK = {
  title: '서비스 이용약관',
  subtitle: '24시나우를 안전하게 이용하기 위한 약속이에요.',
  body_json: [
    { id: 1, title: '제1조 (목적)', content: '이 약관은 24시나우 서비스의 이용 조건 및 절차를 규정함을 목적으로 합니다.' },
  ] as Section[],
};

export default async function TermsPage() {
  const { data } = await supabase
    .from('page_content')
    .select('title, subtitle, body_json')
    .eq('slug', 'terms')
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

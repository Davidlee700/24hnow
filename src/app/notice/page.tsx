import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface NoticeItem {
  id: number;
  title: string;
  date: string;
  content: string;
}

const FALLBACK = {
  title: '공지사항',
  subtitle: '24시나우의 새로운 소식을 전해드립니다.',
  body_json: [
    {
      id: 1,
      title: '서비스 정식 오픈 안내',
      date: '2026.04.28',
      content: '안녕하세요, 24시나우입니다. 밤샘 공간을 찾는 모든 분들을 위한 서비스가 정식 오픈되었습니다.',
    },
  ] as NoticeItem[],
};

export default async function NoticePage() {
  const { data } = await supabase
    .from('page_content')
    .select('title, subtitle, body_json')
    .eq('slug', 'notice')
    .single();

  const page = data ?? FALLBACK;
  const items: NoticeItem[] = page.body_json ?? [];

  return (
    <div className="legal-page">
      <div className="legal-page-header">
        <h1>{page.title}</h1>
        <p>{page.subtitle}</p>
      </div>
      <div className="legal-page-body">
        {items.map(item => (
          <div key={item.id} className="notice-item">
            <h2>{item.title}</h2>
            <span className="notice-date">{item.date}</span>
            <p style={{ whiteSpace: 'pre-line' }}>{item.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

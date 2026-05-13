import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: '서비스 이용약관 | 24시나우',
  alternates: { canonical: 'https://24now.kr/terms' },
  description: '24시나우 서비스 이용약관을 안내합니다.',
};

interface Section {
  id: number;
  title: string;
  content: string;
}

const FALLBACK = {
  title: '서비스 이용약관',
  subtitle: '24시나우를 안전하게 이용하기 위한 약속입니다.',
  body_json: [
    {
      id: 1,
      title: '제1조 (목적)',
      content: '이 약관은 24시나우(이하 "서비스")가 제공하는 24시간 운영 장소 정보 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.',
    },
    {
      id: 2,
      title: '제2조 (정의)',
      content: '이 약관에서 사용하는 용어의 정의는 다음과 같습니다.\n\n• "서비스"란 24시나우가 제공하는 24시간 운영 장소 검색 및 관련 부가 기능 일체를 말합니다.\n• "이용자"란 서비스에 접속하여 이 약관에 따라 서비스를 이용하는 자를 말합니다.\n• "콘텐츠"란 이용자가 서비스에 등록하는 댓글, 평가, 제보 등 일체의 정보를 말합니다.',
    },
    {
      id: 3,
      title: '제3조 (서비스의 내용)',
      content: '서비스는 다음의 기능을 제공합니다.\n\n• 서울·경기·인천 지역 24시간 운영 카페, 편의점, 셀프세차장 등의 위치 정보 제공\n• 지도 기반 주변 24시간 매장 검색\n• 매장별 이용자 댓글 및 정보 제보 기능\n• 심야 가이드 콘텐츠 제공\n\n서비스의 내용은 운영 정책에 따라 변경될 수 있으며, 변경 시 서비스 내 공지를 통해 사전 안내합니다.',
    },
    {
      id: 4,
      title: '제4조 (이용자의 의무)',
      content: '이용자는 서비스를 이용할 때 다음 사항을 준수해야 합니다.\n\n• 서비스 이용 시 정확한 정보를 제공해야 합니다.\n• 타인의 개인정보, 저작권, 기타 권리를 침해하지 않아야 합니다.\n• 관련 법령 및 이 약관의 규정을 준수해야 합니다.\n• 서비스의 정상적인 운영을 방해하는 행위를 해서는 안 됩니다.',
    },
    {
      id: 5,
      title: '제5조 (금지 행위)',
      content: '이용자는 다음 행위를 해서는 안 됩니다.\n\n• 허위 정보 제보 또는 허위 신고\n• 스팸성 댓글 반복 게시\n• 자동화된 프로그램을 이용한 데이터 크롤링 또는 수집\n• 서비스 데이터의 상업적 무단 이용\n• 타인을 사칭하거나 타인의 정보를 도용하는 행위\n• 서비스 서버나 시스템에 과부하를 유발하는 행위\n• 음란, 폭력적, 혐오적 콘텐츠 게시',
    },
    {
      id: 6,
      title: '제6조 (서비스 이용 제한)',
      content: '서비스는 이용자가 이 약관을 위반하거나 다음에 해당하는 경우, 사전 통보 없이 서비스 이용을 제한하거나 계정을 삭제할 수 있습니다.\n\n• 제5조의 금지 행위를 한 경우\n• 서비스의 정상적인 운영을 방해한 경우\n• 법령 위반 행위를 한 경우\n• 타인의 권리를 침해한 경우',
    },
    {
      id: 7,
      title: '제7조 (면책 조항)',
      content: '서비스는 다음의 사항에 대하여 책임을 지지 않습니다.\n\n• 서비스에 제공된 매장 정보의 정확성, 완전성, 최신성\n  (실제 운영 시간 및 상태는 반드시 직접 확인하시기 바랍니다.)\n• 천재지변, 서버 장애, 인터넷 통신 장애 등 불가항력으로 인한 서비스 중단\n• 이용자 간 또는 이용자와 제3자 간에 발생한 분쟁\n• 이용자가 서비스를 이용하여 얻은 정보로 인해 발생한 손해',
    },
    {
      id: 8,
      title: '제8조 (분쟁 해결 및 관할)',
      content: '이 약관과 서비스 이용에 관한 분쟁은 대한민국 법률을 적용합니다.\n\n서비스 이용과 관련하여 발생한 분쟁에 대해서는 민사소송법상의 관할 법원 또는 서울중앙지방법원을 관할 법원으로 합니다.\n\n분쟁 발생 시 먼저 이메일(contact@24now.kr)로 문의해 주시면 신속히 처리하겠습니다.',
    },
    {
      id: 9,
      title: '제9조 (시행일)',
      content: '이 약관은 2026년 5월 6일부터 시행됩니다.\n\n약관이 변경되는 경우, 변경 내용과 시행일을 서비스 공지사항을 통해 사전 공지합니다. 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하실 수 있습니다.',
    },
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

import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: '개인정보처리방침 | 24시나우',
  description: '24시나우의 개인정보 수집·이용·보호 방침을 안내합니다.',
};

interface Section {
  id: number;
  title: string;
  content: string;
}

const FALLBACK = {
  title: '개인정보처리방침',
  subtitle: '이용자님의 소중한 정보를 보호하기 위해 최선을 다하고 있습니다.',
  body_json: [
    {
      id: 1,
      title: '1. 수집하는 개인정보 항목',
      content: '24시나우는 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.\n\n• 위치 정보(GPS): 주변 24시간 운영 장소 검색 기능 제공\n• IP 주소(해시 처리): 서비스 남용 방지 및 보안\n• 이름·이메일(문의 시): 문의 접수 및 답변 제공\n\n위치 정보는 이용자의 기기에서만 처리되며, 서버에 저장되지 않습니다.',
    },
    {
      id: 2,
      title: '2. 개인정보의 수집 및 이용 목적',
      content: '수집한 개인정보는 다음의 목적을 위해서만 이용합니다.\n\n• 위치 기반 서비스 제공: 현재 위치 주변의 24시간 운영 매장 안내\n• 서비스 품질 개선: 이용 패턴 분석 및 서비스 개선\n• 문의 응대: 이용자 문의 접수 및 답변',
    },
    {
      id: 3,
      title: '3. 개인정보의 보유 및 이용 기간',
      content: '24시나우는 원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 즉시 파기합니다.\n\n• 위치 정보: 서비스 이용 즉시 파기 (서버 미저장)\n• IP 해시: 수집 후 30일\n• 문의 이메일(이름·주소): 문의 처리 완료 후 1년\n\n단, 관계 법령의 규정에 의하여 보존할 필요가 있는 경우 법령에서 정한 기간 동안 보존합니다.',
    },
    {
      id: 4,
      title: '4. 개인정보의 제3자 제공',
      content: '24시나우는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.\n\n다만, 아래의 경우에는 예외로 합니다.\n\n• 이용자가 사전에 동의한 경우\n• 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우',
    },
    {
      id: 5,
      title: '5. 개인정보 처리 위탁',
      content: '24시나우는 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁하고 있습니다.\n\n• 수탁자: Supabase Inc.\n  위탁 업무: 데이터베이스 저장 및 운영\n  보유 기간: 위탁 계약 종료 시까지\n\n• 수탁자: Kakao Corp.\n  위탁 업무: 지도 서비스 SDK, 소셜 로그인\n  보유 기간: 위탁 계약 종료 시까지\n\n위탁 업체들은 위탁받은 업무 범위를 벗어나 개인정보를 이용하거나 제3자에게 제공하지 않습니다.',
    },
    {
      id: 6,
      title: '6. 이용자의 권리 및 행사 방법',
      content: '이용자는 언제든지 다음의 권리를 행사할 수 있습니다.\n\n• 개인정보 열람 요구\n• 오류 정정 요구\n• 삭제 요구\n• 처리 정지 요구\n\n권리 행사는 이메일(contact@24now.kr)로 요청하시면 지체 없이 처리합니다.\n\n이용자가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한 경우, 정정 또는 삭제를 완료할 때까지 해당 개인정보를 이용하거나 제공하지 않습니다.',
    },
    {
      id: 7,
      title: '7. 개인정보 보호책임자',
      content: '24시나우는 개인정보 처리에 관한 업무를 총괄하고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제를 위하여 아래와 같이 개인정보 보호책임자를 지정합니다.\n\n• 개인정보 보호책임자\n  이메일: contact@24now.kr\n  서비스명: 24시나우\n\n이용자는 개인정보 보호와 관련한 모든 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.',
    },
    {
      id: 8,
      title: '8. 개인정보처리방침의 변경',
      content: '이 개인정보처리방침은 2026년 5월 6일부터 적용됩니다.\n\n법령, 정책 또는 보안 기술의 변경에 따라 내용의 추가·삭제 및 수정이 있을 경우, 시행일 7일 전부터 서비스 내 공지사항을 통해 고지합니다.\n\n중요한 변경 사항이 있을 경우에는 더욱 명확한 방법으로 개별 통지합니다.',
    },
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

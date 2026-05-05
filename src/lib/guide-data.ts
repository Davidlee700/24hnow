export type GuideCategory = '카페' | '편의점' | '세차장' | '전체';

export interface StoreEntry {
  rank: number;
  name: string;
  address: string;
  hours: string;
  valueTag: string;   // '몰입', '주차', '사색' 등 가치 중심 소제목
  description: string;
  insight: string;    // 리뷰 기반 인사이트 한 줄
  tags?: string[];
  mapLink?: string;   // 24시나우 딥링크
}

export interface GuidePost {
  slug: string;
  title: string;
  description: string;
  region: string;
  category: GuideCategory;
  date: string;
  readTime: number;
  gradient: string;
  intro: string;
  stores: StoreEntry[];
  outro?: string;
}

// 카테고리별 기본 그라디언트
export const CATEGORY_GRADIENTS: Record<GuideCategory, string> = {
  '카페':    'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  '편의점':  'linear-gradient(135deg, #0d1b2a 0%, #1b4332 50%, #2d6a4f 100%)',
  '세차장':  'linear-gradient(135deg, #0d1b2a 0%, #023e8a 50%, #0077b6 100%)',
  '전체':    'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #111 100%)',
};

export const guidePosts: GuidePost[] = [
  {
    slug: 'paju-night-cafe',
    title: '파주 심야 카페 5곳 — 새벽을 보내기 좋은 공간',
    description: '새벽 2시까지 문을 여는 파주의 카페 5곳. 드라이브 후 들르기 좋은 곳부터 50만 권의 책과 함께하는 공간까지.',
    region: '파주',
    category: '카페',
    date: '2026.05.05',
    readTime: 5,
    gradient: 'linear-gradient(135deg, #0d0d1a 0%, #1a1040 50%, #0f2040 100%)',
    intro:
      '파주는 서울에서 차로 40분 거리에 있지만, 밤이 되면 오히려 더 조용하고 깊어지는 도시입니다. 드라이브 끝에, 혹은 야근 후에 어딘가 앉아 숨을 고르고 싶은 날—파주에서 새벽까지 문을 여는 다섯 곳을 소개합니다. 아래 영업 시간은 수집 시점 기준이며, 방문 전 24시나우 지도에서 최신 정보를 확인하세요.',
    stores: [
      {
        rank: 1,
        name: '커피식구',
        address: '경기도 파주시 금촌동 일대',
        hours: '24시간 (연중무휴)',
        valueTag: '드라이브 · 주차',
        description:
          '파주 금촌에 자리한 파주 유일의 24시간 드라이브 카페. 세차장과 같은 공간을 공유하는 복합 시설로, 차를 세차하고 커피 한 잔을 마시거나 심야 드라이브 후 자연스럽게 들르는 코스로 자리잡았습니다. 파주에서 직접 재배한 딸기만으로 만드는 생딸기우유가 대표 메뉴로, 방문자들 사이에서 "이게 진짜 딸기 맛"이라는 반응이 이어집니다.',
        insight: '새벽 3시, 주차장엔 항상 차가 있다. 파주 드라이버들의 무언의 아지트.',
        tags: ['24시간', '드라이브', '주차 여유', '생딸기우유', '세차 연계'],
        mapLink: 'https://24now.kr',
      },
      {
        rank: 2,
        name: '해례본',
        address: '경기도 파주시 시청로 100',
        hours: '월·화 10:00~00:00 / 수~일 10:00~02:00',
        valueTag: '충전 · 여유',
        description:
          '파주 시청 앞에 위치한 공간감이 넓은 카페. 층고가 높아 탁 트인 느낌을 주고, 테이블 간격이 여유로워 옆 사람의 대화가 들리지 않습니다. 전기차 충전기가 마련되어 있어 충전을 맡겨두고 카페에서 시간을 보내는 방문자도 많습니다. 포르투갈 에그타르트, 바스크 치즈케이크 등 베이커리 구성이 탄탄하며, 유명인 사인이 가득한 공간이기도 합니다.',
        insight: '전기차 충전하면서 바닐라빈라떼 한 잔—파주에서 가장 효율적인 새벽.',
        tags: ['새벽 2시', '전기차 충전', '넓은 공간', '베이커리', '무료주차'],
        mapLink: 'https://24now.kr',
      },
      {
        rank: 3,
        name: '카페 8794',
        address: '경기도 파주시 문산읍 통일로2010번길 36 1층',
        hours: '매일 11:00~02:00 / 라스트오더 01:30 (연중무휴)',
        valueTag: '몰입 · 분위기',
        description:
          '87년생과 94년생 부부가 함께 문을 연 카페. 숫자 이름에 이미 이야기가 있습니다. 창고를 개조한 넓은 공간에 오토바이와 빈티지 소품이 가득하며, 보드게임도 빌릴 수 있어 시간을 잊기 쉽습니다. 차 모임과 바이크 모임이 즐겨 찾는 곳으로, 자정이 넘어도 주차장이 비지 않습니다. 시그니처 밀크티와 핸드드립 커피가 인기 메뉴.',
        insight: '새벽 1시의 문산. 오토바이 소리와 밀크티—의외로 잘 어울립니다.',
        tags: ['새벽 2시', '창고형', '빈티지', '보드게임', '차 모임', '연중무휴'],
        mapLink: 'https://24now.kr',
      },
      {
        rank: 4,
        name: '바리루스',
        address: '경기도 파주시 파주읍 봉서산로 245 2층',
        hours: '평일 10:00~21:00 / 금·토·일·공휴일 10:00~02:00',
        valueTag: '일탈 · 테라스',
        description:
          '입구부터 석양과 호수를 연상시키는 미디어아트가 맞이하는 공간. 직접 로스팅한 원두를 사용하며, 야외 테라스에 텐트를 설치해 자연 속 커피 경험을 제공합니다(텐트 이용료 3,000원). 피자·파스타·필라프 등 브런치 메뉴도 갖추고 있어 밤새 배를 채우기에 충분합니다. 주말 심야에 방문하는 것이 가장 빛나는 선택.',
        insight: '텐트 안에서 핸드드립 커피를 마시는 밤—파주에서만 가능한 경험.',
        tags: ['주말 새벽 2시', '야외 테라스', '자체 로스팅', '브런치', '미디어아트'],
        mapLink: 'https://24now.kr',
      },
      {
        rank: 5,
        name: '지혜의 숲 3관',
        address: '경기도 파주시 회동길 145 아시아출판문화정보센터',
        hours: '3관 24시간 개방 / 내부 카페 10:00~22:00',
        valueTag: '사색 · 고독',
        description:
          '50만 권의 책이 높이 8m 서가를 가득 채운 공간. 3관은 연중 24시간 개방되어 있어 새벽에도 자유롭게 입장할 수 있습니다. 내부 카페의 영업은 오후 10시에 마감하지만, 공간 자체는 밤새 열려 있어 콘센트와 무선인터넷을 이용하며 작업이나 독서를 이어갈 수 있습니다. 카페 음료를 들고 서가 사이를 걷는 경험은 파주에서만 할 수 있는 것.',
        insight: '새벽 3시, 책 사이에 혼자 앉아 있으면—소음 없이 생각이 선명해집니다.',
        tags: ['24시간 공간', '도서관', '카페', '콘센트', '와이파이', '무료입장'],
        mapLink: 'https://24now.kr',
      },
    ],
    outro:
      '위 정보는 2026년 5월 기준으로 수집된 데이터입니다. 운영 시간은 사전 공지 없이 변경될 수 있으므로, 방문 전 24시나우 지도에서 최신 정보를 확인하시길 권장합니다.',
  },
];

export function getAllPosts(): GuidePost[] {
  return [...guidePosts].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): GuidePost | undefined {
  return guidePosts.find(p => p.slug === slug);
}

export function getRelatedPosts(current: GuidePost, limit = 2): GuidePost[] {
  return guidePosts
    .filter(p => p.slug !== current.slug)
    .sort((a, b) => {
      const score = (p: GuidePost) =>
        (p.region === current.region ? 2 : 0) + (p.category === current.category ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, limit);
}

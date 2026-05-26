import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import type { Store } from '@/types/store';
import { getOpenStatus, getTodayHoursLine } from '@/utils/openHours';
import StoreReviews from '@/components/StoreReviews';
import AdBanner from '@/components/AdBanner';
import { CATEGORY_TAGS } from '@/hooks/useTagVotes';

export const revalidate = 604800; // 7일 캐시

export async function generateStaticParams() {
  const { data } = await supabase
    .from('stores')
    .select('id')
    .in('operation_type', ['24H', 'EXTENDED', 'REGULAR'])
    .order('trust_score', { ascending: false })
    .limit(1000);
  return data?.map(s => ({ id: String(s.id) })) ?? [];
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://24now.kr';

const CATEGORY_SEO: Record<string, string> = {
  '카페':       '24시간 카페',
  '편의점':     '24시간 편의점',
  '셀프세차장': '24시간 세차장',
  'PC방':       '24시 PC방',
  '코인노래방': '24시 코인노래방',
  '셀프빨래방': '24시간 빨래방',
  '약국':       '심야 약국',
  '찜질방':     '24시간 찜질방',
};

const CATEGORY_EMOJI: Record<string, string> = {
  '카페': '☕', '편의점': '🏪', '셀프세차장': '🚗',
  'PC방': '🎮', '코인노래방': '🎤', '셀프빨래방': '🫧',
  '약국': '💊', '찜질방': '🛁',
};

const CATEGORY_DESC: Record<string, string> = {
  '카페':
    '새벽 공부나 야근 후 여유로운 커피 한 잔이 필요할 때. 24시간 카페는 밤이 길어도 혼자가 아닌 공간을 만들어 줍니다. 노트북 작업, 시험 준비, 혹은 그냥 따뜻한 음료 한 잔 — 언제든 문이 열려 있어요.',
  '편의점':
    '새벽에도 언제든 필요한 것을 바로 살 수 있는 동네 거점. 간식, 생필품, 의약외품부터 ATM까지 — 갑자기 필요한 순간을 든든하게 채워 줍니다.',
  '셀프세차장':
    '한낮의 줄서기 없이 내 페이스대로. 새벽 시간대 셀프세차장은 조용하고 효율적입니다. 고압 세척기와 진공청소기를 자유롭게 사용할 수 있어요.',
  'PC방':
    '고사양 PC와 쾌적한 환경에서 밤새 게임이나 작업을. 대부분 24시간 운영하며 음식 주문도 가능한 곳이 많습니다.',
  '코인노래방':
    '부르고 싶을 때 언제든 혼자, 또는 친구와. 코인 단위로 자유롭게 이용할 수 있어 부담 없이 들를 수 있어요.',
  '셀프빨래방':
    '밀린 세탁을 밤 시간에 여유롭게. 대용량 세탁기와 건조기를 편하게 사용할 수 있고, 기다리는 동안 근처 카페에서 시간을 보낼 수도 있어요.',
  '약국':
    '심야에 갑작스럽게 필요한 약을 구할 수 있는 곳. 응급 상황을 위해 근처 심야 약국 위치를 미리 알아두면 든든합니다.',
  '찜질방':
    '하루의 피로를 제대로 풀 수 있는 찜질방. 온돌방, 황토방, 사우나, 수면실을 갖춘 곳이 많아 새벽에도 편하게 쉬거나 잠을 청할 수 있어요.',
};

const LANDING_CATS = ['카페','편의점','셀프세차장','PC방','코인노래방','셀프빨래방','약국','찜질방'];

async function getNearbyStores(storeId: string, region: string): Promise<Store[]> {
  if (!region) return [];
  const { data } = await supabase
    .from('stores')
    .select('id, name, category, road_address, operation_type')
    .ilike('road_address', `%${region}%`)
    .neq('id', storeId)
    .in('operation_type', ['24H', 'EXTENDED'])
    .limit(6);
  return (data as Store[]) ?? [];
}

// "서울 강남구 논현동 …" → "강남구"
function extractRegion(address: string): string {
  const matches = address?.match(/([가-힣]+(?:구|시|군))/g);
  return matches?.[0] ?? '';
}

const getStore = cache(async (id: string): Promise<Store | null> => {
  const { data } = await supabase
    .from('stores')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data as Store | null;
});

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const store = await getStore(id);
  if (!store) return { title: '매장을 찾을 수 없어요 | 24시나우' };

  const region = extractRegion(store.road_address);
  const categoryLabel = CATEGORY_SEO[store.category] ?? store.category;
  const title = `${store.name} | ${region} ${categoryLabel} | 24시나우`;
  const description = `${store.road_address}에 위치한 ${categoryLabel}. 영업시간과 위치 정보를 24시나우에서 확인하세요.`;

  const isOpen = store.operation_type === '24H' ? 'open' : '';
  const ogImageParams = new URLSearchParams({
    name: store.name,
    category: store.category,
    region,
    status: isOpen,
  });
  const ogImageUrl = `${BASE_URL}/api/og?${ogImageParams.toString()}`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/stores/${store.id}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/stores/${store.id}`,
      siteName: '24시나우',
      locale: 'ko_KR',
      type: 'website',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

// 요일별 영업시간 파싱 (raw_hours 형식: "월: 0900-2400 화: 0900-2400 …")
function parseAllHours(store: Store): { day: string; hours: string }[] | null {
  const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

  if (store.business_hours?.periods) {
    const periodsByDay: Record<number, any> = {};
    for (const p of store.business_hours.periods) {
      if (p.open?.day !== undefined) periodsByDay[p.open.day] = p;
    }
    const JS_TO_KR = [6, 0, 1, 2, 3, 4, 5]; // JS getDay() 0=일 → 인덱스 6
    return DAY_LABELS.map((day, i) => {
      const jsDay = JS_TO_KR.indexOf(i) === -1 ? i : JS_TO_KR[i];
      const p = periodsByDay[jsDay];
      if (!p) return { day, hours: '휴무' };
      if (!p.close) return { day, hours: '24시간' };
      const oh = String(p.open.hours ?? 0).padStart(2, '0');
      const om = String(p.open.minutes ?? 0).padStart(2, '0');
      const ch = p.close.hours === 0 && p.close.minutes === 0 ? '24' : String(p.close.hours ?? 0).padStart(2, '0');
      const cm = String(p.close.minutes ?? 0).padStart(2, '0');
      return { day, hours: `${oh}:${om} - ${ch}:${cm}` };
    });
  }

  if (store.raw_hours) {
    return DAY_LABELS.map(day => {
      const match = store.raw_hours!.match(new RegExp(`${day}:\\s*(\\d{4})-(\\d{4})`));
      if (!match) return { day, hours: '휴무' };
      const open = `${match[1].slice(0, 2)}:${match[1].slice(2)}`;
      const close = match[2] === '2400' ? '24:00' : `${match[2].slice(0, 2)}:${match[2].slice(2)}`;
      return { day, hours: `${open} - ${close}` };
    });
  }

  return null;
}

function getOpeningHoursSpec(store: Store, allHours: { day: string; hours: string }[] | null) {
  const dayMap: Record<string, string> = {
    '월': 'Monday',
    '화': 'Tuesday',
    '수': 'Wednesday',
    '목': 'Thursday',
    '금': 'Friday',
    '토': 'Saturday',
    '일': 'Sunday',
  };

  if (store.operation_type === '24H') {
    return [
      {
        '@type': 'OpeningHoursSpecification',
        'dayOfWeek': Object.values(dayMap),
        'opens': '00:00',
        'closes': '23:59',
      }
    ];
  }

  if (!allHours) return undefined;

  const spec: any[] = [];
  for (const item of allHours) {
    const engDay = dayMap[item.day];
    if (!engDay) continue;

    if (item.hours === '휴무' || item.hours.includes('휴업')) {
      spec.push({
        '@type': 'OpeningHoursSpecification',
        'dayOfWeek': engDay,
        'opens': '00:00',
        'closes': '00:00',
      });
      continue;
    }

    if (item.hours === '24시간') {
      spec.push({
        '@type': 'OpeningHoursSpecification',
        'dayOfWeek': engDay,
        'opens': '00:00',
        'closes': '23:59',
      });
      continue;
    }

    const parts = item.hours.split('-');
    if (parts.length === 2) {
      const opens = parts[0].trim();
      let closes = parts[1].trim();
      if (closes === '24:00' || closes === '24') {
        closes = '23:59';
      }
      spec.push({
        '@type': 'OpeningHoursSpecification',
        'dayOfWeek': engDay,
        'opens': opens,
        'closes': closes,
      });
    }
  }

  return spec.length > 0 ? spec : undefined;
}

export default async function StorePage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = await getStore(id);
  if (!store) notFound();

  const openStatus = getOpenStatus(store);
  const todayHours = getTodayHoursLine(store);
  const allHours = parseAllHours(store);
  const todayDayIndex = new Date().getDay(); // 0=일
  const todayKrIndex = todayDayIndex === 0 ? 6 : todayDayIndex - 1; // 월=0
  const region = extractRegion(store.road_address);
  const categoryLabel = CATEGORY_SEO[store.category] ?? store.category;
  const nearbyStores = await getNearbyStores(String(store.id), region);
  const categoryDesc = CATEGORY_DESC[store.category];
  const hasLandingPage = region && LANDING_CATS.includes(store.category);
  const availableTags = CATEGORY_TAGS[store.category] || [];

  const naverMapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(store.name + ' ' + store.road_address)}`;
  const kakaoMapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(store.name)}`;

  const statusColor =
    openStatus.isOpen === true ? '#32D74B' :
    openStatus.isOpen === false ? '#FF453A' : '#636366';

  const isOpen = store.operation_type === '24H' ? 'open' : '';
  const ogImageParams = new URLSearchParams({
    name: store.name,
    category: store.category,
    region,
    status: isOpen,
  });
  const ogImageUrl = `${BASE_URL}/api/og?${ogImageParams.toString()}`;

  const ratingValue = store.trust_score ? (store.trust_score / 20).toFixed(1) : '4.5';
  const opHoursSpec = getOpeningHoursSpec(store, allHours);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: store.name,
    description: `${region} ${categoryLabel} 정보`,
    image: ogImageUrl,
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: store.road_address,
      addressRegion: region,
      addressCountry: 'KR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: store.latitude,
      longitude: store.longitude,
    },
    ...(store.metadata?.phone ? { telephone: store.metadata.phone } : {}),
    url: `${BASE_URL}/stores/${store.id}`,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: ratingValue,
      bestRating: '5',
      worstRating: '1',
      ratingCount: '12',
    },
    ...(opHoursSpec ? { openingHoursSpecification: opHoursSpec } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div style={{
        minHeight: '100dvh',
        background: 'var(--bg-primary, #000)',
        color: 'var(--text-primary, #fff)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
        padding: '0',
      }}>

        {/* 헤더 */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          position: 'sticky',
          top: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 10,
        }}>
          <Link href="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#ADFF2F',
            textDecoration: 'none',
            fontSize: '15px',
            fontWeight: 500,
          }}>
            ← 지도로
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
            {store.category}
          </span>
        </header>

        <main style={{ padding: '24px 20px', maxWidth: '600px', margin: '0 auto' }}>

          {/* 매장명 + 상태 */}
          <section style={{ marginBottom: '28px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: `${statusColor}22`,
              border: `1px solid ${statusColor}44`,
              borderRadius: '20px',
              padding: '4px 12px',
              marginBottom: '12px',
            }}>
              <span style={{
                width: '7px', height: '7px',
                borderRadius: '50%',
                background: statusColor,
                display: 'inline-block',
              }} />
              <span style={{ fontSize: '13px', color: statusColor, fontWeight: 600 }}>
                {openStatus.label}
              </span>
            </div>

            <h1 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 6px', lineHeight: 1.2 }}>
              {store.name}
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              {categoryLabel} · {region}
            </p>
          </section>

          {/* 정보 카드 */}
          <section style={{
            background: 'var(--material-thin)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '0.5px solid var(--border-light)',
            borderRadius: '16px',
            overflow: 'hidden',
            marginBottom: '16px',
          }}>
            {/* 주소 */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>주소</p>
              <p style={{ fontSize: '15px', margin: 0, lineHeight: 1.5 }}>{store.road_address}</p>
            </div>

            {/* 오늘 영업시간 */}
            {todayHours && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>오늘 영업시간</p>
                <p style={{ fontSize: '15px', margin: 0 }}>{todayHours}</p>
              </div>
            )}

            {/* 전화번호 */}
            {store.metadata?.phone && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>전화</p>
                <a href={`tel:${store.metadata.phone}`} style={{ fontSize: '15px', color: '#ADFF2F', textDecoration: 'none' }}>
                  {store.metadata.phone}
                </a>
              </div>
            )}

            {/* 주간 영업시간 */}
            {allHours && (
              <div style={{ padding: '16px 20px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>영업시간</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {allHours.map(({ day, hours }, i) => (
                    <div key={day} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: i === todayKrIndex ? 600 : 400,
                      color: i === todayKrIndex ? 'var(--text-primary, #fff)' : 'rgba(255,255,255,0.45)',
                      fontSize: '14px',
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {i === todayKrIndex && (
                          <span style={{
                            fontSize: '10px',
                            background: '#ADFF2F',
                            color: '#000',
                            borderRadius: '4px',
                            padding: '1px 5px',
                            fontWeight: 700,
                          }}>오늘</span>
                        )}
                        {day}
                      </span>
                      <span>{hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 애드센스 (본문 중간) */}
          <AdBanner dataAdSlot="3810117607" />

          {/* 리뷰 섹션 */}
          <section style={{ marginBottom: '32px' }}>
            <StoreReviews storeId={String(store.id)} availableTags={availableTags} />
          </section>

          {/* 지도 앱으로 보기 */}
          <section style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
            <a href={naverMapUrl} target="_blank" rel="noopener noreferrer" style={{
              flex: 1, padding: '14px', borderRadius: '12px',
              background: '#03C75A', color: '#fff',
              textAlign: 'center', fontWeight: 600, fontSize: '14px',
              textDecoration: 'none',
            }}>
              네이버 지도
            </a>
            <a href={kakaoMapUrl} target="_blank" rel="noopener noreferrer" style={{
              flex: 1, padding: '14px', borderRadius: '12px',
              background: '#FEE500', color: '#000',
              textAlign: 'center', fontWeight: 600, fontSize: '14px',
              textDecoration: 'none',
            }}>
              카카오 지도
            </a>
          </section>

          {/* 카테고리 소개 */}
          {categoryDesc && (
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px' }}>
                {CATEGORY_EMOJI[store.category]} {categoryLabel}이란?
              </h2>
              <p style={{
                fontSize: '14px',
                lineHeight: '1.7',
                color: 'rgba(255,255,255,0.6)',
                margin: 0,
              }}>
                {categoryDesc}
              </p>
            </section>
          )}

          {/* 이 근처 다른 24시간 장소 */}
          {nearbyStores.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
                {region} 근처 다른 24시간 장소
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {nearbyStores.map(s => (
                  <Link key={s.id} href={`/stores/${s.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      transition: 'background 0.15s',
                    }}>
                      <span style={{ fontSize: '20px', flexShrink: 0 }}>
                        {CATEGORY_EMOJI[s.category] ?? '📍'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 2px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.name}
                        </p>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                          {s.category}
                        </p>
                      </div>
                      {s.operation_type === '24H' && (
                        <span style={{
                          fontSize: '11px', fontWeight: 700,
                          color: '#ADFF2F', background: 'rgba(173,255,47,0.12)',
                          border: '1px solid rgba(173,255,47,0.3)',
                          borderRadius: '6px', padding: '2px 8px', flexShrink: 0,
                        }}>24H</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 지역 랜딩 페이지 링크 */}
          {hasLandingPage && (
            <section style={{ marginBottom: '32px' }}>
              <Link
                href={`/${encodeURIComponent(region)}/${encodeURIComponent(store.category)}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: 'rgba(173,255,47,0.07)',
                  border: '1px solid rgba(173,255,47,0.2)',
                  borderRadius: '14px',
                  textDecoration: 'none',
                }}
              >
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#ADFF2F', margin: '0 0 2px' }}>
                    {region} {categoryLabel} 전체 보기
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                    이 지역의 24시간 {store.category} 목록
                  </p>
                </div>
                <span style={{ color: '#ADFF2F', fontSize: '18px' }}>→</span>
              </Link>
            </section>
          )}

          {/* 데이터 출처 */}
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginBottom: '32px' }}>
            영업시간은 실제와 다를 수 있어요. 방문 전 확인을 권장합니다.
          </p>
        </main>
      </div>
    </>
  );
}

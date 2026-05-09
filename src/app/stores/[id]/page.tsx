import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Store } from '@/types/store';
import { getOpenStatus, getTodayHoursLine } from '@/utils/openHours';

export const revalidate = 86400; // 24시간 캐시

export async function generateStaticParams() {
  const { data } = await supabase
    .from('stores')
    .select('id')
    .in('operation_type', ['24H', 'EXTENDED'])
    .order('trust_score', { ascending: false })
    .limit(5000);
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
};

// "서울 강남구 논현동 …" → "강남구"
function extractRegion(address: string): string {
  const matches = address?.match(/([가-힣]+(?:구|시|군))/g);
  return matches?.[0] ?? '';
}

async function getStore(id: string): Promise<Store | null> {
  const { data } = await supabase
    .from('stores')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data as Store | null;
}

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

  const naverMapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(store.name + ' ' + store.road_address)}`;
  const kakaoMapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(store.name)}`;

  const statusColor =
    openStatus.isOpen === true ? '#32D74B' :
    openStatus.isOpen === false ? '#FF453A' : '#636366';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: store.name,
    description: `${region} ${categoryLabel}`,
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
    ...(store.operation_type === '24H' ? { openingHours: 'Mo,Tu,We,Th,Fr,Sa,Su 00:00-24:00' } : {}),
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
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
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

          {/* 데이터 출처 */}
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginBottom: '32px' }}>
            영업시간은 실제와 다를 수 있어요. 방문 전 확인을 권장합니다.
          </p>
        </main>
      </div>
    </>
  );
}

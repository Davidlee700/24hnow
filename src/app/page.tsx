import { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import HomeClient from '@/components/HomeClient';
import { CATEGORY_TAGS } from '@/hooks/useTagVotes';
import { getAllPosts } from '@/lib/guide-data';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://24now.kr';

const SEO_REGIONS = [
  { slug: '강남구', name: '서울 강남구' },
  { slug: '마포구', name: '서울 마포구' },
  { slug: '송파구', name: '서울 송파구' },
  { slug: '서초구', name: '서울 서초구' },
  { slug: '영등포구', name: '서울 영등포구' },
  { slug: '종로구', name: '서울 종로구' },
  { slug: '용산구', name: '서울 용산구' },
  { slug: '관악구', name: '서울 관악구' },
  { slug: '성남시', name: '경기 성남시 분당구' },
  { slug: '고양시', name: '경기 고양시 일산' },
  { slug: '수원시', name: '경기 수원시' },
  { slug: '부평구', name: '인천 부평구' },
  { slug: '남동구', name: '인천 남동구' },
];

const SEO_CATEGORIES = [
  { name: '카페', keyword: '24시간 카페' },
  { name: '편의점', keyword: '24시간 편의점' },
  { name: '셀프세차장', keyword: '24시 셀프세차장' },
  { name: 'PC방', keyword: '24시 PC방' },
  { name: '약국', keyword: '심야 약국' },
];

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function extractRegion(address?: string): string {
  if (!address) return '내 주변';
  const parts = address.split(' ');
  const guPart = parts.find(p => p.endsWith('구'));
  if (guPart) return guPart;
  const siPart = parts.find(p => p.endsWith('시'));
  if (siPart) return siPart;
  const dongPart = parts.find(p => p.endsWith('동') || p.endsWith('읍') || p.endsWith('면'));
  if (dongPart) return dongPart;
  return parts[1] || '내 주변';
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const storeId = searchParams.store as string | undefined;

  if (!storeId) {
    return {
      title: '24시나우 | 내 주변 24시간 카페, 세차장, 약국 찾기',
      description: '지금 내 주변에서 열려 있는 24시 카페·편의점·세차장·약국을 지도에서 바로 찾아보세요. 새벽에도, 휴일에도 — 24시나우.',
      alternates: { canonical: BASE_URL },
      openGraph: {
        title: '24시나우 | 내 주변 24시간 카페, 세차장, 약국 찾기',
        description: '지금 내 주변에서 열려 있는 24시 카페·편의점·세차장·약국을 지도에서 바로 찾아보세요. 새벽에도, 휴일에도 — 24시나우.',
        images: ['/og-image.png'],
      },
    };
  }

  try {
    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (store) {
      const region = extractRegion(store.road_address);
      const title = `${store.name} | ${region} 24시 ${store.category} - 24시나우`;

      const tags = CATEGORY_TAGS[store.category] || [];
      const tag1 = tags[0] || '심야 운영';
      const tag2 = tags[1] || '24시간 운영';
      const description = `${tag1}, ${tag2}. 지금 바로 이용 가능한 ${region} 24시간 ${store.category} 정보를 확인하세요.`;

      const isOpen = store.operation_type === '24H' ? 'open' : '';
      const ogParams = new URLSearchParams({ name: store.name, category: store.category, region, status: isOpen });
      const ogImageUrl = `${BASE_URL}/api/og?${ogParams.toString()}`;

      return {
        title,
        description,
        openGraph: {
          title,
          description,
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
  } catch (err) {
    if (process.env.NODE_ENV === 'development') console.error('Failed to generate dynamic metadata:', err);
  }

  return {
    title: '24시나우 | 내 주변 24시간 카페, 세차장, 약국 찾기',
    description: '서울, 경기, 인천 전 지역의 24시 운영 장소를 한눈에. 밤샘러를 위한 가장 정확한 지도, 24시나우.',
  };
}

export default async function Page(props: Props) {
  const searchParams = await props.searchParams;
  const storeId = searchParams.store as string | undefined;
  let storeData = null;

  if (storeId) {
    const { data } = await supabase.from('stores').select('*').eq('id', storeId).single();
    storeData = data;
  }

  const guides = getAllPosts();

  return (
    <>
      <HomeClient />
      
      {storeData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "name": storeData.name,
              "address": {
                "@type": "PostalAddress",
                "streetAddress": storeData.road_address,
                "addressCountry": "KR"
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": storeData.latitude,
                "longitude": storeData.longitude
              },
              "url": `${BASE_URL}/?store=${storeData.id}`,
            }),
          }}
        />
      )}

      {/* SEO를 위한 크롤러용 footer 영역 (지도의 레이아웃을 깨뜨리지 않고 크롤러가 읽어갈 수 있도록 마크업 배치) */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        backgroundColor: '#121212',
        color: '#8e8e93',
        padding: '60px 20px',
        fontSize: '13px',
        lineHeight: '1.6',
        borderTop: '1px solid #2c2c2e',
        marginTop: '100vh',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h3 style={{ color: '#ffffff', fontSize: '15px', marginBottom: '15px', fontWeight: '600' }}>
            24시나우 - 내 주변 24시간 매장 지도 및 가이드
          </h3>
          <p style={{ marginBottom: '30px' }}>
            지금 내 주변에서 열려 있는 24시 카페, 24시간 편의점, 24시 셀프세차장, 심야 약국, 24시간 찜질방, 코인노래방 등을 위치 기반 지도로 바로 확인할 수 있는 서비스입니다.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px', marginBottom: '40px' }}>
            {/* 1. 지역별 24시 장소 링크 */}
            <div>
              <h4 style={{ color: '#e5e5ea', fontSize: '14px', marginBottom: '15px', fontWeight: '600' }}>인기 지역별 24시 바로가기</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {SEO_REGIONS.flatMap(region =>
                  SEO_CATEGORIES.map(cat => (
                    <Link 
                      key={`${region.slug}-${cat.name}`} 
                      href={`/${encodeURIComponent(region.slug)}/${encodeURIComponent(cat.name)}`}
                      style={{ color: '#8e8e93', textDecoration: 'none', backgroundColor: '#1c1c1e', padding: '5px 9px', borderRadius: '4px', fontSize: '11px', display: 'inline-block' }}
                    >
                      {region.name} {cat.name}
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* 2. 심야 가이드 리스트 */}
            <div>
              <h4 style={{ color: '#e5e5ea', fontSize: '14px', marginBottom: '15px', fontWeight: '600' }}>밤샘족을 위한 심야 가이드</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {guides.map(guide => (
                  <li key={guide.slug}>
                    <Link 
                      href={`/guide/${guide.slug}`}
                      style={{ color: '#8e8e93', textDecoration: 'none', fontSize: '12px', display: 'block' }}
                    >
                      📍 {guide.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #2c2c2e', paddingTop: '20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
            <div>
              <Link href="/notice" style={{ color: '#8e8e93', marginRight: '15px', textDecoration: 'none' }}>공지사항</Link>
              <Link href="/terms" style={{ color: '#8e8e93', marginRight: '15px', textDecoration: 'none' }}>이용약관</Link>
              <Link href="/privacy" style={{ color: '#8e8e93', textDecoration: 'none' }}>개인정보처리방침</Link>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#636366' }}>© {new Date().getFullYear()} 24시나우. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}

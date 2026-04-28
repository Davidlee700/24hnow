import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import HomeClient from '@/components/HomeClient';
import { CATEGORY_TAGS } from '@/hooks/useTagVotes';

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
      description: '서울, 경기, 인천 전 지역의 24시 운영 장소를 한눈에. 밤샘러를 위한 가장 정확한 지도, 24시나우.',
      openGraph: {
        title: '24시나우 | 내 주변 24시간 카페, 세차장, 약국 찾기',
        description: '서울, 경기, 인천 전 지역의 24시 운영 장소를 한눈에. 밤샘러를 위한 가장 정확한 지도, 24시나우.',
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

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          images: ['/og-image.png'],
        },
      };
    }
  } catch (err) {
    console.error('Failed to generate dynamic metadata:', err);
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
              "url": `https://24hnow.vercel.app/?store=${storeData.id}`,
            }),
          }}
        />
      )}
    </>
  );
}

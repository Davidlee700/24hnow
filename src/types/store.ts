export interface Store {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  trust_score: number;
  road_address: string;
  last_verified_at: string;
  metadata: {
    phone?: string;
    place_url?: string;
    naver_place_url?: string;
    kakao_category_full?: string;
    source?: 'kakao_api' | 'naver_api';
    kakao_id?: string;
  };
}

export interface MapBounds {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
}

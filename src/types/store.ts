export interface Store {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  trust_score: number;
  road_address: string;
  last_verified_at: string;
  tags?: string[];
  class_type?: 'A' | 'B' | 'C' | 'UNKNOWN';
  raw_hours?: string;
  inference_note?: string;
  metadata: {
    phone?: string;
    place_url?: string;
    naver_place_url?: string;
    kakao_category_full?: string;
    source?: string;
    kakao_id?: string;
  };
}

export interface MapBounds {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
}

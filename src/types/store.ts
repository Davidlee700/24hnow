export type OperationType = '24H' | 'EXTENDED' | 'REGULAR' | 'UNKNOWN';
export type HoursSource = 'KAKAO' | 'NAVER' | 'GOOGLE' | 'KAKAO+NAVER' | 'KAKAO+GOOGLE' | 'NAVER+GOOGLE' | 'ALL' | 'CROWD';

export interface BusinessHoursPeriod {
  open: { day: number; hours: number; minutes: number };
  close?: { day?: number; hours: number; minutes: number };
}

export interface BusinessHours {
  periods: BusinessHoursPeriod[];
  weekdayDescriptions?: string[];
}

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
  confidence_level?: 'HIGH' | 'MEDIUM' | 'LOW';
  business_hours?: BusinessHours;
  google_place_id?: string;
  verification_source?: string;
  operation_type?: OperationType;
  hours_source?: HoursSource;
  last_hours_verified_at?: string;
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

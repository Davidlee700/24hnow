import type { OperationType, HoursSource } from '@/types/store';

// 카테고리별 "일반 영업 마감 기준" (분 단위). 이보다 늦으면 EXTENDED.
const EXTENDED_THRESHOLD_BY_CATEGORY: Record<string, number> = {
  '카페':       21 * 60,  // 21:00 이후면 EXTENDED
  '음식점':     21 * 60,
  '편의점':     22 * 60,
  '코인노래방': 22 * 60,  // 노래방은 자정까지 기본, 그 이후면 EXTENDED
  'PC방':       22 * 60,
  '약국':       20 * 60,  // 약국은 20시 이후 영업이면 심야로 분류
  '셀프빨래방': 22 * 60,  // 무인 특성상 늦게까지 가능
  '셀프세차장': 22 * 60,
};
const DEFAULT_EXTENDED_THRESHOLD = 21 * 60; // 미분류 카테고리 기본값

function hhmm2min(hhmm: string): number {
  const h = parseInt(hhmm.slice(0, 2), 10);
  const m = parseInt(hhmm.slice(2, 4), 10);
  return h * 60 + m;
}

// raw_hours 문자열에서 최대 마감 시각(분)을 구한다
function maxCloseMinFromRaw(rawHours: string): number | null {
  // 패턴: "월: 0900-2400" or "월~일: 0000-2400"
  const matches = rawHours.matchAll(/\d{4}-(\d{4})/g);
  let max = -1;
  for (const m of matches) {
    let min = hhmm2min(m[1]);
    if (m[1] === '2400') min = 1440;
    if (min > max) max = min;
  }
  return max >= 0 ? max : null;
}

// Google Places business_hours에서 최대 마감 시각(분)을 구한다
function maxCloseMinFromGoogle(businessHours: any): number | null {
  if (!businessHours?.periods) return null;
  let max = -1;
  for (const period of businessHours.periods) {
    if (!period.close) return 1440; // 24시간 영업 신호
    const min = (period.close.hours ?? 0) * 60 + (period.close.minutes ?? 0);
    const normalized = min === 0 ? 1440 : min;
    if (normalized > max) max = normalized;
  }
  return max >= 0 ? max : null;
}

function classifyOperation(maxCloseMin: number, category: string): OperationType {
  if (maxCloseMin >= 1440) return '24H';
  const threshold = EXTENDED_THRESHOLD_BY_CATEGORY[category] ?? DEFAULT_EXTENDED_THRESHOLD;
  return maxCloseMin > threshold ? 'EXTENDED' : 'REGULAR';
}

// raw_hours 문자열이 충분히 일치하는지 비교 (정확히 같을 필요는 없음)
// 최대 마감 시각 ±30분 이내이면 "일치"로 본다
function hoursRoughlyMatch(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return false;
  return Math.abs(a - b) <= 30;
}

export interface VerificationResult {
  canonical_hours: string | null;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  hours_source: HoursSource | null;
  operation_type: OperationType;
  inference_note?: string;
}

export function crossVerifyHours(params: {
  kakaoHours?: string | null;
  naverHours?: string | null;
  googleHours?: any;
  category?: string;
}): VerificationResult {
  const { kakaoHours, naverHours, googleHours, category = '' } = params;

  const kakaoMax = kakaoHours ? maxCloseMinFromRaw(kakaoHours) : null;
  const naverMax = naverHours ? maxCloseMinFromRaw(naverHours) : null;
  const googleMax = googleHours ? maxCloseMinFromGoogle(googleHours) : null;

  const available = [
    kakaoMax !== null ? 'KAKAO' : null,
    naverMax !== null ? 'NAVER' : null,
    googleMax !== null ? 'GOOGLE' : null,
  ].filter(Boolean) as string[];

  if (available.length === 0) {
    return {
      canonical_hours: null,
      confidence_level: 'LOW',
      hours_source: null,
      operation_type: 'UNKNOWN',
    };
  }

  // 최종 채택할 canonical_hours 결정 (우선순위: Google > Kakao > Naver)
  const canonical = googleHours
    ? null                // Google은 JSONB이므로 raw_hours로 직렬화하지 않음
    : (kakaoHours ?? naverHours ?? null);

  // 최대 마감 시각: 우선순위 Google > Kakao > Naver
  const representativeMax = googleMax ?? kakaoMax ?? naverMax!;
  const operation_type = classifyOperation(representativeMax, category);

  // 소스 간 일치 판단
  const kakaoNaverMatch = hoursRoughlyMatch(kakaoMax, naverMax);
  const kakaoGoogleMatch = hoursRoughlyMatch(kakaoMax, googleMax);
  const naverGoogleMatch = hoursRoughlyMatch(naverMax, googleMax);

  let confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  let hours_source: HoursSource;
  let inference_note: string | undefined;

  if (available.length === 3) {
    const allMatch = kakaoNaverMatch && kakaoGoogleMatch;
    confidence_level = allMatch ? 'HIGH' : 'MEDIUM';
    hours_source = allMatch ? 'ALL' : 'KAKAO+NAVER'; // 불일치 시 Kakao+Naver 기준
    if (!allMatch) {
      inference_note = `소스 불일치: 카카오 ${kakaoMax}분, 네이버 ${naverMax}분, 구글 ${googleMax}분`;
    }
  } else if (available.length === 2) {
    const match =
      (available.includes('KAKAO') && available.includes('NAVER') && kakaoNaverMatch) ||
      (available.includes('KAKAO') && available.includes('GOOGLE') && kakaoGoogleMatch) ||
      (available.includes('NAVER') && available.includes('GOOGLE') && naverGoogleMatch);

    confidence_level = match ? 'HIGH' : 'MEDIUM';
    hours_source = (available.join('+') as HoursSource);
    if (!match) {
      inference_note = `소스 불일치: ${available[0]} ${[kakaoMax, naverMax, googleMax].filter(Boolean)[0]}분, ${available[1]} ${[kakaoMax, naverMax, googleMax].filter(Boolean)[1]}분`;
    }
  } else {
    // 단일 소스
    confidence_level = 'MEDIUM';
    hours_source = available[0] as HoursSource;
  }

  return {
    canonical_hours: canonical,
    confidence_level,
    hours_source,
    operation_type,
    inference_note,
  };
}

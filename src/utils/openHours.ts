import type { Store } from '@/types/store';

export interface OpenStatus {
  isOpen: boolean | null;
  label: string;
  closingSoon: boolean;
  opensAt?: string;
}

const DAY_MAP: Record<string, number> = {
  '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6, '일': 0,
};

// "월: 0900-2400 화: 0900-2400 ..." 형식에서 특정 요일의 [openMin, closeMin] 반환
// closeMin이 1440(2400)이면 다음날 0시로 처리
function parseRawHours(rawHours: string, dayOfWeek: number): [number, number] | null {
  const dayNames = Object.entries(DAY_MAP);
  const targetDay = dayNames.find(([, v]) => v === dayOfWeek)?.[0];
  if (!targetDay) return null;

  const pattern = new RegExp(`${targetDay}:\\s*(\\d{4})-(\\d{4})`);
  const match = rawHours.match(pattern);
  if (!match) return null;

  const openMin = hhmm2min(match[1]);
  let closeMin = hhmm2min(match[2]);
  // 2400 → 1440 (자정)
  if (closeMin === 0 && match[2] === '2400') closeMin = 1440;
  return [openMin, closeMin];
}

function hhmm2min(hhmm: string): number {
  const h = parseInt(hhmm.slice(0, 2), 10);
  const m = parseInt(hhmm.slice(2, 4), 10);
  return h * 60 + m;
}

// Google Places regularOpeningHours 형식에서 [openMin, closeMin] 반환
// Google은 day 0=일, 1=월 ... 6=토
function parseGoogleHours(businessHours: any, dayOfWeek: number): [number, number] | null {
  if (!businessHours?.periods) return null;

  // Google API day: 0=Sun, 1=Mon, ..., 6=Sat (JS Date.getDay()와 동일)
  const period = businessHours.periods.find(
    (p: any) => p.open?.day === dayOfWeek
  );
  if (!period) return null;

  const openMin = (period.open.hours ?? 0) * 60 + (period.open.minutes ?? 0);
  let closeMin: number;

  if (!period.close) {
    // 24시간 영업 (close 없음)
    closeMin = 1440;
  } else {
    closeMin = (period.close.hours ?? 0) * 60 + (period.close.minutes ?? 0);
    if (closeMin === 0) closeMin = 1440;
  }

  return [openMin, closeMin];
}

function minToTimeLabel(min: number): string {
  const normalized = min % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const period = h < 12 ? '오전' : h < 18 ? '오후' : '밤';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0
    ? `${period} ${displayH}시`
    : `${period} ${displayH}시 ${m}분`;
}

export function getOpenStatus(store: Store, at: Date = new Date()): OpenStatus {
  const dayOfWeek = at.getDay(); // 0=일 ... 6=토
  const currentMin = at.getHours() * 60 + at.getMinutes();

  let range: [number, number] | null = null;

  // Google Places 우선, 없으면 raw_hours 파싱
  if (store.business_hours) {
    range = parseGoogleHours(store.business_hours, dayOfWeek);
  }
  if (!range && store.raw_hours) {
    range = parseRawHours(store.raw_hours, dayOfWeek);
  }

  if (!range) {
    return { isOpen: null, label: '영업시간 미확인', closingSoon: false };
  }

  const [openMin, closeMin] = range;

  // 24시간 영업
  if (openMin === 0 && closeMin === 1440) {
    return { isOpen: true, label: '24시간 영업', closingSoon: false };
  }

  // 마감이 다음날로 넘어가는 경우 (예: 22:00~03:00 → closeMin=180+1440=1620)
  // raw_hours는 closeMin을 1440 기준으로 저장하므로 자정을 넘기면 currentMin+1440 비교
  const isOvernight = closeMin > 1440;
  let isOpen: boolean;

  if (isOvernight) {
    // 전날 openMin 이후 or 다음날 closeMin 이전
    isOpen = currentMin >= openMin || currentMin < closeMin - 1440;
  } else {
    isOpen = currentMin >= openMin && currentMin < closeMin;
  }

  if (!isOpen) {
    // 다음 오픈 시각 계산
    const opensAtLabel = minToTimeLabel(openMin);
    return {
      isOpen: false,
      label: '영업 종료',
      closingSoon: false,
      opensAt: opensAtLabel,
    };
  }

  // 마감까지 남은 시간
  let minutesLeft: number;
  if (isOvernight && currentMin < closeMin - 1440) {
    minutesLeft = closeMin - 1440 - currentMin;
  } else {
    minutesLeft = closeMin - currentMin;
  }

  const closingSoon = minutesLeft <= 60;

  if (closingSoon) {
    return {
      isOpen: true,
      label: `${minutesLeft}분 후 마감`,
      closingSoon: true,
    };
  }

  const closingLabel = minToTimeLabel(closeMin > 1440 ? closeMin - 1440 : closeMin);
  return {
    isOpen: true,
    label: `${closingLabel}까지 영업`,
    closingSoon: false,
  };
}

export function isOpenNow(store: Store, at: Date = new Date()): boolean | null {
  return getOpenStatus(store, at).isOpen;
}

// "금 10:00 - 24:00" 형식의 오늘 영업시간 문자열 반환 (접힌 상태 표시용)
export function getTodayHoursLine(store: Store, at: Date = new Date()): string | null {
  const dayOfWeek = at.getDay();
  const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
  const dayLabel = DAY_LABELS[dayOfWeek];

  // Google Places 우선
  if (store.business_hours?.periods) {
    const period = store.business_hours.periods.find((p: any) => p.open?.day === dayOfWeek);
    if (!period) return null;
    if (!period.close) return `${dayLabel} 24시간 영업`;
    const openH = String(period.open.hours ?? 0).padStart(2, '0');
    const openM = String(period.open.minutes ?? 0).padStart(2, '0');
    const closeH = String(period.close.hours ?? 0).padStart(2, '0');
    const closeM = String(period.close.minutes ?? 0).padStart(2, '0');
    const closeStr = period.close.hours === 0 && period.close.minutes === 0 ? '24:00' : `${closeH}:${closeM}`;
    return `${dayLabel} ${openH}:${openM} - ${closeStr}`;
  }

  // raw_hours 파싱
  if (store.raw_hours) {
    const pattern = new RegExp(`${dayLabel}:\\s*(\\d{4})-(\\d{4})`);
    const match = store.raw_hours.match(pattern);
    if (!match) return null;
    const openStr = `${match[1].slice(0, 2)}:${match[1].slice(2, 4)}`;
    const closeRaw = match[2];
    const closeStr = closeRaw === '2400' ? '24:00' : `${closeRaw.slice(0, 2)}:${closeRaw.slice(2, 4)}`;
    if (match[1] === '0000' && closeRaw === '2400') return `${dayLabel} 24시간 영업`;
    return `${dayLabel} ${openStr} - ${closeStr}`;
  }

  return null;
}

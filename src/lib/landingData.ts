export const LANDING_CATEGORIES = ['카페', '편의점', '셀프세차장', 'PC방', '코인노래방', '셀프빨래방', '약국', '찜질방'] as const;
export type LandingCategory = (typeof LANDING_CATEGORIES)[number];

export const CATEGORY_META: Record<LandingCategory, { emoji: string; keyword: string; color: string }> = {
  카페:       { emoji: '☕', keyword: '24시간 카페',    color: '#B07B40' },
  편의점:     { emoji: '🏪', keyword: '24시간 편의점',  color: '#0A84FF' },
  셀프세차장: { emoji: '🚗', keyword: '24시간 세차장',  color: '#30D158' },
  PC방:       { emoji: '🎮', keyword: '24시 PC방',      color: '#5856D6' },
  코인노래방: { emoji: '🎤', keyword: '24시 코인노래방', color: '#FF6B35' },
  셀프빨래방: { emoji: '🫧', keyword: '24시간 빨래방',  color: '#32ADE6' },
  약국:       { emoji: '💊', keyword: '심야 약국',      color: '#FF2D55' },
  찜질방:     { emoji: '🛁', keyword: '24시간 찜질방',  color: '#FF9F0A' },
};

/** road_address에서 주 지역명(구 또는 시) 추출 */
export function extractCitySlug(address: string): string {
  if (!address) return '';
  const parts = address.split(' ');
  // 구 우선 (서울 자치구)
  const gu = parts.find(p => p.endsWith('구') && p.length <= 5);
  if (gu) return gu;
  // 시 (경기/인천 시)
  const si = parts.find(p => p.endsWith('시') && p.length <= 5);
  if (si) return si;
  return '';
}

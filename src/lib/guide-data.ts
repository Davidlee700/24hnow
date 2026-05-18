export type GuideCategory = '카페' | '편의점' | '세차장' | '셀프세차장' | 'PC방' | '약국' | '찜질방' | '셀프빨래방' | '코인노래방' | '전체';

export interface StoreEntry {
  rank: number;
  name: string;
  address: string;
  hours: string;
  valueTag: string;   // '몰입', '주차', '사색' 등 가치 중심 소제목
  description: string;
  insight: string;    // 리뷰 기반 인사이트 한 줄
  tags?: string[];
  mapLink?: string;   // 24시나우 딥링크
}

export interface GuidePost {
  slug: string;
  title: string;
  description: string;
  region: string;   // UI 표시용: "파주 금촌동"
  city?: string;    // 시 단위 필터링: "파주"
  dong?: string;    // 동 단위: "금촌동"
  category: GuideCategory;
  date: string;
  readTime: number;
  gradient: string;
  intro: string;
  stores: StoreEntry[];
  outro?: string;
}

// 카테고리별 기본 그라디언트
export const CATEGORY_GRADIENTS: Record<GuideCategory, string> = {
  '카페':       'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  '편의점':     'linear-gradient(135deg, #0d1b2a 0%, #1b4332 50%, #2d6a4f 100%)',
  '세차장':     'linear-gradient(135deg, #0d1b2a 0%, #023e8a 50%, #0077b6 100%)',
  '셀프세차장': 'linear-gradient(135deg, #0d1b2a 0%, #023e8a 50%, #0077b6 100%)',
  'PC방':       'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #111 100%)',
  '약국':       'linear-gradient(135deg, #1a0020 0%, #3d0030 50%, #6b0050 100%)',
  '찜질방':     'linear-gradient(135deg, #1a0e00 0%, #3d2000 50%, #6b3800 100%)',
  '셀프빨래방': 'linear-gradient(135deg, #001a2e 0%, #00304d 50%, #005a8e 100%)',
  '코인노래방': 'linear-gradient(135deg, #1a0a00 0%, #3d1a00 50%, #7a3800 100%)',
  '전체':       'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #111 100%)',
};

import { allGuidePosts } from './data/guides';

export const guidePosts: GuidePost[] = allGuidePosts;

export function getAllPosts(): GuidePost[] {
  return [...guidePosts].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): GuidePost | undefined {
  return guidePosts.find(p => p.slug === slug);
}

export function getRelatedPosts(current: GuidePost, limit = 2): GuidePost[] {
  return guidePosts
    .filter(p => p.slug !== current.slug)
    .sort((a, b) => {
      const score = (p: GuidePost) =>
        (p.region === current.region ? 2 : 0) + (p.category === current.category ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, limit);
}

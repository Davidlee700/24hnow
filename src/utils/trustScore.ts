/**
 * trustScore.ts
 * 24h Now - Trust Score and Verification Logic
 */

export interface StoreData {
  last_verified_at: string | Date;
  reviews?: string[];
  recent_reports?: Array<'open' | 'closed'>;
}

export interface TrustEvaluation {
  score: number;
  status: 'verified' | 'needs_check' | 'likely_closed';
  badge_text: string;
}

/**
 * Calculates the trust score based on reviews, reports, and verification date.
 * 
 * Logic rules:
 * - Base score is 0.
 * - "24시간" (24 hours) mentioned in recent reviews: +10 points per mention (max 30).
 * - User report "open": +20 points.
 * - User report "closed": -50 points.
 * - If last_verified_at is older than 30 days: -30 points.
 */
export function calculateTrustScore(data: StoreData): TrustEvaluation {
  let score = 0;

  // 1. Analyze reviews
  if (data.reviews && data.reviews.length > 0) {
    const keywordMatches = data.reviews.filter(review => 
      review.includes('24시') || review.includes('24시간') || review.includes('밤샘')
    ).length;
    score += Math.min(keywordMatches * 10, 30);
  }

  // 2. Analyze recent reports
  if (data.recent_reports) {
    data.recent_reports.forEach(report => {
      if (report === 'open') score += 20;
      if (report === 'closed') score -= 50;
    });
  }

  // 3. Time decay (stale data penalty)
  const lastVerifiedDate = new Date(data.last_verified_at);
  const daysSinceVerification = Math.floor((Date.now() - lastVerifiedDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceVerification > 30) {
    score -= 30;
  }

  // Determine status and badge text
  let status: TrustEvaluation['status'] = 'needs_check';
  let badge_text = `${daysSinceVerification}일 전 확인됨`;

  if (score >= 20 && daysSinceVerification <= 7) {
    status = 'verified';
    badge_text = `최근 운영 확인됨 (${daysSinceVerification}일 전)`;
  } else if (score < 0 || daysSinceVerification > 60) {
    status = 'likely_closed';
    badge_text = '운영 확인 필요';
  }

  return {
    score,
    status,
    badge_text
  };
}

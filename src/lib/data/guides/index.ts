import { pajuGuides } from './paju';
import { goyangGuides } from './goyang';
import { gyeonggiNorthGuides } from './gyeonggi-north';
import { gyeonggiSouthGuides } from './gyeonggi-south';
import { incheonGuides } from './incheon';
import { seoulCafeGuides } from './seoul-cafe';
import { seoulPharmacyGuides } from './seoul-pharmacy';
import { seoulJjimjilbangGuides } from './seoul-jjimjilbang';
import { seoulKaraokeGuides } from './seoul-karaoke';
import { seoulLaundryGuides } from './seoul-laundry';
import { seoulCarwashGuides } from './seoul-carwash';
import { busanGuides } from './busan';
import { daeguGuides } from './daegu';
import { daejeonGuides } from './daejeon';
import { gwangjuGuides } from './gwangju';
import { gangwonGuides } from './gangwon';
import { gyeongnamBukGuides } from './gyeongnam-buk';
// 신규: 카페
import { pangyoCafeGuides } from './pangyo-cafe';
import { suwonIncheonCafeGuides } from './suwon-incheon-cafe';
import { seongsuMagokCafeGuides } from './seongsu-magok-cafe';
// 신규: 찜질방
import { nowonYeongdeungpoJjimjilbangGuides } from './nowon-yeongdeungpo-jjimjilbang';
import { busanIncheonJjimjilbangGuides } from './busan-incheon-jjimjilbang';
import { bundangJjimjilbangGuides } from './bundang-jjimjilbang';
// 신규: 셀프빨래방
import { konkukSeongsuLaundryGuides } from './konkuk-seongsu-laundry';
import { nowonYeongdeungpoLaundryGuides } from './nowon-yeongdeungpo-laundry';
import { busanLaundryGuides } from './busan-laundry';
// 신규: 약국
import { yeongdeungpoNowonPharmacyGuides } from './yeongdeungpo-nowon-pharmacy';
import { busanKonkukPharmacyGuides } from './busan-konkuk-pharmacy';
// 복권판매점
import { lotterySeoulSouthGuides } from './lottery-seoul-south';
import { lotterySeoulNorthGuides } from './lottery-seoul-north';
import { lotteryGyeonggiGuides } from './lottery-gyeonggi';
import { lotteryNationwideGuides } from './lottery-nationwide';
import { GuidePost } from '../../guide-data';

export const allGuidePosts: GuidePost[] = [
  ...seoulCafeGuides,
  ...seoulPharmacyGuides,
  ...seoulJjimjilbangGuides,
  ...seoulKaraokeGuides,
  ...seoulLaundryGuides,
  ...seoulCarwashGuides,
  ...pajuGuides,
  ...goyangGuides,
  ...gyeonggiNorthGuides,
  ...gyeonggiSouthGuides,
  ...incheonGuides,
  ...busanGuides,
  ...daeguGuides,
  ...daejeonGuides,
  ...gwangjuGuides,
  ...gangwonGuides,
  ...gyeongnamBukGuides,
  // 신규 카페
  ...pangyoCafeGuides,
  ...suwonIncheonCafeGuides,
  ...seongsuMagokCafeGuides,
  // 신규 찜질방
  ...nowonYeongdeungpoJjimjilbangGuides,
  ...busanIncheonJjimjilbangGuides,
  ...bundangJjimjilbangGuides,
  // 신규 셀프빨래방
  ...konkukSeongsuLaundryGuides,
  ...nowonYeongdeungpoLaundryGuides,
  ...busanLaundryGuides,
  // 신규 약국
  ...yeongdeungpoNowonPharmacyGuides,
  ...busanKonkukPharmacyGuides,
  // 복권판매점
  ...lotterySeoulSouthGuides,
  ...lotterySeoulNorthGuides,
  ...lotteryGyeonggiGuides,
  ...lotteryNationwideGuides,
];

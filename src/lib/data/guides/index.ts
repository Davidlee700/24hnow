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
];

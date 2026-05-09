import { pajuGuides } from './paju';
import { goyangGuides } from './goyang';
import { gyeonggiNorthGuides } from './gyeonggi-north';
import { gyeonggiSouthGuides } from './gyeonggi-south';
import { incheonGuides } from './incheon';
import { GuidePost } from '../../guide-data';

export const allGuidePosts: GuidePost[] = [
  ...pajuGuides,
  ...goyangGuides,
  ...gyeonggiNorthGuides,
  ...gyeonggiSouthGuides,
  ...incheonGuides,
];

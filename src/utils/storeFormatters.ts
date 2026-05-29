export function formatApiTime(timeStr: string): string {
  if (!timeStr) return '';
  const time = parseInt(timeStr);
  if (time === 2400) return '24:00';
  if (time === 0) return '00:00';
  if (time > 2400) {
    const hour = Math.floor((time - 2400) / 100);
    const min = time % 100;
    return `익일 ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  return `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}`;
}

export function calcDistance(user: { lat: number; lng: number } | null, store: { latitude: number; longitude: number }): string {
  if (!user) return '';
  const R = 6371;
  const dLat = (store.latitude - user.lat) * Math.PI / 180;
  const dLng = (store.longitude - user.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(user.lat * Math.PI / 180) * Math.cos(store.latitude * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  if (d < 0.15) return '바로 근처';
  if (d < 1.5) return `도보 ${Math.round(d / 0.067)}분`;
  return `차로 ${Math.round(d / 0.4)}분`;
}

export function relativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (h < 1) return '방금 확인됨';
  if (h < 24) return `${h}시간 전 확인`;
  const d = Math.floor(h / 24);
  return d === 1 ? '어제 확인' : `${d}일 전 확인`;
}

export function getOpenStatusIcon(openStatus: { isOpen: boolean | null; closingSoon: boolean } | null): string {
  if (!openStatus || openStatus.isOpen === null) return '💡'; // Changed from ⚪/⚠️ to 💡 for Honest Incompleteness
  if (openStatus.closingSoon) return '⏰';
  return openStatus.isOpen ? '🟢' : '🔴';
}

export function getOpenStatusColor(openStatus: { isOpen: boolean | null; closingSoon: boolean } | null): string {
  if (!openStatus || openStatus.isOpen === null) return 'var(--text-secondary)';
  if (openStatus.closingSoon) return '#FF9F0A';
  return openStatus.isOpen ? 'var(--accent-brand)' : '#FF453A';
}

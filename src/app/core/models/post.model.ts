export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  imageUrls?: string[];
  visibility: 'national' | 'international';
  community: string; 
  likes: string[]; 
  createdAt: Date;
  expiresAt: Date; 
  isExpired?: boolean; 
}

// ✅ CALCULER LA DATE D'EXPIRATION : 48h national, 72h international
export function calculateExpiration(visibility: 'national' | 'international'): Date {
  const now = new Date();
  const hours = visibility === 'national' ? 48 : 72;
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}
// ✅ VÉRIFIER SI UN POST EST EXPIRÉ
export function isPostExpired(post: Post): boolean {
  return new Date() > new Date(post.expiresAt);
}
// Ajoutez cette fonction helper
export function formatCommunityName(nationality: string, country: string): string {
  return `${nationality}En${country.replace(/\s/g, '')}`;
}
// ✅ FORMATER LE TEMPS RESTANT
export function getTimeRemaining(post: Post): string {
  const now = new Date();
  const expiry = new Date(post.expiresAt);
  const hoursRemaining = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursRemaining < 1) {
    const minutes = Math.floor(hoursRemaining * 60);
    return `${minutes}m`;
  } else if (hoursRemaining < 24) {
    return `${Math.floor(hoursRemaining)}h`;
  } else {
    const days = Math.floor(hoursRemaining / 24);
    return `${days}j`;
  }
}

// ✅ VÉRIFIER SI LE POST EXPIRE BIENTÔT (moins de 12h)
export function isExpiringSoon(post: Post): boolean {
  const now = new Date();
  const expiry = new Date(post.expiresAt);
  const hoursRemaining = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursRemaining < 12;
}
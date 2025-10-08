import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

export interface Post {
  id: string;
  author: string;
  authorId: string;
  content: string;
  avatar: string;
  likes: number;
  createdAt: Date;
  expiresAt: Date; 
  visibility: 'national' | 'international';
  community: string;
  isAdmin: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PostsService {
  
  // Délais de suppression automatique
  private readonly DELETE_DELAYS = {
    NATIONAL: 3 * 24 * 60 * 60 * 1000,     // 72 heures
    INTERNATIONAL: 7 * 24 * 60 * 60 * 1000 // 1 semaine
  };

  constructor(private authService: AuthService) {}

  // Posts mockés avec dates d'expiration
 // Posts mockés avec dates d'expiration
getMockPosts(): Post[] {
  const now = new Date();
  
  return [
    { 
      id: '1',
      author: 'Équipe BELAFRICA', 
      authorId: 'admin',
      content: '🎉 Bienvenue sur BELAFRICA ! Connectons la diaspora africaine.', 
      avatar: 'É',
      likes: 5,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), 
      expiresAt: new Date(now.getTime() + this.DELETE_DELAYS.INTERNATIONAL),
      visibility: 'international' as 'national' | 'international', 
      community: 'Toutes',
      isAdmin: true
    },
    { 
      id: '2',
      author: 'Admin Communauté', 
      authorId: 'admin-cm',
      content: '📢 Réunion des Camerounais ce weekend à Minsk !', 
      avatar: '🇨🇲',
      likes: 3,
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      expiresAt: new Date(now.getTime() + this.DELETE_DELAYS.NATIONAL),
      visibility: 'national' as 'national' | 'international', 
      community: 'Cameroun en Biélorussie',
      isAdmin: true
    }
  ].filter(post => this.isPostValid(post));
}

  // Vérifier si un post est encore valide (non expiré)
  private isPostValid(post: Post): boolean {
    return new Date() < post.expiresAt;
  }

  // Obtenir les posts pour l'utilisateur courant (avec segmentation)
  getPostsForCurrentUser(): Post[] {
    if (!this.authService.isAuthenticated()) {
      return [];
    }

    const user = this.authService.getCurrentUser();
    const userCommunity = this.authService.getUserCommunity();
    
    const allPosts = this.getMockPosts();
    
    // FILTRAGE INTELLIGENT :
    return allPosts.filter(post => {
      // 1. Supprimer les posts expirés
      if (!this.isPostValid(post)) return false;
      
      // 2. Posts internationaux : visibles par tous
      if (post.visibility === 'international') return true;
      
      // 3. Posts nationaux : seulement pour la bonne communauté
      if (post.visibility === 'national') {
        return post.community === userCommunity;
      }
      
      return false;
    });
  }

  // Simuler la création d'un nouveau post
  createPost(content: string, visibility: 'national' | 'international', isAdmin: boolean = false): Post {
    const user = this.authService.getCurrentUser();
    
    const newPost: Post = {
      id: Math.random().toString(36).substr(2, 9),
      author: isAdmin ? 'Équipe BELAFRICA' : user.pseudo,
      authorId: user.userId,
      content,
      avatar: isAdmin ? 'É' : user.pseudo.charAt(0).toUpperCase(),
      likes: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (
        visibility === 'national' 
          ? this.DELETE_DELAYS.NATIONAL 
          : this.DELETE_DELAYS.INTERNATIONAL
      )),
      visibility,
      community: this.authService.getUserCommunity(),
      isAdmin
    };

    console.log('📝 Nouveau post créé:', newPost);
    return newPost;
  }

  // Vérifier l'état d'expiration d'un post
  getTimeUntilExpiration(post: Post): string {
    const now = new Date();
    const timeLeft = post.expiresAt.getTime() - now.getTime();
    
    if (timeLeft <= 0) return 'Expiré';
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `Expire dans ${days}j ${hours}h`;
    return `Expire dans ${hours}h`;
  }
}
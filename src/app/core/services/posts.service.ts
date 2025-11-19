import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StorageService } from './storage.service';
import { UserService } from './user.service';
import { calculateExpiration, isPostExpired, Post } from '../models/post.model';

@Injectable({
  providedIn: 'root'
})
export class PostsService {
  private postsKey = 'belafrica_posts';
  private posts = new BehaviorSubject<Post[]>([]);
  private initialSamplesCreated = false;

  constructor(
    private storageService: StorageService,
    private userService: UserService
  ) {
    this.loadPostsFromStorage();
    this.startCleanupInterval();
    this.createInitialSamplesOnce();
  }

  private loadPostsFromStorage(): void {
    const savedPosts = this.storageService.getItem(this.postsKey) || [];
    console.log('📥 Posts chargés:', savedPosts.length);
    this.posts.next(savedPosts);
  }

  private savePostsToStorage(posts: Post[]): void {
    this.storageService.setItem(this.postsKey, posts);
    this.posts.next(posts);
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredPosts();
    }, 60 * 60 * 1000);
  }

  private cleanupExpiredPosts(): void {
    const currentPosts = this.posts.value;
    const activePosts = currentPosts.filter(post => !isPostExpired(post));
    
    if (activePosts.length !== currentPosts.length) {
      console.log(`🧹 ${currentPosts.length - activePosts.length} posts expirés supprimés`);
      this.savePostsToStorage(activePosts);
    }
  }

  // ✅ CRÉATION DES POSTS EXEMPLE UNE SEULE FOIS
  private createInitialSamplesOnce(): void {
    if (this.initialSamplesCreated) return;

    const existingPosts = this.posts.value;
    if (existingPosts.length === 0) {
      console.log('🎭 Création des posts exemple initiaux...');
      
      setTimeout(() => {
        const samplePosts = this.generateSamplePosts();
        samplePosts.forEach(post => {
          try {
            this.createPostWithMockData(post.content, [], post.visibility, post.community, post.authorName);
          } catch (error) {
            // Ignorer les doublons
          }
        });
        
        this.initialSamplesCreated = true;
      }, 1000); // Réduit à 1s pour plus de rapidité
    } else {
      this.initialSamplesCreated = true;
    }
  }

  // ✅ GÉNÉRATION DES POSTS EXEMPLE
  private generateSamplePosts(): any[] {
    const baseDate = new Date();
    
    return [
      {
        content: '🎉 Bienvenue à la communauté Camerounaise de France ! Restons unis et solidaires.',
        visibility: 'national' as const,
        community: 'CamerounaisEnFrance',
        authorName: 'Admin Cameroun',
        createdAt: new Date(baseDate.getTime() - 2 * 60 * 60 * 1000)
      },
      {
        content: '📅 Réunion mensuelle ce samedi à Paris. Inscriptions ouvertes !',
        visibility: 'international' as const,
        community: 'CamerounaisEnFrance', 
        authorName: 'Admin Cameroun',
        createdAt: new Date(baseDate.getTime() - 5 * 60 * 60 * 1000)
      },
      {
        content: '🇸🇳 La communauté Sénégalaise de Belgique vous souhaite la bienvenue !',
        visibility: 'national' as const,
        community: 'SenegalaisEnBelgique',
        authorName: 'Admin Sénégal',
        createdAt: new Date(baseDate.getTime() - 1 * 60 * 60 * 1000)
      },
      {
        content: '💼 Offre d\'emploi : Développeur Angular recherché à Berlin',
        visibility: 'international' as const,
        community: 'IvoiriensEnAllemagne',
        authorName: 'Admin Côte d\'Ivoire',
        createdAt: new Date(baseDate.getTime() - 3 * 60 * 60 * 1000)
      }
    ];
  }

  private createPostWithMockData(
    content: string, 
    imageUrls: string[], 
    visibility: 'national' | 'international',
    community: string,
    authorName: string
  ): void {
    const newPost: Post = {
      id: this.generatePostId(),
      authorId: 'admin_' + Math.random().toString(36).substr(2, 6),
      authorName: authorName,
      authorAvatar: '',
      content,
      imageUrls,
      visibility,
      community: community,
      likes: [],
      createdAt: new Date(),
      expiresAt: calculateExpiration(visibility)
    };

    const currentPosts = this.posts.value;
    
    const isDuplicate = currentPosts.some(post => 
      post.content === content && 
      post.community === community
    );

    if (!isDuplicate) {
      const updatedPosts = [newPost, ...currentPosts];
      this.savePostsToStorage(updatedPosts);
    }
  }

  // ✅ MÉTHODE CORRIGÉE : getNationalPosts()
  getNationalPosts(): Observable<Post[]> {
    const user = this.userService.getCurrentUser();
    const userCommunity = user?.community;

    return this.posts.asObservable().pipe(
      map(posts => {
        let filteredPosts = posts.filter(post => !isPostExpired(post));
        
        // ✅ SEULEMENT les posts de la communauté de l'utilisateur
        filteredPosts = filteredPosts.filter(post => 
          post.visibility === 'national' && 
          post.community === userCommunity
        );
        
        // Trier par date de création (plus récent en premier)
        return filteredPosts
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map(post => ({
            ...post,
            isExpired: isPostExpired(post)
          }));
      })
    );
  }

  // ✅ MÉTHODE CORRIGÉE : getInternationalPosts()
  getInternationalPosts(): Observable<Post[]> {
    return this.posts.asObservable().pipe(
      map(posts => {
        let filteredPosts = posts.filter(post => !isPostExpired(post));
        
        // ✅ TOUS les posts internationaux
        filteredPosts = filteredPosts.filter(post => 
          post.visibility === 'international'
        );
        
        return filteredPosts
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map(post => ({
            ...post,
            isExpired: isPostExpired(post)
          }));
      })
    );
  }

  // ✅ MÉTHODE GÉNÉRIQUE POUR COMPATIBILITÉ
  getPosts(visibility?: 'national' | 'international'): Observable<Post[]> {
    if (visibility === 'national') {
      return this.getNationalPosts();
    } else if (visibility === 'international') {
      return this.getInternationalPosts();
    } else {
      // Tous les posts non expirés
      return this.posts.asObservable().pipe(
        map(posts => posts.filter(post => !isPostExpired(post)))
      );
    }
  }

  createPost(content: string, imageUrls: string[] = [], visibility: 'national' | 'international'): Post {
    const user = this.userService.getCurrentUser();
    if (!user) throw new Error('Utilisateur non connecté');

    if (!user.isAdmin) {
      throw new Error('Seuls les administrateurs peuvent créer des posts');
    }

    const newPost: Post = {
      id: this.generatePostId(),
      authorId: user.userId,
      authorName: user.pseudo,
      authorAvatar: user.avatar,
      content,
      imageUrls,
      visibility,
      community: user.community,
      likes: [],
      createdAt: new Date(),
      expiresAt: calculateExpiration(visibility)
    };

    const currentPosts = this.posts.value;
    const updatedPosts = [newPost, ...currentPosts];
    this.savePostsToStorage(updatedPosts);

    console.log('✅ Nouveau post créé:', {
      auteur: user.pseudo,
      visibilité: visibility,
      communauté: user.community
    });

    return newPost;
  }

  toggleLike(postId: string): void {
    const user = this.userService.getCurrentUser();
    if (!user) return;

    const currentPosts = this.posts.value;
    const updatedPosts = currentPosts.map(post => {
      if (post.id === postId) {
        const hasLiked = post.likes.includes(user.userId);
        return {
          ...post,
          likes: hasLiked 
            ? post.likes.filter(id => id !== user.userId)
            : [...post.likes, user.userId]
        };
      }
      return post;
    });

    this.savePostsToStorage(updatedPosts);
  }

  private generatePostId(): string {
    return 'post_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  getStats(): any {
    const user = this.userService.getCurrentUser();
    const allPosts = this.posts.value;
    const activePosts = allPosts.filter(post => !isPostExpired(post));
    
    return {
      total: activePosts.length,
      national: activePosts.filter(post => 
        post.visibility === 'national' && 
        post.community === user?.community
      ).length,
      international: activePosts.filter(post => post.visibility === 'international').length,
      expired: allPosts.filter(post => isPostExpired(post)).length,
      userCommunity: user?.community || 'Non connecté'
    };
  }

  deletePost(postId: string): boolean {
    const user = this.userService.getCurrentUser();
    if (!user?.isAdmin) {
      console.error('❌ Accès refusé: admin requis');
      return false;
    }

    const currentPosts = this.posts.value;
    const postToDelete = currentPosts.find(post => post.id === postId);
    
    if (!postToDelete) {
      console.error('❌ Post non trouvé');
      return false;
    }

    if (postToDelete.community !== user.community && user.adminLevel !== 'international') {
      console.error('❌ Accès refusé: communauté différente');
      return false;
    }

    const updatedPosts = currentPosts.filter(post => post.id !== postId);
    this.savePostsToStorage(updatedPosts);
    
    console.log('🗑️ Post supprimé:', postId);
    return true;
  }

  getPostsByCommunity(community: string): Observable<Post[]> {
    return this.posts.asObservable().pipe(
      map(posts => {
        return posts
          .filter(post => 
            post.community === community && 
            !isPostExpired(post)
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      })
    );
  }
}
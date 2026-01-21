/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';
import { UserService } from './user.service';
import { calculateExpiration, isPostExpired, Post } from '../models/post.model';
import { PostsService } from './posts.service';

@Injectable()
export class PostsMockService extends PostsService {
  private postsKey = 'belafrica_posts';
  private posts = new BehaviorSubject<Post[]>([]);
  private initialSamplesCreated = false;

  constructor(
    private storageService: StorageService,
    private userService: UserService
  ) {
    super();
    this.loadPostsFromStorage();
    this.startCleanupInterval();
    if (!environment.production) {
      this.createInitialSamplesOnce();
    }
  }

  private loadPostsFromStorage(): void {
    const savedPosts = this.storageService.getItem(this.postsKey) || [];
    console.log('🎭 [MOCK] Posts chargés:', savedPosts.length);
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
      console.log(`🧹 [MOCK] ${currentPosts.length - activePosts.length} posts expirés supprimés`);
      this.savePostsToStorage(activePosts);
    }
  }

  private createInitialSamplesOnce(): void {
    if (this.initialSamplesCreated) return;

    const existingPosts = this.posts.value;
    if (existingPosts.length === 0) {
      console.log('🎭 [MOCK] Création des posts exemple initiaux...');
      
      setTimeout(() => {
        const samplePosts = this.generateSamplePosts();
        samplePosts.forEach(post => {
          this.createPostWithMockData(post.content, [], post.visibility, post.community, post.authorName);
        });
        this.initialSamplesCreated = true;
      }, 1000);
    } else {
      this.initialSamplesCreated = true;
    }
  }

  private generateSamplePosts(): any[] {
    const baseDate = new Date();
    return [
    ];
  }

  private createPostWithMockData(content: string, imageUrls: string[], visibility: 'national' | 'international', community: string, authorName: string): void {
    const newPost: Post = {
      id: this.generatePostId(),
      authorId: 'admin_' + Math.random().toString(36).substr(2, 6),
      authorName: authorName,
      authorAvatar: '',
      content, imageUrls, visibility, community,
      likes: [],
      createdAt: new Date(),
      expiresAt: calculateExpiration(visibility)
    };
    const currentPosts = this.posts.value;
    if (!currentPosts.some(p => p.content === content && p.community === community)) {
      this.savePostsToStorage([newPost, ...currentPosts]);
    }
  }

  getNationalPosts(): Observable<Post[]> {
    const user = this.userService.getCurrentUser();
    const userCommunity = user?.community;
    return this.posts.asObservable().pipe(
      map(posts => posts
        .filter(p => !isPostExpired(p) && p.visibility === 'national' && p.community === userCommunity)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      )
    );
  }

  getInternationalPosts(): Observable<Post[]> {
    return this.posts.asObservable().pipe(
      map(posts => posts
        .filter(p => !isPostExpired(p) && p.visibility === 'international')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      )
    );
  }

  getPosts(visibility?: 'national' | 'international'): Observable<Post[]> {
    if (visibility === 'national') return this.getNationalPosts();
    if (visibility === 'international') return this.getInternationalPosts();
    return this.posts.asObservable().pipe(map(posts => posts.filter(p => !isPostExpired(p))));
  }

  async createPost(content: string, imageUrls: string[], visibility: 'national' | 'international'): Promise<Post> {
    const user = this.userService.getCurrentUser();
    if (!user) throw new Error('Utilisateur non connecté');
    if (!user.is_admin) throw new Error('Seuls les administrateurs peuvent créer des posts');

    const newPost: Post = {
      id: this.generatePostId(),
      authorId: user.id,
      authorName: user.pseudo,
      authorAvatar: user.avatar_url ?? '',
      content, imageUrls, visibility,
      community: user.community,
      likes: [],
      createdAt: new Date(),
      expiresAt: calculateExpiration(visibility)
    };

    const updatedPosts = [newPost, ...this.posts.value];
    this.savePostsToStorage(updatedPosts);
    console.log('🎭 [MOCK] Nouveau post créé:', newPost.id);
    return Promise.resolve(newPost);
  }

  async toggleLike(postId: string): Promise<void> {
    const user = this.userService.getCurrentUser();
    if (!user) return Promise.resolve();

    const currentPosts = this.posts.value;
    const updatedPosts = currentPosts.map(post => {
      if (post.id === postId) {
        const hasLiked = post.likes.includes(user.id);
        return {
          ...post,
          likes: hasLiked ? post.likes.filter(id => id !== user.id) : [...post.likes, user.id]
        };
      }
      return post;
    });
    this.savePostsToStorage(updatedPosts);
    return Promise.resolve();
  }

  private generatePostId(): string {
    return 'post_mock_' + Math.random().toString(36).substr(2, 9);
  }

  getStats(): any {
    const user = this.userService.getCurrentUser();
    const allPosts = this.posts.value;
    const activePosts = allPosts.filter(post => !isPostExpired(post));
    return {
      total: activePosts.length,
      national: activePosts.filter(p => p.visibility === 'national' && p.community === user?.community).length,
      international: activePosts.filter(p => p.visibility === 'international').length,
    };
  }

  async deletePost(postId: string): Promise<boolean> {
    const user = this.userService.getCurrentUser();
    if (!user?.is_admin) {
      console.error('❌ [MOCK] Accès refusé: admin requis');
      return Promise.resolve(false);
    }

    const currentPosts = this.posts.value;
    const postToDelete = currentPosts.find(post => post.id === postId);
    if (!postToDelete) {
      console.error('❌ [MOCK] Post non trouvé');
      return Promise.resolve(false);
    }

    const updatedPosts = currentPosts.filter(post => post.id !== postId);
    this.savePostsToStorage(updatedPosts);
    console.log('🗑️ [MOCK] Post supprimé:', postId);
    return Promise.resolve(true);
  }

  getPostsByCommunity(community: string): Observable<Post[]> {
    return this.posts.asObservable().pipe(
      map(posts => posts
        .filter(p => p.community === community && !isPostExpired(p))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      )
    );
  }
}

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Post } from '../models/post.model';

/**
 * ✅ Classe abstraite définissant le contrat pour le service de posts.
 * Les composants dépendront de cette abstraction, et non d'une implémentation concrète.
 */
@Injectable({ providedIn: 'root' })
export abstract class PostsService {
  abstract getNationalPosts(): Observable<Post[]>;
  abstract getInternationalPosts(): Observable<Post[]>;
  abstract getPosts(visibility?: 'national' | 'international'): Observable<Post[]>;
  abstract createPost(content: string, imageUrls: string[], visibility: 'national' | 'international'): Promise<Post>;
  abstract toggleLike(postId: string): Promise<void>;
  abstract deletePost(postId: string): Promise<boolean>;
  abstract getStats(): any;
  abstract getPostsByCommunity(community: string): Observable<Post[]>;
}
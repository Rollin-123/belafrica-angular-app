/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Post } from '../models/post.model';

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
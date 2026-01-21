/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Post } from '../models/post.model';
import { PostsService } from './posts.service';

@Injectable()
export class PostsHttpService extends PostsService {
  private apiUrl = `${environment.apiUrl}/posts`;

  constructor(private http: HttpClient) {
    super();
  }

  getNationalPosts(): Observable<Post[]> {
    return this.http.get<{ posts: Post[] }>(`${this.apiUrl}/national`).pipe(
      map(res => res.posts || [])
    );
  }

  getInternationalPosts(): Observable<Post[]> {
    return this.http.get<{ posts: Post[] }>(`${this.apiUrl}/international`).pipe(
      map(res => res.posts || [])
    );
  }

  getPosts(visibility?: 'national' | 'international'): Observable<Post[]> {
    if (visibility === 'national') {
      return this.getNationalPosts();
    }
    if (visibility === 'international') {
      return this.getInternationalPosts();
    }
    return of([]);
  }

  async createPost(content: string, imageUrls: string[], visibility: 'national' | 'international'): Promise<Post> {
    const response = await this.http.post<{ post: Post }>(this.apiUrl, { content, imageUrls, visibility }).toPromise();
    if (!response?.post) {
      throw new Error('La création du post a échoué.');
    }
    return response.post;
  }

  async toggleLike(postId: string): Promise<void> { 
    await this.http.post(`${this.apiUrl}/${postId}/like`, {}).toPromise();
  }

  async deletePost(postId: string): Promise<boolean> {
    const response = await this.http.delete<{ success: boolean }>(`${this.apiUrl}/${postId}`).toPromise();
    return response?.success ?? false;
  }

  getStats(): any {
    console.warn('[PostsHttpService] getStats() non implémenté côté backend.');
    return {
      total: 0,
      national: 0,
      international: 0,
    };
  }

  getPostsByCommunity(community: string): Observable<Post[]> {
    console.warn('[PostsHttpService] getPostsByCommunity() non implémenté côté backend.');
    return of([]);
  }
}
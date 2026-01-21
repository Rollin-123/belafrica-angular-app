/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, of, Subscription } from 'rxjs';
import { UserService } from '../../../../core/services/user.service';
import { PostsService } from '../../../../core/services/posts.service';
import { ModalService } from '../../../../core/services/modal.service';
import { Post, isExpiringSoon, getTimeRemaining } from '../../../../core/models/post.model';

@Component({
  selector: 'app-feed-national',
  templateUrl: './feed-national.component.html',
  styleUrls: ['./feed-national.component.scss'],
  standalone: false
})
export class FeedNationalComponent implements OnInit, OnDestroy {
  posts$: Observable<Post[]>;
  userCommunity: string = '';
  showCreatePostButton: boolean = false;
  isLoading: boolean = true;
  private userSubscription: Subscription | undefined;

  constructor(
    private userService: UserService,
    private postsService: PostsService,
    private modalService: ModalService
  ) {
    this.posts$ = of([]); 
  }

  ngOnInit() {
    this.userSubscription = this.userService.currentUser$.subscribe(user => {
      if (user) {
        this.userCommunity = user.community;
        this.showCreatePostButton = this.userService.canPostNational();
        console.log(`🏠 FeedNational initialisé pour la communauté: ${this.userCommunity}`);
        this.loadNationalPosts();
      } else {
        this.userCommunity = '';
        this.showCreatePostButton = false;
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
  }

  loadNationalPosts(): void {
    this.isLoading = true;
    this.posts$ = this.postsService.getNationalPosts();
    this.posts$.subscribe({
      next: (posts) => {
        this.isLoading = false;
        console.log(`📝 ${posts.length} posts nationaux chargés.`);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('❌ Erreur chargement posts nationaux:', err);
      }
    });
  }

  hasLiked(post: Post): boolean {
    const user = this.userService.getCurrentUser();
    return user ? post.likes.includes(user.id) : false;  
  }

  toggleLike(postId: string): void {
    console.log('❤️ Like pour le post:', postId);
    this.postsService.toggleLike(postId);
  }

  isExpiringSoon(post: Post): boolean {
    return isExpiringSoon(post);
  }

  getTimeRemaining(post: Post): string {
    return getTimeRemaining(post);
  }

  openCreatePostModal(): void {
    if (this.showCreatePostButton) {
      console.log('📝 Ouverture du modal de création de post national');
      this.modalService.showSuccess('Fonctionnalité à venir', '🎯 Fonctionnalité de création de post bientôt disponible !\n\nVous pourrez bientôt créer des posts pour votre communauté.');
    } else {
      console.log('❌ Accès refusé: utilisateur non admin');
    }
  }
  refreshPosts(): void {
    this.isLoading = true;
    console.log('🔄 Actualisation des posts nationaux...');
    this.loadNationalPosts();
  }
}
import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { UserService } from '../../../../core/services/user.service';
import { PostsService } from '../../../../core/services/posts.service';
import { Post } from '../../../../core/models/post.model';

@Component({
  selector: 'app-feed-national',
  templateUrl: './feed-national.component.html',
  styleUrls: ['./feed-national.component.scss'],
  standalone: false
})
export class FeedNationalComponent implements OnInit {
  posts$: Observable<Post[]>;
  userCommunity: string = '';
  showCreatePostButton: boolean = false;
  isLoading: boolean = true;

  constructor(
    private userService: UserService,
    private postsService: PostsService
  ) {
    this.posts$ = this.postsService.getNationalPosts();
  }

  ngOnInit() {
    this.userCommunity = this.userService.getUserCommunity();
    
    this.userService.currentUser$.subscribe(user => {
      this.showCreatePostButton = user?.isAdmin || false;
      
      console.log('🔄 FeedNational - Statut admin mis à jour:', {
        showCreatePostButton: this.showCreatePostButton,
        pseudo: user?.pseudo,
        community: this.userCommunity
      });
    });

    this.posts$.subscribe(posts => {
      this.isLoading = false;
      console.log('📝 Posts chargés:', posts.length);
    });

    console.log('🏠 FeedNational initialisé:', {
      community: this.userCommunity,
      showCreatePostButton: this.showCreatePostButton
    });
  }

  // Méthodes pour la gestion des posts
  hasLiked(post: Post): boolean {
    const user = this.userService.getCurrentUser();
    return user ? post.likes.includes(user.userId) : false;
  }

  toggleLike(postId: string): void {
    console.log('❤️ Like pour le post:', postId);
    this.postsService.toggleLike(postId);
  }

  isExpiringSoon(post: Post): boolean {
    const now = new Date();
    const expiry = new Date(post.expiresAt);
    const hoursRemaining = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursRemaining < 6;
  }

  getTimeRemaining(post: Post): string {
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

  openCreatePostModal(): void {
    if (this.showCreatePostButton) {
      console.log('📝 Ouverture du modal de création de post national');
      this.showFeatureComingSoon();
    } else {
      console.log('❌ Accès refusé: utilisateur non admin');
    }
  }

  private showFeatureComingSoon(): void {
    alert('🎯 Fonctionnalité de création de post bientôt disponible !\n\nVous pourrez bientôt créer des posts pour votre communauté.');
  }

  refreshPosts(): void {
    this.isLoading = true;
    console.log('🔄 Actualisation des posts...');
    
    setTimeout(() => {
      this.isLoading = false;
      console.log('✅ Posts actualisés');
    }, 500);
  }
}
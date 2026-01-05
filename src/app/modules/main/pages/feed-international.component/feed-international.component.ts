import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription, of } from 'rxjs';
import { PostsService } from '../../../../core/services/posts.service';
import { UserService, User } from '../../../../core/services/user.service';
import { Post, isExpiringSoon, getTimeRemaining } from '../../../../core/models/post.model'; 

@Component({
  selector: 'app-feed-international',
  standalone: false,
  templateUrl: './feed-international.component.html',
  styleUrls: [
    './feed-international.component.scss', 
  ]
})
export class FeedInternationalComponent implements OnInit, OnDestroy {
  posts$: Observable<Post[]>;
  showCreatePostButton = false;
  isLoading = true;
  private userSubscription: Subscription | undefined;

  constructor(
    private postsService: PostsService,
    private userService: UserService
  ) {
    this.posts$ = of([]);
  }

  ngOnInit() {
    this.userSubscription = this.userService.currentUser$.subscribe(user => {
      if (user) {
        this.showCreatePostButton = this.userService.canPostInternational();
        console.log('🌍 Feed International initialisé');
        this.loadInternationalPosts();
      } else {
        this.showCreatePostButton = false;
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
  }

  loadInternationalPosts(): void {
    this.isLoading = true;
    this.posts$ = this.postsService.getInternationalPosts();
    this.posts$.subscribe({
      next: (posts) => {
        this.isLoading = false;
        console.log(`📝 ${posts.length} posts internationaux chargés.`);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('❌ Erreur chargement posts internationaux:', err);
      }
    });
  }

  hasLiked(post: Post): boolean {
    const user = this.userService.getCurrentUser();
    return user ? post.likes.includes(user.id) : false; 
  }

  toggleLike(postId: string): void {
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
      console.log('📝 Ouverture du modal de création de post international');
      alert('Fonctionnalité de création de post bientôt disponible !');
    }
  }

  handleImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/images/default-avatar.png';
  }
}
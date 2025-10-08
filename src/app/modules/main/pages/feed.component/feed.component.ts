import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { Post, PostsService } from '../../../../core/services/posts.service';

@Component({
  selector: 'app-feed',
  standalone: false,
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss']
})

export class FeedComponent implements OnInit {
  posts: Post[] = [];
  currentUser: any;
  userCommunity: string = '';

  constructor(
    private authService: AuthService,
    private postsService: PostsService
  ) {}

  ngOnInit() {
    if (!this.authService.isAuthenticated()) return;

    this.currentUser = this.authService.getCurrentUser();
    this.userCommunity = this.authService.getUserCommunity();
    
    this.posts = this.postsService.getPostsForCurrentUser();
    console.log('📊 Posts après filtrage:', this.posts);
  }

  likePost(postId: string): void {
    const post = this.posts.find(p => p.id === postId);
    if (post) {
      post.likes = post.likes + 1;
    }
  }

  // ✅ NOUVELLE MÉTHODE : Formater la date en texte lisible
  getTimeAgo(post: Post): string {
    const now = new Date();
    const createdAt = new Date(post.createdAt);
    const diffMs = now.getTime() - createdAt.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return 'À l\'instant';
    } else if (diffHours < 24) {
      return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    }
  }

  getExpirationTime(post: Post): string {
    return this.postsService.getTimeUntilExpiration(post);
  }
}
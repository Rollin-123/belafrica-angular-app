import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { UserService } from '../../../../core/services/user.service';
import { PostsService } from '../../../../core/services/posts.service';
import { Post, isExpiringSoon, getTimeRemaining } from '../../../../core/models/post.model';

@Component({
  selector: 'app-feed-national',
  standalone: false,
  templateUrl: './feed-national.component.html',
  styleUrls: ['./feed-national.component.scss']
})
export class FeedNationalComponent implements OnInit {
  userCommunity: string = '';
  posts$: Observable<Post[]>;

  constructor(
    private userService: UserService,
    private postsService: PostsService
  ) {
    this.posts$ = this.postsService.getPosts('national');
  }

  ngOnInit() {
    const user = this.userService.getCurrentUser();
    this.userCommunity = user?.community || 'Communauté inconnue';
    
    console.log('🏠 Feed National - Communauté:', this.userCommunity);
  }

  hasLiked(post: Post): boolean {
    const user = this.userService.getCurrentUser();
    return user ? post.likes.includes(user.userId) : false;
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
}
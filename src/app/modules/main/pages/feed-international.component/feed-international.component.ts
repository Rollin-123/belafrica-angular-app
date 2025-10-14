import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { PostsService } from '../../../../core/services/posts.service';
import { UserService } from '../../../../core/services/user.service';
import { Post, isExpiringSoon, getTimeRemaining } from '../../../../core/models/post.model';

@Component({
  selector: 'app-feed-international',
  standalone: false,
  templateUrl: './feed-international.component.html',
  styleUrls: [
    './feed-international.component.scss', 
  ]
})
export class FeedInternationalComponent implements OnInit {
  posts$: Observable<Post[]>;

  constructor(
    private postsService: PostsService,
    private userService: UserService
  ) {
    this.posts$ = this.postsService.getPosts('international');
  }

  ngOnInit() {
    console.log('🌍 Feed International chargé');
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
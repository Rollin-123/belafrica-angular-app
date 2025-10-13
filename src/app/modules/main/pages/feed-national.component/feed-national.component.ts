import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'bel-feed-national.component',
  standalone:false,
  templateUrl: './feed-national.component.html',
  styleUrl: './feed-national.component.scss'
})
export class FeedNationalComponent implements OnInit {
  userCommunity: string = '';

  constructor(private userService: UserService) {}

  ngOnInit() {
    const user = this.userService.getCurrentUser();
    this.userCommunity = user?.community || 'Communauté inconnue';
  }
}
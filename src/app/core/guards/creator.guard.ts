/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { UserService } from '../services/user.service';

@Injectable({
  providedIn: 'root'
})
export class CreatorGuard implements CanActivate {
  
  constructor(
    private router: Router,
    private userService: UserService
  ) {}
  canActivate(): boolean {
    const currentUser = this.userService.getCurrentUser();
    if (currentUser && (currentUser as any).role === 'CREATOR') {
      return true;
    } else {
      this.router.navigate(['/app/feed']);
      return false;
    }
  }
}

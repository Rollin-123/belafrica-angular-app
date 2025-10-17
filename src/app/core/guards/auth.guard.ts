import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { StorageService } from '../services/storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private storageService: StorageService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const userProfile = this.storageService.getItem('belafrica_user_profile');
    
    if (userProfile && this.isValidUser(userProfile)) {
      return true;
    } else {
      // Rediriger vers l'authentification
      this.router.navigate(['/auth/phone']);
      return false;
    }
  }

  private isValidUser(user: any): boolean {
    // Vérifier que l'utilisateur a les données minimales requises
    return !!(user.userId && user.phoneNumber && user.community);
  }
}
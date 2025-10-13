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
    
    if (userProfile) {
      return true; // Utilisateur authentifié
    } else {
      this.router.navigate(['/auth/phone']); // Rediriger vers l'authentification
      return false;
    }
  }
}
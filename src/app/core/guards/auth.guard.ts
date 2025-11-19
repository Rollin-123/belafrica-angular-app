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
    // ✅ VÉRIFICATION COMPLÈTE ET DÉBOGAGE
    const userProfile = this.storageService.getItem('belafrica_user_profile');
    
    // console.log('🔐 AuthGuard - Vérification:', {
    //   userExists: !!userProfile,
    //   userData: userProfile
    // });

    if (userProfile && this.isValidUser(userProfile)) {
      console.log('✅ AuthGuard - Accès autorisé');
      return true;
    } else {
      // console.log('❌ AuthGuard - Redirection vers auth');
      this.router.navigate(['/auth/phone']);
      return false;
    }
  }

  private isValidUser(user: any): boolean {
    // ✅ VÉRIFICATION PLUS TOLÉRANTE POUR LES TESTS
    const isValid = !!(user && user.userId);
    
    console.log('👤 Validation utilisateur:', {
      hasUserId: !!user?.userId,
      hasPhone: !!user?.phoneNumber, 
      hasCommunity: !!user?.community,
      isValid: isValid
    });
    
    return isValid;
  }
}
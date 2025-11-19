import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { StorageService } from '../services/storage.service'; // Importation nécessaire

@Injectable({
  providedIn: 'root'
})
export class CreatorGuard implements CanActivate {
  
  constructor(
    private router: Router,
    private storageService: StorageService // ✅ INJECTION du StorageService
  ) {}

  canActivate(): boolean {
    // Vérifier si c'est le créateur (vous)
    const isCreator = this.checkIfCreator();
    
    if (isCreator) {
      return true;
    } else {
      // Rediriger vers l'app principale
      this.router.navigate(['/app']);
      return false;
    }
  }

  private checkIfCreator(): boolean {
    // Logique pour identifier le créateur
    const creatorEmails = ['rolinloictianga@gmail.com', 'rollin24Admin@belafrica.com'];
    
    // ✅ Utilisation du StorageService pour la cohérence
    const currentUser = this.storageService.getItem('belafrica_user_profile') || {};
    
    return creatorEmails.includes(currentUser.email) || 
           currentUser.userId?.includes('creator') ||
           window.location.hostname === 'localhost'; // Autoriser en développement
  }
}

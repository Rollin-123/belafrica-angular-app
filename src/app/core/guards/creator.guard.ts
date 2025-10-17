import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class CreatorGuard implements CanActivate {
  
  constructor(private router: Router) {}

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
    // Pour l'instant, on peut utiliser une vérification simple
    const creatorEmails = ['2richepintchouabou0@gmail.com', 'rollin24Admin@belafrica.com'];
    const currentUser = JSON.parse(localStorage.getItem('belafrica_user_profile') || '{}');
    
    return creatorEmails.includes(currentUser.email) || 
           currentUser.userId?.includes('creator') ||
           window.location.hostname === 'localhost'; // Autoriser en développement
  }
}
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  // Clé utilisée pour stocker le profil utilisateur
  private readonly USER_PROFILE_KEY = 'belafrica_user_profile';

  constructor(private router: Router) {}

  /**
   * Vérifie si l'utilisateur est authentifié en cherchant le profil dans le localStorage.
   */
  isAuthenticated(): boolean {
    const userData = localStorage.getItem(this.USER_PROFILE_KEY);
    return !!userData;
  }

  /**
   * Récupère les données complètes de l'utilisateur.
   */
  getCurrentUser(): any {
    const userData = localStorage.getItem(this.USER_PROFILE_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Construit le nom de la communauté de l'utilisateur (ex: 'Cameroun en Biélorussie').
   */
  getUserCommunity(): string {
    const user = this.getCurrentUser();
    if (user && user.nationalityName && user.countryName) {
      return `${user.nationalityName} en ${user.countryName}`;
    }
    return 'Communauté non définie';
  }

  /**
   * Déconnecte l'utilisateur et redirige vers l'authentification.
   */
  logout(): void {
    localStorage.removeItem(this.USER_PROFILE_KEY);
    this.router.navigate(['/auth/phone']); 
  }
}

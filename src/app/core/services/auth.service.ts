import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: any) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.ensureInitialData();
  }

  private ensureInitialData() {
    // ✅ CORRECTION : Vérifier si on est côté navigateur
    if (this.isBrowser) {
      // Votre code localStorage existant ici
      if (!localStorage.getItem('tempPhone')) {
        localStorage.setItem('tempPhone', '{}');
      }
    }
  }

  // Vos autres méthodes...
}
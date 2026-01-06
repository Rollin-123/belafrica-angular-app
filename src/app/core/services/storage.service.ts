/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: any) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // Méthode sécurisée pour setItem
  setItem(key: string, value: any): void {
    if (this.isBrowser) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error('❌ Erreur localStorage setItem:', error);
      }
    }
  }

  getItem(key: string): any {
    if (this.isBrowser) {
      try {
        const item = localStorage.getItem(key);
        if (!item) return null;

        // ✅ CORRECTION: Essayer de parser. Si ça échoue, c'est probablement une chaîne brute (comme un token).
        try {
          return JSON.parse(item);
        } catch (e) {
          return item; 
        }
      } catch (error) {
        console.error(`❌ Erreur localStorage getItem pour la clé "${key}":`, error);
        return null;
      }
    }
    return null;
  }

  // Méthode sécurisée pour removeItem
  removeItem(key: string): void {
    if (this.isBrowser) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('❌ Erreur localStorage removeItem:', error);
      }
    }
  }

  // Méthode sécurisée pour clear
  clear(): void {
    if (this.isBrowser) {
      try {
        localStorage.clear();
      } catch (error) {
        console.error('❌ Erreur localStorage clear:', error);
      }
    }
  }
}
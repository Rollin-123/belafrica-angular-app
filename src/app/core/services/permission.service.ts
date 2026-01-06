/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { Injectable } from '@angular/core';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {

  constructor(private userService: UserService) {}

  // Vérifier si l'utilisateur peut poster dans un espace
  canPostIn(space: 'national' | 'international'): boolean {
    const user = this.userService.getCurrentUser();
    if (!user?.is_admin) return false;

    const permissions = user.admin_permissions || [];
    
    switch(space) {
      case 'national':
        return permissions.includes('post_national');
      case 'international':
        return permissions.includes('post_international');
      default:
        return false;
    }
  }

  // Obtenir le niveau admin sous forme lisible
  getAdminLevelLabel(): string {
    const user = this.userService.getCurrentUser();
    if (!user?.is_admin) return 'Utilisateur';

    const permissions = user.admin_permissions || [];
    
    if (permissions.includes('post_national') && permissions.includes('post_international')) {
      return 'Admin Complet';
    } else if (permissions.includes('post_international')) {
      return 'Admin International';
    } else if (permissions.includes('post_national')) {
      return 'Admin National';
    } else {
      return 'Admin';
    }
  }
}
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
    if (!user?.isAdmin) return false;

    const permissions = user.adminPermissions || [];
    
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
    if (!user?.isAdmin) return 'Utilisateur';

    const permissions = user.adminPermissions || [];
    
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
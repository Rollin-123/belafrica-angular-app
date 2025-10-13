import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from './storage.service';

export interface User {
  userId: string;
  phoneNumber: string;
  countryCode: string;
  countryName: string;
  nationality: string;
  nationalityName: string;
  pseudo: string;
  email?: string;
  avatar?: string;
  community: string; // Ex: "CamerounaisEnFrance"
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private currentUser = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUser.asObservable();

  constructor(private storageService: StorageService) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const userData = this.storageService.getItem('belafrica_user_profile');
    if (userData) {
      // Calculer la communauté automatiquement
      const community = `${userData.nationalityName}En${userData.countryName.replace(/\s/g, '')}`;
      const userWithCommunity = {
        ...userData,
        community
      };
      this.currentUser.next(userWithCommunity);
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser.value;
  }

  getUserCommunity(): string {
    const user = this.currentUser.value;
    return user?.community || '';
  }

  logout(): void {
    this.storageService.removeItem('belafrica_user_profile');
    this.storageService.removeItem('tempPhone');
    this.storageService.removeItem('userRegistrationData');
    this.currentUser.next(null);
  }
}
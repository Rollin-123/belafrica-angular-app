import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly USER_PROFILE_KEY = 'belafrica_user_profile';
  private readonly USED_PHONES_KEY = 'belafrica_used_phones';
  private readonly PROFILES_KEY = 'belafrica_profiles';

  constructor(private router: Router) {
    this.ensureInitialData();
  }

  // =============================================================================
  // INITIALISATION
  // =============================================================================
  private ensureInitialData(): void {
    if (!localStorage.getItem(this.USED_PHONES_KEY)) {
      localStorage.setItem(this.USED_PHONES_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.PROFILES_KEY)) {
      localStorage.setItem(this.PROFILES_KEY, JSON.stringify({}));
    }
  }

  // =============================================================================
  // GESTION DES PROFILS UTILISATEURS
  // =============================================================================
  private getProfilesData(): { [userId: string]: any } {
    const data = localStorage.getItem(this.PROFILES_KEY);
    return data ? JSON.parse(data) : {};
  }

  private setProfilesData(data: { [userId: string]: any }): void {
    localStorage.setItem(this.PROFILES_KEY, JSON.stringify(data));
  }

  // 🔄 Créer ou mettre à jour un profil utilisateur
  private saveUserProfile(userData: any): void {
    const profiles = this.getProfilesData();
    const userId = userData.userId;
    
    profiles[userId] = {
      // Données IMMUABLES
      nationality: userData.nationality,
      nationalityName: userData.nationalityName,
      pseudo: userData.pseudo,
      email: userData.email,
      avatar: userData.avatar,
      createdAt: userData.createdAt,
      
      // Historique des communautés
      communitiesHistory: profiles[userId]?.communitiesHistory || [],
      lastLogin: new Date().toISOString()
    };

    // Ajouter la communauté actuelle à l'historique
    const currentCommunity = `${userData.nationalityName} en ${userData.countryName}`;
    if (!profiles[userId].communitiesHistory.includes(currentCommunity)) {
      profiles[userId].communitiesHistory.push(currentCommunity);
    }

    this.setProfilesData(profiles);
  }

  // 🔄 Récupérer un profil utilisateur par ID
  getUserProfileById(userId: string): any {
    const profiles = this.getProfilesData();
    return profiles[userId] || null;
  }

  // =============================================================================
  // GESTION DES NUMÉROS DE TÉLÉPHONE
  // =============================================================================
  private getUsedPhonesData(): string[] {
    const data = localStorage.getItem(this.USED_PHONES_KEY);
    return data ? JSON.parse(data) : [];
  }

  private setUsedPhonesData(data: string[]): void {
    localStorage.setItem(this.USED_PHONES_KEY, JSON.stringify(data));
  }

  // 🔄 Vérifier si un numéro est connu
  isPhoneNumberKnown(phoneNumber: string): boolean {
    const usedPhones = this.getUsedPhonesData();
    return usedPhones.includes(phoneNumber);
  }

  // 🔄 Enregistrer un numéro pour la reconnexion
  private registerPhoneNumber(phoneNumber: string, userId: string): void {
    const usedPhones = this.getUsedPhonesData();
    if (!usedPhones.includes(phoneNumber)) {
      usedPhones.push(phoneNumber);
      this.setUsedPhonesData(usedPhones);
    }

    // Lier le numéro à l'userId
    const phoneMapping = this.getPhoneToUserMapping();
    phoneMapping[phoneNumber] = userId;
    localStorage.setItem('belafrica_phone_mapping', JSON.stringify(phoneMapping));
  }

  // 🔄 Trouver l'userId associé à un numéro
  private getUserIdFromPhone(phoneNumber: string): string | null {
    const phoneMapping = this.getPhoneToUserMapping();
    return phoneMapping[phoneNumber] || null;
  }

  private getPhoneToUserMapping(): { [phoneNumber: string]: string } {
    const mapping = localStorage.getItem('belafrica_phone_mapping');
    return mapping ? JSON.parse(mapping) : {};
  }

  // =============================================================================
  // FONCTIONNALITÉS PRINCIPALES
  // =============================================================================
  // 🆕 NOUVELLE INSCRIPTION
  registerNewUser(userData: any): void {
    const userId = this.generateUserId();
    const profile = {
      ...userData,
      userId,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    this.setCurrentProfile(profile);
    this.saveUserProfile(profile);
    this.registerPhoneNumber(userData.fullPhoneNumber, userId);
    
    this.router.navigate(['/app']);
  }

  // 🔄 RECONNEXION
  reconnectUser(phoneData: any, selectedNationality: string): void {
    const userId = this.getUserIdFromPhone(phoneData.fullPhoneNumber);
    
    if (!userId) {
      console.error('❌ UserId non trouvé pour ce numéro');
      this.router.navigate(['/auth/phone']);
      return;
    }

    const userProfile = this.getUserProfileById(userId);
    
    if (!userProfile) {
      console.error('❌ Profil non trouvé');
      this.router.navigate(['/auth/phone']);
      return;
    }

    // ⚠️ RESPECT DE LA NATIONALITÉ IMMUABLE
    if (userProfile.nationality !== selectedNationality) {
      alert('⚠️ Votre nationalité ne peut pas être modifiée. Utilisation de votre nationalité d\'origine.');
    }

    const currentProfile = {
      ...phoneData,
      userId: userId,
      nationality: userProfile.nationality, // ⬅️ TOUJOURS l'originale
      nationalityName: userProfile.nationalityName,
      pseudo: userProfile.pseudo,
      email: userProfile.email,
      avatar: userProfile.avatar,
      createdAt: userProfile.createdAt,
      reconnectedAt: new Date().toISOString()
    };

    this.setCurrentProfile(currentProfile);
    this.saveUserProfile(currentProfile);
    
    this.router.navigate(['/app']);
  }

  // 🔄 CHANGEMENT DE NUMÉRO (Même utilisateur, nouvelle communauté)
  changePhoneNumber(newPhoneData: any): void {
    const currentUser = this.getCurrentUser();
    
    if (!currentUser) {
      console.error('❌ Utilisateur non connecté');
      return;
    }

    const updatedProfile = {
      ...currentUser,
      ...newPhoneData,
      phoneChangedAt: new Date().toISOString(),
      previousCommunity: `${currentUser.nationalityName} en ${currentUser.countryName}`
    };

    this.setCurrentProfile(updatedProfile);
    this.registerPhoneNumber(newPhoneData.fullPhoneNumber, currentUser.userId);
    this.saveUserProfile(updatedProfile);

    console.log('📞 Numéro changé avec succès');
  }

  // =============================================================================
  // DÉCONNEXION INTELLIGENTE
  // =============================================================================
  logout(options?: { changePhone?: boolean }): void {
    const currentUser = this.getCurrentUser();
    
    if (options?.changePhone) {
      // Mode "Changer de numéro" - Garder le profil en mémoire
      console.log('🔄 Déconnexion pour changement de numéro');
      localStorage.setItem('belafrica_pending_phone_change', 'true');
    } else {
      // Déconnexion normale
      console.log('👋 Déconnexion normale');
    }

    localStorage.removeItem(this.USER_PROFILE_KEY);
    this.router.navigate(['/auth/phone']);
  }

  // Vérifier si c'est un changement de numéro en attente
  isPendingPhoneChange(): boolean {
    return localStorage.getItem('belafrica_pending_phone_change') === 'true';
  }

  clearPendingPhoneChange(): void {
    localStorage.removeItem('belafrica_pending_phone_change');
  }

  // =============================================================================
  // METHODES EXISTANTES (à conserver)
  // =============================================================================
  private setCurrentProfile(profile: any): void {
    localStorage.setItem(this.USER_PROFILE_KEY, JSON.stringify(profile));
  }

  getCurrentUser(): any {
    const profile = localStorage.getItem(this.USER_PROFILE_KEY);
    return profile ? JSON.parse(profile) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  getUserCommunity(): string {
    const user = this.getCurrentUser();
    return user ? `${user.nationalityName} en ${user.countryName}` : '';
  }

  private generateUserId(): string {
    return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  getCountryName(countryCode: string): string {
    const countries: { [key: string]: string } = {
      '+33': 'France', '+32': 'Belgique', '+49': 'Allemagne', '+39': 'Italie',
      '+34': 'Espagne', '+41': 'Suisse', '+44': 'Royaume-Uni', '+1': 'Canada',
      '+7': 'Russie', '+375': 'Biélorussie'
    };
    return countries[countryCode] || 'Inconnu';
  }
}
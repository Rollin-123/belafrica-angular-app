import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

export interface PhoneValidationResult {
  isValid: boolean;
  type: 'reconnection' | 'phone_change' | 'new_registration' | 'invalid';
  message?: string;
  userId?: string;
  previousProfile?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly USER_PROFILE_KEY = 'belafrica_user_profile';
  private readonly USED_PHONES_KEY = 'belafrica_used_phones';
  private readonly PROFILES_KEY = 'belafrica_profiles';
  private readonly PHONE_MAPPING_KEY = 'belafrica_phone_mapping';

  constructor(private router: Router) {
    this.ensureInitialData();
  }

  // =============================================================================
  // INITIALISATION DES DONNÉES
  // =============================================================================
  private ensureInitialData(): void {
    if (!localStorage.getItem(this.USED_PHONES_KEY)) {
      localStorage.setItem(this.USED_PHONES_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.PROFILES_KEY)) {
      localStorage.setItem(this.PROFILES_KEY, JSON.stringify({}));
    }
    if (!localStorage.getItem(this.PHONE_MAPPING_KEY)) {
      localStorage.setItem(this.PHONE_MAPPING_KEY, JSON.stringify({}));
    }
  }

  // =============================================================================
  // VALIDATION INTELLIGENTE DU NUMÉRO
  // =============================================================================
  validatePhoneNumber(phoneData: any): PhoneValidationResult {
    const fullPhoneNumber = `${phoneData.countryCode}${phoneData.phoneNumber.replace(/\s/g, '')}`;
    
    // Vérifier si le numéro est déjà utilisé
    const usedPhones = this.getUsedPhonesData();
    const isPhoneKnown = usedPhones.includes(fullPhoneNumber);
    
    if (!isPhoneKnown) {
      // Nouveau numéro → Nouvelle inscription
      return {
        isValid: true,
        type: 'new_registration',
        message: 'Nouvelle inscription détectée'
      };
    }

    // Numéro connu → Vérifier la cohérence pays
    const userId = this.getUserIdFromPhone(fullPhoneNumber);
    const previousProfile = this.getUserProfileById(userId!);
    
    if (!previousProfile) {
      return {
        isValid: false,
        type: 'invalid',
        message: 'Erreur: Profil non trouvé pour ce numéro'
      };
    }

    // ⚠️ CRITIQUE : Vérifier la cohérence du pays
    const previousCountry = this.getCountryFromPhone(previousProfile.phoneNumber);
    const newCountry = this.getCountryNameFromCode(phoneData.countryCode);
    
    if (previousCountry !== newCountry) {
      return {
        isValid: false,
        type: 'invalid',
        message: `Impossible de changer de pays. Votre numéro est associé à ${previousCountry}.`
      };
    }

    // Vérifier le type d'opération
    if (this.isPendingPhoneChange()) {
      return {
        isValid: true,
        type: 'phone_change',
        message: 'Changement de numéro confirmé',
        userId: userId!,
        previousProfile
      };
    } else {
      return {
        isValid: true,
        type: 'reconnection',
        message: 'Reconnexion détectée',
        userId: userId!,
        previousProfile
      };
    }
  }

  // =============================================================================
  // GESTION DES OPÉRATIONS
  // =============================================================================
  handleNewRegistration(phoneData: any): void {
    // Stocker temporairement pour l'OTP
    localStorage.setItem('tempPhone', JSON.stringify({
      ...phoneData,
      fullPhoneNumber: `${phoneData.countryCode}${phoneData.phoneNumber.replace(/\s/g, '')}`
    }));
  }

  handleReconnection(validationResult: PhoneValidationResult, phoneData: any): void {
    const { userId, previousProfile } = validationResult;
    
    localStorage.setItem('tempPhone', JSON.stringify({
      ...phoneData,
      fullPhoneNumber: `${phoneData.countryCode}${phoneData.phoneNumber.replace(/\s/g, '')}`
    }));
    localStorage.setItem('isReconnection', 'true');

    console.log('🔄 Reconnexion pour:', previousProfile.pseudo);
  }

  handlePhoneChange(validationResult: PhoneValidationResult, phoneData: any): void {
    const { userId, previousProfile } = validationResult;
    
    // Mettre à jour le profil avec le nouveau numéro
    const updatedProfile = {
      ...previousProfile,
      phoneNumber: `${phoneData.countryCode}${phoneData.phoneNumber.replace(/\s/g, '')}`,
      countryCode: phoneData.countryCode,
      countryName: this.getCountryNameFromCode(phoneData.countryCode),
      phoneChangedAt: new Date().toISOString()
    };

    this.setCurrentProfile(updatedProfile);
    this.updatePhoneMapping(previousProfile.phoneNumber, phoneData, userId!);
    
    console.log('📞 Numéro changé avec succès pour:', previousProfile.pseudo);
    this.router.navigate(['/app']);
  }

  // =============================================================================
  // GESTION DES DONNÉES
  // =============================================================================
  private getUsedPhonesData(): string[] {
    const data = localStorage.getItem(this.USED_PHONES_KEY);
    return data ? JSON.parse(data) : [];
  }

  private setUsedPhonesData(data: string[]): void {
    localStorage.setItem(this.USED_PHONES_KEY, JSON.stringify(data));
  }

  private getProfilesData(): { [userId: string]: any } {
    const data = localStorage.getItem(this.PROFILES_KEY);
    return data ? JSON.parse(data) : {};
  }

  private setProfilesData(data: { [userId: string]: any }): void {
    localStorage.setItem(this.PROFILES_KEY, JSON.stringify(data));
  }

  private getPhoneMappingData(): { [phoneNumber: string]: string } {
    const data = localStorage.getItem(this.PHONE_MAPPING_KEY);
    return data ? JSON.parse(data) : {};
  }

  private setPhoneMappingData(data: { [phoneNumber: string]: string }): void {
    localStorage.setItem(this.PHONE_MAPPING_KEY, JSON.stringify(data));
  }

  // =============================================================================
  // METHODES EXISTANTES AMÉLIORÉES
  // =============================================================================
  registerNewUser(userData: any): void {
    const userId = this.generateUserId();
    const fullPhoneNumber = userData.fullPhoneNumber || `${userData.countryCode}${userData.phoneNumber.replace(/\s/g, '')}`;
    
    const profile = {
      ...userData,
      userId,
      phoneNumber: fullPhoneNumber,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    // Sauvegarder le profil
    this.setCurrentProfile(profile);
    
    // Enregistrer le numéro et le mapping
    this.registerPhoneNumber(fullPhoneNumber, userId);
    this.saveUserProfile(profile);
    
    this.router.navigate(['/app']);
  }

  completeReconnection(phoneData: any, selectedNationality: string): void {
    const validationResult = this.validatePhoneNumber(phoneData);
    
    if (!validationResult.isValid || validationResult.type !== 'reconnection') {
      alert('❌ Erreur lors de la reconnexion');
      this.router.navigate(['/auth/phone']);
      return;
    }

    const { userId, previousProfile } = validationResult;

    // Vérifier la cohérence de la nationalité
    if (previousProfile.nationality !== selectedNationality) {
      alert('⚠️ Votre nationalité ne peut pas être modifiée. Utilisation de votre nationalité d\'origine.');
    }

    const currentProfile = {
      ...phoneData,
      userId: userId!,
      nationality: previousProfile.nationality, // Toujours l'originale
      nationalityName: previousProfile.nationalityName,
      pseudo: previousProfile.pseudo,
      email: previousProfile.email,
      avatar: previousProfile.avatar,
      createdAt: previousProfile.createdAt,
      reconnectedAt: new Date().toISOString()
    };

    this.setCurrentProfile(currentProfile);
    this.router.navigate(['/app']);
  }

  // =============================================================================
  // METHODES UTILITAIRES
  // =============================================================================
  private registerPhoneNumber(phoneNumber: string, userId: string): void {
    const usedPhones = this.getUsedPhonesData();
    if (!usedPhones.includes(phoneNumber)) {
      usedPhones.push(phoneNumber);
      this.setUsedPhonesData(usedPhones);
    }

    const phoneMapping = this.getPhoneMappingData();
    phoneMapping[phoneNumber] = userId;
    this.setPhoneMappingData(phoneMapping);
  }

  private updatePhoneMapping(oldPhone: string, newPhoneData: any, userId: string): void {
    const phoneMapping = this.getPhoneMappingData();
    const newPhoneNumber = `${newPhoneData.countryCode}${newPhoneData.phoneNumber.replace(/\s/g, '')}`;
    
    // Supprimer l'ancien mapping et ajouter le nouveau
    delete phoneMapping[oldPhone];
    phoneMapping[newPhoneNumber] = userId;
    
    this.setPhoneMappingData(phoneMapping);

    // Mettre à jour la liste des numéros utilisés
    const usedPhones = this.getUsedPhonesData();
    const index = usedPhones.indexOf(oldPhone);
    if (index > -1) {
      usedPhones.splice(index, 1);
    }
    usedPhones.push(newPhoneNumber);
    this.setUsedPhonesData(usedPhones);
  }

  private getUserIdFromPhone(phoneNumber: string): string | null {
    const phoneMapping = this.getPhoneMappingData();
    return phoneMapping[phoneNumber] || null;
  }

  private getUserProfileById(userId: string): any {
    const profiles = this.getProfilesData();
    return profiles[userId] || null;
  }

  private saveUserProfile(userData: any): void {
    const profiles = this.getProfilesData();
    profiles[userData.userId] = {
      nationality: userData.nationality,
      nationalityName: userData.nationalityName,
      pseudo: userData.pseudo,
      email: userData.email,
      avatar: userData.avatar,
      createdAt: userData.createdAt,
      phoneNumber: userData.phoneNumber,
      lastLogin: new Date().toISOString()
    };
    this.setProfilesData(profiles);
  }

  private getCountryFromPhone(phoneNumber: string): string {
    // Extraire le code pays du numéro complet
    const countryCode = phoneNumber.substring(0, 3); // +33, +32, etc.
    return this.getCountryNameFromCode(countryCode);
  }

  private getCountryNameFromCode(code: string): string {
    const countries: { [key: string]: string } = {
      '+33': 'France', '+32': 'Belgique', '+49': 'Allemagne', '+39': 'Italie',
      '+34': 'Espagne', '+41': 'Suisse', '+44': 'Royaume-Uni', '+1': 'Canada',
      '+7': 'Russie', '+375': 'Biélorussie'
    };
    return countries[code] || 'Inconnu';
  }

  // =============================================================================
// MÉTHODES MANQUANTES POUR LA COMPATIBILITÉ
// =============================================================================

/**
 * 🆕 Méthode pour récupérer un profil précédent (compatibilité)
 */
getPreviousProfile(phoneNumber: string): any {
  const userId = this.getUserIdFromPhone(phoneNumber);
  if (userId) {
    return this.getUserProfileById(userId);
  }
  return null;
}

/**
 * 🆕 Méthode de reconnexion (compatibilité)
 */
reconnectUser(phoneData: any, selectedNationality: string): void {
  this.completeReconnection(phoneData, selectedNationality);
}

/**
 * 🆕 Méthode de changement de numéro (compatibilité)
 */
changePhoneNumber(newPhoneData: any): void {
  const validationResult = this.validatePhoneNumber(newPhoneData);
  
  if (validationResult.isValid && validationResult.type === 'phone_change') {
    this.handlePhoneChange(validationResult, newPhoneData);
  } else {
    console.error('❌ Impossible de changer le numéro:', validationResult.message);
    this.router.navigate(['/auth/phone']);
  }
}

  // =============================================================================
  // METHODES PUBLIQUES EXISTANTES
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

  isPendingPhoneChange(): boolean {
    return localStorage.getItem('belafrica_pending_phone_change') === 'true';
  }

  setPendingPhoneChange(): void {
    localStorage.setItem('belafrica_pending_phone_change', 'true');
  }

  clearPendingPhoneChange(): void {
    localStorage.removeItem('belafrica_pending_phone_change');
  }

  logout(options?: { changePhone?: boolean }): void {
    if (options?.changePhone) {
      this.setPendingPhoneChange();
    }
    localStorage.removeItem(this.USER_PROFILE_KEY);
    this.router.navigate(['/auth/phone']);
  }

  private generateUserId(): string {
    return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}
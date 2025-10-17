import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { UserService } from './user.service';
import { EmailService } from './email.service'; 
import { AdminCode, AdminVerificationRequest } from '../models/admin.model';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private requestsKey = 'belafrica_admin_requests';
  private codesKey = 'belafrica_admin_codes';

  constructor(
    private storageService: StorageService,
    private userService: UserService,
    private emailService: EmailService // ⬅️ INJECTION
  ) {
    // this.emailService.testEmailJSConfig(); // Test au démarrage
  }

  // ✅ GÉNÉRER UN CODE COURT (6 caractères)
  private generateShortCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // ✅ FORMATER LE NOM DE LA COMMUNAUTÉ
  private formatCommunityName(nationality: string, countryName: string): string {
    const cleanNationality = nationality
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '');
    
    const cleanCountry = countryName
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '');
    
    return `${cleanNationality}En${cleanCountry}`;
  }

 // Dans admin.service.ts - CORRIGEZ la méthode generateAdminCode
async generateAdminCode(
  countryCode: string,     
  countryName: string,      
  nationality: string,      
  userEmail: string,
  permissions: string[],
  expiresInHours: number
): Promise<{ success: boolean; code?: string; error?: string }> { // ⬅️ CORRECTION
    
  try {
    // 1. Calculer la communauté automatiquement
    const community = this.formatCommunityName(nationality, countryName);
    
    // 2. Générer code court
    const code = this.generateShortCode();
    
    const adminCode: AdminCode = {
      code,
      community,
      userEmail,
      permissions,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
      createdAt: new Date(),
      used: false
    };

    // Sauvegarder code
    const existingCodes = this.getAdminCodes();
    const updatedCodes = [adminCode, ...existingCodes];
    this.storageService.setItem(this.codesKey, updatedCodes);

    console.log('🔑 Code admin généré:', {
      code,
      community, 
      email: userEmail,
      expiresIn: expiresInHours + 'h'
    });

    // 3. ENVOI EMAIL RÉEL avec EmailJS
    try {
      const emailSent = await this.emailService.sendAdminCode(
        userEmail, 
        code, 
        community, 
        expiresInHours
      );

      if (emailSent) {
        console.log('✅ Email envoyé avec succès à:', userEmail);
        return { success: true, code }; // ⬅️ CORRECTION
      } else {
        console.warn('⚠️ Email non envoyé, fallback activé');
        return { success: true, code }; // ⬅️ CORRECTION (on retourne quand même le code)
      }
    } catch (error) {
      console.error('❌ Erreur envoi email:', error);
      return { success: true, code }; // ⬅️ CORRECTION (on retourne quand même le code)
    }

  } catch (error: any) {
    console.error('❌ Erreur génération code:', error);
    return { success: false, error: error.message }; // ⬅️ CORRECTION
  }
}

  // ✅ SOUMETTRE DEMANDE ADMIN AVEC NOTIFICATION
  async submitAdminRequest(passportPhoto: string, additionalInfo: string): Promise<boolean> {
    const user = this.userService.getCurrentUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const request: AdminVerificationRequest = {
      id: this.generateRequestId(),
      userId: user.userId,
      userPseudo: user.pseudo,
      userCommunity: user.community,
      userPhone: user.phoneNumber,
      userEmail: user.email,
      passportPhoto,
      additionalInfo,
      status: 'pending',
      submittedAt: new Date()
    };

    // Sauvegarder demande
    const existingRequests = this.getAdminRequests();
    const updatedRequests = [request, ...existingRequests];
    this.storageService.setItem(this.requestsKey, updatedRequests);

    console.log('📨 Demande admin soumise:', request.userPseudo);

    // Envoyer notification email
    try {
      await this.emailService.sendAdminRequestNotification(request);
      console.log('✅ Notification demande envoyée');
    } catch (error) {
      console.error('❌ Erreur notification demande:', error);
    }

    return true;
  }

 // Dans validateAdminCode - AJOUTEZ cette vérification
validateAdminCode(code: string): boolean {
  const user = this.userService.getCurrentUser();
  if (!user) return false;

  const adminCodes = this.getAdminCodes();
  const validCode = adminCodes.find(ac => 
    ac.code === code && 
    new Date(ac.expiresAt) > new Date() &&
    !ac.used
  );

  if (validCode) {
    // ✅ NOUVELLE VÉRIFICATION : Accès selon permissions
    const userCommunity = user.community;
    const codeCommunity = validCode.community;
    
    // Admin International peut poster partout
    if (validCode.permissions.includes('post_international') && 
        !validCode.permissions.includes('post_national')) {
      // Vérifier que c'est bien un admin international
      if (codeCommunity !== 'International') {
        console.log('❌ Accès refusé: code international requis');
        return false;
      }
    }
    // Admin National ne peut poster que dans sa communauté
    else if (validCode.permissions.includes('post_national') && 
             !validCode.permissions.includes('post_international')) {
      if (codeCommunity !== userCommunity) {
        console.log('❌ Accès refusé: communauté différente');
        return false;
      }
    }
    // Admin Complet (les deux permissions)
    else if (validCode.permissions.includes('post_national') && 
             validCode.permissions.includes('post_international')) {
      // Peut poster partout - pas de restriction
      console.log('✅ Admin complet - accès à tous les espaces');
    }

    // Marquer code comme utilisé et promouvoir
    this.markCodeAsUsed(code, user.userId);
    this.promoteToAdmin(validCode.permissions, validCode.community);
    
    console.log('✅ Utilisateur promu admin:', user.pseudo);
    return true;
  }

  console.log('❌ Code invalide ou expiré');
  return false;
}

  // ✅ PROMOUVOIR UTILISATEUR ADMIN
  private promoteToAdmin(permissions: string[], community: string): void {
    const user = this.userService.getCurrentUser();
    if (user) {
      const updatedUser = {
        ...user,
        isAdmin: true,
        adminPermissions: permissions,
        adminCommunity: community,
        adminSince: new Date()
      };
      
      this.storageService.setItem('belafrica_user_profile', updatedUser);
      
      // Déclencher un event pour mettre à jour l'UI
      this.userService.notifyUserUpdate();
    }
  }

  // ✅ VÉRIFIER SI ADMIN
  isUserAdmin(): boolean {
    const user = this.userService.getCurrentUser();
    return user?.isAdmin || false;
  }

  // ✅ VÉRIFIER DEMANDE EN ATTENTE
  hasPendingRequest(): boolean {
    const user = this.userService.getCurrentUser();
    if (!user) return false;

    const requests = this.getAdminRequests();
    return requests.some(request => 
      request.userId === user.userId && 
      request.status === 'pending'
    );
  }

  // ✅ MÉTHODES PRIVÉES
  private getAdminRequests(): AdminVerificationRequest[] {
    return this.storageService.getItem(this.requestsKey) || [];
  }

  private getAdminCodes(): AdminCode[] {
    return this.storageService.getItem(this.codesKey) || [];
  }

  private markCodeAsUsed(code: string, userId: string): void {
    const codes = this.getAdminCodes();
    const updatedCodes = codes.map(ac => {
      if (ac.code === code) {
        return { 
          ...ac, 
          used: true, 
          usedBy: userId, 
          usedAt: new Date() 
        };
      }
      return ac;
    });
    this.storageService.setItem(this.codesKey, updatedCodes);
  }

  private generateRequestId(): string {
    return 'req_' + Math.random().toString(36).substr(2, 9);
  }

  // ✅ RÉCUPÉRER LES CODES GÉNÉRÉS
  getGeneratedCodes(): AdminCode[] {
    return this.getAdminCodes()
      .filter(code => !code.used)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
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
    private emailService: EmailService
  ) {}

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

  // ✅ CORRECTION : GÉNÉRATION DE CODE ADMIN
  async generateAdminCode(
    countryCode: string,  
    countryName: string,  
    nationality: string,  
    userEmail: string,
    permissions: string[] = ['post_national'],
    expiresInHours: number = 72
  ): Promise<{ success: boolean; code?: string; error?: string }> { 
    
    try {
      const community = this.formatCommunityName(nationality, countryName);
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

      const existingCodes: AdminCode[] = this.getAdminCodes();
      const updatedCodes = [adminCode, ...existingCodes];
      this.storageService.setItem(this.codesKey, updatedCodes);

      console.log('🔑 Code admin généré:', {
        code,
        community, 
        email: userEmail,
        expiresIn: expiresInHours + 'h'
      });

      try {
        const emailResult = await this.emailService.sendAdminCode(
          userEmail, 
          code, 
          community, 
          expiresInHours
        );

        if (emailResult.success) {
          console.log('✅ Email envoyé avec succès à:', userEmail);
          return { success: true, code };
        } else {
          console.error('❌ Échec envoi email:', emailResult.error);
          return { success: true, code, error: emailResult.error }; 
        }
      } catch (error: any) {
        console.error('❌ Erreur envoi email:', error);
        return { success: true, code, error: error.message };
      }

    } catch (error: any) {
      console.error('❌ Erreur génération code:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ CORRECTION : SOUMETTRE DEMANDE ADMIN
  async submitAdminRequest(passportPhotoUrl: string, additionalInfo: string): Promise<boolean> {
    const user = this.userService.getCurrentUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const request: AdminVerificationRequest = {
      id: this.generateRequestId(),
      userId: user.userId,
      userPseudo: user.pseudo,
      userCommunity: user.community,
      userPhone: user.phoneNumber,
      userEmail: user.email,
      passportPhoto: passportPhotoUrl,
      additionalInfo,
      status: 'pending',
      submittedAt: new Date()
    };

    const existingRequests = this.getAdminRequests();
    const updatedRequests = [request, ...existingRequests];
    this.storageService.setItem(this.requestsKey, updatedRequests);

    console.log('📨 Demande admin soumise:', request.userPseudo);

    try {
      const codeResult = await this.generateAdminCode(
        user.countryCode,
        user.countryName, 
        user.nationality,
        user.email || 'rollinloictianga@gmail.com',
        ['post_national'],
        72
      );

      if (codeResult.success && codeResult.code) {
        console.log('✅ Code admin généré pour la demande:', codeResult.code);
        
        const finalRequests = updatedRequests.map(req => 
          req.id === request.id ? { ...req, adminCode: codeResult.code } : req
        );
        this.storageService.setItem(this.requestsKey, finalRequests);
        
        await this.emailService.sendAdminRequestNotification(request);
        console.log('✅ Notification demande envoyée au créateur');
      } else {
        console.error('❌ Erreur génération code pour demande:', codeResult.error);
      }
    } catch (error) {
      console.error('❌ Erreur traitement demande:', error);
    }

    return true;
  }

  // ✅ NOUVELLE MÉTHODE : Validation avec redirection automatique
  async validateAdminCodeWithRedirect(code: string, router: Router): Promise<boolean> {
    console.log('🔑 Validation du code avec redirection:', code);

    const user = this.userService.getCurrentUser();
    if (!user) {
      console.error('❌ Aucun utilisateur connecté');
      return false;
    }

    const adminCodes: AdminCode[] = this.getAdminCodes();
    const validCode = adminCodes.find(ac => 
      ac.code === code && 
      new Date(ac.expiresAt) > new Date() &&
      !ac.used
    );

    if (!validCode) {
      console.log('❌ Code invalide, expiré ou déjà utilisé');
      return false;
    }

    console.log('✅ Code valide trouvé:', validCode);

    const userCommunity = user.community;
    const codeCommunity = validCode.community;

    if (validCode.permissions.includes('post_international') && 
    !validCode.permissions.includes('post_national')) {
      if (codeCommunity !== 'International') {
        console.log('❌ Accès refusé: code international requis');
        return false;
      }
    } else if (validCode.permissions.includes('post_national') && 
      !validCode.permissions.includes('post_international')) {
      if (codeCommunity !== userCommunity) {
        console.log(`❌ Accès refusé: communauté différente (vous: ${userCommunity}, code: ${codeCommunity})`);
        return false;
      }
    }

    this.markCodeAsUsed(code, user.userId);
    this.userService.promoteToAdmin(validCode.permissions);
    
    console.log('✅ Utilisateur promu admin:', user.pseudo);

    setTimeout(() => {
      console.log('🔄 Redirection automatique vers /national');
      router.navigate(['/app/national']);
    }, 1000);

    return true;
  }

  // ✅ MÉTHODE EXISTANTE AMÉLIORÉE
  validateAdminCode(code: string): boolean {
    const user = this.userService.getCurrentUser();
    if (!user) return false;

    const adminCodes: AdminCode[] = this.getAdminCodes();
    const validCode = adminCodes.find(ac => 
      ac.code === code && 
      new Date(ac.expiresAt) > new Date() &&
      !ac.used
    );

    if (!validCode) return false;

    const userCommunity = user.community;
    const codeCommunity = validCode.community;

    if (validCode.permissions.includes('post_international') && 
    !validCode.permissions.includes('post_national')) {
      if (codeCommunity !== 'International') return false;
    } else if (validCode.permissions.includes('post_national') && 
      !validCode.permissions.includes('post_international')) {
      if (codeCommunity !== userCommunity) return false;
    }

    this.markCodeAsUsed(code, user.userId);
    this.userService.promoteToAdmin(validCode.permissions);
    
    return true;
  }

  // ✅ VÉRIFICATIONS DE PERMISSIONS EN TEMPS RÉEL
  canPostNational(): boolean {
    return this.userService.canPostNational();
  }

  canPostInternational(): boolean {
    return this.userService.canPostInternational();
  }

  isUserAdmin(): boolean {
    return this.userService.isUserAdmin();
  }

  hasPendingRequest(): boolean {
    const user = this.userService.getCurrentUser();
    if (!user) return false;

    const requests = this.getAdminRequests();
    return requests.some(request => 
      request.userId === user.userId && 
      request.status === 'pending'
    );
  }

  getPendingRequests(): AdminVerificationRequest[] {
    return this.getAdminRequests()
      .filter(request => request.status === 'pending')
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  }

  updateRequestStatus(requestId: string, newStatus: 'rejected' | 'canceled'): boolean {
    const requests = this.getAdminRequests();
    
    const updatedRequests = requests.map(req => {
      if (req.id === requestId) {
        if (req.status === 'pending') {
          console.log(`🔄 Demande ${requestId} mise à jour: ${req.status} -> ${newStatus}`);
          return { ...req, status: newStatus, resolvedAt: new Date() };
        } else {
          console.warn(`⚠️ Demande ${requestId} n'est pas en attente (status: ${req.status}). Statut non mis à jour.`);
          return req;
        }
      }
      return req;
    });
    
    const wasUpdated = updatedRequests.some(req => req.id === requestId && req.status === newStatus);
    
    if (wasUpdated) {
      this.storageService.setItem(this.requestsKey, updatedRequests);
      return true;
    }
    return false;
  }

  // ✅ MÉTHODES PRIVÉES
  private getAdminRequests(): AdminVerificationRequest[] {
    const rawData = this.storageService.getItem(this.requestsKey);
    return (rawData || []) as AdminVerificationRequest[];
  }

  private getAdminCodes(): AdminCode[] {
    const rawData = this.storageService.getItem(this.codesKey);
    return (rawData || []) as AdminCode[];
  }

  private markCodeAsUsed(code: string, userId: string): void {
    const codes: AdminCode[] = this.getAdminCodes();
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

  getGeneratedCodes(): AdminCode[] {
    return this.getAdminCodes()
      .filter(code => !code.used)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  resetAdminData(): void {
    this.storageService.removeItem(this.requestsKey);
    this.storageService.removeItem(this.codesKey);
    this.userService.resetAdminStatus();
    console.log('🔄 Données admin réinitialisées');
  }
}
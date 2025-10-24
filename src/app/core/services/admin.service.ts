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
 permissions: string[] = ['post_national'], // Valeur par défaut
 expiresInHours: number = 72 // 3 jours par défaut
 ): Promise<{ success: boolean; code?: string; error?: string }> { 
 
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
  const existingCodes: AdminCode[] = this.getAdminCodes();
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
 // Mais on retourne quand même le code généré
 return { success: true, code, error: emailResult.error }; 
 }
  } catch (error: any) {
 console.error('❌ Erreur envoi email:', error);
 // On retourne le code même si l'email échoue
 return { success: true, code, error: error.message };
  }

 } catch (error: any) {
  console.error('❌ Erreur génération code:', error);
  return { success: false, error: error.message };
 }
 }

 // ✅ CORRECTION : SOUMETTRE DEMANDE ADMIN
 // MODIFIÉ : passportPhoto est maintenant une URL (string)
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
  passportPhoto: passportPhotoUrl, // <-- URL Cloudinary stockée
  additionalInfo,
  status: 'pending',
  submittedAt: new Date()
 };

 // Sauvegarder demande
 const existingRequests = this.getAdminRequests();
 const updatedRequests = [request, ...existingRequests];
 this.storageService.setItem(this.requestsKey, updatedRequests);

 console.log('📨 Demande admin soumise:', request.userPseudo);

 // ✅ CORRECTION : GÉNÉRER ET ENVOYER LE CODE IMMÉDIATEMENT
 try {
  // Générer un code admin pour cet utilisateur
  const codeResult = await this.generateAdminCode(
 user.countryCode,
 user.countryName, 
 user.nationality,
 user.email || 'rollinloictianga@gmail.com', // Email de fallback
 ['post_national'], // Permissions de base
 72 // 72 heures
  );

  if (codeResult.success && codeResult.code) {
 console.log('✅ Code admin généré pour la demande:', codeResult.code);
 
 // Mettre à jour la demande avec le code
 const finalRequests = updatedRequests.map(req => 
 req.id === request.id ? { ...req, adminCode: codeResult.code } : req
 );
 this.storageService.setItem(this.requestsKey, finalRequests);
 
 // Envoyer notification au créateur
 // On utilise l'objet 'request' qui contient maintenant l'URL Cloudinary
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

 // ✅ CORRECTION : VALIDATION DU CODE ADMIN
 validateAdminCode(code: string): boolean {
 const user = this.userService.getCurrentUser();
 if (!user) {
  console.error('❌ Aucun utilisateur connecté');
  return false;
 }

 const adminCodes: AdminCode[] = this.getAdminCodes();
 console.log('🔍 Codes disponibles:', adminCodes.map(c => ({ code: c.code, used: c.used, expires: c.expiresAt })));

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

 // ✅ CORRECTION : Vérification des permissions et communauté
 const userCommunity = user.community;
 const codeCommunity = validCode.community;

 // Vérifier si l'utilisateur a le droit d'utiliser ce code
 if (validCode.permissions.includes('post_international') && 
 !validCode.permissions.includes('post_national')) {
  // Admin International - doit correspondre exactement
  if (codeCommunity !== 'International') {
 console.log('❌ Accès refusé: code international requis');
 return false;
  }
 } else if (validCode.permissions.includes('post_national') && 
  !validCode.permissions.includes('post_international')) {
  // Admin National - doit correspondre à la communauté
  if (codeCommunity !== userCommunity) {
 console.log(`❌ Accès refusé: communauté différente (vous: ${userCommunity}, code: ${codeCommunity})`);
 return false;
  }
 }
 // Admin Complet (les deux permissions) - pas de restriction

 // ✅ CORRECTION : Promouvoir l'utilisateur
 this.markCodeAsUsed(code, user.userId);
 this.promoteToAdmin(validCode.permissions);
 
 console.log('✅ Utilisateur promu admin:', user.pseudo);
 return true;
 }

 // ✅ CORRECTION : PROMOUVOIR UTILISATEUR
 private promoteToAdmin(permissions: string[]): void {
 const user = this.userService.getCurrentUser();
 if (!user) return;

 const updatedUser = {
  ...user,
  isAdmin: true,
  adminPermissions: permissions, // <-- L'array des permissions est sauvegardé ici
  adminLevel: permissions.includes('post_international') ? 'international' : 'national',
  adminSince: new Date().toISOString()
 };
 
 // Sauvegarder l'utilisateur
 this.storageService.setItem('belafrica_user_profile', updatedUser);
 
 // Notifier les composants du changement
 this.userService.notifyUserUpdate();
 
 console.log('👑 Utilisateur promu admin:', {
  pseudo: updatedUser.pseudo,
  permissions: updatedUser.adminPermissions,
  level: updatedUser.adminLevel
 });
 }

 // 🆕 NOUVEAU: Vérifie si l'utilisateur peut poster sur le fil National (sa communauté)
 canPostNational(): boolean {
 const user = this.userService.getCurrentUser();
 return user?.isAdmin && user?.adminPermissions?.includes('post_national') || false;
 }

 // 🆕 NOUVEAU: Vérifie si l'utilisateur peut poster sur le fil International
 canPostInternational(): boolean {
 const user = this.userService.getCurrentUser();
 return user?.isAdmin && user?.adminPermissions?.includes('post_international') || false;
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

 // ✅ NOUVEAU : Récupérer toutes les demandes en attente
 getPendingRequests(): AdminVerificationRequest[] {
 return this.getAdminRequests()
  .filter(request => request.status === 'pending')
  .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
 }

 // ✅ NOUVEAU : Gérer le statut d'une demande (Rejet ou Annulation)
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
 // Assurez-vous que les dates sont des objets Date si besoin
 const rawData = this.storageService.getItem(this.requestsKey);
 return (rawData || []) as AdminVerificationRequest[];
 }

 private getAdminCodes(): AdminCode[] {
 // Assurez-vous que les dates sont des objets Date si besoin
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

 // ✅ RÉCUPÉRER LES CODES GÉNÉRÉS
 getGeneratedCodes(): AdminCode[] {
 return this.getAdminCodes()
  .filter(code => !code.used)
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
 }

 // ✅ NOUVEAU : RÉINITIALISER LES DONNÉES ADMIN (pour les tests)
 resetAdminData(): void {
 this.storageService.removeItem(this.requestsKey);
 this.storageService.removeItem(this.codesKey);
 console.log('🔄 Données admin réinitialisées');
 }
}

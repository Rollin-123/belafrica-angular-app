import { Injectable } from '@angular/core';
import emailjs from 'emailjs-com';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  // ⚠️ CORRIGEZ CES ID AVEC LES VÔTRES
  private readonly SERVICE_ID = 'belafrica_2024';
  private readonly TEMPLATE_ID = 'template_ii9nrtk'; 
  private readonly ADMIN_CODE_TEMPLATE = 'template_d56cgjp'; 
  private readonly USER_ID = 'kTjpGuG__x98jqzdc'; 

  constructor() {
    emailjs.init(this.USER_ID);
    this.testConnection();
  }

  // ✅ TEST DE CONNEXION EMAILJS
  private async testConnection(): Promise<void> {
    try {
      // Test simple pour vérifier la configuration
      console.log('🔧 Test configuration EmailJS...');
      
      // Vérifier que les IDs sont corrects
      if (!this.SERVICE_ID || !this.USER_ID) {
        console.error('❌ IDs EmailJS manquants');
        return;
      }

      console.log('✅ Configuration EmailJS chargée:', {
        serviceId: this.SERVICE_ID,
        userId: this.USER_ID.substring(0, 10) + '...' // Masquer partiellement
      });
      
    } catch (error) {
      console.error('❌ Erreur configuration EmailJS:', error);
    }
  }

  // ✅ ENVOI CODE ADMIN À L'UTILISATEUR
  async sendAdminCode(
    userEmail: string, 
    adminCode: string, 
    community: string, 
    expiresInHours: number
  ): Promise<{success: boolean, error?: string}> {
    try {
      console.log('📧 Tentative envoi code admin à:', userEmail);

      const expiryDate = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
      
      const templateParams = {
        to_email: userEmail,
        admin_code: adminCode,
        community: community,
        expiration_date: expiryDate.toLocaleDateString('fr-FR'),
        expiration_hours: expiresInHours.toString(),
        from_name: 'BELAFRICA Admin'
      };

      console.log('📤 Paramètres email:', templateParams);

      const result = await emailjs.send(
        this.SERVICE_ID,
        this.ADMIN_CODE_TEMPLATE,
        templateParams
      );

      console.log('✅ Code admin envoyé avec succès à:', userEmail, result);
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ Erreur envoi code admin:', error);
      
      // Détails de l'erreur
      let errorMessage = 'Erreur inconnue';
      if (error.text) {
        errorMessage = error.text;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  // ✅ NOTIFICATION DEMANDE ADMIN
  async sendAdminRequestNotification(requestData: any): Promise<{success: boolean, error?: string}> {
    try {
      console.log('📧 Tentative envoi notification demande admin');

      const templateParams = {
        user_pseudo: requestData.userPseudo,
        user_community: requestData.userCommunity,
        user_phone: requestData.userPhone,
        submission_date: new Date().toLocaleDateString('fr-FR'),
        additional_info: requestData.additionalInfo,
        passport_photo: requestData.passportPhoto,
        request_id: requestData.id,
        to_email: 'rollinloictianga@gmail.com',
        from_name: 'BELAFRICA System'
      };

      console.log('📤 Paramètres notification:', templateParams);

      const result = await emailjs.send(
        this.SERVICE_ID,
        this.TEMPLATE_ID,
        templateParams
      );

      console.log('✅ Notification demande admin envoyée', result);
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ Erreur envoi notification:', error);
      
      let errorMessage = 'Erreur inconnue';
      if (error.text) {
        errorMessage = error.text;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }
}
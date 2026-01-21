/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { Injectable, isDevMode } from '@angular/core';
import emailjs from '@emailjs/browser';

@Injectable({
  providedIn: 'root'
})
export class EmailService { 
  private readonly SERVICE_ID = 'service_xduzb8q';
  private readonly TEMPLATE_ID = 'template_fo51bos';      
  private readonly ADMIN_CODE_TEMPLATE = 'template_tegkwx8'; 
  private readonly USER_ID = 'GTz9vTGaQAwOMA9lT';

  constructor() {
    if (!isDevMode()) {  
      emailjs.init(this.USER_ID);
    }
    this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      console.log('🔧 Test configuration EmailJS...');
      if (!this.SERVICE_ID || !this.USER_ID) {
        console.error('❌ IDs EmailJS manquants');
        return;
      }
      console.log('✅ Configuration EmailJS chargée:', {
        serviceId: this.SERVICE_ID,
        userId: this.USER_ID.substring(0, 10) + '...'
      });
    } catch (error) {
      console.error('❌ Erreur configuration EmailJS:', error);
    }
  }

  async sendAdminCode(
    userEmail: string,
    adminCode: string,
    community: string,
    expiresInHours: number
  ): Promise<{success: boolean, error?: string}> {
    if (isDevMode()) {
      console.log('📧 [DEV MODE] Envoi de code admin simulé:', { userEmail, adminCode, community, expiresInHours });
      return { success: true };
    }
    try {
      console.log('📧 Tentative envoi code admin à:', userEmail);
      const expiryDate = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

      const templateParams = {
        admin_name: userEmail, 
        
        admin_code: adminCode,
        community: community,
        expiration_date: expiryDate.toLocaleDateString('fr-FR', {
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        }),  
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
      
      let errorMessage = error.text || error.message || 'Erreur inconnue lors de l\'envoi du code admin.';

      return {
        success: false,
        error: errorMessage
      };
    }
  }
 
  async sendAdminRequestNotification(requestData: any): Promise<{success: boolean, error?: string}> {
    if (isDevMode()) {
      console.log('📧 [DEV MODE] Envoi de notification demande admin simulé:', requestData);
      return { success: true };
    }
    try {
      console.log('📧 Tentative envoi notification demande admin');

      const templateParams = {
        user_pseudo: requestData.userPseudo,
        user_community: requestData.userCommunity,
        user_phone: requestData.userPhone,
        submission_date: new Date().toLocaleDateString('fr-FR'),
        additional_info: requestData.additionalInfo,
        passport_photo_url: requestData.passportPhoto, 
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

      let errorMessage = error.text || error.message || 'Erreur inconnue lors de l\'envoi de la notification.';

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

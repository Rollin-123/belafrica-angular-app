/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CloudinaryUploadService {

  private readonly CLOUD_NAME = 'ddcda1blt'; 
  private readonly UPLOAD_PRESET = 'unsigned_admin'; 
  private readonly UPLOAD_URL = `https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/image/upload`;

  constructor() {
    if (this.CLOUD_NAME === 'ddcda1blt' || this.UPLOAD_PRESET === 'unsigned_admin') {
      console.error("🛑 ERREUR CLOUDINARY : Veuillez configurer CLOUD_NAME et UPLOAD_PRESET dans cloudinary-upload.service.ts");
    }
  }

  /**
   * Télécharge l'image en Base64 sur Cloudinary.
   * @param fileData - La chaîne Base64 ou Data URI de l'image.
   * @returns L'URL de l'image téléchargée.
   */
  async uploadImage(fileData: string): Promise<string> {
    if (this.CLOUD_NAME === 'ddcda1blt' || this.UPLOAD_PRESET === 'unsigned_admin') {
      throw new Error("Cloudinary n'est pas configuré correctement.");
    }

    console.log('☁️ Début du téléchargement sur Cloudinary...');

    const formData = new FormData();
    formData.append('file', fileData);
    formData.append('upload_preset', this.UPLOAD_PRESET);
    formData.append('folder', 'admin_requests'); 
    const response = await fetch(this.UPLOAD_URL, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erreur Cloudinary:', errorData);
      throw new Error(errorData.error.message || 'Échec du téléchargement Cloudinary.');
    }
    const result = await response.json();
    console.log('✅ Téléchargement Cloudinary réussi. URL:', result.secure_url);
    return result.secure_url;
  }
}
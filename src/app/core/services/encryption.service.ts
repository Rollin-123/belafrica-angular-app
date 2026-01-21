/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */


import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class EncryptionService {
  constructor() {}

  async generateEncryptionKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, 
      ['encrypt', 'decrypt']
    );
  }

  async exportKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('jwk', key);
    return JSON.stringify(exported);
  }

  async importKey(keyString: string): Promise<CryptoKey> {
    const jwk = JSON.parse(keyString);
    return await window.crypto.subtle.importKey(
        'jwk', 
        jwk, 
        { name: 'AES-GCM' }, 
        true, 
        ['encrypt', 'decrypt']
    );
  }

  // =================================================================================
  // UTILITAIRES DE CHIFFREMENT/DÉCHIFFREMENT COMBINÉS
  // =================================================================================

  async encryptAndSerialize(content: string, key: CryptoKey): Promise<{ iv: string; encryptedContent: string }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    
    const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    
    return {
      iv: btoa(String.fromCharCode(...iv)),
      encryptedContent: btoa(String.fromCharCode(...new Uint8Array(encrypted)))
    };
  }

async deserializeAndDecrypt(encryptedData: { iv: string; encryptedContent: string }, key: CryptoKey): Promise<string> {
  try {
    if (!encryptedData.iv || !encryptedData.encryptedContent) {
      throw new Error('Données de chiffrement manquantes');
    }

    const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
    const encrypted = Uint8Array.from(atob(encryptedData.encryptedContent), c => c.charCodeAt(0));
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, 
      key, 
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('❌ Erreur de déchiffrement:', error);
    throw new Error('Impossible de déchiffrer le message - Clé ou données invalides');
  }
}
}

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EncryptionService {
  
  constructor() {}

  // ✅ GÉNÉRER UNE CLÉ DE CHIFFREMENT PAR UTILISATEUR
  async generateEncryptionKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, 
      ['encrypt', 'decrypt']
    );
  }

  // ✅ CONVERTIR LA CLÉ EN STRING POUR STOCKAGE (JWK)
  async exportKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('jwk', key);
    return JSON.stringify(exported);
  }

  // ✅ RECONSTRUIRE LA CLÉ DEPUIS UN STRING (JWK)
  async importKey(keyString: string): Promise<CryptoKey> {
    const jwk = JSON.parse(keyString);
    // Note: Utiliser 'length: 256' est facultatif ici si l'objet JWK l'inclut déjà, mais l'ajouter est plus sûr.
    return await window.crypto.subtle.importKey(
        'jwk', 
        jwk, 
        { name: 'AES-GCM' }, // Pas besoin de length/extractable ici, ils viennent du JWK
        true, 
        ['encrypt', 'decrypt']
    );
  }

  // =================================================================================
  // UTILITAIRES DE CHIFFREMENT/DÉCHIFFREMENT COMBINÉS
  // =================================================================================

  // ✅ CHIFFRE ET SÉRIALISE (MESSAGE + IV)
  async encryptAndSerialize(content: string, key: CryptoKey): Promise<{ iv: string; encryptedContent: string }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    
    const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    
    // Conversion simple en Base64
    return {
      // Conversion Uint8Array (IV) en Base64
      iv: btoa(String.fromCharCode(...iv)),
      // Conversion ArrayBuffer (Message chiffré) en Base64
      encryptedContent: btoa(String.fromCharCode(...new Uint8Array(encrypted)))
    };
  }

  // ✅ DÉSÉRIALISE ET DÉCHIFFRE
async deserializeAndDecrypt(encryptedData: { iv: string; encryptedContent: string }, key: CryptoKey): Promise<string> {
  try {
    // Vérification des données d'entrée
    if (!encryptedData.iv || !encryptedData.encryptedContent) {
      throw new Error('Données de chiffrement manquantes');
    }

    // Reconversion Base64
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

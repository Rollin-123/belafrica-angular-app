/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Message, Conversation, MessageAction } from '../models/message.model';
import { MessagingService } from './messaging.service';
import { EncryptionService } from './encryption.service';
import { StorageService } from './storage.service';
@Injectable()
export class MessagingHttpService extends MessagingService {
  private apiUrl = `${environment.apiUrl}/messaging`;
  private userEncryptionKey: CryptoKey | null = null; // ✅ Nécessaire pour le déchiffrement

  // Utiliser des BehaviorSubjects pour mettre en cache et partager les données
  private conversations$ = new BehaviorSubject<Conversation[]>([]);

  constructor(
    private http: HttpClient,
    private encryptionService: EncryptionService, // ✅ Injecter pour le déchiffrement
    private storageService: StorageService // ✅ Injecter pour la clé
  ) {
    super();
    console.log('⚡️ MessagingHttpService initialisé (mode production)');
    this.initializeEncryption();
    // TODO: Initialiser la connexion WebSocket/Realtime ici
  }

  private async initializeEncryption(): Promise<void> {
    try {
      const savedKey = this.storageService.getItem('belafrica_user_encryption_key');
      if (savedKey) {
        this.userEncryptionKey = await this.encryptionService.importKey(savedKey);
        console.log('⚡️ [HTTP] Clé de chiffrement chargée.');
      } else {
        // En production, la clé devrait idéalement être gérée de manière plus sécurisée,
        // mais pour la cohérence avec le mock, nous la générons si elle n'existe pas.
        this.userEncryptionKey = await this.encryptionService.generateEncryptionKey();
        const keyString = await this.encryptionService.exportKey(this.userEncryptionKey);
        this.storageService.setItem('belafrica_user_encryption_key', keyString);
        console.log('⚡️ [HTTP] Nouvelle clé de chiffrement générée.');
      }
    } catch (error) {
      console.error('❌ [HTTP] Erreur initialisation chiffrement:', error);
    }
  }

  getConversations(): Observable<Conversation[]> {
    // ✅ Implémentation réelle avec appel HTTP
    return this.http.get<{ conversations: Conversation[] }>(`${this.apiUrl}/conversations`).pipe(
      map(response => response.conversations || []),
      tap(conversations => {
        console.log(`⚡️ [HTTP] ${conversations.length} conversations chargées.`);
        this.conversations$.next(conversations); // Mettre en cache
      })
    );
  }

  getMessages(conversationId: string): Observable<Message[]> {
    // ✅ Implémentation réelle avec appel HTTP
    return this.http.get<{ messages: Message[] }>(`${this.apiUrl}/conversations/${conversationId}/messages`).pipe(
      map(response => response.messages || []),
      // ✅ Déchiffrer les messages reçus
      switchMap(async (messages) => {
        if (!this.userEncryptionKey) {
          console.warn('⚠️ [HTTP] Clé de chiffrement non prête, messages non déchiffrés.');
          return messages.map(msg => ({ ...msg, content: 'Chargement...' }));
        }
        
        const decryptionPromises = messages.map(async (message) => {
          if (message.isDeleted || !message.encryptedContent || !message.encryptionKey) {
            return { ...message, content: 'Message supprimé' };
          }
          try {
            const decryptedContent = await this.encryptionService.deserializeAndDecrypt(
              { iv: message.encryptionKey, encryptedContent: message.encryptedContent },
              this.userEncryptionKey!
            );
            return { ...message, content: decryptedContent };
          } catch (error) {
            console.error(`❌ [HTTP] Erreur déchiffrement message ${message.id}:`, error);
            return { ...message, content: '🔒 Message non déchiffrable' };
          }
        });
        return Promise.all(decryptionPromises);
      })
    );
  }

  async sendMessage(content: string, conversationId: string, type: 'group' | 'private', replyTo?: any): Promise<Message> {
    if (!this.userEncryptionKey) {
      throw new Error('Clé de chiffrement non disponible pour l\'envoi.');
    }

    // ✅ Chiffrer le contenu avant de l'envoyer
    const encryptedData = await this.encryptionService.encryptAndSerialize(
      content,
      this.userEncryptionKey
    );

    const response = await this.http.post<{ message: Message }>(
      `${this.apiUrl}/conversations/${conversationId}/messages`,
      { 
        encryptedContent: encryptedData.encryptedContent,
        iv: encryptedData.iv,
        replyToId: replyTo?.messageId || null
      }
    ).toPromise();

    if (!response?.message) {
      throw new Error("L'envoi du message a échoué.");
    }
    return response.message;
  }

  async sendMessageWithMentions(content: string, conversationId: string, type: 'group' | 'private', replyTo?: any): Promise<Message> {
    return this.sendMessage(content, conversationId, type, replyTo);
  }

  async replyToMessage(content: string, conversationId: string, replyToMessageId: string, type: 'group' | 'private'): Promise<Message> {
    console.warn('MessagingHttpService.replyToMessage() non implémenté.');
    throw new Error('Non implémenté');
  }

  async editMessage(messageId: string, newContent: string): Promise<Message> {
    console.warn('MessagingHttpService.editMessage() non implémenté.');
    throw new Error('Non implémenté');
  }

  async deleteMessage(messageId: string): Promise<void> {
    console.warn('MessagingHttpService.deleteMessage() non implémenté.');
    return Promise.reject('Non implémenté');
  }
  // ✅ CORRECTION : Implémentation des méthodes manquantes pour satisfaire la classe abstraite
  getMessageActions(message: Message, currentUserId: string): MessageAction[] {
    console.warn('[MessagingHttpService] getMessageActions() non implémenté.');
    // En production, cette logique pourrait être en partie sur le backend pour les permissions
    return [];
  }

  getMentionSuggestions(searchTerm: string, conversationId: string): any[] {
    console.warn('[MessagingHttpService] getMentionSuggestions() non implémenté.');
    // Nécessitera un appel HTTP vers une route comme /api/conversations/:id/participants
    return [];
  }

  markAsRead(conversationId: string): void {
    console.warn('[MessagingHttpService] markAsRead() non implémenté.');
    // Appel HTTP vers une route comme POST /api/conversations/:id/read
  }

  getStats(): any {
    console.warn('[MessagingHttpService] getStats() non implémenté.');
    return {};
  }
  // Les autres méthodes (getMessageActions, getMentionSuggestions, etc.) peuvent rester locales
  // ou nécessiter des appels backend selon votre architecture.
}
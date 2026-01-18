/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Message, Conversation, MessageAction } from '../models/message.model';
import { MessagingService } from './messaging.service';
import { EncryptionService } from './encryption.service';
import { StorageService } from './storage.service';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root'
})
export class MessagingHttpService extends MessagingService {
  private apiUrl = `${environment.apiUrl}/messaging`;
  private userEncryptionKey: CryptoKey | null = null; 

  private conversations$ = new BehaviorSubject<Conversation[]>([]);

  constructor(
    private http: HttpClient,
    private encryptionService: EncryptionService,  
    private storageService: StorageService,
    private socketService: SocketService
  ) {
    super();
    console.log('⚡️ MessagingHttpService initialisé (mode production)');
    this.initializeEncryption();
  }

  private async initializeEncryption(): Promise<void> {
    try {
      const savedKey = this.storageService.getItem('belafrica_user_encryption_key');
      if (savedKey) {
        this.userEncryptionKey = await this.encryptionService.importKey(savedKey);
        console.log('⚡️ [HTTP] Clé de chiffrement chargée.');
      } else { 
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
    return this.http.get<{ conversations: Conversation[] }>(`${this.apiUrl}/conversations`).pipe(
      map(response => response.conversations || []),
      tap(conversations => {
        console.log(`⚡️ [HTTP] ${conversations.length} conversations chargées.`);
        this.conversations$.next(conversations);  
      }),
      catchError(error => {
        console.error('❌ [HTTP] Erreur chargement conversations:', error);
        return of([]); 
      })
    );
  }

  getMessages(conversationId: string): Observable<Message[]> {
    return this.http.get<{ messages: Message[] }>(`${this.apiUrl}/conversations/${conversationId}/messages`).pipe(
      map(response => response.messages || []),
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

  async sendMessage(
    content: string,
    conversationId: string,
    type: 'group' | 'private',
    mentions: import("../models/message.model").Mention[],
    replyToId?: string
  ): Promise<void> {
    if (!this.userEncryptionKey) {
      throw new Error('Clé de chiffrement non disponible pour l\'envoi.');
    }
  
    const encryptedData = await this.encryptionService.encryptAndSerialize(
      content,
      this.userEncryptionKey
    );
  
    // Le backend gère la diffusion via WebSocket, donc la réponse HTTP est moins critique.
    await this.http.post(
      `${this.apiUrl}/conversations/${conversationId}/messages`,
      { 
        encryptedContent: encryptedData.encryptedContent,
        iv: encryptedData.iv,
        replyToId: replyToId || null,
        mentions: mentions
      }
    ).toPromise();
  }

  async sendMessageWithMentions(
    content: string,
    conversationId: string,
    type: 'group' | 'private',
    mentions: import("../models/message.model").Mention[]
  ): Promise<void> {
    return this.sendMessage(content, conversationId, type, mentions);
  }

  async replyToMessage(
    content: string,
    conversationId: string,
    replyToMessageId: string,
    type: 'group' | 'private',
    mentions: import("../models/message.model").Mention[]
  ): Promise<void> {
    return this.sendMessage(content, conversationId, type, mentions, replyToMessageId);
  }

  async editMessage(messageId: string, newContent: string): Promise<void> {
    if (!this.userEncryptionKey) throw new Error('Clé de chiffrement non disponible.');
    const encryptedData = await this.encryptionService.encryptAndSerialize(newContent, this.userEncryptionKey);
    await this.http.put(`${this.apiUrl}/messages/${messageId}`, {
      encryptedContent: encryptedData.encryptedContent,
      iv: encryptedData.iv
    }).toPromise();
  }

  async deleteMessage(messageId: string, forEveryone: boolean): Promise<void> {
    if (forEveryone) {
      await this.http.delete(`${this.apiUrl}/messages/${messageId}`).toPromise();
    } else {
      console.warn('[HTTP] La suppression "pour soi" est une opération locale et ne nécessite pas d\'appel API.');
    }
  }
  getMessageActions(message: Message, currentUserId: string): MessageAction[] {
    console.warn('[MessagingHttpService] getMessageActions() non implémenté.');
    return [];
  }

  getMentionSuggestions(searchTerm: string, conversationId: string): any[] {
    console.warn('[MessagingHttpService] getMentionSuggestions() non implémenté.');
    return [];
  }

  markAsRead(conversationId: string): void {
    console.warn('[MessagingHttpService] markAsRead() non implémenté.');
  }

  getStats(): any {
    console.warn('[MessagingHttpService] getStats() non implémenté.');
    return {};
  }

  // =================================================================
  // ⚡️ MÉTHODES TEMPS RÉEL (via Socket.IO)
  // =================================================================

  joinConversation(conversationId: string): void {
    this.socketService.joinConversation(conversationId);
  }

  leaveConversation(conversationId: string): void {
    this.socketService.leaveConversation(conversationId);
  }

  getRealTimeMessages(): Observable<Message> {
    return this.socketService.onNewMessage().pipe(
      switchMap(async (message: Message) => {
        if (!this.userEncryptionKey) {
          return { ...message, content: 'Déchiffrement en attente...' };
        }
        if (message.isDeleted || !message.encryptedContent || !message.encryptionKey) {
          return { ...message, content: message.isDeleted ? 'Message supprimé' : '🔒 Message non déchiffrable' };
        }
        const decryptedContent = await this.encryptionService.deserializeAndDecrypt(
          { iv: message.encryptionKey, encryptedContent: message.encryptedContent },
          this.userEncryptionKey
        );
        return { ...message, content: decryptedContent };
      })
    );
  }

  emitStartTyping(conversationId: string): void { this.socketService.emitStartTyping(conversationId); }
  emitStopTyping(conversationId: string): void { this.socketService.emitStopTyping(conversationId); }
  onUserTyping(): Observable<{ userId: string; pseudo: string; conversationId: string; }> { return this.socketService.onUserTyping(); }
  onUserStoppedTyping(): Observable<{ userId: string; pseudo: string; conversationId: string; }> { return this.socketService.onUserStoppedTyping(); }

  onMessagesRead(): Observable<{ conversationId: string; userId: string; messageIds: string[]; }> {
    return this.socketService.onMessagesRead();
  }
}
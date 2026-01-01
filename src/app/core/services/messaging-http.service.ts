import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Message, Conversation, MessageAction } from '../models/message.model';
import { MessagingService } from './messaging.service';
import { EncryptionService } from './encryption.service';
@Injectable()
export class MessagingHttpService extends MessagingService {
  private apiUrl = `${environment.apiUrl}/messaging`;
  private userEncryptionKey: CryptoKey | null = null; // ✅ Nécessaire pour le déchiffrement

  // Utiliser des BehaviorSubjects pour mettre en cache et partager les données
  private conversations$ = new BehaviorSubject<Conversation[]>([]);

  constructor(
    private http: HttpClient,
    private encryptionService: EncryptionService // ✅ Injecter pour le déchiffrement
  ) {
    super();
    console.log('⚡️ MessagingHttpService initialisé (mode production)');
    // TODO: Initialiser la clé de chiffrement et la connexion WebSocket/Realtime
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
      map(response => response.messages || [])
      // TODO: Ajouter le déchiffrement des messages ici
    );
  }

  async sendMessage(content: string, conversationId: string, type: 'group' | 'private', replyTo?: any): Promise<Message> {
    // TODO: Chiffrer le contenu avant de l'envoyer
    const encryptedData = { encryptedContent: 'contenu chiffré (TODO)', iv: 'iv (TODO)' };

    const response = await this.http.post<{ message: Message }>(
      `${this.apiUrl}/conversations/${conversationId}/messages`,
      encryptedData
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
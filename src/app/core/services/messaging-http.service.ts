/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Message, Conversation, MessageAction, MessagePayload } from '../models/message.model';
import { MessagingService } from './messaging.service';
import { StorageService } from './storage.service';
import { UserService } from './user.service';
import { SocketService } from './socket.service';
import { mapBackendMessageToFrontend } from '../mappers/message.mapper';

@Injectable({
  providedIn: 'root'
})
export class MessagingHttpService extends MessagingService {
  private apiUrl = `${environment.apiUrl}/messaging`;
  private conversations$ = new BehaviorSubject<Conversation[]>([]);

  constructor(
    private http: HttpClient,
    private storageService: StorageService,
    private socketService: SocketService,
    private userService: UserService
  ) {
    super();
    console.log('MessagingHttpService initialise');
  }

  getConversations(): Observable<Conversation[]> {
    return this.http.get<{ conversations: Conversation[] }>(`${this.apiUrl}/conversations`).pipe(
      map(response => response.conversations || []),
      tap(conversations => {
        console.log(conversations.length + ' conversations chargees.');
        this.conversations$.next(conversations);
      }),
      catchError(error => {
        console.error('Erreur chargement conversations:', error);
        return of([]);
      })
    );
  }

  getMessages(conversationId: string): Observable<Message[]> {
    return this.http.get<{ messages: any[] }>(`${this.apiUrl}/conversations/${conversationId}/messages`).pipe(
      map((response: { messages: any[] }) => {
        const currentUserId = this.userService.getCurrentUser()?.id;
        return (response.messages || []).map((msg: any) =>
          mapBackendMessageToFrontend(msg, currentUserId)
        );
      }),
      map((messages: Message[]) =>
        messages.map((message: Message) => ({
          ...message,
          content: message.isDeleted
            ? 'Message supprime'
            : (message.encryptedContent || '')
        }))
      ),
      catchError(error => {
        console.error('Erreur chargement messages:', error);
        return of([]);
      })
    );
  }

  async sendMessage(payload: MessagePayload): Promise<void> {
    await this.http.post(
      `${this.apiUrl}/conversations/${payload.conversationId}/messages`,
      {
        encryptedContent: payload.content,
        iv: 'none',
        replyToId: payload.replyToMessageId || null,
        mentions: payload.mentions
      }
    ).toPromise();
  }

  async editMessage(messageId: string, newContent: string): Promise<void> {
    await this.http.put(`${this.apiUrl}/messages/${messageId}`, {
      encryptedContent: newContent,
      iv: 'none'
    }).toPromise();
  }

  async deleteMessage(messageId: string, forEveryone: boolean): Promise<void> {
    if (forEveryone) {
      await this.http.delete(`${this.apiUrl}/messages/${messageId}`).toPromise();
    }
  }

  getMessageActions(message: Message, currentUserId: string): MessageAction[] {
    const actions: MessageAction[] = [];
    if (!message.isDeleted) {
      actions.push({ type: 'reply', label: 'Repondre', icon: 'reply', condition: () => true });
      actions.push({ type: 'copy', label: 'Copier', icon: 'content_copy', condition: () => true });
    }
    if (message.fromUserId === currentUserId && !message.isDeleted) {
      actions.push({ type: 'edit', label: 'Modifier', icon: 'edit', condition: () => true });
      actions.push({ type: 'delete', label: 'Supprimer', icon: 'delete', condition: () => true });
    }
    return actions;
  }

  getMentionSuggestions(searchTerm: string, conversationId: string): any[] {
    return [];
  }

  markAsRead(conversationId: string, messageIds: string[]): void {
    this.socketService.emitMarkAsRead(conversationId, messageIds);
  }

  getStats(): any {
    return {};
  }

  joinConversation(conversationId: string): void {
    this.socketService.joinConversation(conversationId);
  }

  leaveConversation(conversationId: string): void {
    this.socketService.leaveConversation(conversationId);
  }

  getRealTimeMessages(): Observable<Message> {
    return this.socketService.onNewMessage().pipe(
      map((message: Message) => ({
        ...message,
        content: message.isDeleted
          ? 'Message supprime'
          : (message.encryptedContent || '')
      }))
    );
  }

  emitStartTyping(conversationId: string): void {
    this.socketService.emitStartTyping(conversationId);
  }

  emitStopTyping(conversationId: string): void {
    this.socketService.emitStopTyping(conversationId);
  }

  onUserTyping(): Observable<{ userId: string; pseudo: string; conversationId: string }> {
    return this.socketService.onUserTyping();
  }

  onUserStoppedTyping(): Observable<{ userId: string; pseudo: string; conversationId: string }> {
    return this.socketService.onUserStoppedTyping();
  }

  onMessagesRead(): Observable<{ conversationId: string; userId: string; messageIds: string[] }> {
    return this.socketService.onMessagesRead();
  }
}

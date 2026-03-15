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
    // Initialiser le socket avec l'userId pour le mapping des messages
    const userId = this.userService.getCurrentUser()?.id;
    this.socketService.initializeSocket(userId);
  }

  getConversations(): Observable<Conversation[]> {
    return this.http.get<{ conversations: any[] }>(`${this.apiUrl}/conversations`).pipe(
      map(response => {
        return (response.conversations || []).map((conv: any) => ({
          ...conv,
          communityMembersCount: conv.communityMembersCount || conv.community_members_count || 0,
          participantsDetails: conv.participantsDetails || conv.participants || [],
          createdAt: new Date(conv.created_at || conv.createdAt),
          updatedAt: new Date(conv.updated_at || conv.updatedAt),
          unreadCount: conv.unreadCount || conv.unread_count || 0,
          adminIds: conv.adminIds || [],
          lastMessage: conv.lastMessage || conv.last_message_content || '',
          lastMessageTimestamp: conv.lastMessageTimestamp || conv.last_message_created_at
            ? new Date(conv.last_message_created_at || conv.lastMessageTimestamp)
            : undefined
        }));
      }),
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
    const currentUserId = this.userService.getCurrentUser()?.id;
    return this.http.get<{ messages: any[] }>(`${this.apiUrl}/conversations/${conversationId}/messages`).pipe(
      map(response => {
        return (response.messages || []).map((msg: any) => {
          const mapped = mapBackendMessageToFrontend(msg, currentUserId);
          return {
            ...mapped,
            content: mapped.isDeleted ? 'Message supprime' : (mapped.encryptedContent || '')
          };
        });
      }),
      catchError(error => {
        console.error('Erreur chargement messages:', error);
        return of([]);
      })
    );
  }

  async sendMessage(payload: MessagePayload): Promise<void> {
    const body: any = {
      encryptedContent: payload.content,
      iv: 'none',
      mentions: payload.mentions || []
    };
    if (payload.replyToMessageId) {
      body.replyToId = payload.replyToMessageId;
    }
    await this.http.post(
      `${this.apiUrl}/conversations/${payload.conversationId}/messages`,
      body
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
      const elapsed = new Date().getTime() - new Date(message.timestamp).getTime();
      if (elapsed < 30 * 60 * 1000) {
        actions.push({ type: 'edit', label: 'Modifier', icon: 'edit', condition: () => true });
      }
      if (elapsed < 2 * 60 * 60 * 1000) {
        actions.push({ type: 'delete', label: 'Supprimer', icon: 'delete', condition: () => true });
      }
    }
    return actions;
  }

  getMentionSuggestions(searchTerm: string, conversationId: string): any[] {
    return [];
  }

  markAsRead(conversationId: string, messageIds: string[]): void {
    this.socketService.emitMarkAsRead(conversationId, messageIds);
    // Optionnel: appel HTTP aussi
    this.http.post(`${this.apiUrl}/conversations/${conversationId}/read`, { messageIds })
      .pipe(catchError(() => of(null)))
      .subscribe();
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
    return this.socketService.onNewMessage();
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

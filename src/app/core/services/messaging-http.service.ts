/*
 * BELAFRICA - Plateforme diaspora africaine
 * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
 * BUG #1 FIX: extends MessagingService correctement implementé
 * BUG #3 FIX: filtre actif dans getRealTimeMessages() — déduplique les messages
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, filter, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Message, Conversation, MessageAction, MessagePayload } from '../models/message.model';
import { MessagingService } from './messaging.service';
import { StorageService } from './storage.service';
import { UserService } from './user.service';
import { SocketService } from './socket.service';
import { mapBackendMessageToFrontend } from '../mappers/message.mapper';

@Injectable({ providedIn: 'root' })
export class MessagingHttpService extends MessagingService {

  private apiUrl = `${environment.apiUrl}/messaging`;
  private conversations$ = new BehaviorSubject<Conversation[]>([]);
  // BUG #3 FIX: IDs des messages qu'on vient d'envoyer soi-même via HTTP
  private recentlySentIds = new Set<string>();

  constructor(
    private http: HttpClient,
    private storageService: StorageService,
    private socketService: SocketService,
    private userService: UserService
  ) {
    super();
    const userId = this.userService.getCurrentUser()?.id;
    this.socketService.initializeSocket(userId);
  }

  getConversations(): Observable<Conversation[]> {
    return this.http.get<{ conversations: any[] }>(`${this.apiUrl}/conversations`).pipe(
      map(response => (response.conversations || []).map((conv: any) => ({
        ...conv,
        communityMembersCount: conv.communityMembersCount || conv.community_members_count || 0,
        participantsDetails: conv.participantsDetails || conv.participants || [],
        createdAt: new Date(conv.created_at || conv.createdAt),
        updatedAt: new Date(conv.updated_at || conv.updatedAt),
        unreadCount: conv.unreadCount || conv.unread_count || 0,
        adminIds: conv.adminIds || [],
        lastMessage: conv.lastMessage || conv.last_message_content || '',
        lastMessageTimestamp: conv.lastMessageTimestamp || conv.last_message_created_at
          ? new Date(conv.last_message_created_at || conv.lastMessageTimestamp) : undefined
      }))),
      tap(conversations => this.conversations$.next(conversations)),
      catchError(error => { console.error('Erreur conversations:', error); return of([]); })
    );
  }

  getMessages(conversationId: string): Observable<Message[]> {
    const currentUserId = this.userService.getCurrentUser()?.id;
    return this.http.get<{ messages: any[] }>(`${this.apiUrl}/conversations/${conversationId}/messages`).pipe(
      map(response => (response.messages || []).map((msg: any) => {
        const mapped = mapBackendMessageToFrontend(msg, currentUserId);
        return { ...mapped, content: mapped.isDeleted ? 'Message supprimé' : (mapped.encryptedContent || '') };
      })),
      catchError(error => { console.error('Erreur messages:', error); return of([]); })
    );
  }

  async sendMessage(payload: MessagePayload): Promise<void> {
    const body: any = { encryptedContent: payload.content, iv: 'none', mentions: payload.mentions || [] };
    if (payload.replyToMessageId) body.replyToId = payload.replyToMessageId;
    try {
      const response: any = await this.http.post(
        `${this.apiUrl}/conversations/${payload.conversationId}/messages`, body
      ).toPromise();
      // BUG #3 FIX: stocker l'ID pour ignorer le retour Socket.IO
      if (response?.message?.id) {
        this.recentlySentIds.add(response.message.id);
        setTimeout(() => this.recentlySentIds.delete(response.message.id), 5000);
      }
    } catch (error) { console.error('Erreur envoi message:', error); throw error; }
  }

  async editMessage(messageId: string, newContent: string): Promise<void> {
    await this.http.put(`${this.apiUrl}/messages/${messageId}`, { encryptedContent: newContent, iv: 'none' }).toPromise();
  }

  async deleteMessage(messageId: string, forEveryone: boolean): Promise<void> {
    if (forEveryone) await this.http.delete(`${this.apiUrl}/messages/${messageId}`).toPromise();
  }

  getMessageActions(message: Message, currentUserId: string): MessageAction[] {
    const actions: MessageAction[] = [];
    if (!message.isDeleted) {
      actions.push({ type: 'reply', label: 'Répondre', icon: 'reply', condition: () => true });
      actions.push({ type: 'copy', label: 'Copier', icon: 'content_copy', condition: () => true });
    }
    if (message.fromUserId === currentUserId && !message.isDeleted) {
      const elapsed = new Date().getTime() - new Date(message.timestamp).getTime();
      if (elapsed < 30 * 60 * 1000) actions.push({ type: 'edit', label: 'Modifier', icon: 'edit', condition: () => true });
      if (elapsed < 2 * 60 * 60 * 1000) actions.push({ type: 'delete', label: 'Supprimer', icon: 'delete', condition: () => true });
    }
    return actions;
  }

  getMentionSuggestions(searchTerm: string, conversationId: string): any[] { return []; }

  markAsRead(conversationId: string, messageIds: string[]): void {
    this.socketService.emitMarkAsRead(conversationId, messageIds);
    this.http.post(`${this.apiUrl}/conversations/${conversationId}/read`, { messageIds })
      .pipe(catchError(() => of(null))).subscribe();
  }

  getStats(): any { return {}; }
  joinConversation(conversationId: string): void { this.socketService.joinConversation(conversationId); }
  leaveConversation(conversationId: string): void { this.socketService.leaveConversation(conversationId); }

  // BUG #3 FIX: filtre actif — ignore les messages qu'on vient d'envoyer nous-mêmes
  getRealTimeMessages(): Observable<Message> {
    return this.socketService.onNewMessage().pipe(
      filter((msg: any) => !this.recentlySentIds.has(msg?.id)),
      map((msg: any) => msg),
      catchError(err => { console.error('Socket error:', err); return of(); })
    );
  }

  isOwnRecentMessage(messageId: string): boolean { return this.recentlySentIds.has(messageId); }
  emitStartTyping(conversationId: string): void { this.socketService.emitStartTyping(conversationId); }
  emitStopTyping(conversationId: string): void { this.socketService.emitStopTyping(conversationId); }
  onUserTyping(): Observable<{ userId: string; pseudo: string; conversationId: string }> { return this.socketService.onUserTyping(); }
  onUserStoppedTyping(): Observable<{ userId: string; pseudo: string; conversationId: string }> { return this.socketService.onUserStoppedTyping(); }
  onMessagesRead(): Observable<{ conversationId: string; userId: string; messageIds: string[] }> { return this.socketService.onMessagesRead(); }
}

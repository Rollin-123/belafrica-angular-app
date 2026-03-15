/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Message } from '../models/message.model';
import { StorageService } from './storage.service';
import { mapBackendMessageToFrontend } from '../mappers/message.mapper';

@Injectable({
  providedIn: 'root'
})
export class SocketService implements OnDestroy {
  private socket?: Socket;
  private currentUserId?: string;

  constructor(private storageService: StorageService) {}

  initializeSocket(userId?: string): void {
    this.currentUserId = userId;
    if (this.socket && this.socket.connected) {
      return;
    }
    if (this.socket) {
      this.socket.disconnect();
    }
    this.connect();
  }

  private connect(): void {
    const token = this.storageService.getItem('belafrica_token');
    if (!token) {
      console.warn('Pas de token, connexion socket reportee.');
      return;
    }
    const baseUrl = environment.apiUrl.replace('/api', '');
    this.socket = io(baseUrl, {
      withCredentials: true,
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('Connecte au serveur Socket.IO:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Deconnecte du serveur Socket.IO, raison:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Erreur connexion Socket.IO:', err.message);
    });
  }

  joinConversation(conversationId: string) {
    if (this.socket) this.socket.emit('joinConversation', conversationId);
  }

  leaveConversation(conversationId: string) {
    if (this.socket) this.socket.emit('leaveConversation', conversationId);
  }

  // ✅ onNewMessage mappe le message backend vers le modèle frontend
  onNewMessage(): Observable<Message> {
    return new Observable(observer => {
      this.socket?.on('newMessage', (data: any) => {
        // Le backend envoie un BackendMessage - on le mappe
        const mapped = mapBackendMessageToFrontend(data, this.currentUserId);
        const messageWithContent: Message = {
          ...mapped,
          content: mapped.isDeleted ? 'Message supprime' : (mapped.encryptedContent || (data.content || ''))
        };
        observer.next(messageWithContent);
      });
    });
  }

  onMessageUpdated(): Observable<Message> {
    return new Observable(observer => {
      this.socket?.on('messageUpdated', (data: any) => {
        const mapped = mapBackendMessageToFrontend(data, this.currentUserId);
        observer.next({ ...mapped, content: mapped.encryptedContent || '' });
      });
    });
  }

  onMessageDeleted(): Observable<{ messageId: string; conversationId: string }> {
    return this.listenToEvent<{ messageId: string; conversationId: string }>('messageDeleted');
  }

  emitStartTyping(conversationId: string) {
    this.socket?.emit('startTyping', { conversationId });
  }

  emitStopTyping(conversationId: string) {
    this.socket?.emit('stopTyping', { conversationId });
  }

  onUserTyping(): Observable<{ userId: string, pseudo: string, conversationId: string }> {
    return this.listenToEvent<{ userId: string, pseudo: string, conversationId: string }>('userTyping');
  }

  onUserStoppedTyping(): Observable<{ userId: string, pseudo: string, conversationId: string }> {
    return this.listenToEvent<{ userId: string, pseudo: string, conversationId: string }>('userStoppedTyping');
  }

  emitMarkAsRead(conversationId: string, messageIds: string[]) {
    this.socket?.emit('markAsRead', { conversationId, messageIds });
  }

  onMessagesRead(): Observable<{ conversationId: string, userId: string, messageIds: string[] }> {
    return this.listenToEvent<{ conversationId: string, userId: string, messageIds: string[] }>('messagesRead');
  }

  private listenToEvent<T>(eventName: string): Observable<T> {
    return new Observable(observer => {
      this.socket?.on(eventName, (data: T) => observer.next(data));
    });
  }

  ngOnDestroy() {
    if (this.socket) this.socket.disconnect();
  }
}

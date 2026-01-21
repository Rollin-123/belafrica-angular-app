/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Message } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class SocketService implements OnDestroy {
  private socket?: Socket;

  constructor(private authService: AuthService) {
    this.connect();
  }

  private connect(): void {
    this.socket = io(environment.apiUrl, {
      withCredentials: true,
      path: '/socket.io/'  
    });

    this.socket.on('connect', () => {
      console.log('🚀 Connecté au serveur Socket.IO:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Déconnecté du serveur Socket.IO');
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ Erreur de connexion Socket.IO:', err.message);
    });
  }

  joinConversation(conversationId: string) {
    if (this.socket) this.socket.emit('joinConversation', conversationId);
  }

  leaveConversation(conversationId: string) {
    if (this.socket) this.socket.emit('leaveConversation', conversationId);
  }

  onNewMessage(): Observable<Message> {
    return this.listenToEvent<Message>('newMessage');
  }

  // --- Indicateur "est en train d'écrire" ---
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

  // --- Statut "lu" ---
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
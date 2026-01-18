/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { 
  Message, 
  Conversation,
  Mention, 
  MessageAction
} from '../models/message.model';

// 📦 INTERFACE LOCALE
interface EncryptedData {
  iv: string;
  encryptedContent: string;
}

@Injectable({
  providedIn: 'root'
})
export abstract class MessagingService {
  abstract getConversations(): Observable<Conversation[]>;
  abstract getMessages(conversationId: string): Observable<Message[]>;
  abstract sendMessage(
    content: string, 
    conversationId: string,
    type: 'group' | 'private',
    mentions: Mention[],
    replyToId?: string
  ): Promise<void>;
  abstract sendMessageWithMentions(
    content: string, 
    conversationId: string, 
    type: 'group' | 'private',
    mentions: Mention[]
  ): Promise<void>;
  abstract replyToMessage(
    content: string, 
    conversationId: string, 
    replyToMessageId: string,
    type: 'group' | 'private',
    mentions: Mention[]
  ): Promise<void>;
  abstract editMessage(messageId: string, newContent: string): Promise<void>;
  abstract deleteMessage(messageId: string, forEveryone: boolean): Promise<void>;
  abstract getMessageActions(message: Message, currentUserId: string): MessageAction[];
  abstract getMentionSuggestions(searchTerm: string, conversationId: string): any[];
  abstract markAsRead(conversationId: string): void;
  abstract getStats(): any;
  abstract joinConversation(conversationId: string): void;
  abstract leaveConversation(conversationId: string): void;
  abstract getRealTimeMessages(): Observable<Message>;
  abstract emitStartTyping(conversationId: string): void;
  abstract emitStopTyping(conversationId: string): void;
  abstract onUserTyping(): Observable<{ userId: string; pseudo: string; conversationId: string; }>;
  abstract onUserStoppedTyping(): Observable<{ userId: string; pseudo: string; conversationId: string; }>;
  abstract onMessagesRead(): Observable<{ conversationId: string; userId: string; messageIds: string[] }>;
}
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
    replyTo?: any
  ): Promise<Message>;
  abstract sendMessageWithMentions(
    content: string, 
    conversationId: string, 
    type: 'group' | 'private',
    replyTo?: any
  ): Promise<Message>;
  abstract replyToMessage(
    content: string, 
    conversationId: string, 
    replyToMessageId: string,
    type: 'group' | 'private'
  ): Promise<Message>;
  abstract editMessage(messageId: string, newContent: string): Promise<Message>;
  abstract deleteMessage(messageId: string): Promise<void>;
  abstract getMessageActions(message: Message, currentUserId: string): MessageAction[];
  abstract getMentionSuggestions(searchTerm: string, conversationId: string): any[];
  abstract markAsRead(conversationId: string): void;
  abstract getStats(): any;
}

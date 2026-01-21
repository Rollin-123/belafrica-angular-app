/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

export function generateMessageId(): string {
  return 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

export interface BackendMessage {
  id: string;
  conversation_id: string;
  user_id: string;  
  encrypted_content: string | null;
  iv: string;  
  created_at: string;
  updated_at: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  reply_to_id: string | null;
  mentions: Mention[];
  user: {
    id: string;
    pseudo: string;
    avatar_url: string | null;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  content?: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isMyMessage: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  editedAt?: Date;
  replyTo?: {
    messageId: string;
    fromUserName: string;
    content: string;
    isDeleted: boolean;
  };
  mentions: Mention[];
  encryptedContent: string | null;
  encryptionKey: string | null; // This is the IV
}

export interface Participant {
  userId: string;
  pseudo: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  community: string;
}

export interface Conversation {
  id: string;
  type: 'group' | 'private';
  name: string;
  avatar?: string;
  participants: string[];
  participantsDetails?: Participant[];
  unreadCount: number;
  lastMessage?: string;
  lastMessageTimestamp?: Date;
  createdAt: Date;
  updatedAt: Date;
  adminIds: string[];
  description?: string;
  community?: string;
}

export interface Mention {
  userId: string;
  userName: string;
  position: number;
  length: number;
}

export interface MessageAction {
  type: 'reply' | 'edit' | 'delete' | 'copy' | 'delete-for-self';
  label: string;
  icon: string;
  condition: (message: Message, currentUserId: string) => boolean;
}
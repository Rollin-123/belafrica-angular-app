export interface Message {
  id: string;
  conversationId: string;
  type: 'group' | 'private';
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  
  // Chiffrement
  encryptedContent: string;
  encryptionKey?: string;
  content?: string;
  
  // Métadonnées
  timestamp: Date;
  isRead: boolean;
  readBy: string[];
  
  // Édition/Suppression
  isEdited: boolean;
  isDeleted: boolean;
  editedAt?: Date;
  deletedAt?: Date;
  
  // Statut d'envoi
  status: 'sending' | 'sent' | 'delivered' | 'read';
  
  // NOUVEAU : RÉPONSE À UN MESSAGE
  replyTo?: {
    messageId: string;
    fromUserId: string;
    fromUserName: string;
    content: string;
    isDeleted?: boolean;
  };
  
  // NOUVEAU : MENTIONS
  mentions?: Mention[];
}

// NOUVEAU : INTERFACE POUR LES MENTIONS
export interface Mention {
  userId: string;
  userName: string;
  position: number;
  length: number;
}

// INTERFACE POUR LE MENU CONTEXTUEL
export interface MessageAction {
  type: 'reply' | 'edit' | 'delete' | 'copy' | 'forward';
  label: string;
  icon: string;
  condition: (message: Message, currentUserId: string) => boolean;
}

// INTERFACE POUR LES CONVERSATIONS

export interface Conversation {
  id: string;
  type: 'group' | 'private';
  name: string;
  avatar?: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTimestamp?: Date;
  unreadCount: number;
  isOnline?: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  adminIds?: string[];
  description?: string;
  
  // NOUVEAU : Participants avec infos complètes
  participantsDetails?: Participant[];
}

// NOUVELLE INTERFACE POUR LES PARTICIPANTS
export interface Participant {
  userId: string;
  pseudo: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

// Helpers pour générer des IDs
export function generateConversationId(user1: string, user2: string): string {
  const sortedIds = [user1, user2].sort();
  return `conv_${sortedIds[0]}_${sortedIds[1]}`;
}

export function generateGroupId(community: string): string {
  const cleanCommunity = community.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
  return `group_${cleanCommunity}_${Date.now().toString(36)}`;
}

export function generateMessageId(): string {
  return 'msg_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}
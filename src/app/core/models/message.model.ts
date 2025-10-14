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
  
  // NOUVEAUX CHAMPS POUR ÉDITION/SUPPRESSION AVEC TIMEOUT
  isEdited: boolean;
  isDeleted: boolean;
  editedAt?: Date;
  deletedAt?: Date;
  
  // Fonctionnalités avancées
  replyTo?: string;
  mentions?: string[];
  
  // NOUVEAU : Statut d'envoi
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

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
// // NOUVELLE INTERFACE POUR LES ACTIONS
// export interface MessageAction {
//   type: 'edit' | 'delete' | 'reply';
//   messageId: string;
//   data?: any;
//   timestamp: Date;
// }

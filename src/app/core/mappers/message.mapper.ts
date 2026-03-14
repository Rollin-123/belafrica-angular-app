/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Message, BackendMessage } from '../models/message.model';

export function mapBackendMessageToFrontend(
  backendMessage: BackendMessage,
  currentUserId: string | undefined
): Message {
  return {
    id: backendMessage.id,
    conversationId: backendMessage.conversation_id,
    fromUserId: backendMessage.sender_id,
    fromUserName: backendMessage.user?.pseudo || 'Inconnu',
    fromUserAvatar: backendMessage.user?.avatar_url ?? undefined,
    encryptedContent: backendMessage.encrypted_content,
    encryptionKey: backendMessage.iv,
    timestamp: new Date(backendMessage.created_at),
    isEdited: backendMessage.is_edited || false,
    editedAt: backendMessage.updated_at ? new Date(backendMessage.updated_at) : undefined,
    isDeleted: backendMessage.is_deleted || false,
    status: 'sent',
    mentions: backendMessage.mentions || [],
    isMyMessage: backendMessage.sender_id === currentUserId,
    replyTo: undefined
  };
}

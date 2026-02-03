/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
*/
import { Message, BackendMessage } from '../models/message.model';

/**
 * Mappe un objet message du backend (avec snake_case) vers le modèle du frontend (avec camelCase).
 * @param backendMessage - L'objet message provenant de l'API.
 * @param currentUserId - L'ID de l'utilisateur actuel pour déterminer `isMyMessage`.
 * @returns Un objet Message formaté pour le frontend.
 */
export function mapBackendMessageToFrontend(backendMessage: BackendMessage, currentUserId: string | undefined): Message {
  return {
    id: backendMessage.id,
    conversationId: backendMessage.conversation_id,
    fromUserId: backendMessage.user_id,
    fromUserName: backendMessage.user.pseudo,
    fromUserAvatar: backendMessage.user.avatar_url ?? undefined,
    encryptedContent: backendMessage.encrypted_content,
    encryptionKey: backendMessage.iv,
    timestamp: new Date(backendMessage.created_at),
    isEdited: backendMessage.is_edited,
    editedAt: backendMessage.updated_at ? new Date(backendMessage.updated_at) : undefined,
    isDeleted: backendMessage.is_deleted,
    status: 'sent',
    mentions: backendMessage.mentions || [],
    isMyMessage: backendMessage.user_id === currentUserId,
    replyTo: undefined  
  };
}
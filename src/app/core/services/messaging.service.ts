import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { StorageService } from './storage.service';
import { UserService } from './user.service';
import { EncryptionService } from './encryption.service';
import { 
  Message, 
  Conversation, 
  Participant,
  generateMessageId 
} from '../models/message.model';

interface EncryptedData {
  iv: string;
  encryptedContent: string;
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private messagesKey = 'belafrica_messages';
  private conversationsKey = 'belafrica_conversations';
  private userKeyStorageKey = 'belafrica_user_encryption_key';
  
  private messages = new BehaviorSubject<Message[]>([]);
  private conversations = new BehaviorSubject<Conversation[]>([]);
  private userEncryptionKey: CryptoKey | null = null;

  // CONSTANTES DE TEMPS
  private readonly EDIT_TIMEOUT = 30 * 60 * 1000; // 30 minutes en millisecondes
  private readonly DELETE_TIMEOUT = 2 * 60 * 60 * 1000; // 2 heures en millisecondes

  constructor(
    private storageService: StorageService,
    private userService: UserService,
    private encryptionService: EncryptionService
  ) {
    this.initializeEncryption();
    this.loadInitialData();
    this.createInitialConversations();
  }

  // ✅ INITIALISATION DU CHIFFREMENT
  private async initializeEncryption(): Promise<void> {
    try {
      const savedKey = this.storageService.getItem(this.userKeyStorageKey);
      
      if (savedKey) {
        this.userEncryptionKey = await this.encryptionService.importKey(savedKey);
        console.log('🔑 Clé de chiffrement chargée');
      } else {
        this.userEncryptionKey = await this.encryptionService.generateEncryptionKey();
        const keyString = await this.encryptionService.exportKey(this.userEncryptionKey);
        this.storageService.setItem(this.userKeyStorageKey, keyString);
        console.log('🔑 Nouvelle clé de chiffrement générée');
      }
    } catch (error) {
      console.error('❌ Erreur initialisation chiffrement:', error);
    }
  }

  // ✅ CHARGEMENT DES DONNÉES INITIALES
  private loadInitialData(): void {
    const savedMessages = this.storageService.getItem(this.messagesKey) || [];
    const savedConversations = this.storageService.getItem(this.conversationsKey) || [];
    
    console.log('📨 Messages chargés:', savedMessages.length);
    console.log('💬 Conversations chargées:', savedConversations.length);
    
    this.messages.next(savedMessages);
    this.conversations.next(savedConversations);
  }

  // ✅ CORRECTION : CRÉATION UNIQUE DES CONVERSATIONS
  private createInitialConversations(): void {
    const user = this.userService.getCurrentUser();
    if (!user) return;

    const existingConversations = this.conversations.value;
    
    // ID stable pour la communauté
    const groupConversationId = this.generateCommunityGroupId(user.community);
    let groupConversation = existingConversations.find(c => c.id === groupConversationId);

    if (!groupConversation) {
      // Créer un participant pour l'utilisateur actuel
      const currentParticipant: Participant = {
        userId: user.userId,
        pseudo: user.pseudo,
        avatar: user.avatar,
        isOnline: true,
        lastSeen: new Date()
      };

      groupConversation = {
        id: groupConversationId,
        type: 'group',
        name: `Groupe ${user.community}`,
        participants: [user.userId],
        participantsDetails: [currentParticipant],
        unreadCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        adminIds: [user.userId],
        description: `Discussion de la communauté ${user.community}`
      };

      const updatedConversations = [...existingConversations, groupConversation];
      this.saveConversations(updatedConversations);
      this.createWelcomeMessage(groupConversationId);
    } else {
      // Mettre à jour les participants si nécessaire
      this.updateConversationParticipants(groupConversationId);
    }
  }

  // ✅ NOUVEAU : METTRE À JOUR LES PARTICIPANTS
  private updateConversationParticipants(conversationId: string): void {
    const user = this.userService.getCurrentUser();
    if (!user) return;

    const currentConversations = this.conversations.value;
    const updatedConversations = currentConversations.map(conv => {
      if (conv.id === conversationId) {
        // Vérifier si l'utilisateur est déjà dans les participants
        const isUserInParticipants = conv.participants.includes(user.userId);
        const isUserInDetails = conv.participantsDetails?.some(p => p.userId === user.userId);

        let updatedParticipants = [...conv.participants];
        let updatedParticipantsDetails = [...(conv.participantsDetails || [])];

        if (!isUserInParticipants) {
          updatedParticipants.push(user.userId);
        }

        if (!isUserInDetails) {
          const newParticipant: Participant = {
            userId: user.userId,
            pseudo: user.pseudo,
            avatar: user.avatar,
            isOnline: true,
            lastSeen: new Date()
          };
          updatedParticipantsDetails.push(newParticipant);
        } else {
          // Mettre à jour le statut en ligne
          updatedParticipantsDetails = updatedParticipantsDetails.map(p => 
            p.userId === user.userId 
              ? { ...p, isOnline: true, lastSeen: new Date() }
              : p
          );
        }

        return {
          ...conv,
          participants: updatedParticipants,
          participantsDetails: updatedParticipantsDetails
        };
      }
      return conv;
    });

    this.saveConversations(updatedConversations);
  }

  // ✅ GÉNÉRER UN ID STABLE
  private generateCommunityGroupId(community: string): string {
    const cleanCommunity = community.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').toLowerCase();
    return `group_${cleanCommunity}`;
  }

  private async createWelcomeMessage(conversationId: string): Promise<void> {
    try {
      const existingMessages = this.messages.value;
      const hasWelcomeMessage = existingMessages.some(msg => 
        msg.conversationId === conversationId && msg.content?.includes('Bienvenue')
      );

      if (!hasWelcomeMessage) {
        await this.sendMessage(
          `👋 Bienvenue dans le groupe de votre communauté ${this.userService.getCurrentUser()?.community} ! Ici, vous pouvez échanger avec les autres membres.`,
          conversationId,
          'group'
        );
      }
    } catch (error) {
      console.log('Message de bienvenue déjà existant ou erreur');
    }
  }

  // ✅ ENVOI DE MESSAGE CHIFFRÉ
  async sendMessage(
    content: string, 
    conversationId: string, 
    type: 'group' | 'private'
  ): Promise<Message> {
    const user = this.userService.getCurrentUser();
    if (!user) throw new Error('Utilisateur non connecté');
    if (!this.userEncryptionKey) throw new Error('Clé de chiffrement non disponible');

    try {
      const encryptedData: EncryptedData = await this.encryptionService.encryptAndSerialize(
        content, 
        this.userEncryptionKey
      );
      
      const newMessage: Message = {
        id: generateMessageId(),
        conversationId,
        type,
        fromUserId: user.userId,
        fromUserName: user.pseudo,
        fromUserAvatar: user.avatar,
        encryptedContent: encryptedData.encryptedContent,
        encryptionKey: encryptedData.iv,
        timestamp: new Date(),
        isRead: false,
        readBy: [user.userId],
        isEdited: false,
        isDeleted: false,
        status: 'sent' // Commence par "sent"
      };

      const currentMessages = this.messages.value;
      const updatedMessages = [...currentMessages, newMessage];
      this.saveMessages(updatedMessages);

      this.updateConversationLastMessage(conversationId, newMessage);

      console.log('🔒 Message chiffré envoyé:', {
        conversationId,
        type,
        from: user.pseudo
      });

      // Simuler la livraison et lecture après un délai
      this.simulateMessageDelivery(newMessage.id);

      return {
        ...newMessage,
        content: content
      };

    } catch (error) {
      console.error('❌ Erreur chiffrement message:', error);
      throw new Error('Erreur lors du chiffrement du message');
    }
  }

  // ✅ SIMULATION DE LIVRAISON ET LECTURE
  private simulateMessageDelivery(messageId: string): void {
    setTimeout(() => {
      const currentMessages = this.messages.value;
      const messageIndex = currentMessages.findIndex(msg => msg.id === messageId);
      
      if (messageIndex !== -1) {
        const updatedMessages = [...currentMessages];
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          status: 'delivered'
        };
        this.saveMessages(updatedMessages);

        // Simuler la lecture après un autre délai
        setTimeout(() => {
          const currentMessages2 = this.messages.value;
          const messageIndex2 = currentMessages2.findIndex(msg => msg.id === messageId);
          
          if (messageIndex2 !== -1) {
            const updatedMessages2 = [...currentMessages2];
            updatedMessages2[messageIndex2] = {
              ...updatedMessages2[messageIndex2],
              status: 'read',
              isRead: true
            };
            this.saveMessages(updatedMessages2);
          }
        }, 2000); // 2 secondes après la livraison
      }
    }, 1000); // 1 seconde après l'envoi
  }

  // ✅ MISE À JOUR DE LA CONVERSATION
  private updateConversationLastMessage(conversationId: string, message: Message): void {
    const currentConversations = this.conversations.value;
    const updatedConversations = currentConversations.map(conv => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          lastMessage: '🔒 Message chiffré',
          lastMessageTimestamp: message.timestamp,
          updatedAt: new Date(),
          unreadCount: conv.unreadCount + 1
        };
      }
      return conv;
    });

    this.saveConversations(updatedConversations);
  }

  // ✅ RÉCUPÉRATION DES MESSAGES AVEC DÉCHIFFREMENT
  getMessages(conversationId: string): Observable<Message[]> {
    return this.messages.asObservable().pipe(
      map(messages => 
        messages
          .filter(msg => msg.conversationId === conversationId)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      ),
      switchMap(async (messages) => {
        return await this.decryptMessages(messages);
      })
    );
  }

  // ✅ DÉCHIFFREMENT DES MESSAGES
  private async decryptMessages(messages: Message[]): Promise<Message[]> {
    if (!this.userEncryptionKey) {
      console.warn('⚠️ Clé de chiffrement non disponible');
      return messages.map(msg => ({
        ...msg,
        content: '🔒 Clé de chiffrement manquante'
      }));
    }

    const decryptionPromises = messages.map(async (message) => {
      try {
        if (message.isDeleted) {
          return {
            ...message,
            content: '🗑️ Message supprimé'
          };
        }

        if (!message.encryptionKey || !message.encryptedContent) {
          return {
            ...message,
            content: '🔒 Données de chiffrement incomplètes'
          };
        }

        const encryptedData: EncryptedData = {
          encryptedContent: message.encryptedContent,
          iv: message.encryptionKey
        };

        const decryptedContent = await this.encryptionService.deserializeAndDecrypt(
          encryptedData, 
          this.userEncryptionKey!
        );

        return {
          ...message,
          content: decryptedContent
        };
        
      } catch (error) {
        console.error(`❌ Erreur déchiffrement message ${message.id}:`, error);
        return {
          ...message,
          content: '🔒 Message non déchiffrable'
        };
      }
    });

    return await Promise.all(decryptionPromises);
  }

  // ✅ NOUVEAU : VÉRIFICATION DES TIMEOUTS
  canEditMessage(message: Message): boolean {
    if (message.isDeleted) return false;
    
    const now = new Date().getTime();
    const messageTime = new Date(message.timestamp).getTime();
    const timeDiff = now - messageTime;
    
    return timeDiff <= this.EDIT_TIMEOUT;
  }

  canDeleteMessage(message: Message): boolean {
    if (message.isDeleted) return false;
    
    const now = new Date().getTime();
    const messageTime = new Date(message.timestamp).getTime();
    const timeDiff = now - messageTime;
    
    return timeDiff <= this.DELETE_TIMEOUT;
  }

  // ✅ ÉDITER UN MESSAGE AVEC VÉRIFICATION DE TIMEOUT
  async editMessage(messageId: string, newContent: string): Promise<Message> {
    const user = this.userService.getCurrentUser();
    if (!user || !this.userEncryptionKey) {
      throw new Error('Utilisateur non connecté ou clé manquante');
    }

    const currentMessages = this.messages.value;
    const messageIndex = currentMessages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) {
      throw new Error('Message non trouvé');
    }

    const originalMessage = currentMessages[messageIndex];
    
    if (originalMessage.fromUserId !== user.userId) {
      throw new Error('Vous ne pouvez modifier que vos propres messages');
    }

    if (!this.canEditMessage(originalMessage)) {
      throw new Error('Le délai de modification (30 minutes) est expiré');
    }

    const encryptedData: EncryptedData = await this.encryptionService.encryptAndSerialize(
      newContent, 
      this.userEncryptionKey
    );

    const updatedMessage: Message = {
      ...originalMessage,
      encryptedContent: encryptedData.encryptedContent,
      encryptionKey: encryptedData.iv,
      isEdited: true,
      editedAt: new Date()
    };

    const updatedMessages = [...currentMessages];
    updatedMessages[messageIndex] = updatedMessage;
    this.saveMessages(updatedMessages);

    console.log('✏️ Message édité:', { messageId, from: user.pseudo });

    return {
      ...updatedMessage,
      content: newContent
    };
  }

  // ✅ SUPPRIMER UN MESSAGE AVEC VÉRIFICATION DE TIMEOUT
  async deleteMessage(messageId: string): Promise<void> {
    const user = this.userService.getCurrentUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const currentMessages = this.messages.value;
    const messageIndex = currentMessages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) {
      throw new Error('Message non trouvé');
    }

    const originalMessage = currentMessages[messageIndex];
    
    if (originalMessage.fromUserId !== user.userId) {
      throw new Error('Vous ne pouvez supprimer que vos propres messages');
    }

    if (!this.canDeleteMessage(originalMessage)) {
      throw new Error('Le délai de suppression (2 heures) est expiré');
    }

    const updatedMessage: Message = {
      ...originalMessage,
      isDeleted: true,
      deletedAt: new Date(),
      encryptedContent: '',
      content: '🗑️ Message supprimé'
    };

    const updatedMessages = [...currentMessages];
    updatedMessages[messageIndex] = updatedMessage;
    this.saveMessages(updatedMessages);

    console.log('🗑️ Message supprimé:', { messageId, from: user.pseudo });
  }

  // ✅ SAUVEGARDE DES MESSAGES
  private saveMessages(messages: Message[]): void {
    this.storageService.setItem(this.messagesKey, messages);
    this.messages.next(messages);
  }

  // ✅ SAUVEGARDE DES CONVERSATIONS
  private saveConversations(conversations: Conversation[]): void {
    this.storageService.setItem(this.conversationsKey, conversations);
    this.conversations.next(conversations);
  }

  // ✅ RÉCUPÉRATION DES CONVERSATIONS
  getConversations(): Observable<Conversation[]> {
    return this.conversations.asObservable().pipe(
      map(conversations => 
        conversations.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      )
    );
  }

  // ✅ MARQUER COMME LU
  markAsRead(conversationId: string): void {
    const currentConversations = this.conversations.value;
    let needsUpdate = false;
    
    const updatedConversations = currentConversations.map(conv => {
      if (conv.id === conversationId && conv.unreadCount > 0) {
        needsUpdate = true;
        return {
          ...conv,
          unreadCount: 0
        };
      }
      return conv;
    });

    if (needsUpdate) {
      this.saveConversations(updatedConversations);
    }
  }

  // ✅ STATISTIQUES
  getStats(): any {
    const messages = this.messages.value;
    const conversations = this.conversations.value;
    const user = this.userService.getCurrentUser();

    return {
      totalMessages: messages.length,
      totalConversations: conversations.length,
      groupConversations: conversations.filter(c => c.type === 'group').length,
      privateConversations: conversations.filter(c => c.type === 'private').length,
      unreadTotal: conversations.reduce((sum, conv) => sum + conv.unreadCount, 0),
      userCommunity: user?.community || 'Non connecté'
    };
  }
}
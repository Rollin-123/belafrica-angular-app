import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

// 📚 IMPORTS DES SERVICES
import { StorageService } from './storage.service';
import { UserService } from './user.service';
import { EncryptionService } from './encryption.service';

// 🧩 IMPORTS DES MODÈLES
import { 
  Message, 
  Conversation, 
  Participant,
  Mention,
  MessageAction,
  generateMessageId 
} from '../models/message.model';

// 📦 INTERFACE LOCALE
interface EncryptedData {
  iv: string;
  encryptedContent: string;
}

/**
 * Service de gestion des messages et des conversations.
 * Utilise le chiffrement de bout en bout (simulé par CryptoKey locale).
 */
@Injectable({
  providedIn: 'root'
})
export class MessagingService {

  // =================================================================
  // 🔑 PROPRIÉTÉS & INITIALISATION
  // =================================================================

  // --- Clés de stockage LocalStorage ---
  private readonly messagesKey = 'belafrica_messages';
  private readonly conversationsKey = 'belafrica_conversations';
  private readonly userKeyStorageKey = 'belafrica_user_encryption_key';
  
  // --- Flux de données (BehaviorSubjects) ---
  private messages = new BehaviorSubject<Message[]>([]);
  private conversations = new BehaviorSubject<Conversation[]>([]);
  
  // --- Clé de chiffrement utilisateur ---
  private userEncryptionKey: CryptoKey | null = null;

  // --- Constantes de temps (en millisecondes) ---
  private readonly EDIT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly DELETE_TIMEOUT = 2 * 60 * 60 * 1000; // 2 heures

  constructor(
    private storageService: StorageService,
    private userService: UserService,
    private encryptionService: EncryptionService
  ) {
    this.initializeEncryption();
    this.loadInitialData();
    this.createInitialConversations();
  }

  // 1. ✅ INITIALISATION DU CHIFFREMENT (Génération/Chargement de la clé)
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

  // 2. ✅ CHARGEMENT DES DONNÉES INITIALES DU LOCAL STORAGE
  private loadInitialData(): void {
    const savedMessages = this.storageService.getItem(this.messagesKey) || [];
    const savedConversations = this.storageService.getItem(this.conversationsKey) || [];
    
    console.log('📨 Messages chargés:', savedMessages.length);
    console.log('💬 Conversations chargées:', savedConversations.length);
    
    this.messages.next(savedMessages);
    this.conversations.next(savedConversations);
  }

  // 3. ✅ CRÉATION UNIQUE DES CONVERSATIONS (Ex: Groupe Communautaire)
  private createInitialConversations(): void {
    const user = this.userService.getCurrentUser();
    if (!user) return;

    const existingConversations = this.conversations.value;
    const groupConversationId = this.generateCommunityGroupId(user.community);
    let groupConversation = existingConversations.find(c => c.id === groupConversationId);

    if (!groupConversation) {
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
      // Mettre à jour le statut du participant existant
      this.updateConversationParticipants(groupConversationId);
    }
  }

  // =================================================================
  // 💬 OPÉRATIONS D'ENVOI ET DE RÉPONSE
  // =================================================================

  // 4. ✅ ENVOYER UN MESSAGE CHIFFRÉ (Version simple)
  async sendMessage(
    content: string, 
    conversationId: string, 
    type: 'group' | 'private',
    replyTo?: any
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
        status: 'sent',
        replyTo: replyTo
      };

      const updatedMessages = [...this.messages.value, newMessage];
      this.saveMessages(updatedMessages);

      this.updateConversationLastMessage(conversationId, newMessage);
      this.simulateMessageDelivery(newMessage.id);

      console.log('🔒 Message envoyé:', { conversationId, type, from: user.pseudo });

      return {
        ...newMessage,
        content: content // Retourne le contenu déchiffré pour l'affichage immédiat
      };

    } catch (error) {
      console.error('❌ Erreur chiffrement message:', error);
      throw new Error('Erreur lors du chiffrement du message');
    }
  }

  // 5. ✅ ENVOYER UN MESSAGE AVEC DÉTECTION ET ENREGISTREMENT DES MENTIONS
  async sendMessageWithMentions(
    content: string, 
    conversationId: string, 
    type: 'group' | 'private',
    replyTo?: any
  ): Promise<Message> {
    // Détecter les mentions dans le contenu
    const { content: processedContent, mentions } = this.detectMentions(content);
    
    // Réutiliser la logique d'envoi standard
    const message = await this.sendMessage(processedContent, conversationId, type, replyTo);
    
    // Mettre à jour le message avec les mentions si elles existent (simulé dans cet environnement local)
    if (mentions.length > 0) {
      const currentMessages = this.messages.value;
      const messageIndex = currentMessages.findIndex(msg => msg.id === message.id);

      if (messageIndex !== -1) {
        const updatedMessage = {
          ...currentMessages[messageIndex],
          mentions: mentions
        };
        const updatedMessages = [...currentMessages];
        updatedMessages[messageIndex] = updatedMessage;
        this.saveMessages(updatedMessages);
        
        return { ...message, mentions }; // Retourne la version complète
      }
    }
    
    return message;
  }

  // 6. ✅ RÉPONDRE À UN MESSAGE
  async replyToMessage(
    content: string, 
    conversationId: string, 
    replyToMessageId: string,
    type: 'group' | 'private'
  ): Promise<Message> {
    const originalMessage = this.messages.value.find(msg => msg.id === replyToMessageId);
    if (!originalMessage) {
      throw new Error('Message original non trouvé');
    }

    // Récupérer le contenu déchiffré du message original pour la réponse
    const decryptedOriginal = (await this.decryptMessages([originalMessage]))[0];

    // Préparer les données de réponse
    const replyData = {
      messageId: decryptedOriginal.id,
      fromUserId: decryptedOriginal.fromUserId,
      fromUserName: decryptedOriginal.fromUserName,
      // Afficher un aperçu de 100 caractères du contenu déchiffré
      content: decryptedOriginal.content?.substring(0, 100) + (decryptedOriginal.content && decryptedOriginal.content.length > 100 ? '...' : '') || 'Message',
      isDeleted: decryptedOriginal.isDeleted
    };

    // Envoyer le message avec la référence de réponse
    return await this.sendMessage(content, conversationId, type, replyData);
  }

  // =================================================================
  // 📝 ACTIONS MESSAGES (Édition, Suppression, Actions Contextuelles)
  // =================================================================

  // 7. ✅ VÉRIFICATION DES TIMEOUTS
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

  // 8. ✅ ÉDITER UN MESSAGE AVEC VÉRIFICATION DE TIMEOUT
  async editMessage(messageId: string, newContent: string): Promise<Message> {
    const user = this.userService.getCurrentUser();
    if (!user || !this.userEncryptionKey) {
      throw new Error('Utilisateur non connecté ou clé manquante');
    }

    const currentMessages = this.messages.value;
    const messageIndex = currentMessages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) throw new Error('Message non trouvé');

    const originalMessage = currentMessages[messageIndex];
    
    if (originalMessage.fromUserId !== user.userId) throw new Error('Vous ne pouvez modifier que vos propres messages');
    if (!this.canEditMessage(originalMessage)) throw new Error('Le délai de modification (30 minutes) est expiré');

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

  // 9. ✅ SUPPRIMER UN MESSAGE AVEC VÉRIFICATION DE TIMEOUT
  async deleteMessage(messageId: string): Promise<void> {
    const user = this.userService.getCurrentUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const currentMessages = this.messages.value;
    const messageIndex = currentMessages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) throw new Error('Message non trouvé');

    const originalMessage = currentMessages[messageIndex];
    
    if (originalMessage.fromUserId !== user.userId) throw new Error('Vous ne pouvez supprimer que vos propres messages');
    if (!this.canDeleteMessage(originalMessage)) throw new Error('Le délai de suppression (2 heures) est expiré');

    const updatedMessage: Message = {
      ...originalMessage,
      isDeleted: true,
      deletedAt: new Date(),
      encryptedContent: '', // Supprimer le contenu chiffré
      content: ' Message supprimé'
    };

    const updatedMessages = [...currentMessages];
    updatedMessages[messageIndex] = updatedMessage;
    this.saveMessages(updatedMessages);

    console.log(' Message supprimé:', { messageId, from: user.pseudo });
  }

  // ✅ OBTENIR LES ACTIONS DISPONIBLES POUR UN MESSAGE
getMessageActions(message: Message, currentUserId: string): MessageAction[] {
  const actions: MessageAction[] = [];

  // Action Répondre
  if (!message.isDeleted) {
    actions.push({
      type: 'reply',
      label: 'Répondre',
      icon: '↩',
      condition: (msg, userId) => true
    });
  }

  // Action Copier
  if (!message.isDeleted) {
    actions.push({
      type: 'copy',
      label: 'Copier',
      icon: '🗐',
      condition: (msg, userId) => true
    });
  }

  // Action Modifier
  if (message.fromUserId === currentUserId && !message.isDeleted) {
    actions.push({
      type: 'edit',
      label: 'Modifier',
      icon: '🖋',
      condition: (msg, userId) => this.canEditMessage(msg)
    });
  }

  // Action Supprimer
  if (message.fromUserId === currentUserId && !message.isDeleted) {
    actions.push({
      type: 'delete',
      label: 'Supprimer',
      icon: '🗑️',
      condition: (msg, userId) => this.canDeleteMessage(msg)
    });
  }

  // CORRECTION : Passer les deux paramètres à la condition
  return actions.filter(action => action.condition(message, currentUserId));
}

  // =================================================================
  // 👁️ RÉCUPÉRATION ET DÉCHIFFREMENT DES DONNÉES
  // =================================================================

  // 11. ✅ RÉCUPÉRATION DES CONVERSATIONS (Observable, trié par dernière activité)
  getConversations(): Observable<Conversation[]> {
    return this.conversations.asObservable().pipe(
      map(conversations => 
        conversations.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      )
    );
  }

  // 12. ✅ RÉCUPÉRATION DES MESSAGES (Observable, déchiffrement inclus)
  getMessages(conversationId: string): Observable<Message[]> {
    return this.messages.asObservable().pipe(
      // 1. Filtrer et trier
      map(messages => 
        messages
          .filter(msg => msg.conversationId === conversationId)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      ),
      // 2. Déchiffrer
      switchMap(async (messages) => {
        return await this.decryptMessages(messages);
      })
    );
  }

  // 13. ✅ DÉCHIFFREMENT EFFECTIF DES MESSAGES
  private async decryptMessages(messages: Message[]): Promise<Message[]> {
    if (!this.userEncryptionKey) {
      // Si la clé n'est pas prête, retourner un message d'attente
      console.warn('⚠️ Clé de chiffrement non disponible');
      return messages.map(msg => ({
        ...msg,
        content: 'Veuillez patienter le chargement de ce message'
      }));
    }

    const decryptionPromises = messages.map(async (message) => {
      // Cas du message supprimé
      if (message.isDeleted) {
        return { ...message, content: ' Message supprimé' };
      }
      // Vérification des données de chiffrement
      if (!message.encryptionKey || !message.encryptedContent) {
        return { ...message, content: '🔒 Données de chiffrement incomplètes' };
      }

      const encryptedData: EncryptedData = {
        encryptedContent: message.encryptedContent,
        iv: message.encryptionKey
      };

      try {
        const decryptedContent = await this.encryptionService.deserializeAndDecrypt(
          encryptedData, 
          this.userEncryptionKey!
        );
        return { ...message, content: decryptedContent };
        
      } catch (error) {
        console.error(`❌ Erreur déchiffrement message ${message.id}:`, error);
        return { ...message, content: '🔒 Message non déchiffrable' };
      }
    });

    return await Promise.all(decryptionPromises);
  }

  // 14. ✅ SUGGESTIONS DE MENTIONS
  getMentionSuggestions(searchTerm: string, conversationId: string): any[] {
    const conversation = this.conversations.value.find(c => c.id === conversationId);
    if (!conversation || !conversation.participantsDetails) return [];

    const term = searchTerm.toLowerCase();
    return conversation.participantsDetails
      .filter(participant => 
        participant.pseudo.toLowerCase().includes(term) &&
        participant.userId !== this.userService.getCurrentUser()?.userId
      )
      .slice(0, 5) // Limiter à 5 suggestions
      .map(participant => ({
        userId: participant.userId,
        userName: participant.pseudo,
        avatar: participant.avatar
      }));
  }

  // =================================================================
  // ⚙️ UTILITAIRES INTERNES & LOGIQUE CONVERSATIONS
  // =================================================================

  // 15. ✅ GÉNÉRER UN ID STABLE POUR LA CONVERSATION DE GROUPE
  private generateCommunityGroupId(community: string): string {
    const cleanCommunity = community.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').toLowerCase();
    return `group_${cleanCommunity}`;
  }

  // 16. ✅ CRÉATION DU MESSAGE DE BIENVENUE
  private async createWelcomeMessage(conversationId: string): Promise<void> {
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
  }

  // 17. ✅ DÉTECTER ET TRAITER LES MENTIONS
  detectMentions(text: string): { content: string, mentions: Mention[] } {
    const mentions: Mention[] = [];
    // Le contenu n'est pas modifié ici, mais les mentions sont extraites
    const processedContent = text;
    const mentionRegex = /@(\w+)/g;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const userName = match[1];
      const position = match.index; // Position dans le texte original
      const mentionLength = match[0].length;

      mentions.push({
        userId: `user_${userName}`, // ID simulé
        userName: userName,
        position: position,
        length: mentionLength
      });
    }

    return { content: processedContent, mentions: mentions };
  }

  // 18. ✅ SIMULATION DE LIVRAISON ET LECTURE (pour l'environnement local)
  private simulateMessageDelivery(messageId: string): void {
    const updateStatus = (id: string, newStatus: 'delivered' | 'read', isRead = false) => {
      const current = this.messages.value;
      const index = current.findIndex(msg => msg.id === id);
      
      if (index !== -1) {
        const updatedMessages = [...current];
        updatedMessages[index] = {
          ...updatedMessages[index],
          status: newStatus,
          isRead: isRead
        };
        this.saveMessages(updatedMessages);
      }
    };

    setTimeout(() => {
      updateStatus(messageId, 'delivered');
      setTimeout(() => {
        updateStatus(messageId, 'read', true);
      }, 2000);
    }, 1000);
  }

  // 19. ✅ MISE À JOUR DU DERNIER MESSAGE DE LA CONVERSATION
  private updateConversationLastMessage(conversationId: string, message: Message): void {
    const currentConversations = this.conversations.value;
    const updatedConversations = currentConversations.map(conv => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          lastMessage: '🔒 Message chiffré', // Masquer le contenu réel
          lastMessageTimestamp: message.timestamp,
          updatedAt: new Date(),
          // Incrémenter si ce n'est pas l'utilisateur actuel qui envoie (simulation pour l'instant)
          unreadCount: (message.fromUserId !== this.userService.getCurrentUser()?.userId) 
                       ? conv.unreadCount + 1 
                       : conv.unreadCount
        };
      }
      return conv;
    });

    this.saveConversations(updatedConversations);
  }

  // 20. ✅ METTRE À JOUR LES PARTICIPANTS (pour s'assurer que l'utilisateur est bien là)
  private updateConversationParticipants(conversationId: string): void {
    const user = this.userService.getCurrentUser();
    if (!user) return;

    const currentConversations = this.conversations.value;
    const updatedConversations = currentConversations.map(conv => {
      if (conv.id === conversationId) {
        let updatedParticipants = [...conv.participants];
        let updatedParticipantsDetails = [...(conv.participantsDetails || [])];

        // 1. Ajouter l'ID si manquant
        if (!updatedParticipants.includes(user.userId)) {
          updatedParticipants.push(user.userId);
        }

        const isUserInDetails = conv.participantsDetails?.some(p => p.userId === user.userId);

        // 2. Mettre à jour/Ajouter les détails du participant
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

  // =================================================================
  // 💾 PERSISTENCE & STATISTIQUES PUBLIQUES
  // =================================================================

  // 21. ✅ MARQUER UNE CONVERSATION COMME LUE (Réinitialiser le compteur)
  markAsRead(conversationId: string): void {
    const currentConversations = this.conversations.value;
    let needsUpdate = false;
    
    const updatedConversations = currentConversations.map(conv => {
      if (conv.id === conversationId && conv.unreadCount > 0) {
        needsUpdate = true;
        return { ...conv, unreadCount: 0 };
      }
      return conv;
    });

    if (needsUpdate) {
      this.saveConversations(updatedConversations);
    }
  }

  // 22. ✅ SAUVEGARDE DES MESSAGES (Met à jour le LocalStorage et le Subject)
  private saveMessages(messages: Message[]): void {
    this.storageService.setItem(this.messagesKey, messages);
    this.messages.next(messages);
  }

  // 23. ✅ SAUVEGARDE DES CONVERSATIONS (Met à jour le LocalStorage et le Subject)
  private saveConversations(conversations: Conversation[]): void {
    this.storageService.setItem(this.conversationsKey, conversations);
    this.conversations.next(conversations);
  }

  // 24. ✅ STATISTIQUES GLOBALES
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

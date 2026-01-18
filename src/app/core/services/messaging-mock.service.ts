/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, of, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { map, switchMap } from 'rxjs/operators';
import { MessagingService } from './messaging.service';
import { mapBackendMessageToFrontend } from '../mappers/message.mapper';
import { StorageService } from './storage.service';
import { UserService } from './user.service';
import { EncryptionService } from './encryption.service';

// 🧩 IMPORTS DES MODÈLES
import { 
  Message, 
  Conversation, 
  BackendMessage,
  Participant,
  Mention,
  MessageAction,
  generateMessageId
} from '../models/message.model';

interface EncryptedData {
  iv: string;
  encryptedContent: string;
}

/**
 * Service MOCK de gestion des messages et des conversations.
 * Utilise le localStorage et simule le chiffrement.
 */
@Injectable()
export class MessagingMockService extends MessagingService {
  // =================================================================
  // 🔑 PROPRIÉTÉS & INITIALISATION
  // =================================================================

  // --- Clés de stockage LocalStorage ---
  private readonly messagesKey = 'belafrica_messages';
  private readonly conversationsKey = 'belafrica_conversations';
  private readonly userKeyStorageKey = 'belafrica_user_encryption_key';
  private readonly deletedForSelfKey = 'belafrica_deleted_for_self'; // ✅ Pour la suppression locale
  
  // --- Flux de données (BehaviorSubjects) ---
  private messages = new BehaviorSubject<BackendMessage[]>([]); // ✅ Stocke les données brutes du backend
  private conversations = new BehaviorSubject<Conversation[]>([]);
  
  // --- Sujets pour les événements temps réel (simulés) ---
  private userTypingSubject = new Subject<{ userId: string; pseudo: string; conversationId: string }>();
  private userStoppedTypingSubject = new Subject<{ userId: string; conversationId: string }>();
  private messagesReadSubject = new Subject<{ conversationId: string; userId: string; messageIds: string[] }>();

  // --- Clé de chiffrement utilisateur ---
  private userEncryptionKey: CryptoKey | null = null;

  // --- Constantes de temps (en millisecondes) ---
  private readonly EDIT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly DELETE_TIMEOUT = 2 * 60 * 60 * 1000; // 2 heures

  // --- Stockage local des messages supprimés "pour soi" ---
  private deletedForSelfIds: Set<string> = new Set();

  constructor(
    private storageService: StorageService,
    private userService: UserService,
    private encryptionService: EncryptionService
  ) {
    super();
    this.init();
  }

  // ✅ NOUVEAU : Méthode d'initialisation asynchrone
  private async init(): Promise<void> {
    await this.initializeEncryption();
    this.loadInitialData(); // Charge les données existantes
    const deletedIds = this.storageService.getItem(this.deletedForSelfKey) || [];
    this.deletedForSelfIds = new Set(deletedIds);
    if (!environment.production) {
      this.createInitialConversations(); // Crée les données de démo
    }
  }

  // 1. ✅ INITIALISATION DU CHIFFREMENT (Génération/Chargement de la clé)
  private async initializeEncryption(): Promise<void> {
    try {
      const savedKey = this.storageService.getItem(this.userKeyStorageKey);
      
      if (savedKey) {
        this.userEncryptionKey = await this.encryptionService.importKey(savedKey);
        console.log('🎭 [MOCK] Clé de chiffrement chargée');
      } else {
        this.userEncryptionKey = await this.encryptionService.generateEncryptionKey();
        const keyString = await this.encryptionService.exportKey(this.userEncryptionKey);
        this.storageService.setItem(this.userKeyStorageKey, keyString);
        console.log('🎭 [MOCK] Nouvelle clé de chiffrement générée');
      }
    } catch (error) {
      console.error('❌ Erreur initialisation chiffrement:', error);
    }
  }

  // 2. ✅ CHARGEMENT DES DONNÉES INITIALES DU LOCAL STORAGE
  private loadInitialData(): void {
    const savedMessages = this.storageService.getItem(this.messagesKey) || [];
    const savedConversations = this.storageService.getItem(this.conversationsKey) || [];
    
    console.log('🎭 [MOCK] Messages chargés:', savedMessages.length);
    console.log('🎭 [MOCK] Conversations chargées:', savedConversations.length);
    
    this.messages.next(savedMessages);
    this.conversations.next(savedConversations);
  }

  // 3. ✅ CRÉATION UNIQUE DES CONVERSATIONS (Ex: Groupe Communautaire)
  private createInitialConversations(): void {
    const user = this.userService.getCurrentUser();
    if (!user || this.conversations.value.length > 0) return; // Ne pas recréer si des conversations existent

    const existingConversations = this.conversations.value;
    const groupConversationId = this.generateCommunityGroupId(user.community);
    let groupConversation = existingConversations.find(c => c.id === groupConversationId);

    if (!groupConversation) {
      const currentParticipant: Participant = {
        userId: user.id, // ✅ CORRECTION
        pseudo: user.pseudo,
        avatar: user.avatar_url ?? undefined, // ✅ CORRECTION
        isOnline: true,
        lastSeen: new Date()
      };

      groupConversation = {
        id: groupConversationId,
        type: 'group',
        name: `Groupe ${user.community}`,
        participants: [user.id], // ✅ CORRECTION
        participantsDetails: [currentParticipant],
        unreadCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        adminIds: [user.id], // ✅ CORRECTION
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
    mentions: Mention[] = [],
    replyToId?: string
  ): Promise<void> {  
    const user = this.userService.getCurrentUser();
    if (!user) throw new Error('Utilisateur non connecté');
    if (!this.userEncryptionKey) throw new Error('Clé de chiffrement non disponible');

    try {
      const encryptedData: EncryptedData = await this.encryptionService.encryptAndSerialize(
        content, 
        this.userEncryptionKey
      );
      
      const newMessage: BackendMessage = {
        id: generateMessageId(),
        conversation_id: conversationId,
        user_id: user.id,
        encrypted_content: encryptedData.encryptedContent,
        iv: encryptedData.iv,
        created_at: new Date().toISOString(),
        updated_at: null,
        is_edited: false,
        is_deleted: false,
        reply_to_id: replyToId || null,
        mentions: mentions,
        user: {
          id: user.id,
          pseudo: user.pseudo,
          avatar_url: user.avatar_url || null
        }
      };

      const updatedMessages = [...this.messages.value, newMessage];
      this.saveMessages(updatedMessages);

      // Simule la mise à jour de la conversation
      const frontendMessage = mapBackendMessageToFrontend(newMessage);
      this.updateConversationLastMessage(conversationId, frontendMessage);
      this.simulateMessageDelivery(newMessage.id);

      console.log('🎭 [MOCK] Message envoyé:', { conversationId, type, from: user.pseudo });

    } catch (error) {
      console.error('❌ Erreur chiffrement message:', error);
    }
  }

  // 5. ✅ ENVOYER UN MESSAGE AVEC DÉTECTION ET ENREGISTREMENT DES MENTIONS
  async sendMessageWithMentions(
    content: string, 
    conversationId: string, 
    type: 'group' | 'private',
    mentions: Mention[] = []
  ): Promise<void> { 
    return this.sendMessage(content, conversationId, type, mentions);
  }

  // 6. ✅ RÉPONDRE À UN MESSAGE
  async replyToMessage(
    content: string, 
    conversationId: string, 
    replyToMessageId: string,
    type: 'group' | 'private',  
    mentions: Mention[] = []
  ): Promise<void> {
    // La logique de création de l'objet `replyTo` est dans le composant.
    // Le service n'a besoin que de l'ID.
    return await this.sendMessage(content, conversationId, type, mentions, replyToMessageId);
  }

  // =================================================================
  // 📝 ACTIONS MESSAGES (Édition, Suppression, Actions Contextuelles)
  // =================================================================

  // 8. ✅ ÉDITER UN MESSAGE AVEC VÉRIFICATION DE TIMEOUT
  async editMessage(messageId: string, newContent: string): Promise<void> {
    const user = this.userService.getCurrentUser();
    if (!user || !this.userEncryptionKey) {
      throw new Error('Utilisateur non connecté ou clé manquante');
    }

    const currentMessages = this.messages.value;
    const messageIndex = currentMessages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) throw new Error('Message non trouvé');

    const originalMessage = currentMessages[messageIndex];
    
    if (originalMessage.user_id !== user.id) throw new Error('Vous ne pouvez modifier que vos propres messages');
    if (new Date().getTime() - new Date(originalMessage.created_at).getTime() > this.EDIT_TIMEOUT) throw new Error('Le délai de modification (30 minutes) est expiré');

    const encryptedData: EncryptedData = await this.encryptionService.encryptAndSerialize(
      newContent, 
      this.userEncryptionKey
    );

    const updatedMessage: BackendMessage = {
      ...originalMessage,
      encrypted_content: encryptedData.encryptedContent,
      iv: encryptedData.iv,
      is_edited: true,
      updated_at: new Date().toISOString()
    };

    const updatedMessages = [...currentMessages];
    updatedMessages[messageIndex] = updatedMessage;
    this.saveMessages(updatedMessages);

    console.log('🎭 [MOCK] Message édité:', { messageId, from: user.pseudo });
  }

  // 9. ✅ SUPPRIMER UN MESSAGE AVEC VÉRIFICATION DE TIMEOUT
  async deleteMessage(messageId: string, forEveryone: boolean): Promise<void> {
    const user = this.userService.getCurrentUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const currentMessages = this.messages.value;
    const messageIndex = currentMessages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) throw new Error('Message non trouvé');

    const originalMessage = currentMessages[messageIndex];
    
    if (forEveryone) {
      if (originalMessage.user_id !== user.id) throw new Error('Vous ne pouvez supprimer que vos propres messages');
      if (new Date().getTime() - new Date(originalMessage.created_at).getTime() > this.DELETE_TIMEOUT) throw new Error('Le délai de suppression (2 heures) est expiré');

      const updatedMessage: BackendMessage = {
        ...originalMessage,
        is_deleted: true,
        updated_at: new Date().toISOString(),
        encrypted_content: null,
        iv: null
      };

      const updatedMessages = [...currentMessages];
      updatedMessages[messageIndex] = updatedMessage;
      this.saveMessages(updatedMessages);

      console.log('🎭 [MOCK] Message supprimé pour tous:', { messageId, from: user.pseudo });
    } else {
      // Suppression "pour soi"
      this.deletedForSelfIds.add(messageId);
      this.storageService.setItem(this.deletedForSelfKey, Array.from(this.deletedForSelfIds));
      // Forcer la mise à jour du flux de messages pour que le filtre s'applique
      this.messages.next(this.messages.value);
      console.log('🎭 [MOCK] Message supprimé pour soi:', { messageId, from: user.pseudo });
    }
  }

  // ✅ OBTENIR LES ACTIONS DISPONIBLES POUR UN MESSAGE
getMessageActions(message: Message, currentUserId: string): MessageAction[] {
  const actions: MessageAction[] = [];

  // Action Répondre
  if (!message.isDeleted) {
    actions.push({
      type: 'reply',
      label: 'Répondre',
      icon: 'reply', // Nom de l'icône SVG
      condition: (msg, userId) => true
    });
  }

  // Action Copier
  if (!message.isDeleted) {
    actions.push({
      type: 'copy',
      label: 'Copier',
      icon: 'copy',
      condition: (msg, userId) => true
    });
  }

  // Action Modifier
  if (message.fromUserId === currentUserId && !message.isDeleted) {
    actions.push({
      type: 'edit',
      label: 'Modifier',
      icon: 'edit',
      condition: (msg, userId) => new Date().getTime() - new Date(msg.timestamp).getTime() <= this.EDIT_TIMEOUT
    });
  }

  // Action Supprimer
  if (message.fromUserId === currentUserId && !message.isDeleted) {
    actions.push({
      type: 'delete',
      label: 'Supprimer',
      icon: 'delete',
      condition: (msg, userId) => new Date().getTime() - new Date(msg.timestamp).getTime() <= this.DELETE_TIMEOUT
    });
  }

  // Action Supprimer pour soi
  actions.push({
    type: 'delete-for-self',
    label: 'Supprimer pour moi',
      icon: 'delete', // Using same icon for now, can be different
    condition: (msg, userId) => true // Toujours possible
  });


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
      // 1. Mapper les messages backend en messages frontend
      map(backendMessages => backendMessages.map(mapBackendMessageToFrontend)),
      // 2. Filtrer par conversation et ceux supprimés "pour soi"
      map(messages => 
        messages
          .filter(msg => msg.conversationId === conversationId)
          .filter(msg => !this.deletedForSelfIds.has(msg.id)) // ✅ Filtre les messages supprimés localement
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      ),
      // 3. Déchiffrer
      switchMap(async (messages) => {
        return await this.decryptMessages(messages);
      })
    );
  }

  // 13. ✅ DÉCHIFFREMENT EFFECTIF DES MESSAGES
  private async decryptMessages(messages: (Message | BackendMessage)[]): Promise<Message[]> {
    if (!this.userEncryptionKey) {
      // Si la clé n'est pas prête, retourner un message d'attente
      console.warn('⚠️ Clé de chiffrement non disponible');
      return messages.map(msg => ({
        ...mapBackendMessageToFrontend(msg as BackendMessage),
        content: 'Veuillez patienter le chargement de ce message'
      }));
    }

    const decryptionPromises = messages.map(async (message) => {
      const frontendMessage = ('fromUserId' in message) ? message as Message : mapBackendMessageToFrontend(message as BackendMessage);

      // Cas du message supprimé
      if (frontendMessage.isDeleted) {
        return { ...frontendMessage, content: ' Message supprimé' };
      }
      // Vérification des données de chiffrement
      if (!frontendMessage.encryptionKey || !frontendMessage.encryptedContent) {
        return { ...frontendMessage, content: '🔒 Données de chiffrement incomplètes' };
      }

      const encryptedData: EncryptedData = {
        encryptedContent: frontendMessage.encryptedContent,
        iv: frontendMessage.encryptionKey
      };

      try {
        const decryptedContent = await this.encryptionService.deserializeAndDecrypt(
          encryptedData, 
          this.userEncryptionKey!
        );
        return { ...frontendMessage, content: decryptedContent };
        
      } catch (error) {
        console.error(`❌ Erreur déchiffrement message ${frontendMessage.id}:`, error);
        return { ...frontendMessage, content: '🔒 Message non déchiffrable' };
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
        participant.pseudo.toLowerCase().includes(term) && participant.userId !== this.userService.getCurrentUser()?.id
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
    const hasMessageInConversation = existingMessages.some(
      msg => msg.conversation_id === conversationId
    );

    if (!hasMessageInConversation) {
      await this.sendMessage(
        `👋 Bienvenue dans le groupe de votre communauté ${this.userService.getCurrentUser()?.community} ! Ici, vous pouvez échanger avec les autres membres.`,
        conversationId,
        'group',
        []
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
        // Simule l'événement de lecture
        if (newStatus === 'read') {
          this.messagesReadSubject.next({
            conversationId: current[index].conversation_id,
            userId: 'mock_user_id', // Simule un autre utilisateur qui lit
            messageIds: [id]
          });
        } else {
          // Pour 'sent' et 'delivered', on pourrait aussi émettre des événements
          // mais c'est moins crucial pour l'UI que la lecture.
        }
      } 
    };

    setTimeout(() => {
      updateStatus(messageId, 'delivered');
      setTimeout(() => {
        updateStatus(messageId, 'read');
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
          unreadCount: (message.fromUserId !== this.userService.getCurrentUser()?.id) // ✅ CORRECTION
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
        if (!updatedParticipants.includes(user.id)) {
          updatedParticipants.push(user.id);
        }

        const isUserInDetails = conv.participantsDetails?.some(p => p.userId === user.id);

        // 2. Mettre à jour/Ajouter les détails du participant
        if (!isUserInDetails) {
          const newParticipant: Participant = {
            userId: user.id,
            pseudo: user.pseudo,
            avatar: user.avatar_url ?? undefined, // ✅ CORRECTION
            isOnline: true,
            lastSeen: new Date()
          };
          updatedParticipantsDetails.push(newParticipant);
        } else {
          // Mettre à jour le statut en ligne
          updatedParticipantsDetails = updatedParticipantsDetails.map(p =>
            p.userId === user.id
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
  private saveMessages(messages: BackendMessage[]): void {
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

  // =================================================================
  // ⚡️ MÉTHODES TEMPS RÉEL (MOCK)
  // =================================================================

  joinConversation(conversationId: string): void {
    console.log(`[MOCK] Rejoint la conversation ${conversationId}`);
  }

  leaveConversation(conversationId: string): void {
    console.log(`[MOCK] Quitté la conversation ${conversationId}`);
  }

  getRealTimeMessages(): Observable<Message> {
    // Simule la réception d'un nouveau message en le mappant
    return this.messages.pipe(
      map(messages => messages[messages.length - 1]), // Prend le dernier
      switchMap(async backendMessage => mapBackendMessageToFrontend(backendMessage as BackendMessage))
    );
  }

  emitStartTyping(conversationId: string): void {
    const user = this.userService.getCurrentUser();
    if (user) {
      console.log(`[MOCK] Événement "startTyping" émis pour ${conversationId}`);
      this.userTypingSubject.next({ userId: user.id, pseudo: user.pseudo, conversationId });
    }
  }

  emitStopTyping(conversationId: string): void {
    const user = this.userService.getCurrentUser();
    if (user) {
      console.log(`[MOCK] Événement "stopTyping" émis pour ${conversationId}`);
      this.userStoppedTypingSubject.next({ userId: user.id, conversationId });
    }
  }

  onUserTyping(): Observable<{ userId: string; pseudo: string; conversationId: string; }> { return this.userTypingSubject.asObservable(); }
  onUserStoppedTyping(): Observable<{ userId: string; pseudo: string; conversationId: string; }> {
    // This needs to be adapted to match the base class if it expects a pseudo
    return this.userStoppedTypingSubject.pipe(map(data => ({
      ...data,
      pseudo: this.userService.getCurrentUser()?.pseudo || 'unknown'
    })));
  }
  onMessagesRead(): Observable<{ conversationId: string; userId: string; messageIds: string[] }> { return this.messagesReadSubject.asObservable(); }
}

/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { Observable, of, firstValueFrom, Subscription } from 'rxjs';
import { map, tap, switchMap, distinctUntilChanged } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Message, Conversation, MessageAction, Mention } from '../../../../core/models/message.model';
import { MessagingService } from '../../../../core/services/messaging.service';
import { User, UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-messaging',
  templateUrl: './messaging.component.html',
  styleUrls: ['./messaging.component.scss'],
  standalone: false
})
export class MessagingComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  private readonly EDIT_TIMEOUT = 30 * 60 * 1000; 
  private readonly DELETE_TIMEOUT = 2 * 60 * 60 * 1000; 
  currentUser: User | null = null;

  activeTab: 'group' | 'private' = 'group';
  newMessage: string = '';
  isSending: boolean = false;
  editingMessageId: string | null = null;
  editMessageContent: string = '';
  replyingTo: Message | null = null;
  showEmojiPicker = false;
  showMentionsList = false;
  contextMenu = {
    visible: false,
    x: 0,
    y: 0,
    message: null as Message | null,
    actions: [] as MessageAction[]
  };

  // ✅ Indicateur "en train d'écrire"
  typingUsers = new Map<string, { pseudo: string, timeout: any }>();
  isTyping = false;
  private typingTimeout: any;
  readonly TYPING_TIMER_LENGTH = 3000; 

  private touchStart = {
    time: 0,
    x: 0,
    y: 0
  };

  // Gestion des @mentions
  currentMentionQuery: string = '';
  mentionCandidates: any[] = [];
  public Array = Array;
  mentionStartPosition: number = -1;

  // Observables
  groupConversation$: Observable<Conversation | undefined>;
  messages$: Observable<Message[]>;
  userCommunity: string = '';
  conversationParticipants: any[] = [];

  // Stockage local des messages
  private currentMessages: Message[] = [];
  private subscription = new Subscription();

  constructor(
    private messagingService: MessagingService,
    private userService: UserService,
    private sanitizer: DomSanitizer  
  ) {
    const user = this.userService.getCurrentUser();
    this.currentUser = user;
    this.userCommunity = user?.community || 'Communauté inconnue';

    // Charger la conversation de groupe
    this.groupConversation$ = this.messagingService.getConversations().pipe( 
      map(conversations => conversations.find(c => c.type === 'group')),
      tap(conversation => {
        if (conversation) {
          this.conversationParticipants = conversation.participantsDetails || [];
        }
      }),
      distinctUntilChanged()
    );

    // Charger les messages du groupe
    this.messages$ = this.groupConversation$.pipe(
      map(conversation => conversation ? conversation.id : ''),
      distinctUntilChanged(),
      switchMap(conversationId => {
        if (conversationId) {
          return this.messagingService.getMessages(conversationId);
        } else {
          return of([]);
        }
      }),
      tap(messages => {
        this.currentMessages = messages;
        setTimeout(() => this.scrollToBottom(), 100);
      })
    );
  }

  ngOnInit() {
    this.subscription.add(
      this.messages$.subscribe(messages => {
        this.currentMessages = messages;
        this.updateReadStatus(messages);
      })
    );
  }

  ngAfterViewInit() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.contextMenu.visible) {
      this.closeContextMenu();
    }
    if (this.showEmojiPicker) {
      this.showEmojiPicker = false;
    }
    if (this.showMentionsList) {
      this.showMentionsList = false;
    }
  }

  // ✅ NAVIGATION PAR ONGLETS
  setActiveTab(tab: 'group' | 'private'): void {
    this.activeTab = tab;
  }

  // ✅ ENVOI DE MESSAGE
  async sendMessage(): Promise<void> {
    if (!this.newMessage.trim() || this.isSending) return;

    this.isSending = true;
    const messageContent = this.newMessage.trim();

    try {
      const conversation = await firstValueFrom(this.groupConversation$);
      if (!conversation) {
        console.error('❌ Tentative d\'envoi de message sans conversation chargée. Probablement dû à une erreur de chargement initiale (401?).');
        alert('Impossible d\'envoyer le message. La conversation n\'a pas pu être chargée. Veuillez rafraîchir la page.');
        this.isSending = false;
        return;
      }

      // Détecter les mentions avant l'envoi
      const mentions = this.detectMentions(messageContent, conversation.id);

      await this.messagingService.sendMessage(
        messageContent,
        conversation.id,
        'group',
        mentions
      );

      this.newMessage = '';
      this.showMentionsList = false;
      this.scrollToBottom();
      
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      this.isSending = false;
      if (this.messageInput?.nativeElement) {
        this.messageInput.nativeElement.focus();
      }
    }
  }


  // ✅ ENVOI DE MESSAGE AVEC RÉPONSE
  async sendMessageWithReply(): Promise<void> {
    if (!this.newMessage.trim() || this.isSending || !this.replyingTo) return;

    this.isSending = true;
    const messageContent = this.newMessage.trim();

    try {
      const conversation = await firstValueFrom(this.groupConversation$);
      if (!conversation) {
        console.error('❌ Tentative d\'envoi de message sans conversation chargée. Probablement dû à une erreur de chargement initiale (401?).');
        alert('Impossible d\'envoyer le message. La conversation n\'a pas pu être chargée. Veuillez rafraîchir la page.');
        this.isSending = false;
        return;
      }

      // Détecter les mentions avant l'envoi
      const mentions = this.detectMentions(messageContent, conversation.id);

      await this.messagingService.replyToMessage(
        messageContent,
        conversation.id,
        this.replyingTo.id, 
        'group',
        mentions
      );

      this.newMessage = '';
      this.replyingTo = null;
      this.showMentionsList = false;
      this.scrollToBottom();
      
    } catch (error) {
      console.error('❌ Erreur envoi message avec réponse:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      this.isSending = false;
      if (this.messageInput?.nativeElement) {
        this.messageInput.nativeElement.focus();
      }
    }
  }

  // ✅ GESTION DES TOUCHES AVEC @MENTIONS
  onKeyPress(event: KeyboardEvent): void {
    // Gestion de l'indicateur "en train d'écrire"
    if (!this.isTyping) {
      this.isTyping = true;
      // this.messagingService.emitStartTyping(this.activeConversationId);
    }
    clearTimeout(this.typingTimeout);
    // Gestion des @mentions
    if (event.key === '@') {
      this.handleMentionStart();
    }
    
    // Navigation dans la liste des mentions
    if (this.showMentionsList) {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Enter') {
        event.preventDefault();
        this.handleMentionNavigation(event);
        return;
      }
    }

    // Envoi du message
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.replyingTo) {
        this.sendMessageWithReply();
      } else {
        this.sendMessage();
      }
    }
  }

  // ✅ DÉTECTION DES @MENTIONS
  onMessageInput(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    this.newMessage = input.value;

    this.typingTimeout = setTimeout(() => {
      this.isTyping = false;
      // this.messagingService.emitStopTyping(this.activeConversationId);
    }, this.TYPING_TIMER_LENGTH);
    
    // Vérifier si on est en train de taper une mention
    if (this.showMentionsList) {
      this.updateMentionCandidates();
    }
  }

  // ✅ DÉMARRER UNE MENTION
  handleMentionStart(): void {
    this.showMentionsList = true;
    this.mentionStartPosition = this.newMessage.length;
    this.currentMentionQuery = '';
    this.updateMentionCandidates();
  }

  // ✅ METTRE À JOUR LES CANDIDATS DE MENTION
  updateMentionCandidates(): void {
    const text = this.newMessage;
    const atPosition = text.lastIndexOf('@', this.mentionStartPosition);
    
    if (atPosition === -1) {
      this.showMentionsList = false;
      return;
    }

    this.currentMentionQuery = text.substring(atPosition + 1);
    
    if (this.currentMentionQuery.length === 0) {
      this.mentionCandidates = this.conversationParticipants.filter(p => 
        p.users.id !== this.userService.getCurrentUser()?.id
      );
    } else {
      this.mentionCandidates = this.conversationParticipants.filter(p => 
        p.users.pseudo.toLowerCase().includes(this.currentMentionQuery.toLowerCase()) &&
        p.users.id !== this.userService.getCurrentUser()?.id
      );
    }
    this.showMentionsList = this.mentionCandidates.length > 0;
  }

  // ✅ NAVIGATION DANS LES MENTIONS
  handleMentionNavigation(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.mentionCandidates.length > 0) {
      this.selectMention(this.mentionCandidates[0]);
    }
  }

  // ✅ SÉLECTIONNER UNE MENTION
  selectMention(user: any): void {
    const textBefore = this.newMessage.substring(0, this.mentionStartPosition);
    const textAfter = this.newMessage.substring(this.mentionStartPosition + this.currentMentionQuery.length + 1);
    
    this.newMessage = textBefore + '@' + user.users.pseudo + ' ' + textAfter;
    this.showMentionsList = false;
    this.currentMentionQuery = '';
    
    setTimeout(() => {
      if (this.messageInput?.nativeElement) {
        this.messageInput.nativeElement.focus();
        const newPosition = this.mentionStartPosition + user.users.pseudo.length + 2;
        this.messageInput.nativeElement.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  }

  // ✅ DÉTECTER LES MENTIONS DANS LE TEXTE
  detectMentions(text: string, conversationId: string): Mention[] {
    const mentions: Mention[] = [];
    const mentionRegex = /@(\w+)/g;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const userName = match[1];
      const participant = this.conversationParticipants.find(p =>
        p.users.pseudo === userName
      );

      if (participant) {
        mentions.push({
          userId: participant.users.id,
          userName: participant.users.pseudo,
          position: match.index,
          length: match[0].length
        });
      }
    }

    return mentions;
  }

  // ✅ GESTION DES TOUCHES POUR L'ÉDITION
  onEditKeyPress(event: KeyboardEvent, message: Message): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.saveEditedMessage();
    } else if (event.key === 'Escape') {
      this.cancelEditing();
    }
  }

  // ✅ DÉFILEMENT
  private scrollToBottom(): void {
    try {
      if (this.messagesContainer?.nativeElement) {
        const element = this.messagesContainer.nativeElement;
        setTimeout(() => {
          element.scrollTop = element.scrollHeight;
        }, 100);
      }
    } catch (error) {
      console.log('Scroll error:', error);
    }
  }

  // ✅ VÉRIFICATION MESSAGE PERSONNEL
  isMyMessage(message: Message): boolean {
    const user = this.userService.getCurrentUser();
    return message.fromUserId === user?.id;
  }

  // ✅ VÉRIFICATIONS ÉDITION/SUPPRESSION
  canEditMessage(message: Message): boolean {
    if (message.isDeleted || !this.isMyMessage(message)) {
      return false;
    }
    const now = new Date().getTime();
    const messageTime = new Date(message.timestamp).getTime();
    return (now - messageTime) <= this.EDIT_TIMEOUT;
  }

  canDeleteMessage(message: Message): boolean {
    if (message.isDeleted || !this.isMyMessage(message)) {
      return false;
    }
    const now = new Date().getTime();
    const messageTime = new Date(message.timestamp).getTime();
    return (now - messageTime) <= this.DELETE_TIMEOUT;
  }


  // ✅ TROUVER UN MESSAGE PAR ID
  private findMessageById(messageId: string): Message | undefined {
    return this.currentMessages.find(m => m.id === messageId);
  }

  // ✅ ACTIONS SUR LES MESSAGES
  startEditing(message: Message): void {
    if (!this.canEditMessage(message)) {
      alert('Le délai de modification (30 minutes) est expiré');
      return;
    }

    this.editingMessageId = message.id;
    this.editMessageContent = message.content || '';
    setTimeout(() => {
      const editInput = document.querySelector('.bel-edit-input') as HTMLTextAreaElement;
      if (editInput) editInput.focus();
    }, 100);
  }

  cancelEditing(): void {
    this.editingMessageId = null;
    this.editMessageContent = '';
  }

  async saveEditedMessage(): Promise<void> {
    if (!this.editingMessageId || !this.editMessageContent.trim()) return;

    try {
      await this.messagingService.editMessage(this.editingMessageId, this.editMessageContent.trim());
      this.cancelEditing();
    } catch (error: any) {
      console.error('❌ Erreur édition message:', error);
      alert(error.message || 'Erreur lors de la modification du message');
    }
  }

  async deleteMessage(messageId: string, forEveryone: boolean): Promise<void> {
    try {
      const message = this.findMessageById(messageId);
      if (!message) return alert('Message non trouvé');

      const confirmationText = forEveryone 
        ? 'Êtes-vous sûr de vouloir supprimer ce message pour tout le monde ?'
        : 'Supprimer ce message uniquement pour vous ?';

      if (forEveryone) {
        if (!this.canDeleteMessage(message)) {
          return alert('Le délai de suppression (2 heures) est expiré');
        }
      }

      if (!confirm(confirmationText)) return;

      await this.messagingService.deleteMessage(messageId, forEveryone);

    } catch (error: any) {
      console.error('❌ Erreur suppression message:', error);
      alert(error.message || 'Erreur lors de la suppression du message');
    }
    finally {
      this.closeContextMenu();
    }
  }

  // ✅ MENU CONTEXTUEL
  showContextMenu(event: MouseEvent, message: Message): void {
    event.preventDefault();
    
    const user = this.userService.getCurrentUser();
    if (!user) return;

    const actions = this.messagingService.getMessageActions(message, user.id); 
    if (actions.length === 0) return;

    this.contextMenu = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      message,
      actions
    };
  }

  closeContextMenu(): void {
    this.contextMenu.visible = false;
  }

  executeContextAction(action: MessageAction): void {
    if (!this.contextMenu.message) return;

    const message = this.contextMenu.message;

    switch (action.type) {
      case 'reply':
        this.startReplying(message);
        break;
      case 'edit':
        this.startEditing(message);
        break;
      case 'delete':
        this.deleteMessage(message.id, true); 
        break;
      case 'delete-for-self':
        this.deleteMessage(message.id, false); 
        break;
      case 'copy':
        this.copyMessage(message);
        break;
    }

    this.closeContextMenu();
  }

  // ✅ RÉPONSES AUX MESSAGES
  startReplying(message: Message): void {
    this.replyingTo = message;
    this.scrollToMessage(message.id);
    setTimeout(() => {
      if (this.messageInput?.nativeElement) {
        this.messageInput.nativeElement.focus();
      }
    }, 100);
  }

  cancelReply(): void {
    this.replyingTo = null;
  }

  // ✅ FONCTIONNALITÉS DIVERSES
  copyMessage(message: Message): void {
    if (message.content && !message.isDeleted) {
      navigator.clipboard.writeText(message.content)
        .then(() => {
          console.log('✅ Message copié');
        })
        .catch(err => {
          console.error('❌ Erreur copie:', err);
        });
    }
  }

  scrollToMessage(messageId: string): void {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('bel-message-highlight');
      setTimeout(() => {
        messageElement.classList.remove('bel-message-highlight');
      }, 2000);
    }
  }

  // ✅ ÉMOJIS
  toggleEmojiPicker(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showEmojiPicker = !this.showEmojiPicker;
    this.showMentionsList = false;
  }

  addEmoji(emoji: string): void {
    this.newMessage += emoji;
    this.showEmojiPicker = false;
  }

  // ✅ GESTION DES ACCUSÉS DE LECTURE
  private updateReadStatus(messages: Message[]): void {
    const unreadMessages = messages.filter(m => !this.isMyMessage(m) && m.status !== 'read');
    if (unreadMessages.length > 0) {
      const conversationId = unreadMessages[0].conversationId;
      this.messagingService.markAsRead(conversationId, unreadMessages.map(m => m.id));
    }
  }
}
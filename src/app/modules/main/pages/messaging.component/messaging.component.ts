import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { Observable, of, firstValueFrom, Subscription } from 'rxjs';
import { map, tap, switchMap, distinctUntilChanged } from 'rxjs/operators';
import { Message, Conversation, MessageAction, Mention } from '../../../../core/models/message.model';
import { MessagingService } from '../../../../core/services/messaging.service';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-messaging',
  templateUrl: './messaging.component.html',
  styleUrls: ['./messaging.component.scss'],
  standalone: false
})
export class MessagingComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  activeTab: 'group' | 'private' = 'group';
  newMessage: string = '';
  isSending: boolean = false;

  // États pour l'édition
  editingMessageId: string | null = null;
  editMessageContent: string = '';

  // NOUVEAUX ÉTATS POUR LES FONCTIONNALITÉS AVANCÉES
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

  // Gestion du touch pour mobile
  private touchStart = {
    time: 0,
    x: 0,
    y: 0
  };

  // Gestion des @mentions
  currentMentionQuery: string = '';
  mentionCandidates: any[] = [];
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
    private userService: UserService
  ) {
    const user = this.userService.getCurrentUser();
    this.userCommunity = user?.community || 'Communauté inconnue';

    // Charger la conversation de groupe
    this.groupConversation$ = this.messagingService.getConversations().pipe(
      map(conversations => conversations.find(c => 
        c.type === 'group' && c.name.includes(this.userCommunity)
      )),
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
          this.messagingService.markAsRead(conversationId);
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
        throw new Error('Conversation de groupe non trouvée');
      }

      // Détecter les mentions avant l'envoi
      const mentions = this.detectMentions(messageContent);

      await this.messagingService.sendMessage(
        messageContent,
        conversation.id,
        'group'
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
        throw new Error('Conversation de groupe non trouvée');
      }

      await this.messagingService.replyToMessage(
        messageContent,
        conversation.id,
        this.replyingTo.id,
        'group'
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
      // Afficher tous les participants
      this.mentionCandidates = this.conversationParticipants.filter(p => 
        p.userId !== this.userService.getCurrentUser()?.userId
      );
    } else {
      // Filtrer par la query
      this.mentionCandidates = this.conversationParticipants.filter(p => 
        p.pseudo.toLowerCase().includes(this.currentMentionQuery.toLowerCase()) &&
        p.userId !== this.userService.getCurrentUser()?.userId
      );
    }

    this.showMentionsList = this.mentionCandidates.length > 0;
  }

  // ✅ NAVIGATION DANS LES MENTIONS
  handleMentionNavigation(event: KeyboardEvent): void {
    // Implémentation simple - pour l'instant on sélectionne le premier
    if (event.key === 'Enter' && this.mentionCandidates.length > 0) {
      this.selectMention(this.mentionCandidates[0]);
    }
  }

  // ✅ SÉLECTIONNER UNE MENTION
  selectMention(user: any): void {
    const textBefore = this.newMessage.substring(0, this.mentionStartPosition);
    const textAfter = this.newMessage.substring(this.mentionStartPosition + this.currentMentionQuery.length + 1);
    
    this.newMessage = textBefore + '@' + user.pseudo + ' ' + textAfter;
    this.showMentionsList = false;
    this.currentMentionQuery = '';
    
    // Remettre le focus et positionner le curseur
    setTimeout(() => {
      if (this.messageInput?.nativeElement) {
        this.messageInput.nativeElement.focus();
        const newPosition = this.mentionStartPosition + user.pseudo.length + 2;
        this.messageInput.nativeElement.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  }

  // ✅ DÉTECTER LES MENTIONS DANS LE TEXTE
  detectMentions(text: string): Mention[] {
    const mentions: Mention[] = [];
    const mentionRegex = /@(\w+)/g;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const userName = match[1];
      const participant = this.conversationParticipants.find(p => 
        p.pseudo === userName
      );
      
      if (participant) {
        mentions.push({
          userId: participant.userId,
          userName: participant.pseudo,
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
    return message.fromUserId === user?.userId;
  }

  // ✅ FORMATAGE HEURE
  formatMessageTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  // ✅ STATUT DU MESSAGE
  getMessageStatus(message: Message): string {
    switch (message.status) {
      case 'sending': return '⏳';
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '👁️';
      default: return '✓';
    }
  }

  // ✅ VÉRIFICATIONS ÉDITION/SUPPRESSION
  canEditMessage(message: Message): boolean {
    return this.messagingService.canEditMessage(message);
  }

  canDeleteMessage(message: Message): boolean {
    return this.messagingService.canDeleteMessage(message);
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

  async deleteMessage(messageId: string): Promise<void> {
    try {
      const message = this.findMessageById(messageId);
      if (!message) {
        alert('Message non trouvé');
        return;
      }

      if (!this.canDeleteMessage(message)) {
        alert('Le délai de suppression (2 heures) est expiré');
        return;
      }

      if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) return;

      await this.messagingService.deleteMessage(messageId);
    } catch (error: any) {
      console.error('❌ Erreur suppression message:', error);
      alert(error.message || 'Erreur lors de la suppression du message');
    }
  }

  // ✅ MENU CONTEXTUEL
  showContextMenu(event: MouseEvent, message: Message): void {
    event.preventDefault();
    
    const user = this.userService.getCurrentUser();
    if (!user) return;

    const actions = this.messagingService.getMessageActions(message, user.userId);
    if (actions.length === 0) return;

    this.contextMenu = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      message,
      actions
    };
  }

  // ✅ GESTION TOUCH MOBILE
  onTouchStart(event: TouchEvent, message: Message): void {
    this.touchStart = {
      time: Date.now(),
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  }

  onTouchEnd(event: TouchEvent, message: Message): void {
    const touchEnd = {
      time: Date.now(),
      x: event.changedTouches[0].clientX,
      y: event.changedTouches[0].clientY
    };

    // Vérifier si c'est un tap long (plus de 500ms)
    const isLongPress = (touchEnd.time - this.touchStart.time) > 500;
    // Vérifier si le mouvement est faible (pas un swipe)
    const isStationary = 
      Math.abs(touchEnd.x - this.touchStart.x) < 10 && 
      Math.abs(touchEnd.y - this.touchStart.y) < 10;

    if (isLongPress && isStationary) {
      event.preventDefault();
      this.showContextMenu(
        new MouseEvent('contextmenu', {
          clientX: touchEnd.x,
          clientY: touchEnd.y
        }),
        message
      );
    }
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
        this.deleteMessage(message.id);
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

  getReplyPreview(message: Message): string {
    if (!message.replyTo) return '';
    
    if (message.replyTo.isDeleted) {
      return '🗑️ Message supprimé';
    }
    
    return message.replyTo.content || 'Message';
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
  // ✅ FORMATER LES MESSAGES AVEC MENTIONS EN SURBRILLANCE
formatMessageWithMentions(message: Message): string {
  if (!message.content || !message.mentions || message.mentions.length === 0) {
    return message.content || '';
  }

  let formattedContent = message.content;
  
  // Trier les mentions par position décroissante pour éviter les problèmes d'index
  const sortedMentions = [...message.mentions].sort((a, b) => b.position - a.position);
  
  for (const mention of sortedMentions) {
    const before = formattedContent.substring(0, mention.position);
    const mentionText = formattedContent.substring(mention.position, mention.position + mention.length);
    const after = formattedContent.substring(mention.position + mention.length);
    
    formattedContent = before + 
      `<span class="mention-highlight">${mentionText}</span>` + 
      after;
  }
  
  return formattedContent;
}
}
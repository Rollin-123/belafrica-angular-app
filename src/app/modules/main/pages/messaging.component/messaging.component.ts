/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { Observable, of, firstValueFrom, Subscription, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { map, tap, switchMap, distinctUntilChanged, debounceTime, filter, take } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Message, Conversation, MessageAction, Mention, MessagePayload } from '../../../../core/models/message.model';
import { MessagingService } from '../../../../core/services/messaging.service';
import { User, UserService } from '../../../../core/services/user.service';
import { ModalService } from '../../../../core/services/modal.service';

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

  typingUsers = new Map<string, { pseudo: string, timeout: any }>();
  isTyping = false;
  private typingTimeout: any;
  private typingSubject = new Subject<void>();
  readonly TYPING_TIMER_LENGTH = 3000;

  private touchStart = { time: 0, x: 0, y: 0 };

  currentMentionQuery: string = '';
  mentionCandidates: any[] = [];
  public Array = Array;
  mentionStartPosition: number = -1;

  // ✅ BehaviorSubject pour les messages - permet mises à jour en temps réel
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  messages$: Observable<Message[]> = this.messagesSubject.asObservable();

  groupConversation$: Observable<Conversation | undefined>;
  private currentConversationId: string = '';
  userCommunity: string = '';
  conversationParticipants: any[] = [];
  communityMembersCount: number = 0;

  private currentMessages: Message[] = [];
  private subscription = new Subscription();

  constructor(
    private messagingService: MessagingService,
    private userService: UserService,
    private sanitizer: DomSanitizer,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef
  ) {
    const user = this.userService.getCurrentUser();
    this.currentUser = user;
    this.userCommunity = user?.community || 'Communaute inconnue';

    this.groupConversation$ = this.messagingService.getConversations().pipe(
      map(conversations => conversations.find(c => c.type === 'group')),
      tap(conversation => {
        if (conversation) {
          this.conversationParticipants = conversation.participantsDetails || [];
          this.communityMembersCount = (conversation as any).communityMembersCount
            || this.conversationParticipants.length;
        }
      }),
      distinctUntilChanged((a, b) => a?.id === b?.id)
    );
  }

  ngOnInit() {
    // Charger les conversations et brancher temps réel
    this.subscription.add(
      this.groupConversation$.pipe(
        filter(conv => !!conv),
        take(1)
      ).subscribe(conversation => {
        if (!conversation) return;
        this.currentConversationId = conversation.id;

        // ✅ REJOINDRE la room Socket.IO
        this.messagingService.joinConversation(conversation.id);

        // ✅ CHARGER les messages initiaux
        this.loadMessages(conversation.id);

        // ✅ BRANCHER les messages temps réel
        this.listenForRealTimeMessages(conversation.id);
      })
    );

    this.listenForRealTimeEvents();
  }

  // ✅ Charger les messages via HTTP
  private loadMessages(conversationId: string): void {
    this.subscription.add(
      this.messagingService.getMessages(conversationId).subscribe(messages => {
        this.messagesSubject.next(messages);
        this.currentMessages = messages;
        this.updateReadStatus(messages);
        setTimeout(() => this.scrollToBottom(), 100);
      })
    );
  }

  // ✅ Écouter les nouveaux messages en temps réel via Socket.IO
  private listenForRealTimeMessages(conversationId: string): void {
    this.subscription.add(
      this.messagingService.getRealTimeMessages().subscribe((newMessage: Message) => {
        // Filtrer pour ne garder que les messages de cette conversation
        if ((newMessage as any).conversation_id !== conversationId &&
            newMessage.conversationId !== conversationId) {
          return;
        }

        // ✅ FIX: ignorer mes propres messages (déjà ajoutés en mode optimiste)
        if (newMessage.fromUserId === this.currentUser?.id) {
          // Remplacer le message optimiste temp_ par le vrai ID si existant
          const current = this.messagesSubject.getValue();
          const hasTempMessage = current.some(m => m.id.startsWith('temp_') && m.isMyMessage);
          if (hasTempMessage) {
            const updated = current.map(m => {
              if (m.id.startsWith('temp_') && m.isMyMessage &&
                  m.content === (newMessage.encryptedContent || (newMessage as any).content || '')) {
                return { ...m, id: newMessage.id, status: 'sent' as const };
              }
              return m;
            });
            this.messagesSubject.next(updated);
            this.currentMessages = updated;
            this.cdr.detectChanges();
          }
          return;
        }

        const current = this.messagesSubject.getValue();

        // Éviter les doublons
        if (current.some(m => m.id === newMessage.id)) {
          return;
        }

        const messageWithContent: Message = {
          ...newMessage,
          content: newMessage.isDeleted ? 'Message supprime' : (newMessage.encryptedContent || (newMessage as any).content || '')
        };

        this.messagesSubject.next([...current, messageWithContent]);
        this.currentMessages = this.messagesSubject.getValue();
        setTimeout(() => this.scrollToBottom(), 50);
        this.cdr.detectChanges();
      })
    );

    // Écouter les messages modifiés
    // Écouter les messages supprimés
  }

  private listenForRealTimeEvents(): void {
    this.subscription.add(this.messagingService.onUserTyping().subscribe(async data => {
      if (!this.currentConversationId) return;
      if (data.userId !== this.currentUser?.id && data.conversationId === this.currentConversationId) {
        if (this.typingUsers.has(data.userId)) {
          clearTimeout(this.typingUsers.get(data.userId)?.timeout);
        }
        const timeout = setTimeout(() => {
          this.typingUsers.delete(data.userId);
          this.cdr.detectChanges();
        }, this.TYPING_TIMER_LENGTH + 1000);
        this.typingUsers.set(data.userId, { pseudo: data.pseudo, timeout });
        this.cdr.detectChanges();
      }
    }));

    this.subscription.add(this.messagingService.onUserStoppedTyping().subscribe(data => {
      if (data.userId !== this.currentUser?.id) {
        if (this.typingUsers.has(data.userId)) {
          clearTimeout(this.typingUsers.get(data.userId)?.timeout);
          this.typingUsers.delete(data.userId);
          this.cdr.detectChanges();
        }
      }
    }));

    this.subscription.add(this.typingSubject.pipe(debounceTime(this.TYPING_TIMER_LENGTH)).subscribe(() => {
      if (this.currentConversationId) {
        this.messagingService.emitStopTyping(this.currentConversationId);
      }
      this.isTyping = false;
    }));
  }

  ngAfterViewInit() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    if (this.currentConversationId) {
      this.messagingService.leaveConversation(this.currentConversationId);
    }
    this.subscription.unsubscribe();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.contextMenu.visible) this.closeContextMenu();
    if (this.showEmojiPicker) this.showEmojiPicker = false;
    if (this.showMentionsList) this.showMentionsList = false;
  }

  setActiveTab(tab: 'group' | 'private'): void {
    this.activeTab = tab;
  }

  // ✅ ENVOI - Optimiste: ajouter immédiatement puis confirmer via HTTP
  async sendMessage(): Promise<void> {
    const content = this.newMessage.trim();
    if (!content || this.isSending) return;

    this.isSending = true;

    // Vérification de la conversation
    if (!this.currentConversationId) {
      this.modalService.showError('Erreur', 'Conversation non chargée. Rafraîchissez la page.');
      this.isSending = false;
      return;
    }

    // Conversation chargée - on peut envoyer

    // ✅ Message optimiste (affiché immédiatement)
    const optimisticId = 'temp_' + Date.now();
    const optimisticMessage: Message = {
      id: optimisticId,
      conversationId: this.currentConversationId,
      fromUserId: this.currentUser?.id || '',
      fromUserName: this.currentUser?.pseudo || 'Moi',
      fromUserAvatar: this.currentUser?.avatar_url ?? undefined,
      content: content,
      encryptedContent: content,
      encryptionKey: 'none',
      timestamp: new Date(),
      status: 'sending',
      isMyMessage: true,
      isEdited: false,
      isDeleted: false,
      mentions: this.extractMentions(content),
      replyTo: this.replyingTo ? {
        messageId: this.replyingTo.id,
        fromUserName: this.replyingTo.fromUserName,
        content: this.replyingTo.content || '',
        isDeleted: this.replyingTo.isDeleted
      } : undefined
    };

    const current = this.messagesSubject.getValue();
    this.messagesSubject.next([...current, optimisticMessage]);
    this.currentMessages = this.messagesSubject.getValue();
    this.newMessage = '';
    this.replyingTo = null;
    this.showMentionsList = false;
    setTimeout(() => this.scrollToBottom(), 50);

    try {
      const payload: MessagePayload = {
        content: content,
        conversationId: this.currentConversationId,
        conversationType: 'group',
        mentions: optimisticMessage.mentions,
        replyToMessageId: optimisticMessage.replyTo?.messageId
      };

      await this.messagingService.sendMessage(payload);

      // ✅ Remplacer le message optimiste par "sent"
      const updated = this.messagesSubject.getValue().map(m =>
        m.id === optimisticId ? { ...m, status: 'sent' as const } : m
      );
      this.messagesSubject.next(updated);
      this.currentMessages = updated;

    } catch (error: any) {
      console.error('Erreur envoi message:', error);
      // Supprimer le message optimiste en cas d'erreur
      const withoutOptimistic = this.messagesSubject.getValue().filter(m => m.id !== optimisticId);
      this.messagesSubject.next(withoutOptimistic);
      this.currentMessages = withoutOptimistic;
      this.newMessage = content; // Remettre le contenu dans l'input
      this.modalService.showError('Erreur d\'envoi', 'Impossible d\'envoyer le message. Réessayez.');
    } finally {
      this.isSending = false;
      if (this.messageInput?.nativeElement) {
        this.messageInput.nativeElement.focus();
      }
      this.cdr.detectChanges();
    }
  }

  private extractMentions(content: string): Mention[] {
    const mentions: Mention[] = [];
    const regex = /@(\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const currentMatch = match; // capture locale = non-null garanti
      const participant = this.conversationParticipants.find(
        p => p.pseudo?.toLowerCase() === currentMatch[1].toLowerCase()
      );
      if (participant) {
        mentions.push({
          userId: participant.userId,
          userName: participant.pseudo,
          position: currentMatch.index,
          length: currentMatch[0].length
        });
      }
    }
    return mentions;
  }

  onKeyPress(event: KeyboardEvent): void {
    if (!this.isTyping) {
      this.isTyping = true;
      if (this.currentConversationId) {
        this.messagingService.emitStartTyping(this.currentConversationId);
      }
    }
    clearTimeout(this.typingTimeout);

    if (event.key === '@') {
      this.handleMentionStart();
    }

    if (this.showMentionsList) {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Enter') {
        event.preventDefault();
        this.handleMentionNavigation(event);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onMessageInput(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    this.newMessage = input.value;

    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.isTyping = false;
      this.typingSubject.next();
    }, this.TYPING_TIMER_LENGTH);

    if (this.showMentionsList) {
      this.updateMentionQuery(input.selectionStart || 0);
    }

    // Auto-resize textarea
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }

  private handleMentionStart(): void {
    this.mentionStartPosition = this.messageInput?.nativeElement.selectionStart || 0;
    this.currentMentionQuery = '';
    this.mentionCandidates = [...this.conversationParticipants];
    this.showMentionsList = this.mentionCandidates.length > 0;
  }

  private updateMentionQuery(cursorPosition: number): void {
    if (this.mentionStartPosition === -1) return;
    const textBeforeCursor = this.newMessage.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      this.currentMentionQuery = mentionMatch[1];
      this.mentionCandidates = this.conversationParticipants.filter(p =>
        p.pseudo?.toLowerCase().includes(this.currentMentionQuery.toLowerCase())
      );
      this.showMentionsList = this.mentionCandidates.length > 0;
    } else {
      this.showMentionsList = false;
      this.mentionStartPosition = -1;
    }
  }

  private handleMentionNavigation(event: KeyboardEvent): void {
    // Navigation simplifiée dans la liste des mentions
  }

  selectMention(participant: any): void {
    if (this.mentionStartPosition === -1) return;
    const before = this.newMessage.substring(0, this.mentionStartPosition);
    const after = this.newMessage.substring(
      this.messageInput?.nativeElement.selectionStart || 0
    );
    this.newMessage = before + '@' + participant.pseudo + ' ' + after;
    this.showMentionsList = false;
    this.mentionStartPosition = -1;
    if (this.messageInput?.nativeElement) {
      this.messageInput.nativeElement.focus();
    }
  }

  cancelReply(): void {
    this.replyingTo = null;
  }

  toggleEmojiPicker(event: Event): void {
    event.stopPropagation();
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emoji: string): void {
    this.newMessage += emoji;
    this.showEmojiPicker = false;
    if (this.messageInput?.nativeElement) {
      this.messageInput.nativeElement.focus();
    }
  }

  showContextMenu(event: MouseEvent, message: Message): void {
    event.preventDefault();
    event.stopPropagation();
    const actions = this.messagingService.getMessageActions(message, this.currentUser?.id || '');
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
    this.contextMenu.message = null;
  }

  executeContextAction(action: MessageAction): void {
    const message = this.contextMenu.message;
    if (!message) return;
    this.closeContextMenu();

    switch (action.type) {
      case 'reply':
        this.replyingTo = message;
        setTimeout(() => this.messageInput?.nativeElement?.focus(), 100);
        break;
      case 'copy':
        navigator.clipboard.writeText(message.content || '').catch(() => {});
        break;
      case 'edit':
        this.startEditing(message);
        break;
      case 'delete':
        this.confirmDeleteMessage(message);
        break;
    }
  }

  startEditing(message: Message): void {
    const elapsed = new Date().getTime() - new Date(message.timestamp).getTime();
    if (elapsed > this.EDIT_TIMEOUT) {
      this.modalService.showError('Délai dépassé', 'Vous ne pouvez plus modifier ce message (délai de 30 min dépassé).');
      return;
    }
    this.editingMessageId = message.id;
    this.editMessageContent = message.content || '';
  }

  cancelEditing(): void {
    this.editingMessageId = null;
    this.editMessageContent = '';
  }

  async saveEditedMessage(): Promise<void> {
    if (!this.editingMessageId || !this.editMessageContent.trim()) return;
    try {
      await this.messagingService.editMessage(this.editingMessageId, this.editMessageContent.trim());
      // Mettre à jour localement
      const updated = this.messagesSubject.getValue().map(m =>
        m.id === this.editingMessageId
          ? { ...m, content: this.editMessageContent.trim(), isEdited: true }
          : m
      );
      this.messagesSubject.next(updated);
      this.currentMessages = updated;
    } catch (error) {
      this.modalService.showError('Erreur', 'Impossible de modifier le message.');
    } finally {
      this.cancelEditing();
    }
  }

  onEditKeyPress(event: KeyboardEvent, message: Message): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.saveEditedMessage();
    }
    if (event.key === 'Escape') {
      this.cancelEditing();
    }
  }

  confirmDeleteMessage(message: Message): void {
    const elapsed = new Date().getTime() - new Date(message.timestamp).getTime();
    if (elapsed > this.DELETE_TIMEOUT) {
      this.modalService.showError('Délai dépassé', 'Vous ne pouvez plus supprimer ce message (délai de 2h dépassé).');
      return;
    }
    this.modalService.showConfirm('Supprimer', 'Supprimer ce message pour tout le monde ?').then(async confirmed => {
      if (confirmed) {
        try {
          await this.messagingService.deleteMessage(message.id, true);
          const updated = this.messagesSubject.getValue().map(m =>
            m.id === message.id ? { ...m, isDeleted: true, content: 'Message supprime' } : m
          );
          this.messagesSubject.next(updated);
          this.currentMessages = updated;
        } catch (error) {
          this.modalService.showError('Erreur', 'Impossible de supprimer le message.');
        }
      }
    });
  }

  scrollToMessage(messageId: string): void {
    const element = document.getElementById('msg-' + messageId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bel-message-highlight');
      setTimeout(() => element.classList.remove('bel-message-highlight'), 2000);
    }
  }

  private scrollToBottom(): void {
    if (this.messagesContainer?.nativeElement) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  private updateReadStatus(messages: Message[]): void {
    if (!messages.length || !this.currentConversationId) return;
    const unread = messages.filter(m => !m.isMyMessage && m.status !== 'read');
    if (unread.length > 0) {
      this.messagingService.markAsRead(this.currentConversationId, unread.map(m => m.id));
    }
  }

  detectMentions(content: string, conversationId: string): Mention[] {
    return this.extractMentions(content);
  }

  getTypingIndicator(): string {
    const pseudos = Array.from(this.typingUsers.values())
      .filter(u => u.pseudo !== this.currentUser?.pseudo)
      .map(u => u.pseudo);
    if (pseudos.length === 0) return '';
    if (pseudos.length === 1) return `${pseudos[0]} est en train d'ecrire...`;
    if (pseudos.length === 2) return `${pseudos[0]} et ${pseudos[1]} sont en train d'ecrire...`;
    return 'Plusieurs personnes sont en train d\'ecrire...';
  }

  renderMessageContent(message: Message): SafeHtml {
    if (message.isDeleted) {
      return this.sanitizer.bypassSecurityTrustHtml(
        '<em class="deleted-msg">Message supprime</em>'
      );
    }
    let content = (message.content || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    content = content.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    content = content.replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  formatTimestamp(date: Date): string {
    const d = new Date(date);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
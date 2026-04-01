/*
 * BELAFRICA - MessagingComponent
 * FIX : toutes les méthodes appelées dans le template sont présentes
 * - setActiveTab, showContextMenu, scrollToMessage, onEditKeyPress
 * - cancelEditing, saveEditedMessage, getTypingIndicator
 * - toggleEmojiPicker, onKeyPress, addEmoji, executeContextAction
 */
import {
  Component, OnInit, ViewChild, ElementRef,
  AfterViewInit, OnDestroy, ChangeDetectorRef, HostListener
} from '@angular/core';
import { Observable, Subscription, Subject, BehaviorSubject } from 'rxjs';
import { map, tap, distinctUntilChanged, debounceTime, filter, take } from 'rxjs/operators';
import {
  Message, Conversation, MessageAction, MessagePayload
} from '../../../../core/models/message.model';
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
    visible: false, x: 0, y: 0,
    message: null as Message | null,
    actions: [] as MessageAction[]
  };
  typingUsers = new Map<string, { pseudo: string; timeout: any }>();
  isTyping = false;
  private typingSubject = new Subject<void>();
  readonly TYPING_TIMER_LENGTH = 3000;
  currentMentionQuery = '';
  mentionCandidates: any[] = [];
  public Array = Array;
  mentionStartPosition = -1;

  private messagesSubject = new BehaviorSubject<Message[]>([]);
  messages$: Observable<Message[]> = this.messagesSubject.asObservable();
  groupConversation$: Observable<Conversation | undefined>;
  private currentConversationId = '';
  userCommunity = '';
  conversationParticipants: any[] = [];
  communityMembersCount = 0;
  private messageIds = new Set<string>();
  private subscription = new Subscription();

  constructor(
    private messagingService: MessagingService,
    private userService: UserService,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef
  ) {
    const user = this.userService.getCurrentUser();
    this.currentUser = user;
    this.userCommunity = user?.community || 'Communauté';
    this.groupConversation$ = this.messagingService.getConversations().pipe(
      map(conversations => conversations.find(c => c.type === 'group')),
      tap(conversation => {
        if (conversation) {
          this.conversationParticipants = conversation.participantsDetails || [];
          this.communityMembersCount = (conversation as any).communityMembersCount || this.conversationParticipants.length;
        }
      }),
      distinctUntilChanged((a, b) => a?.id === b?.id)
    );
  }

  ngOnInit(): void {
    this.subscription.add(
      this.groupConversation$.pipe(
        filter((conv): conv is Conversation => !!conv),
        take(1)
      ).subscribe(conversation => {
        this.currentConversationId = conversation.id;
        this.messagingService.joinConversation(conversation.id);
        this.loadMessages(conversation.id);
        this.listenForRealTimeMessages(conversation.id);
      })
    );
    this.listenForRealTimeEvents();
  }

  // ─────────────────────────────────────────────
  // ONGLETS
  // ─────────────────────────────────────────────
  setActiveTab(tab: 'group' | 'private'): void {
    this.activeTab = tab;
    this.contextMenu.visible = false;
    this.showEmojiPicker = false;
  }

  // ─────────────────────────────────────────────
  // CHARGEMENT ET TEMPS RÉEL
  // ─────────────────────────────────────────────
  private loadMessages(conversationId: string): void {
    this.subscription.add(
      this.messagingService.getMessages(conversationId).subscribe(messages => {
        this.messageIds.clear();
        messages.forEach(m => this.messageIds.add(m.id));
        this.messagesSubject.next(messages);
        this.updateReadStatus(messages);
        setTimeout(() => this.scrollToBottom(), 100);
      })
    );
  }

  private listenForRealTimeMessages(conversationId: string): void {
    this.subscription.add(
      this.messagingService.getRealTimeMessages().subscribe((newMessage: Message) => {
        const msgConvId = (newMessage as any).conversation_id || newMessage.conversationId;
        if (msgConvId !== conversationId) return;
        if (this.messageIds.has(newMessage.id)) return;
        this.messageIds.add(newMessage.id);
        const current = this.messagesSubject.getValue();
        this.messagesSubject.next([...current, newMessage]);
        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 100);
        if (newMessage.fromUserId !== this.currentUser?.id) {
          this.messagingService.markAsRead(conversationId, [newMessage.id]);
        }
      })
    );
  }

  private listenForRealTimeEvents(): void {
    this.subscription.add(
      this.messagingService.onUserTyping().subscribe(data => {
        if (data.userId !== this.currentUser?.id) {
          if (this.typingUsers.has(data.userId)) clearTimeout(this.typingUsers.get(data.userId)?.timeout);
          const timeout = setTimeout(() => { this.typingUsers.delete(data.userId); this.cdr.detectChanges(); }, this.TYPING_TIMER_LENGTH + 1000);
          this.typingUsers.set(data.userId, { pseudo: data.pseudo, timeout });
          this.cdr.detectChanges();
        }
      })
    );
    this.subscription.add(
      this.messagingService.onUserStoppedTyping().subscribe(data => {
        if (data.userId !== this.currentUser?.id && this.typingUsers.has(data.userId)) {
          clearTimeout(this.typingUsers.get(data.userId)?.timeout);
          this.typingUsers.delete(data.userId);
          this.cdr.detectChanges();
        }
      })
    );
    this.subscription.add(
      this.typingSubject.pipe(debounceTime(2000)).subscribe(() => {
        this.messagingService.emitStopTyping(this.currentConversationId);
        this.isTyping = false;
      })
    );
  }

  private updateReadStatus(messages: Message[]): void {
    const unread = messages.filter(m => m.fromUserId !== this.currentUser?.id && m.status !== 'read').map(m => m.id);
    if (unread.length > 0) this.messagingService.markAsRead(this.currentConversationId, unread);
  }

  // ─────────────────────────────────────────────
  // TYPING INDICATOR — 
  // ─────────────────────────────────────────────
  getTypingIndicator(): string {
    const users = Array.from(this.typingUsers.values()).map(v => v.pseudo);
    if (users.length === 1) return `${users[0]} est en train d'écrire...`;
    if (users.length === 2) return `${users[0]} et ${users[1]} écrivent...`;
    return 'Plusieurs personnes écrivent...';
  }

  // ─────────────────────────────────────────────
  // ENVOI
  // ─────────────────────────────────────────────
  async sendMessage(): Promise<void> {
    const content = this.newMessage.trim();
    if (!content || this.isSending || !this.currentConversationId) return;

    this.isSending = true;
    const tempId = 'temp_' + Date.now();
    const optimistic: Message = {
      id: tempId, conversationId: this.currentConversationId,
      fromUserId: this.currentUser?.id || '', fromUserName: this.currentUser?.pseudo || '',
      content, encryptedContent: content, timestamp: new Date(),
      status: 'sending', isDeleted: false, isEdited: false,
      isMyMessage: true, mentions: [], encryptionKey: null,
    } as Message;

    this.messageIds.add(tempId);
    this.messagesSubject.next([...this.messagesSubject.getValue(), optimistic]);
    this.newMessage = '';
    setTimeout(() => this.scrollToBottom(), 50);

    try {
      const payload: MessagePayload = {
        conversationId: this.currentConversationId,
        conversationType: 'group',
        content,
        replyToMessageId: this.replyingTo?.id,
        mentions: []
      };
      await this.messagingService.sendMessage(payload);
      this.replyingTo = null;
    } catch (err) {
      console.error('Erreur envoi:', err);
      this.messageIds.delete(tempId);
      this.messagesSubject.next(this.messagesSubject.getValue().filter(m => m.id !== tempId));
      this.newMessage = content;
    } finally {
      this.isSending = false;
      this.cdr.detectChanges();
    }
  }

  // ─────────────────────────────────────────────
  // KEYBOARD — 
  // ─────────────────────────────────────────────
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    } else {
      if (!this.isTyping) {
        this.isTyping = true;
        this.messagingService.emitStartTyping(this.currentConversationId);
      }
      this.typingSubject.next();
    }
  }

  onInputChange(): void {
    if (!this.isTyping) {
      this.isTyping = true;
      this.messagingService.emitStartTyping(this.currentConversationId);
    }
    this.typingSubject.next();
  }

  // ─────────────────────────────────────────────
  // EMOJI — 
  // ─────────────────────────────────────────────
  toggleEmojiPicker(event?: Event): void {
    event?.stopPropagation();
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emoji: string): void {
    this.newMessage += emoji;
    this.showEmojiPicker = false;
    this.messageInput?.nativeElement?.focus();
  }

  // ─────────────────────────────────────────────
  // MENU CONTEXTUEL — 
  // ─────────────────────────────────────────────
  showContextMenu(event: MouseEvent, message: Message): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.currentUser) return;
    const actions = this.messagingService.getMessageActions(message, this.currentUser.id);
    if (actions.length === 0) return;
    this.contextMenu = { visible: true, x: event.clientX, y: event.clientY, message, actions };
  }

  executeContextAction(action: MessageAction): void {
    if (!this.contextMenu.message) return;
    const message = this.contextMenu.message;
    this.contextMenu.visible = false;
    switch (action.type) {
      case 'reply': this.startReplying(message); break;
      case 'edit': this.startEditing(message); break;
      case 'delete': this.deleteMessage(message.id, true); break;
      case 'delete-for-self': this.deleteMessage(message.id, false); break;
      case 'copy': this.copyMessage(message); break;
    }
  }

  // ─────────────────────────────────────────────
  // ÉDITION — 
  // ─────────────────────────────────────────────
  startEditing(message: Message): void {
    if (!this.canEditMessage(message)) return;
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
      this.cancelEditing();
    } catch (err: any) {
      this.modalService.showError('Erreur', err.message || 'Erreur modification');
    }
  }

  onEditKeyPress(event: KeyboardEvent, message: Message): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.saveEditedMessage();
    } else if (event.key === 'Escape') {
      this.cancelEditing();
    }
  }

  // ─────────────────────────────────────────────
  // SCROLL — 
  // ─────────────────────────────────────────────
  scrollToMessage(messageId: string): void {
    const el = document.getElementById(`message-${messageId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────
  cancelReply(): void { this.replyingTo = null; }

  startReplying(message: Message): void {
    this.replyingTo = message;
    this.messageInput?.nativeElement?.focus();
  }

  canEditMessage(message: Message): boolean {
    if (message.isDeleted || message.fromUserId !== this.currentUser?.id) return false;
    return (Date.now() - new Date(message.timestamp).getTime()) <= this.EDIT_TIMEOUT;
  }

  canDeleteMessage(message: Message): boolean {
    if (message.isDeleted || message.fromUserId !== this.currentUser?.id) return false;
    return (Date.now() - new Date(message.timestamp).getTime()) <= this.DELETE_TIMEOUT;
  }

  async deleteMessage(messageId: string, forEveryone: boolean): Promise<void> {
    const msg = this.messagesSubject.getValue().find(m => m.id === messageId);
    if (!msg || !this.canDeleteMessage(msg)) return;
    const confirmed = await this.modalService.showConfirm('Confirmation', 'Supprimer ce message ?');
    if (!confirmed) return;
    try {
      await this.messagingService.deleteMessage(messageId, forEveryone);
    } catch (err: any) {
      this.modalService.showError('Erreur', err.message || 'Erreur suppression');
    }
  }

  copyMessage(message: Message): void {
    if (message.content && !message.isDeleted) {
      navigator.clipboard.writeText(message.content).catch(err => console.error('Erreur copie:', err));
    }
  }

  isMyMessage(message: Message): boolean { return message.fromUserId === this.currentUser?.id; }

  formatTime(date: Date | string): string {
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  scrollToBottom(): void {
    try {
      if (this.messagesContainer)
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    } catch (e) { /* ignore */ }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.contextMenu.visible) this.contextMenu.visible = false;
    if (this.showEmojiPicker) this.showEmojiPicker = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.contextMenu.visible = false;
    this.showEmojiPicker = false;
    if (this.editingMessageId) this.cancelEditing();
  }

  ngAfterViewInit(): void { setTimeout(() => this.scrollToBottom(), 200); }

  ngOnDestroy(): void {
    if (this.currentConversationId) this.messagingService.leaveConversation(this.currentConversationId);
    this.typingUsers.forEach(v => clearTimeout(v.timeout));
    this.subscription.unsubscribe();
  }
}
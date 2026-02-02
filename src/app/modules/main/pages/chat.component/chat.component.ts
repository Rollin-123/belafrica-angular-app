/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription, firstValueFrom, Subject } from 'rxjs';
import { map, debounceTime } from 'rxjs/operators';

// Assurez-vous que ces paths sont corrects
import { Message, Conversation, MessageAction } from '../../../../core/models/message.model';
import { MessagingService } from '../../../../core/services/messaging.service';
import { ModalService } from '../../../../core/services/modal.service';
import { UserService } from '../../../../core/services/user.service';

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.scss'],
    imports: [CommonModule, FormsModule]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  conversationId: string = '';
  conversation$!: Observable<Conversation | undefined>;
  messages: Message[] = [];
  newMessage: string = '';
  isSending: boolean = false;
  currentUser: any;

  // --- Logique d'édition et de réponse ---
  editingMessageId: string | null = null;
  editMessageContent: string = '';
  replyingTo: Message | null = null;

  // --- Menu contextuel ---
  contextMenu = {
    visible: false,
    x: 0,
    y: 0,
    message: null as Message | null,
    actions: [] as MessageAction[]
  };

  private readonly EDIT_TIMEOUT = 30 * 60 * 1000; 
  private readonly DELETE_TIMEOUT = 2 * 60 * 60 * 1000;

  // --- Indicateur "est en train d'écrire" ---
  typingUsers: Map<string, { pseudo: string, timeout: any }> = new Map(); // Changement de Array à Map
  private typingSubject = new Subject<void>();
  isTyping = false; // Ajout de la propriété isTyping
  readonly TYPING_TIMER_LENGTH = 3000; // Ajout de la constante
  
  private subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private messagingService: MessagingService,
    private userService: UserService, // Assurez-vous que UserService est injecté
    private modalService: ModalService, // Injecter le ModalService
    private cdr: ChangeDetectorRef
  ) {
    this.currentUser = this.userService.getCurrentUser();
  }

  ngOnInit() {
    this.conversationId = this.route.snapshot.paramMap.get('conversationId') || '';
    
    if (!this.conversationId) {
      this.router.navigate(['/app/messaging']);
      return;
    }

    // Rejoindre la conversation en temps réel
    this.messagingService.joinConversation(this.conversationId);

    this.loadConversation();
    this.loadMessages();
    this.listenForRealTimeEvents();
  }

  ngAfterViewInit() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    if (this.conversationId) {
      this.messagingService.leaveConversation(this.conversationId);
    }
    this.subscriptions.unsubscribe();
  }

  private loadConversation(): void {
    this.conversation$ = this.messagingService.getConversations().pipe(
      map(conversations => conversations.find(c => c.id === this.conversationId))
    );
  }

  private loadMessages(): void {
    const messagesSub = this.messagingService.getMessages(this.conversationId).subscribe(messages => {
      this.messages = messages;
      this.cdr.detectChanges();
      setTimeout(() => this.scrollToBottom(), 100);
      const unreadMessageIds = messages
        .filter(m => !this.isMyMessage(m) && m.status !== 'read')
        .map(m => m.id);
      if (unreadMessageIds.length > 0) {
        this.messagingService.markAsRead(this.conversationId, unreadMessageIds);
      }
    });
    this.subscriptions.add(messagesSub);
  }

  private listenForRealTimeEvents(): void {
    const newMsgSub = this.messagingService.getRealTimeMessages().subscribe(message => {
      if (message && message.conversationId === this.conversationId) {
        this.messages.push(message);
        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 100);
        if (!this.isMyMessage(message)) {
          this.messagingService.markAsRead(this.conversationId, [message.id]);
        }
      }
    });

    this.subscriptions.add(this.messagingService.onUserTyping().subscribe(data => {
      if (data.userId !== this.currentUser?.id && data.conversationId === this.conversationId) { 
        if (this.typingUsers.has(data.userId)) {
          clearTimeout(this.typingUsers.get(data.userId)?.timeout);
        }
        const timeout = setTimeout(() => {  
          this.typingUsers.delete(data.userId);
          // this.cdr.detectChanges();  
        }, this.TYPING_TIMER_LENGTH + 1000);
        this.typingUsers.set(data.userId, { pseudo: data.pseudo, timeout });
        // this.cdr.detectChanges();
      }
    }));
    this.subscriptions.add(this.messagingService.onUserStoppedTyping().subscribe(data => {  
      if (data.userId !== this.currentUser?.id && data.conversationId === this.conversationId) {
        if (this.typingUsers.has(data.userId)) {
          clearTimeout(this.typingUsers.get(data.userId)?.timeout);
          this.typingUsers.delete(data.userId);
          // this.cdr.detectChanges();
        }
      }
    }));


    const typingSub = this.typingSubject.pipe(debounceTime(2000)).subscribe(() => {
      this.messagingService.emitStopTyping(this.conversationId);
    });

    const messagesReadSub = this.messagingService.onMessagesRead().subscribe(data => {
      if (data && data.conversationId === this.conversationId && data.userId !== this.currentUser?.id) {
        this.messages.forEach(message => {
          if (this.isMyMessage(message) && message.status !== 'read') {
            message.status = 'read';
          }
        });
        this.cdr.detectChanges(); 
      }
    });

    this.subscriptions.add(newMsgSub);
    this.subscriptions.add(typingSub);
    this.subscriptions.add(messagesReadSub);
  }

  async sendMessage(): Promise<void> {
    if (!this.newMessage.trim() || this.isSending) return;
    this.isSending = true;
    const messageContent = this.newMessage.trim();

    try {
      const conversation = await firstValueFrom(this.conversation$);
      if (!conversation) throw new Error("Conversation not found");

      if (this.replyingTo) {
        await this.messagingService.replyToMessage(
          messageContent,
          this.conversationId,
          this.replyingTo.id,
          conversation.type,
          [] 
        );
      } else {
        await this.messagingService.sendMessage(
          messageContent,
          this.conversationId,
          conversation.type,
          [] 
        );
      }

      this.newMessage = '';
      this.replyingTo = null;
      this.messagingService.emitStopTyping(this.conversationId); 
      this.scrollToBottom();
      
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      this.modalService.showError('Erreur d\'envoi', 'Erreur lors de l\'envoi du message');
    } finally {
      this.isSending = false;
      // Vérifier que l'element existe avant de focus
      if (this.messageInput?.nativeElement) {
        this.messageInput.nativeElement.focus();
      }
    }
  }

  onInput(): void {
    // Émettre un événement 'startTyping' si l'utilisateur n'est pas déjà en train de taper
    if (!this.isTyping) {
      this.isTyping = true;
      this.messagingService.emitStartTyping(this.conversationId);
    }
    // Réinitialiser le timer pour 'stopTyping' à chaque frappe
    this.typingSubject.next();
  }

  // Ajout de la logique pour le timeout de typing
  private typingTimeout: any;

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    } else {
      this.onInput();
    }

    // Gestion de l'indicateur "en train d'écrire"
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.isTyping = false;
      this.messagingService.emitStopTyping(this.conversationId);
    }, this.TYPING_TIMER_LENGTH);
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer?.nativeElement) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (error) {
      console.log('Scroll error:', error);
    }
  }

  isMyMessage(message: Message): boolean {
    return message.fromUserId === this.currentUser?.id;
  }

  formatMessageTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getTypingIndicator(): string {
    const typingUserPseudos = Array.from(this.typingUsers.values())
      .filter(u => u.pseudo !== this.currentUser?.pseudo) // Filter out current user
      .map(u => u.pseudo);
    if (typingUserPseudos.length === 0) return '';
    if (typingUserPseudos.length === 1) return `${typingUserPseudos[0]} est en train d'écrire...`;
    if (typingUserPseudos.length === 2) return `${typingUserPseudos[0]} et ${typingUserPseudos[1]} sont en train d'écrire...`;
    return 'Plusieurs personnes sont en train d\'écrire...';
  }

  // =================================================================
  // 📝 ACTIONS SUR LES MESSAGES (Édition, Suppression, Menu)
  // =================================================================

  showContextMenu(event: MouseEvent, message: Message): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.currentUser) return;

    const actions = this.messagingService.getMessageActions(message, this.currentUser.id);
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

  executeContextAction(actionType: MessageAction['type']): void {
    if (!this.contextMenu.message) return;
    const message = this.contextMenu.message;

    switch (actionType) {
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

  startReplying(message: Message): void {
    this.replyingTo = message;
    this.messageInput.nativeElement.focus();
  }

  cancelReply(): void {
    this.replyingTo = null;
  }

  startEditing(message: Message): void {
    if (!this.canEditMessage(message)) return;
    this.editingMessageId = message.id;
    this.editMessageContent = message.content || '';
    this.closeContextMenu();
    setTimeout(() => {
      const editInput = document.querySelector(`#edit-input-${message.id}`) as HTMLTextAreaElement;
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
      this.modalService.showError('Erreur d\'édition', error.message || 'Erreur lors de la modification du message');
    }
  }

  async deleteMessage(messageId: string, forEveryone: boolean): Promise<void> {
    const message = this.messages.find(m => m.id === messageId);
    if (!message || !this.canDeleteMessage(message)) return;

    this.modalService.showConfirm('Confirmation', 'Êtes-vous sûr de vouloir supprimer ce message ?').then(async confirmed => {
      if (confirmed) {
      try {
        await this.messagingService.deleteMessage(messageId, forEveryone);
      } catch (error: any) {
        console.error('❌ Erreur suppression message:', error);
        this.modalService.showError('Erreur de suppression', error.message || 'Erreur lors de la suppression du message');
      }
    }
    });
  }

  copyMessage(message: Message): void {
    if (message.content && !message.isDeleted) {
      navigator.clipboard.writeText(message.content)
        .then(() => console.log('✅ Message copié'))
        .catch(err => console.error('❌ Erreur copie:', err));
    }
  }

  canEditMessage(message: Message): boolean {
    if (message.isDeleted || !this.isMyMessage(message)) return false;
    const now = new Date().getTime();
    const messageTime = new Date(message.timestamp).getTime();
    return (now - messageTime) <= this.EDIT_TIMEOUT;
  }

  canDeleteMessage(message: Message): boolean {
    if (message.isDeleted || !this.isMyMessage(message)) return false;
    const now = new Date().getTime();
    const messageTime = new Date(message.timestamp).getTime();
    return (now - messageTime) <= this.DELETE_TIMEOUT;
  }

  getReplyPreview(message: Message): string {
    if (!message.replyTo) return '';
    if (message.replyTo.isDeleted) return 'Message supprimé';
    return message.replyTo.content || 'Message';
  }

  scrollToMessage(messageId: string): void {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  goBack(): void {
    this.router.navigate(['/app/messaging']);
  }
}
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { Observable, of, firstValueFrom, Subscription } from 'rxjs';
import { map, tap, switchMap, distinctUntilChanged } from 'rxjs/operators';
import { Message, Conversation, Participant } from '../../../../core/models/message.model';
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

  // Observables
  groupConversation$: Observable<Conversation | undefined>;
  messages$: Observable<Message[]>;
  userCommunity: string = '';

  // NOUVEAU : Stockage local des messages pour les vérifications
  private currentMessages: Message[] = [];
  private subscription = new Subscription();

  constructor(
    private messagingService: MessagingService,
    private userService: UserService
  ) {
    const user = this.userService.getCurrentUser();
    this.userCommunity = user?.community || 'Communauté inconnue';

    // Charger la conversation de groupe de la communauté
    this.groupConversation$ = this.messagingService.getConversations().pipe(
      map(conversations => conversations.find(c => 
        c.type === 'group' && c.name.includes(this.userCommunity)
      )),
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
        // Stocker les messages localement pour les vérifications
        this.currentMessages = messages;
        setTimeout(() => this.scrollToBottom(), 100);
      })
    );
  }

  ngOnInit() {
    // S'abonner aux messages pour les garder à jour
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

  // Changer d'onglet
  setActiveTab(tab: 'group' | 'private'): void {
    this.activeTab = tab;
  }

  // Envoyer un message
  async sendMessage(): Promise<void> {
    if (!this.newMessage.trim() || this.isSending) return;

    this.isSending = true;
    const messageContent = this.newMessage.trim();

    try {
      const conversation = await firstValueFrom(this.groupConversation$);
      if (!conversation) {
        throw new Error('Conversation de groupe non trouvée');
      }

      await this.messagingService.sendMessage(
        messageContent,
        conversation.id,
        'group'
      );

      this.newMessage = '';
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

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // Gestion des touches pour l'édition
  onEditKeyPress(event: KeyboardEvent, message: Message): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.saveEditedMessage();
    } else if (event.key === 'Escape') {
      this.cancelEditing();
    }
  }

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

  isMyMessage(message: Message): boolean {
    const user = this.userService.getCurrentUser();
    return message.fromUserId === user?.userId;
  }

  formatMessageTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  // NOUVEAU : Afficher le statut du message
  getMessageStatus(message: Message): string {
    switch (message.status) {
      case 'sending': return '⏳';
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '👁️';
      default: return '✓';
    }
  }

  // NOUVEAU : Vérifier si on peut éditer/supprimer
  canEditMessage(message: Message): boolean {
    return this.messagingService.canEditMessage(message);
  }

  canDeleteMessage(message: Message): boolean {
    return this.messagingService.canDeleteMessage(message);
  }

  // NOUVEAU : Trouver un message par ID
  private findMessageById(messageId: string): Message | undefined {
    return this.currentMessages.find(m => m.id === messageId);
  }

  // ACTIONS SUR LES MESSAGES
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
      // CORRECTION : Utiliser la méthode privée pour trouver le message
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

  // NOUVEAU : Obtenir les détails d'un participant
  getParticipantDetails(conversation: Conversation | undefined, userId: string): Participant | undefined {
    return conversation?.participantsDetails?.find(p => p.userId === userId);
  }

  // Menu contextuel pour les messages
  showMessageMenu(message: Message, event: Event): void {
    event.preventDefault();
    
    const user = this.userService.getCurrentUser();
    if (this.isMyMessage(message) && !message.isDeleted) {
      const canEdit = this.canEditMessage(message);
      const canDelete = this.canDeleteMessage(message);
      
      let messageText = 'Que voulez-vous faire ?\n\n';
      if (canEdit) messageText += 'OK pour modifier\n';
      if (canDelete) messageText += 'Annuler pour supprimer\n';
      
      if (!canEdit && !canDelete) {
        alert('Aucune action disponible (délais expirés)');
        return;
      }
      
      const action = confirm(messageText);
      
      if (action === true && canEdit) {
        this.startEditing(message);
      } else if (action === false && canDelete) {
        this.deleteMessage(message.id);
      }
    }
  }
}
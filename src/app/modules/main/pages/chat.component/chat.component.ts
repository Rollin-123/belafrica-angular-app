import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription, firstValueFrom } from 'rxjs';
import { map, tap } from 'rxjs/operators';

// Assurez-vous que ces paths sont corrects
import { Message, Conversation } from '../../../../core/models/message.model';
import { MessagingService } from '../../../../core/services/messaging.service';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  standalone: true, // ⬅️ IMPORTANT pour Angular 16+
  imports: [CommonModule, FormsModule] // ⬅️ IMPORTANT pour les directives
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  conversationId: string = '';
  conversation$!: Observable<Conversation | undefined>;
  messages$!: Observable<Message[]>;
  newMessage: string = '';
  isSending: boolean = false;
  
  private subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private messagingService: MessagingService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.conversationId = this.route.snapshot.paramMap.get('conversationId') || '';
    
    if (!this.conversationId) {
      this.router.navigate(['/app/messaging']);
      return;
    }

    this.loadConversation();
    this.loadMessages();
    this.markAsRead();
  }

  ngAfterViewInit() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private loadConversation(): void {
    this.conversation$ = this.messagingService.getConversations().pipe(
      map(conversations => conversations.find(c => c.id === this.conversationId))
    );
  }

  private loadMessages(): void {
    this.messages$ = this.messagingService.getMessages(this.conversationId).pipe(
      tap(() => {
        setTimeout(() => this.scrollToBottom(), 100);
      })
    );
  }

  private markAsRead(): void {
    this.messagingService.markAsRead(this.conversationId);
  }

  async sendMessage(): Promise<void> {
    if (!this.newMessage.trim() || this.isSending) return;

    this.isSending = true;
    const messageContent = this.newMessage.trim();

    try {
      // Utiliser firstValueFrom au lieu de toPromise() qui est déprécié
      const conversation = await firstValueFrom(this.conversation$);
      const messageType = conversation?.type || 'group';

      await this.messagingService.sendMessage(
        messageContent,
        this.conversationId,
        messageType
      );

      this.newMessage = '';
      this.scrollToBottom();
      
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      this.isSending = false;
      // Vérifier que l'element existe avant de focus
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
    const user = this.userService.getCurrentUser();
    return message.fromUserId === user?.userId;
  }

  formatMessageTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  goBack(): void {
    this.router.navigate(['/app/messaging']);
  }
}
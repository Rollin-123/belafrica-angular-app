import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Message } from '../../../../core/models/message.model';
import { User } from '../../../../core/services/user.service';

@Component({
    selector: 'app-message-bubble',
    templateUrl: './message-bubble.component.html',
    styleUrls: ['./message-bubble.component.scss'],
    standalone: false
})
export class MessageBubbleComponent {
  @Input() message!: Message;
  @Input() currentUser!: User | null;
  @Input() editingMessageId: string | null = null;
  @Input() editMessageContent: string = '';

  @Output() contextMenuRequest = new EventEmitter<{ event: MouseEvent, message: Message }>();
  @Output() scrollToRequest = new EventEmitter<string>();
  @Output() editKeydown = new EventEmitter<{ event: KeyboardEvent, message: Message }>();
  @Output() editInput = new EventEmitter<string>();
  @Output() cancelEditRequest = new EventEmitter<void>();
  @Output() saveEditRequest = new EventEmitter<void>();

  private touchStart = { time: 0, x: 0, y: 0 };

  constructor(private sanitizer: DomSanitizer) {}


  isMyMessage(): boolean {
    return this.message.fromUserId === this.currentUser?.id;
  }

  formatMessageTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getMessageStatus(message: Message): string {
    if (message.status === 'read') return 'status-read';
    if (message.status === 'delivered') return 'status-delivered';
    if (message.status === 'sent') return 'status-sent';
    if (message.status === 'sending') return 'status-sending';
    return 'status-sent';  
  }

  getReplyPreview(message: Message): string {
    if (!message.replyTo) return '';
    if (message.replyTo.isDeleted) {
      return '🗑️ Message supprimé';
    }
    return message.replyTo.content || 'Message';
  }

  formatMessageWithMentions(message: Message): SafeHtml {
    if (!message.content || message.isDeleted) {
      return message.content || '';
    }
    let formattedContent = message.content;
    const sortedMentions = [...(message.mentions || [])].sort((a, b) => b.position - a.position);
    if (sortedMentions.length === 0) {
      return message.content;
    }
    for (const mention of sortedMentions) {
      const before = formattedContent.substring(0, mention.position);
      const mentionText = formattedContent.substring(mention.position, mention.position + mention.length);
      const after = formattedContent.substring(mention.position + mention.length);
      const safeMention = `<span class="mention-highlight">${mentionText}</span>`;
      formattedContent = before + safeMention + after;
    }
    return this.sanitizer.bypassSecurityTrustHtml(formattedContent);
  }

  // --- GESTION DES ÉVÉNEMENTS ---

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.contextMenuRequest.emit({ event, message: this.message });
  }

  onScrollToClick(messageId: string | undefined): void {
    if (messageId) {
      this.scrollToRequest.emit(messageId);
    }
  }

  onEditInput(event: Event): void {
    this.editInput.emit((event.target as HTMLTextAreaElement).value);
  }

  // --- GESTION TOUCH MOBILE POUR LE MENU CONTEXTUEL ---
  onTouchStart(event: TouchEvent): void {
    this.touchStart = {
      time: Date.now(),
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  }

  onTouchEnd(event: TouchEvent): void {
    const touchEnd = {
      time: Date.now(),
      x: event.changedTouches[0].clientX,
      y: event.changedTouches[0].clientY
    };
    const isStationary =
      Math.abs(touchEnd.x - this.touchStart.x) < 10 &&
      Math.abs(touchEnd.y - this.touchStart.y) < 10;

    if ((touchEnd.time - this.touchStart.time) > 500 && isStationary) {
      event.preventDefault();
      const mouseEvent = new MouseEvent('contextmenu', {
        clientX: touchEnd.x,
        clientY: touchEnd.y
      });
      this.contextMenuRequest.emit({ event: mouseEvent, message: this.message });
    }
  }
}
/*
 * BELAFRICA - Plateforme diaspora africaine
 * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
 * Service de notifications - PWA Push Notifications
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from './storage.service';

export interface BelNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  type: 'message' | 'post' | 'admin' | 'system';
  conversationId?: string;
  read: boolean;
  createdAt: Date;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly STORAGE_KEY = 'bel_notifications';
  private notificationsSubject = new BehaviorSubject<BelNotification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  private swRegistration: ServiceWorkerRegistration | null = null;
  isPushSupported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
  permissionStatus: NotificationPermission = 'default';

  constructor(private storageService: StorageService) {
    this.loadFromStorage();
    if (this.isPushSupported) {
      this.permissionStatus = Notification.permission;
    }
  }

  /** Demander la permission de notification au navigateur */
  async requestPermission(): Promise<boolean> {
    if (!this.isPushSupported) return false;
    try {
      const result = await Notification.requestPermission();
      this.permissionStatus = result;
      if (result === 'granted') {
        await this.registerServiceWorker();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erreur permission notification:', err);
      return false;
    }
  }

  private async registerServiceWorker(): Promise<void> {
    try {
      this.swRegistration = await navigator.serviceWorker.ready;
    } catch (err) {
      console.warn('Service Worker non disponible:', err);
    }
  }

  /** Afficher une notification (in-app + système si permission) */
  async showNotification(
    title: string,
    body: string,
    options?: {
      type?: BelNotification['type'];
      conversationId?: string;
      icon?: string;
    }
  ): Promise<void> {
    const notif: BelNotification = {
      id: Date.now().toString(),
      title,
      body,
      icon: options?.icon || '/assets/icons/icon-192x192.png',
      type: options?.type || 'system',
      conversationId: options?.conversationId,
      read: false,
      createdAt: new Date()
    };

    // Stocker en mémoire (max 50)
    const current = this.notificationsSubject.getValue();
    const updated = [notif, ...current].slice(0, 50);
    this.notificationsSubject.next(updated);
    this.saveToStorage(updated);

    // Notification système si app en arrière-plan et permission OK
    if (this.permissionStatus === 'granted' &&
        typeof document !== 'undefined' &&
        document.visibilityState === 'hidden') {
      try {
        if (this.swRegistration) {
          await this.swRegistration.showNotification(title, {
            body,
            icon: notif.icon,
            badge: '/assets/icons/icon-72x72.png',
            data: { conversationId: options?.conversationId },
            vibrate: [200, 100, 200]
          } as any);
        } else {
          new Notification(title, { body, icon: notif.icon });
        }
      } catch (err) {
        console.warn('Erreur notification système:', err);
      }
    }
  }

  /** Notification spécifique pour un nouveau message */
  async notifyNewMessage(
    senderName: string,
    messagePreview: string,
    conversationId: string
  ): Promise<void> {
    await this.showNotification(
      senderName,
      messagePreview,
      { type: 'message', conversationId }
    );
  }

  get unreadCount(): number {
    return this.notificationsSubject.getValue().filter(n => !n.read).length;
  }

  markAllAsRead(): void {
    const updated = this.notificationsSubject.getValue().map(n => ({ ...n, read: true }));
    this.notificationsSubject.next(updated);
    this.saveToStorage(updated);
  }

  markAsRead(id: string): void {
    const updated = this.notificationsSubject.getValue().map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    this.notificationsSubject.next(updated);
    this.saveToStorage(updated);
  }

  clearAll(): void {
    this.notificationsSubject.next([]);
    this.storageService.removeItem(this.STORAGE_KEY);
  }

  private loadFromStorage(): void {
    const saved = this.storageService.getItem(this.STORAGE_KEY) as BelNotification[] | null;
    if (Array.isArray(saved)) {
      this.notificationsSubject.next(
        saved.map(n => ({ ...n, createdAt: new Date(n.createdAt) }))
      );
    }
  }

  private saveToStorage(notifs: BelNotification[]): void {
    this.storageService.setItem(this.STORAGE_KEY, notifs);
  }
}

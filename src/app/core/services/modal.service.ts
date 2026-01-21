/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ModalData {
  title: string;
  message: string;
  type: 'success' | 'error' | 'confirm';
  resolve?: (value: boolean | PromiseLike<boolean>) => void; 
}

@Injectable({
  providedIn: 'root'
})

export class ModalService {
  private modalState = new BehaviorSubject<ModalData | null>(null);
  modalState$ = this.modalState.asObservable();

  show(data: ModalData) {
    this.modalState.next(data);
  }
  showSuccess(title: string, message: string) {
    this.show({ title, message, type: 'success' });
  }
  showError(title: string, message: string) {
    this.show({ title, message, type: 'error' });
  }

  showConfirm(title: string, message: string): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      this.show({ title, message, type: 'confirm', resolve });
    });
  }

  hide() {
    this.modalState.next(null);
  }

  // Méthode pour résoudre la promesse de confirmation
  confirm(value: boolean): void {
    const currentModal = this.modalState.getValue();
    if (currentModal?.type === 'confirm' && currentModal.resolve) {
      currentModal.resolve(value);
      this.hide();
    }
  }
}
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ModalData {
  title: string;
  message: string;
  type: 'success' | 'error';
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
  hide() {
    this.modalState.next(null);
  }
}
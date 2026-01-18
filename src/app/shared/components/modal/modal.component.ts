/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ModalService, ModalData } from '../../../core/services/modal.service';
import { CommonModule } from '@angular/common';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
    selector: 'app-modal',
    imports: [CommonModule],
    templateUrl: './modal.component.html',
    styleUrls: ['./modal.component.scss'],
    animations: [
        trigger('fade', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('300ms ease-out', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('300ms ease-in', style({ opacity: 0 }))
            ])
        ])
    ]
})
export class ModalComponent implements OnInit {
  modalState$: Observable<ModalData | null>;

  constructor(public modalService: ModalService) {
    this.modalState$ = this.modalService.modalState$;
  }
  ngOnInit(): void {}

  close() {
    this.modalService.hide();
  }
}

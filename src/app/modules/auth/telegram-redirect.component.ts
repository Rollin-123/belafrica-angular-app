// src/app/modules/auth/components/telegram-redirect.component.ts
/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';


@Component({
    selector: 'app-telegram-redirect',
    imports: [],
    template: `
    <div class="telegram-redirect-container">
      <div class="telegram-card">
    
        <h1 class="title">{{ pageTitle }}</h1>
        <p class="subtitle">{{ pageSubtitle }}</p>
    
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progress"></div>
          </div>
          <div class="progress-text">{{ progress }}%</div>
        </div>
    
        <div class="instructions">
          <h3>📋 Instructions :</h3>
          <ol>
            <li>Telegram devrait s'ouvrir automatiquement</li>
            <li>Si rien ne se passe, cliquez sur le bouton ci-dessous</li>
            <li>Revenez ici après avoir reçu le code</li>
          </ol>
        </div>
    
        <div class="actions">
          <button class="btn-telegram" (click)="openTelegram()" [disabled]="isOpening">
            @if (!isOpening) {
              <span>📲 Ouvrir Telegram</span>
            }
            @if (isOpening) {
              <span>⏳ Ouverture en cours...</span>
            }
          </button>
    
          <!-- <button class="btn-sms" (click)="showSmsOption()">
          📱 Recevoir par SMS (alternatif)
        </button> -->
    
        <button class="btn-copy" (click)="copyLink()">
          📋 Copier le lien Telegram
        </button>
      </div>
    
      <div class="tips">
        <div class="tip">
          💡 <strong>Conseil :</strong> Revenez sur cette page après avoir reçu le code
        </div>
        <div class="tip">
          ⏱️ Code valable pendant <strong>10 minutes</strong>
        </div>
      </div>
    
      <button class="btn-continue" (click)="continueToOtp()" [disabled]="!canContinue">
        → Continuer vers la vérification du code
      </button>
    </div>
    </div>
    `,
    styles: [`
    .telegram-redirect-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 20px;
    }
    
    .telegram-card {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    
    @keyframes slide {
      0%, 100% { transform: translateX(0); }
      50% { transform: translateX(10px); }
    }
    
    .title {
      color: #333;
      font-size: 28px;
      margin-bottom: 10px;
    }
    
    .subtitle {
      color: #666;
      font-size: 18px;
      margin-bottom: 30px;
    }
    
    .progress-container {
      margin: 30px 0;
    }
    
    .progress-bar {
      height: 12px;
      background: #e0e0e0;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #0088cc, #00c6ff);
      border-radius: 6px;
      transition: width 0.3s ease;
    }
    
    .progress-text {
      color: #0088cc;
      font-weight: bold;
      font-size: 14px;
    }
    
    .instructions {
      background: #f8f9fa;
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
      text-align: left;
    }
    
    .instructions h3 {
      color: #333;
      margin-bottom: 10px;
    }
    
    .instructions ol {
      padding-left: 20px;
      color: #555;
    }
    
    .instructions li {
      margin-bottom: 8px;
    }
    
    .actions {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin: 25px 0;
    }
    
    .btn-telegram, .btn-continue {
      color: white;
      border: none;
      border-radius: 10px;
      padding: 16px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-telegram {
      background: linear-gradient(135deg, #0088cc, #00c6ff);
    }
    
    .btn-telegram:hover:not([disabled]) {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(0, 136, 204, 0.2);
    }
    
    .btn-telegram:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .btn-sms, .btn-copy {
      background: white;
      color: #333;
      border: 2px solid #ddd;
      border-radius: 10px;
      padding: 14px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-sms:hover, .btn-copy:hover {
      border-color: #0088cc;
      background: #f0f8ff;
    }
    
    .tips {
      background: #fff9e6;
      border-radius: 10px;
      padding: 15px;
      margin: 20px 0;
      text-align: left;
    }
    
    .tip {
      margin-bottom: 8px;
      color: #856404;
    }
    
    .telegram-link {
      display: block;
      background: #f1f3f4;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      word-break: break-all;
      margin-top: 10px;
    }
    
    .btn-continue {
      width: 100%;
      background: #34a853;
      margin-top: 20px;
    }
    
    .btn-continue:hover:not([disabled]) {
      opacity: 0.9;
    }
    
    .btn-continue:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class TelegramRedirectComponent implements OnInit, OnDestroy {
  progress = 0;
  telegramLink = '';
  isOpening = false;
  canContinue = false;
  pageTitle = 'Ouvrez Telegram';
  pageSubtitle = 'Vous allez recevoir votre code de vérification';
  private intervalId: any;

  constructor(private router: Router) {}

  ngOnInit() {
    const otpResponse = localStorage.getItem('telegram_otp_response');
    if (otpResponse) {
      const data = JSON.parse(otpResponse);
      this.telegramLink = data.links?.universal || data.links?.web || '';

      // ✅ NOUVEAU : Personnaliser les messages en fonction du contexte (login ou inscription)
      if (data.userExists) {
        this.pageTitle = 'Bon retour !';
        this.pageSubtitle = 'Veuillez vérifier votre identité via Telegram pour vous connecter en toute sécurité.';
      } else {
        this.pageTitle = 'Presque terminé !';
        this.pageSubtitle = 'Un code vous a été envoyé sur Telegram pour finaliser votre inscription.';
      }
      
      if (data.token) {
        localStorage.setItem('telegram_token', data.token);
      }
    }

    this.intervalId = setInterval(() => {
      if (this.progress < 100) {
        this.progress += 5;
      } else {
        clearInterval(this.intervalId);
        this.openTelegram();
      }
    }, 200);

    setTimeout(() => {
      this.canContinue = true;
    }, 10000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  openTelegram() {
    if (!this.telegramLink || this.isOpening) return;
    
    this.isOpening = true;
    this.progress = 100;

    const token = localStorage.getItem('telegram_token') || '';
    const mobileLink = `tg://resolve?domain=Belafrica_bot&start=${token}`;
    
    window.location.href = mobileLink;
    
    setTimeout(() => {
      if (!document.hidden && this.isOpening) {
        window.open(this.telegramLink, '_blank');
      }
      this.isOpening = false;
    }, 1500);
  }

  showSmsOption() {
    alert('Option SMS bientôt disponible. Pour le moment, utilisez Telegram.');
  }

  copyLink() {
    if (!this.telegramLink) return;
    
    navigator.clipboard.writeText(this.telegramLink)
      .then(() => {
        alert('Lien copié ! Collez-le dans Telegram.');
      })
      .catch(err => {
        console.error('Erreur copie:', err);
      });
  }
  continueToOtp() {
    this.router.navigate(['/auth/otp']);
  }
}
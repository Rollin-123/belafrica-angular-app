import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LogoService {
  private logoUrl: string = 'https://res.cloudinary.com/ddcda1blt/image/upload/v1757857471/BelaAfrica/logo_dcnjrv.jpg'

  getLogoUrl(): string {
    return this.logoUrl;
  }
}


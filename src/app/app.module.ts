/* 
 * BELAFRICA - Plateforme diaspora africaine
 * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
 * Code source confidentiel - Usage interdit sans autorisation
 */
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { isDevMode, NgModule, APP_INITIALIZER } from '@angular/core';
import { AppRoutingModule } from '../app-routing.module';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AppComponent } from './app.component';
import { ModalComponent } from './shared/components/modal/modal.component';  
import { TelegramRedirectComponent } from './modules/auth/telegram-redirect.component';
import { Observable } from 'rxjs';
import { ConfigService } from './core/services/config.service';
import { CredentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import { environment } from '../environments/environment';
import { PostsService } from './core/services/posts.service';
import { PostsMockService } from './core/services/posts-mock.service';
import { PostsHttpService } from './core/services/posts-http.service';
import { MessagingService } from './core/services/messaging.service';
import { MessagingMockService } from './core/services/messaging-mock.service';
import { MessagingHttpService } from './core/services/messaging-http.service';

export function initializeApp(configService: ConfigService): () => Observable<any> {
  return () => configService.loadAppConfig();
}

@NgModule({
  declarations: [AppComponent, ModalComponent, TelegramRedirectComponent],  
  imports: [
    BrowserModule,
    BrowserAnimationsModule,  
    AppRoutingModule,
    HttpClientModule,
    ServiceWorkerModule.register('ngsw-worker.js', {enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000'})
  ],
  providers: [
    ConfigService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ConfigService],
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    { provide: HTTP_INTERCEPTORS, useClass: CredentialsInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    {
      provide: PostsService,
      useClass: environment.production ? PostsHttpService : PostsMockService
    },
    {
      provide: MessagingService,
      useClass: environment.production ? MessagingHttpService : MessagingMockService
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
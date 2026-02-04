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
import { Observable } from 'rxjs';
import { ConfigService } from './core/services/config.service';
import { CredentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import { PostsService } from './core/services/posts.service';
import { PostsHttpService } from './core/services/posts-http.service';
import { MessagingService } from './core/services/messaging.service';
import { MessagingHttpService } from './core/services/messaging-http.service';
import { AuthModule } from './modules/auth/auth.module';
import { SharedModule } from './shared/shared/shared.module';

export function initializeApp(configService: ConfigService): () => Observable<any> {
  return () => configService.loadAppConfig();
}

@NgModule({
  declarations: [AppComponent],  
  imports: [
    BrowserModule,
    BrowserAnimationsModule,  
    AppRoutingModule,
    HttpClientModule,
    ServiceWorkerModule.register('ngsw-worker.js', {enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000'}),
    AuthModule,
    SharedModule
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
      useClass: PostsHttpService  
    },
    {
      provide: MessagingService,
      useClass: MessagingHttpService  
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
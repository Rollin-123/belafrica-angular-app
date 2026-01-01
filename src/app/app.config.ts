import { ApplicationConfig, importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpClientModule, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { Observable } from 'rxjs';

import { routes } from '../app-routing.module'; 
import { ConfigService } from './core/services/config.service';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { environment } from '../environments/environment';
import { PostsService } from './core/services/posts.service';
import { PostsMockService } from './core/services/posts-mock.service';
import { PostsHttpService } from './core/services/posts-http.service';

import { MessagingService } from './core/services/messaging.service'; 
import { MessagingMockService } from './core/services/messaging-mock.service';
import { MessagingHttpService } from './core/services/messaging-http.service';

// Fonction d'initialisation (ne change pas)
export function initializeApp(configService: ConfigService): () => Observable<any> {
  return () => configService.loadAppConfig();
}
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), 
    importProvidersFrom(HttpClientModule),
    provideHttpClient(withInterceptorsFromDi()), 
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ConfigService],
      multi: true,
    },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    {
      provide: PostsService, 
      useClass: environment.production ? PostsHttpService : PostsMockService
    },
    {
      provide: MessagingService,
      useClass: environment.production ? MessagingHttpService : MessagingMockService
    }
  ]
};
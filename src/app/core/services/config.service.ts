import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private appConfig: any;

  constructor(private http: HttpClient) {}

  loadAppConfig(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/constants`).pipe(
      tap(config => {
        this.appConfig = (config as any).data;
        console.log('✅ Constantes de l\'application chargées depuis le backend.');
      })
    );
  }

  get constants() {
    if (!this.appConfig) {
      throw new Error('Les constantes de configuration ne sont pas chargées !');
    }
    return this.appConfig;
  }
}
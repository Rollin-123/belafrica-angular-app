import { provideHttpClient, withInterceptors } from '@angular/common/http';

export const provideAppHttp = () => 
  provideHttpClient(
    withInterceptors([
    ])
  );
  
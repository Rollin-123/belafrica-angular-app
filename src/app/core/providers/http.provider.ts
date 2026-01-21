/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { provideHttpClient, withInterceptors } from '@angular/common/http';


export const provideAppHttp = () => 
  provideHttpClient(
    withInterceptors([
    ])
  );
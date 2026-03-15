/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
    * Code source confidentiel - Usage interdit sans autorisation
    */

// RenderMode et ServerRoute sont disponibles a partir de @angular/ssr 18.2+
// Version actuelle: 18.1.x - utiliser la syntaxe compatible

export const serverRoutes = [
  { path: '**', renderMode: 'client' }
];

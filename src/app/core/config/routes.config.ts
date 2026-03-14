/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

// src/app/core/config/routes.config.ts
export const AppRoutes = {
  // Routes publiques
  AUTH: {
    PHONE: '/auth/phone',
    OTP: '/auth/otp',
    NATIONALITY: '/auth/nationality',
    PROFILE: '/auth/profile'
  },
  
  // Routes privées
  APP: {
    ROOT: '/app',
    NATIONAL: '/app/national',
    INTERNATIONAL: '/app/international',
    MESSAGES: '/app/messages',
    SETTINGS: '/app/settings'
  },
  // Routes admin
  ADMIN: {
    ROOT: '/admin',
    GENERATOR: '/admin/generator'
  }
};

export const RouteGuards = {
  PUBLIC_ONLY: [], 
  AUTH_REQUIRED: ['/app', '/app/*'], 
  ADMIN_REQUIRED: ['/admin', '/admin/*'] 
};
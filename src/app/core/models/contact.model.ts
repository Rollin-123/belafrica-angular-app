/*
 * BELAFRICA - Plateforme diaspora africaine
 * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
 */

export interface Contact {
  id: string;
  userId: string;
  pseudo: string;
  avatar?: string;
  community?: string;
  nationalityName?: string;
  isVerified?: boolean;
  privateConversationId?: string | null;
  addedAt: string;
  isOnline?: boolean;
}

export interface ContactSearchResult {
  id: string;
  pseudo: string;
  avatar_url?: string;
  community?: string;
  nationality_name?: string;
  is_verified?: boolean;
  isAlreadyContact: boolean;
  isBlocked: boolean;
}

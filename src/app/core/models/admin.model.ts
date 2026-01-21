/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
export interface AdminVerificationRequest {
  id: string;
  userId: string;
  userPseudo: string;
  userCommunity: string;
  userPhone: string;
  userEmail?: string;
  passportPhoto: string;
  additionalInfo: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  adminCode?: string;
}
export interface AdminCode {
  code: string;           
  community: string;      
  userEmail: string;
  permissions: string[];
  expiresAt: Date;
  createdAt: Date;
  used: boolean;
  usedBy?: string;
  usedAt?: Date;
}
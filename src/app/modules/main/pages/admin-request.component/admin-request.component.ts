import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';
import { UserService } from '../../../../core/services/user.service';
import { CloudinaryUploadService } from '../../../../core/services/cloudinary.service';

@Component({
  selector: 'app-admin-request',
  templateUrl: './admin-request.component.html',
  styleUrls: ['./admin-request.component.scss'],
  standalone: false
})
export class AdminRequestComponent implements OnInit {
  adminForm: FormGroup;
  isLoading = false;
  validatingCode = false;
  selectedPassportBase64: string | null = null; 
  passportPreview: string | ArrayBuffer | null = null;
  adminCode = '';
  hasPendingRequest = false;
  isAdmin = false;
  codeError: string | null = '';
  user: any;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private adminService: AdminService,
    private userService: UserService,
    private cloudinaryService: CloudinaryUploadService,
    private cd: ChangeDetectorRef,
  ) {
    this.adminForm = this.fb.group({
      passportPhoto: [false, Validators.requiredTrue],
      additionalInfo: ['', [Validators.required, Validators.minLength(50)]],
    });
  }

  ngOnInit() {
    this.loadUserData();
    
    // S'abonner aux mises à jour de l'utilisateur
    this.userService.userUpdate$.subscribe(() => {
      this.loadUserData();
    });
  }

  private loadUserData(): void {
    this.user = this.userService.getCurrentUser();
    this.isAdmin = this.adminService.isUserAdmin();
    this.hasPendingRequest = this.adminService.hasPendingRequest();
    
    console.log('👤 Statut admin mis à jour:', {
      isAdmin: this.isAdmin,
      hasPendingRequest: this.hasPendingRequest,
      user: this.user?.pseudo
    });

    this.cd.detectChanges();
  }

 onPassportSelected(event: any): void {
    const file: File = event.target.files[0];

    if (file) {
      // 1. Crée un lecteur de fichier
      const reader = new FileReader();

      // 2. Déclenche la lecture en Base64 (Data URL)
      reader.readAsDataURL(file);

      // 3. Une fois la lecture terminée
      reader.onload = () => {
        // Stocke la Data URL (Base64) pour l'aperçu ET l'upload
        this.passportPreview = reader.result;
        this.selectedPassportBase64 = reader.result as string; 
        
        // Valide le champ du formulaire
        this.cd.detectChanges();
        this.adminForm.get('passportPhoto')?.setValue(true);
      };

      reader.onerror = (error) => {
        console.error("Erreur de lecture de fichier:", error);
        this.cd.detectChanges();
        this.adminForm.get('passportPhoto')?.setValue(false);
      };

    } else {
      this.passportPreview = null;
      this.selectedPassportBase64 = null;
      this.cd.detectChanges();
      this.adminForm.get('passportPhoto')?.setValue(false);
    }
  }

  // Logique de soumission de la demande
  async submitRequest(): Promise<void> {
    if (this.adminForm.invalid || this.isLoading) {
      this.adminForm.markAllAsTouched();
      return;
    }

    if (!this.selectedPassportBase64) {
      console.error("L'image Base64 est manquante.");
      // Afficher un message d'erreur à l'utilisateur ici
      return;
    }

    this.isLoading = true;
    this.codeError = null; 

    try {
      // ⚠️ FIX: On passe la chaîne Base64 convertie et non l'objet File !
      const imageUrl = await this.cloudinaryService.uploadImage(this.selectedPassportBase64); 

      // 2. Préparation des données pour Firestore/Backend
      const requestData = {
        community: this.user?.community, // ou autre donnée utilisateur
        additionalInfo: this.adminForm.value.additionalInfo,
        passportImageUrl: imageUrl, // L'URL publique de Cloudinary
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      // 3. Envoi au Backend / Firestore
      console.log('Données à envoyer au backend/Firestore:', requestData);
      // await this.adminService.createAdminRequest(requestData); 

      // ... (Logique de succès, navigation, etc.)
      this.hasPendingRequest = true; 

    } catch (error) {
      console.error("Erreur lors de la soumission de la demande:", error);
      this.codeError = "Échec de l'envoi de la demande. Veuillez réessayer.";
    } finally {
      this.isLoading = false;
    }
  }

  // Validation du code JWT
  validateAdminCode(): void {
    const code = this.adminCode.trim();
    console.log('🔑 Tentative de validation du code :', code);

    if (code) {
      this.validatingCode = true;
      this.codeError = '';
      
      // Simulation de délai pour l'UX
      setTimeout(() => {
        try {
          // 💡 POINT CRITIQUE : Ici, vous devez implémenter la logique réelle.
          const isValid = this.adminService.validateAdminCode(code);
          
          if (isValid) {
            this.showSuccess('🎉 Félicitations ! Vous êtes maintenant administrateur.');
            
            // Recharger les données
            this.loadUserData();
            
            // Redirection après succès
            setTimeout(() => {
              this.router.navigate(['/app/settings']);
            }, 2000);
          } else {
            this.codeError = '❌ Code invalide, expiré ou ne correspond pas à votre communauté.';
          }
        } catch (error: any) {
          this.codeError = '❌ Erreur de validation: ' + (error.message || 'Veuillez réessayer.');
        } finally {
          this.validatingCode = false;
          this.cd.detectChanges();
        }
      }, 1000);
    } else {
      this.codeError = '⚠️ Veuillez entrer un code de validation.';
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.adminForm.controls).forEach(key => {
      this.adminForm.get(key)?.markAsTouched();
    });
  }

  // Remplacer les alert() par des messages stylisés est fortement recommandé en production
  private showError(message: string): void {
    alert(message);
  }

  private showSuccess(message: string): void {
    alert(message);
  }

  goBack(): void {
    this.router.navigate(['/app/settings']);
  }

  // Réinitialiser pour les tests
  resetForTesting(): void {
    this.adminService.resetAdminData();
    this.loadUserData();
    this.showSuccess('🔄 Données admin réinitialisées pour les tests');
  }
}

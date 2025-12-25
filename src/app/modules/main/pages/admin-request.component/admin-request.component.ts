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
  showCreatePostButton = false;
  uploadError: string | null = null;

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
    
    this.userService.currentUser$.subscribe(user => {
      if (user) {
        this.user = user;
        this.isAdmin = user.isAdmin || false;
        this.showCreatePostButton = this.adminService.canPostNational();
        console.log('🔄 Mise à jour réactive du statut admin:', {
          isAdmin: this.isAdmin,
          pseudo: user.pseudo,
          showCreatePostButton: this.showCreatePostButton
        });

        this.cd.detectChanges();
      }
    });
  }

  private loadUserData(): void {
    this.user = this.userService.getCurrentUser();
    this.isAdmin = this.adminService.isUserAdmin();
    this.showCreatePostButton = this.adminService.canPostNational();
    
    console.log('👤 Statut admin initial:', {
      isAdmin: this.isAdmin,
      hasPendingRequest: this.hasPendingRequest,
      user: this.user?.pseudo,
      showCreatePostButton: this.showCreatePostButton
    });

    this.cd.detectChanges();
  }

  onPassportSelected(event: any): void {
    const file: File = event.target.files[0];

    if (file) {
      this.uploadError = null;
      
      if (file.size > 5 * 1024 * 1024) {
        this.uploadError = '⚠️ La photo ne doit pas dépasser 5MB';
        this.cd.detectChanges();
        return;
      }
      
      if (!file.type.match('image/(jpeg|png|jpg)')) {
        this.uploadError = '⚠️ Format non supporté. Utilisez JPG ou PNG';
        this.cd.detectChanges();
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.passportPreview = e.target.result;
        this.selectedPassportBase64 = e.target.result as string; 
        
        this.adminForm.get('passportPhoto')?.setValue(true);
        this.uploadError = null;
        this.cd.detectChanges();
      };

      reader.onerror = (error) => {
        console.error("Erreur de lecture de fichier:", error);
        this.uploadError = '❌ Erreur de lecture du fichier';
        this.adminForm.get('passportPhoto')?.setValue(false);
        this.cd.detectChanges();
      };

      reader.readAsDataURL(file);
    } else {
      this.passportPreview = null;
      this.selectedPassportBase64 = null;
      this.adminForm.get('passportPhoto')?.setValue(false);
      this.cd.detectChanges();
    }
  }

  async submitRequest(): Promise<void> {
    if (this.adminForm.invalid || this.isLoading) {
      this.markFormGroupTouched();
      return;
    }

    if (!this.selectedPassportBase64) {
      this.uploadError = '⚠️ Veuillez sélectionner une photo de pièce d\'identité';
      return;
    }

    this.isLoading = true;
    this.codeError = null;
    this.uploadError = null;

    try {
      const imageUrl = await this.cloudinaryService.uploadImage(this.selectedPassportBase64);
      const success = false;

      if (success !== undefined && success) {
        this.hasPendingRequest = true;
        this.showSuccess('📨 Demande envoyée ! Vous recevrez un code par email sous 24-48h.');
        this.adminForm.reset();
        this.passportPreview = null;
        this.selectedPassportBase64 = null;
      } else {
        this.codeError = '❌ Erreur lors de l\'envoi de la demande. Réessayez.';
      }
    } catch (error: any) {
      console.error("Erreur lors de la soumission de la demande:", error);
      this.codeError = "❌ Échec de l'envoi de la demande: " + (error.message || 'Erreur inconnue');
    } finally {
      this.isLoading = false;
      this.cd.detectChanges();
    }
  }

  validateAdminCode(): void {
    const code = this.adminCode.trim();
    console.log('🔑 Tentative de validation du code :', code);

    if (!code) {
      this.codeError = '⚠️ Veuillez entrer un code de validation.';
      return;
    }

    this.validatingCode = true;
    this.codeError = '';
    
    this.adminService.validateAdminCode(code).subscribe({
      next: (response) => {
        if (response.success) {
          this.codeError = '🎉 Félicitations ! Vous êtes maintenant administrateur. Redirection...';
          this.isAdmin = true;
          this.showCreatePostButton = true;
          this.router.navigate(['/app/settings']); // Rediriger après succès
        } else {
          this.codeError = response.error || '❌ Code invalide, expiré ou ne correspond pas à votre communauté.';
        }
      },
      error: (error) => {
        this.codeError = '❌ Erreur de validation: ' + (error.message || 'Veuillez réessayer.');
      },
      complete: () => {
        this.validatingCode = false;
        this.cd.detectChanges();
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.adminForm.controls).forEach(key => {
      this.adminForm.get(key)?.markAsTouched();
    });
  }

  private showError(message: string): void {
    alert(message);
  }

  private showSuccess(message: string): void {
    alert(message);
  }

  goBack(): void {
    this.router.navigate(['/app/settings']);
  }

  resetForTesting(): void {
    this.adminService.resetAdminData();
    this.loadUserData();
    this.showSuccess('🔄 Données admin réinitialisées pour les tests');
  }

  // Nouvelle méthode pour ouvrir le modal de création de post
  openCreatePostModal(): void {
    if (this.showCreatePostButton) {
      console.log('📝 Ouverture du modal de création de post');
      // Implémenter l'ouverture du modal ici
      this.showSuccess('Fonctionnalité de création de post bientôt disponible !');
    }
  }
}
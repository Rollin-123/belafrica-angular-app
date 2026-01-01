import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';
import { User, UserService } from '../../../../core/services/user.service';
import { CloudinaryUploadService } from '../../../../core/services/cloudinary.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-request',
  templateUrl: './admin-request.component.html',
  styleUrls: ['./admin-request.component.scss'],
  standalone: false
})
export class AdminRequestComponent implements OnInit, OnDestroy {
  adminForm: FormGroup;
  isLoading = true; // ✅ Démarrer en mode chargement
  validatingCode = false;
  selectedPassportBase64: string | null = null; 
  passportPreview: string | ArrayBuffer | null = null;
  adminCode = '';
  hasPendingRequest = false; // Cette info devrait venir du backend
  isAdmin = false;
  codeError: string | null = '';
  user: User | null = null;
  showCreatePostButton = false;
  uploadError: string | null = null;
  private userSubscription: Subscription | undefined;

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
    this.userSubscription = this.userService.currentUser$.subscribe(user => {
      if (user) {
        this.user = user;
        this.isAdmin = user.is_admin; // ✅ Utiliser la bonne propriété
        this.showCreatePostButton = this.userService.canPostNational(); // ✅ Utiliser UserService directement
        console.log('🔄 Mise à jour réactive du statut admin:', {
          isAdmin: this.isAdmin,
          hasPendingRequest: this.hasPendingRequest, // Ajouter le statut de la demande
          pseudo: user.pseudo,
          showCreatePostButton: this.showCreatePostButton
        });
      }
      this.isLoading = false; // ✅ Fin du chargement initial une fois l'utilisateur traité
      this.cd.detectChanges();
    });
  }
  // ... (le reste du fichier est bon)

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
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
      // 1. Uploader l'image sur Cloudinary
      const imageUrl = await this.cloudinaryService.uploadImage(this.selectedPassportBase64);
      
      // 2. Soumettre la demande au backend avec l'URL de l'image
      const response = await this.adminService.submitAdminRequest(imageUrl, this.adminForm.value.additionalInfo).toPromise();

      if (response?.success) {
        this.hasPendingRequest = true;
        this.showSuccess(response.message || '📨 Demande envoyée ! Vous recevrez une notification une fois traitée.');
        this.adminForm.reset();
        this.passportPreview = null;
        this.selectedPassportBase64 = null;
      } else {
        this.codeError = response?.error || '❌ Erreur lors de l\'envoi de la demande. Réessayez.';
      }
    } catch (error: any) {
      console.error("Erreur lors de la soumission de la demande:", error);
      this.codeError = "❌ Échec de l'envoi: " + (error.error?.error || error.message || 'Erreur inconnue');
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
          this.isAdmin = true; // L'état sera mis à jour par le `currentUser$` de toute façon
          this.showCreatePostButton = true;
          this.router.navigate(['/app/settings']); // Rediriger après succès
        } else {
          this.codeError = response.error || '❌ Code invalide, expiré ou ne correspond pas à votre communauté.';
        }
      },
      error: (error) => {
        this.codeError = '❌ Erreur de validation: ' + (error.error?.error || error.message || 'Veuillez réessayer.');
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
    this.showSuccess('🔄 Données admin réinitialisées. Le statut sera mis à jour.');
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
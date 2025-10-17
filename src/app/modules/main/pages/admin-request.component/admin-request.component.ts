import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-admin-request',
  standalone: false,
  templateUrl: './admin-request.component.html',
  styleUrls: ['./admin-request.component.scss']
})
export class AdminRequestComponent implements OnInit {
  adminForm: FormGroup;
  isLoading = false;
  validatingCode = false;
  passportPreview: string | null = null;
  selectedPassport: File | null = null;
  adminCode: string = '';
  hasPendingRequest = false;
  isAdmin = false;
  codeError: string = '';
  user: any = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private adminService: AdminService,
    private userService: UserService,
    private cd: ChangeDetectorRef // ⬅️ AJOUT

  ) {
    this.adminForm = this.fb.group({
      additionalInfo: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(500)]],
      passportPhoto: [null, Validators.required]
    });
  }

  ngOnInit() {
    this.user = this.userService.getCurrentUser();
    this.isAdmin = this.adminService.isUserAdmin();
    this.hasPendingRequest = this.adminService.hasPendingRequest();
    
    console.log('👤 Statut admin:', {
      isAdmin: this.isAdmin,
      hasPendingRequest: this.hasPendingRequest,
      user: this.user?.pseudo
    });
  }

 onPassportSelected(event: any): void {
  const file = event.target.files[0];
  if (!file) return;

  // Validation du fichier
  if (!file.type.match('image/(jpeg|png|jpg)')) {
    this.showError('Format non supporté. Utilisez JPG ou PNG.');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    this.showError('L\'image ne doit pas dépasser 5MB.');
    return;
  }

  this.selectedPassport = file;
  this.adminForm.patchValue({ passportPhoto: file });

  // ✅ CORRECTION : Forcer la détection de changement
  const reader = new FileReader();
  reader.onload = (e: any) => {
    this.passportPreview = e.target.result;
    this.cd.detectChanges(); // ⬅️ Ici
    setTimeout(() => {
      // Cette ligne déclenche la détection de changement
      this.passportPreview = e.target.result;
    }, 0);
  };
  reader.onerror = () => this.showError('Erreur lors de la lecture du fichier');
  reader.readAsDataURL(file);
}

  async submitRequest(): Promise<void> {
    if (this.adminForm.valid && this.passportPreview) {
      this.isLoading = true;
      this.codeError = '';

      try {
        const success = await this.adminService.submitAdminRequest(
          this.passportPreview,
          this.adminForm.get('additionalInfo')?.value
        );

        if (success) {
          this.hasPendingRequest = true;
          this.showSuccess('✅ Demande envoyée ! Vous recevrez un email sous 48h.');
          this.adminForm.reset();
          this.passportPreview = null;
        } else {
          this.showError('❌ Erreur lors de l\'envoi. Veuillez réessayer.');
        }
        
      } catch (error: any) {
        console.error('Erreur soumission:', error);
        this.showError('❌ Erreur: ' + (error.message || 'Veuillez réessayer.'));
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

 validateAdminCode(): void {
  if (this.adminCode.trim()) {
    this.validatingCode = true;
    this.codeError = '';
    setTimeout(() => {
      try {
        const isValid = this.adminService.validateAdminCode(this.adminCode.trim());
        
        if (isValid) {
          this.isAdmin = true;
          this.showSuccess('🎉 Félicitations ! Vous êtes maintenant administrateur.');
          
          // Recharger les données utilisateur
          setTimeout(() => {
            this.router.navigate(['/app/settings']);
          }, 2000);
        } else {
          this.codeError = '❌ Code invalide, expiré ou communauté incorrecte.';
        }
      } catch (error) {
        this.codeError = '❌ Erreur de validation.';
      } finally {
        this.validatingCode = false;
      }
    }, 1000);
  }
}

  private markFormGroupTouched(): void {
    Object.keys(this.adminForm.controls).forEach(key => {
      this.adminForm.get(key)?.markAsTouched();
    });
  }

  private showError(message: string): void {
    // Implémenter un toast ou alert stylé
    alert(message);
  }

  private showSuccess(message: string): void {
    // Implémenter un toast ou alert stylé
    alert(message);
  }

  goBack(): void {
    this.router.navigate(['/app/settings']);
  }
}
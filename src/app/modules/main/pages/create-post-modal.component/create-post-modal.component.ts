import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PostsService } from '../../../../core/services/posts.service';

@Component({
  selector: 'app-create-post-modal',
  templateUrl: './create-post-modal.component.html',
  styleUrls: ['./create-post-modal.component.scss'],
  standalone: false // ✅ CORRECTION: Ajout du décorateur
})
export class CreatePostModalComponent implements OnInit {
  @Input() visibility: 'national' | 'international' = 'national';
  @Output() closed = new EventEmitter<void>();
  @Output() postCreated = new EventEmitter<void>();

  postForm: FormGroup;
  isLoading = false;
  imagePreviews: string[] = [];
  selectedImages: File[] = [];

  constructor(
    private fb: FormBuilder,
    private postsService: PostsService
  ) {
    this.postForm = this.fb.group({
      visibility: ['national', Validators.required],
      content: ['', [Validators.required, Validators.minLength(1)]]
    });
  }
  ngOnInit(): void { // ✅ CORRECTION: Laisser la méthode vide
    this.postForm.get('visibility')?.setValue(this.visibility);
  }

  onImageSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];
    
    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert('❌ Veuillez sélectionner uniquement des images');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('❌ L\'image ne doit pas dépasser 5MB');
        return;
      }

      if (this.selectedImages.length >= 4) {
        alert('❌ Maximum 4 images autorisées');
        return;
      }

      this.selectedImages.push(file);

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviews.push(e.target.result);
      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  }

  removeImage(index: number): void {
    this.imagePreviews.splice(index, 1);
    this.selectedImages.splice(index, 1);
  }

  async createPost(): Promise<void> {
    if (this.postForm.valid) {
      this.isLoading = true;

      try {
        // Convertir les images en URLs (dans une vraie app, upload vers cloud)
        const imageUrls = this.imagePreviews;

        // Créer le post
        await this.postsService.createPost(
          this.postForm.get('content')?.value,
          imageUrls,
          this.postForm.get('visibility')?.value
        );

        // Émettre l'événement et fermer
        this.postCreated.emit();
        this.closeModal();
        
        alert('✅ Publication créée avec succès !');
        
      } catch (error) {
        console.error('❌ Erreur création post:', error);
        alert('❌ Erreur lors de la création de la publication');
      } finally {
        this.isLoading = false;
      }
    }
  }

  closeModal(): void {
    this.closed.emit();
  }
}
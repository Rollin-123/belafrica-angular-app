import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'bel-privacy-security',
  standalone: false,
  templateUrl: './privacy-security.component.html',
  styleUrl: './privacy-security.component.scss'
})
export class PrivacySecurityComponent implements OnInit {
  
  constructor(
      private router: Router,
    ) {}

  ngOnInit() {
  }
    
    goBackToSettings(): void {
    this.router.navigate(['/app/settings']);
  }
}

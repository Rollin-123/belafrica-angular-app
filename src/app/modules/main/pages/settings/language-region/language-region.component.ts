import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'bel-language-region',
  standalone: false,
  templateUrl: './language-region.component.html',
  styleUrl: './language-region.component.scss'
})
export class LanguageRegionComponent implements OnInit{
  
  constructor(
    private router: Router,
  ) { }

  ngOnInit(): void {
  }
  
  goBackToSettings(): void {
    this.router.navigate(['/app/settings']);
  }
}

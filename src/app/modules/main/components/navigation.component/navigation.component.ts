import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface NavItem {
name: any;
  path: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-navigation',
  standalone: false,
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent {
  navItems = [
    { name: 'Accueil', icon: '🏠', path: '/app' },
    { name: 'Communauté', icon: '🌍', path: '/app/community' },
    { name: 'Messages', icon: '💬', path: '/app/messages' },
    { name: 'Réglages', icon: '⚙️', path: '/app/settings' },
  ];

  
  activePath: string = '';

  constructor(private router: Router) {}

  ngOnInit() {
    // Détermine le chemin actif au chargement initial
    this.activePath = this.router.url;
  }

  // Gère la navigation et met à jour le chemin actif
  navigateTo(path: string) {
    this.router.navigate([path]);
    this.activePath = path;
  }

  // Vérifie si le chemin est actif pour le style
  isActive(path: string): boolean {
    // Utilise startsWith pour gérer les routes enfants si nécessaire, mais ici le match exact est suffisant
    return this.activePath === path;
  }
}
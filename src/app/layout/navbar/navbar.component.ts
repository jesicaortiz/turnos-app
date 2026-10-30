import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {

  scrolled = false;

  menuAbierto = false;

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  @HostListener('window:scroll')
  onWindowScroll() {

    this.scrolled = window.scrollY > 50;

  }

  /**
   * Si se agranda la ventana (o se rota el celular) hasta
   * el tamaño de escritorio, el menú desplegable se cierra.
   */
  @HostListener('window:resize')
  onResize() {

    if (window.innerWidth > 768) {
      this.menuAbierto = false;
    }

  }

  @HostListener('document:keydown.escape')
  onEscape() {

    this.menuAbierto = false;

  }

  alternarMenu(): void {

    this.menuAbierto = !this.menuAbierto;

  }

  cerrarMenu(): void {

    this.menuAbierto = false;

  }

  async cerrarSesion(): Promise<void> {

    this.cerrarMenu();

    await this.authService.logout();

    this.router.navigate(['/']);

  }

}


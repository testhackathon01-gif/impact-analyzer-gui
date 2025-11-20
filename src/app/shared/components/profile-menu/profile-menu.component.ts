import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-container">
      <div class="profile-icon" (click)="toggleMenu()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <path
            fill="currentColor"
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
          />
        </svg>
      </div>
      <div class="profile-menu" *ngIf="isMenuOpen">
        <div class="menu-item" (click)="toggleTheme()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M12 3a1 1 0 0 0 0 2 7 7 0 1 1 0 14 1 1 0 0 0 0 2 9 9 0 1 0 0-18z"
            />
          </svg>
          <span>{{ isDark ? 'Switch to Light' : 'Switch to Dark' }}</span>
        </div>
        <div class="menu-separator"></div>
        <div class="menu-item" (click)="openSetup()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
            />
          </svg>
          <span>Setup</span>
        </div>
        <div class="menu-item" (click)="logout()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"
            />
          </svg>
          <span>Logout</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .profile-container {
        position: relative;
        display: flex;
        justify-content: flex-end;
      }

      .profile-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .profile-menu {
        position: absolute;
        top: 45px;
        right: 0;
        background: var(--surface);
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        min-width: 180px;
        z-index: 1000;
        overflow: hidden;
      }

      .menu-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;
        color: var(--text);
        transition: background-color 0.2s;

        svg {
          flex-shrink: 0;
        }
      }
      .menu-separator {
        height: 1px;
        background: rgba(0, 0, 0, 0.06);
        margin: 6px 0;
      }
    `,
  ],
})
export class ProfileMenuComponent {
  isMenuOpen = false;
  isDark = false;

  constructor() {
    try {
      this.isDark =
        document.documentElement.classList.contains('theme-dark') ||
        localStorage.getItem('theme') === 'dark';
    } catch (e) {
      this.isDark = false;
    }
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const profileContainer = target.closest('.profile-container');

    if (!profileContainer) {
      this.isMenuOpen = false;
    }
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleTheme() {
    try {
      this.isDark = !this.isDark;
      if (this.isDark) {
        document.documentElement.classList.add('theme-dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('theme-dark');
        localStorage.setItem('theme', 'light');
      }
    } catch (e) {}
    this.isMenuOpen = false;
  }

  openSetup() {
    console.log('Opening setup...');
    this.isMenuOpen = false;
  }

  logout() {
    console.log('Logging out...');
    this.isMenuOpen = false;
  }
}

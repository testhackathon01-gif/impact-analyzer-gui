import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="global-loader">
      <div class="loader-backdrop" aria-hidden="true"></div>
      <div class="loader-spinner" role="status" aria-live="polite">
        <svg class="spinner" viewBox="0 0 50 50" width="64" height="64" aria-hidden="true">
          <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
        </svg>
        <div class="loader-text">Analyzing changes…</div>
      </div>
    </div>
  `,
  styleUrls: ['./landing-loader.component.scss'],
})
export class LandingLoaderComponent {}

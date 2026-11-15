import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-logo',
  imports: [RouterLink],
  template: `
    @if (linked()) {
      <a class="logo" [class.logo--sm]="size() === 'sm'" routerLink="/" aria-label="CANJEA, ir al inicio">
        <span class="logo__mark" aria-hidden="true">
          <svg viewBox="0 0 512 512" width="100%" height="100%">
            <rect width="512" height="512" rx="116" fill="#070609" />
            <g transform="translate(64 64) scale(16)" fill="none" stroke="#C9FF3D" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m17 2 4 4-4 4" />
              <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
              <path d="m7 22-4-4 4-4" />
              <path d="M21 13v1a4 4 0 0 1-4 4H3" />
            </g>
            <circle cx="392" cy="120" r="20" fill="#FF4D8D" />
          </svg>
        </span>
        @if (!compact()) {
          <span class="logo__word">CANJEA<span class="logo__dot">.</span></span>
        }
      </a>
    } @else {
      <span class="logo" [class.logo--sm]="size() === 'sm'">
        <span class="logo__mark" aria-hidden="true">
          <svg viewBox="0 0 512 512" width="100%" height="100%">
            <rect width="512" height="512" rx="116" fill="#070609" />
            <g transform="translate(64 64) scale(16)" fill="none" stroke="#C9FF3D" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m17 2 4 4-4 4" />
              <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
              <path d="m7 22-4-4 4-4" />
              <path d="M21 13v1a4 4 0 0 1-4 4H3" />
            </g>
            <circle cx="392" cy="120" r="20" fill="#FF4D8D" />
          </svg>
        </span>
        @if (!compact()) {
          <span class="logo__word">CANJEA<span class="logo__dot">.</span></span>
        }
      </span>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .logo {
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        color: var(--paper);
      }
      .logo__mark {
        display: block;
        width: 38px;
        height: 38px;
        border-radius: 9px;
        overflow: hidden;
        flex: 0 0 auto;
        box-shadow: 0 0 0 1px rgba(244, 240, 230, 0.12);
      }
      .logo__word {
        font-family: var(--font-sans);
        font-weight: 700;
        font-size: 1.32rem;
        letter-spacing: 0.04em;
        line-height: 1;
        text-transform: uppercase;
      }
      .logo__dot {
        color: var(--lime);
      }
      .logo--sm .logo__mark {
        width: 30px;
        height: 30px;
        border-radius: 7px;
      }
      .logo--sm .logo__word {
        font-size: 1.05rem;
      }
    `,
  ],
})
export class LogoComponent {
  readonly compact = input(false);
  readonly linked = input(true);
  readonly size = input<'sm' | 'md'>('md');
}

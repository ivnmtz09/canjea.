import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastHostComponent } from './shared/toast-host.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastHostComponent],
  template: `
    <a class="skip-link" href="#contenido">Saltar al contenido</a>
    <router-outlet />
    <app-toast-host />
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100dvh;
      }
      .skip-link {
        position: fixed;
        left: 16px;
        top: -80px;
        z-index: 500;
        padding: 10px 16px;
        border-radius: 999px;
        background: var(--lime);
        color: var(--ink);
        font-family: var(--font-mono);
        font-size: 0.7rem;
        font-weight: 600;
        text-decoration: none;
        transition: top 0.2s var(--ease);
      }
      .skip-link:focus {
        top: 16px;
      }
    `,
  ],
})
export class App {}

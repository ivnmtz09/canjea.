import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toast-host',
  imports: [IconComponent],
  template: `
    <div class="toasts" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class]="'toast--' + toast.type">
          <span class="toast__icon">
            <app-icon [name]="toast.type === 'success' ? 'circle-check' : toast.type === 'error' ? 'alert-circle' : 'info'" [size]="18" />
          </span>
          <div class="toast__body">
            <p class="toast__title">{{ toast.title }}</p>
            @if (toast.message) {
              <p class="toast__msg">{{ toast.message }}</p>
            }
          </div>
          <button class="toast__close" type="button" (click)="toasts.dismiss(toast.id)" aria-label="Cerrar aviso">
            <app-icon name="x" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toasts {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 300;
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: min(380px, calc(100vw - 32px));
        pointer-events: none;
      }
      .toast {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 14px 14px 14px 12px;
        background: #14111b;
        border: 1px solid var(--line-strong);
        border-left: 3px solid var(--line-strong);
        border-radius: var(--radius);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
        pointer-events: auto;
        animation: rise 0.32s var(--ease);
      }
      .toast--success {
        border-left-color: var(--lime);
      }
      .toast--error {
        border-left-color: var(--danger);
      }
      .toast--info {
        border-left-color: var(--violet);
      }
      .toast__icon {
        color: var(--muted);
        margin-top: 1px;
      }
      .toast--success .toast__icon {
        color: var(--lime);
      }
      .toast--error .toast__icon {
        color: var(--danger);
      }
      .toast--info .toast__icon {
        color: #b3a2ff;
      }
      .toast__body {
        flex: 1;
        min-width: 0;
      }
      .toast__title {
        font-size: 0.87rem;
        font-weight: 600;
      }
      .toast__msg {
        margin-top: 2px;
        font-size: 0.78rem;
        color: var(--muted);
        line-height: 1.4;
      }
      .toast__close {
        border: 0;
        background: transparent;
        color: var(--muted-2);
        cursor: pointer;
        padding: 2px;
      }
      .toast__close:hover {
        color: var(--paper);
      }
      @media (max-width: 640px) {
        .toasts {
          right: 12px;
          bottom: 82px;
          left: 12px;
          width: auto;
        }
      }
      @keyframes rise {
        from {
          opacity: 0;
          transform: translateY(14px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);
}

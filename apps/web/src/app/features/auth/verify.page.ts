import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { FieldErrorComponent } from '../../shared/field-error.component';
import { IconComponent } from '../../shared/icon.component';
import { AuthFrameComponent } from './auth-frame.component';

@Component({
  selector: 'app-verify-page',
  imports: [ReactiveFormsModule, RouterLink, AuthFrameComponent, IconComponent, FieldErrorComponent],
  template: `
    <app-auth-frame
      eyebrow="Último paso"
      title="Confirma que eres tú."
      subtitle="Enviamos un código de 6 dígitos a tu correo. Con eso habilitas publicar, negociar y mover dinero."
      quote="Un correo verificado es una puerta que se abre. Lo demás se gana negociando."
      quoteBy="Manifiesto CANJEA · 04"
    >
      <div class="verify-head">
        <span class="verify-head__icon"><app-icon name="mail" [size]="22" /></span>
        <div>
          <p class="mono">Código enviado a</p>
          <strong>{{ auth.user()?.email ?? 'tu correo' }}</strong>
        </div>
      </div>

      @if (auth.verified()) {
        <div class="alert">
          <app-icon name="circle-check" [size]="17" />
          <div><strong>Tu correo ya está verificado.</strong> Puedes entrar a publicar y negociar.</div>
        </div>
        <a class="btn btn--primary btn--block" routerLink="/app">
          Ir a mi panel <app-icon name="arrow-right" [size]="16" />
        </a>
      } @else {
        @if (auth.lastDevCode(); as devCode) {
          <div class="devcode">
            <div class="devcode__head">
              <span class="mono"><app-icon name="terminal" [size]="13" /> modo demo</span>
              <span class="devcode__hint">código de desarrollo</span>
            </div>
            <div class="devcode__row">
              <code>{{ devCode }}</code>
              <button class="btn btn--soft btn--sm" type="button" (click)="useDevCode(devCode)">Usar código</button>
            </div>
            <p class="hint">
              En producción este código llega por correo. En la demo se muestra aquí y en la consola del API.
            </p>
          </div>
        }

        @if (error()) {
          <div class="alert alert--danger" role="alert">
            <app-icon name="alert-circle" [size]="17" />
            <div>{{ error() }}</div>
          </div>
        }

        <form class="stack stack-4" (ngSubmit)="submit()" novalidate>
          <label class="field">
            <span class="label">Código de verificación</span>
            <input
              class="input auth-code-input"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="000000"
              [formControl]="code"
              [attr.aria-invalid]="code.invalid && code.touched"
              (input)="onlyDigits($event)"
            />
            <app-field-error [control]="code" />
          </label>

          <button class="btn btn--primary btn--block" type="submit" [disabled]="busy()">
            @if (busy()) {
              <span class="spinner"></span> Verificando…
            } @else {
              Verificar mi correo <app-icon name="check" [size]="16" />
            }
          </button>
        </form>

        <div class="resend">
          <span class="hint">¿No te llegó?</span>
          <button class="link-btn" type="button" [disabled]="busy() || cooldown() > 0" (click)="resend()">
            @if (cooldown() > 0) {
              Reintentar en {{ cooldown() }}s
            } @else {
              Reenviar código
            }
          </button>
        </div>
      }

      <p class="auth__switch">
        ¿Correo equivocado?
        <a routerLink="/app/perfil">Cámbialo en tu perfil</a>
      </p>
    </app-auth-frame>
  `,
  styles: [
    `
      .verify-head {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: rgba(244, 240, 230, 0.02);
      }
      .verify-head__icon {
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 1px solid rgba(201, 255, 61, 0.35);
        background: var(--lime-soft);
        color: var(--lime);
        flex: 0 0 auto;
      }
      .verify-head .mono {
        font-size: 0.54rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--muted-2);
      }
      .verify-head strong {
        font-size: 0.88rem;
        font-weight: 500;
        overflow-wrap: anywhere;
      }
      .devcode {
        display: grid;
        gap: 9px;
        padding: 12px;
        border: 1px dashed rgba(201, 255, 61, 0.4);
        border-radius: var(--radius-sm);
        background: rgba(201, 255, 61, 0.035);
      }
      .devcode__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.7rem;
      }
      .devcode__head .mono {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 0.52rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--lime);
      }
      .devcode__hint {
        font-size: 0.66rem;
        color: var(--muted-2);
      }
      .devcode__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .devcode code {
        font-family: var(--font-mono);
        font-size: 1.45rem;
        letter-spacing: 0.34em;
        color: var(--lime);
      }
      .devcode .hint {
        font-size: 0.67rem;
      }
      .resend {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .resend .link-btn:disabled {
        color: var(--muted-2);
        cursor: default;
        text-decoration: none;
      }
    `,
  ],
})
export class VerifyPage implements OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly code = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly cooldown = signal(0);
  private timer?: ReturnType<typeof setInterval>;

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  protected onlyDigits(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/\D/g, '').slice(0, 6);
    if (clean !== input.value) input.value = clean;
    this.code.setValue(clean);
  }

  protected useDevCode(value: string): void {
    this.code.setValue(value);
    this.code.markAsTouched();
  }

  protected resend(): void {
    this.error.set(null);
    this.busy.set(true);
    this.auth.resendCode().subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Código reenviado', 'Revisa tu correo o el bloque de demo.');
        this.startCooldown();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }

  protected submit(): void {
    this.error.set(null);
    if (this.code.invalid) {
      this.code.markAsTouched();
      return;
    }
    this.busy.set(true);
    this.auth.verifyEmail(this.code.value).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Correo verificado', 'Ya puedes publicar y cerrar canjes.');
        void this.router.navigate(['/app']);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }

  private startCooldown(): void {
    this.cooldown.set(45);
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.cooldown.update((value) => {
        if (value <= 1) {
          if (this.timer) clearInterval(this.timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  }
}

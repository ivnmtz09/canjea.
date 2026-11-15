import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { FieldErrorComponent } from '../../shared/field-error.component';
import { IconComponent } from '../../shared/icon.component';
import { AuthFrameComponent } from './auth-frame.component';

@Component({
  selector: 'app-forgot-page',
  imports: [ReactiveFormsModule, RouterLink, AuthFrameComponent, IconComponent, FieldErrorComponent],
  template: `
    <app-auth-frame
      eyebrow="Recuperación"
      title="Vuelve a tu cuenta."
      subtitle="Escribe el correo con el que te registraste. Te enviamos un código para crear una contraseña nueva."
      quote="Perder la llave no cierra la puerta. Solo pide caminar de otra forma."
      quoteBy="Manifiesto CANJEA · 05"
    >
      @if (sent()) {
        <div class="alert">
          <app-icon name="mail" [size]="17" />
          <div>
            <strong>Revisa tu correo.</strong> Si la dirección existe, el código ya va en camino. Vence en 15 minutos.
          </div>
        </div>

        @if (devCode(); as code) {
          <div class="devcode">
            <span class="mono">código de desarrollo</span>
            <strong>{{ code }}</strong>
            <p class="hint">La demo lo muestra aquí; en producción solo llega por correo.</p>
          </div>
        }

        <a class="btn btn--primary btn--block" [routerLink]="['/restablecer']" [queryParams]="{ email: form.controls.email.value, code: devCode() }">
          Escribir nueva contraseña <app-icon name="arrow-right" [size]="16" />
        </a>

        <button class="link-btn center" type="button" (click)="sent.set(false)">Usar otro correo</button>
      } @else {
        @if (error()) {
          <div class="alert alert--danger" role="alert">
            <app-icon name="alert-circle" [size]="17" />
            <div>{{ error() }}</div>
          </div>
        }

        <form class="stack stack-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label class="field">
            <span class="label">Correo electrónico <span class="req">*</span></span>
            <input
              class="input"
              type="email"
              formControlName="email"
              autocomplete="email"
              inputmode="email"
              placeholder="tunombre@correo.com"
              [attr.aria-invalid]="form.controls.email.invalid && form.controls.email.touched"
            />
            <app-field-error [control]="form.controls.email" />
          </label>

          <button class="btn btn--primary btn--block" type="submit" [disabled]="busy()">
            @if (busy()) {
              <span class="spinner"></span> Enviando…
            } @else {
              Enviar código <app-icon name="send" [size]="15" />
            }
          </button>
        </form>

        <p class="auth__switch">
          ¿Ya recordaste tu contraseña?
          <a routerLink="/entrar">Entra aquí</a>
        </p>
      }
    </app-auth-frame>
  `,
  styles: [
    `
      .devcode {
        display: grid;
        gap: 3px;
        padding: 12px;
        border: 1px dashed rgba(201, 255, 61, 0.4);
        border-radius: var(--radius-sm);
        background: rgba(201, 255, 61, 0.035);
      }
      .devcode .mono {
        font-size: 0.52rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--lime);
      }
      .devcode strong {
        font-family: var(--font-mono);
        font-size: 1.5rem;
        letter-spacing: 0.32em;
        color: var(--lime);
      }
      .devcode .hint {
        font-size: 0.67rem;
      }
      .center {
        text-align: center;
        justify-self: center;
      }
    `,
  ],
})
export class ForgotPage {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly sent = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly devCode = signal<string | null>(null);
  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.auth.forgotPassword(this.form.controls.email.value.trim().toLowerCase()).subscribe({
      next: (result) => {
        this.busy.set(false);
        this.sent.set(true);
        if (result.devCode) this.devCode.set(result.devCode);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}

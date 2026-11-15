import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { FieldErrorComponent } from '../../shared/field-error.component';
import { IconComponent } from '../../shared/icon.component';
import { PasswordStrengthComponent } from '../../shared/password-strength.component';
import { AuthFrameComponent } from './auth-frame.component';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.parent?.get('password')?.value;
  if (!password) return null;
  return password === control.value ? null : { mismatch: true };
}

@Component({
  selector: 'app-reset-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthFrameComponent,
    IconComponent,
    FieldErrorComponent,
    PasswordStrengthComponent,
  ],
  template: `
    <app-auth-frame
      eyebrow="Nueva contraseña"
      title="Cierra la puerta vieja."
      subtitle="Usa el código que llegó a tu correo y elige una contraseña que no hayas usado antes."
      quote="Cambiar la llave también es cuidar lo que hay adentro."
      quoteBy="Manifiesto CANJEA · 06"
    >
      <form class="stack stack-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (error()) {
          <div class="alert alert--danger" role="alert">
            <app-icon name="alert-circle" [size]="17" />
            <div>{{ error() }}</div>
          </div>
        }

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

        <label class="field">
          <span class="label">Código de 6 dígitos <span class="req">*</span></span>
          <input
            class="input auth-code-input"
            type="text"
            formControlName="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="000000"
            [attr.aria-invalid]="form.controls.code.invalid && form.controls.code.touched"
          />
          <app-field-error [control]="form.controls.code" />
          <p class="hint">¿No lo tienes? <a class="link-btn" routerLink="/recuperar">Pide otro código</a></p>
        </label>

        <label class="field">
          <span class="label">Contraseña nueva <span class="req">*</span></span>
          <input
            class="input"
            [type]="reveal() ? 'text' : 'password'"
            formControlName="password"
            autocomplete="new-password"
            placeholder="Mínimo 10 caracteres"
            [attr.aria-invalid]="form.controls.password.invalid && form.controls.password.touched"
          />
          <app-field-error [control]="form.controls.password" />
          @if (form.controls.password.value) {
            <app-password-strength [password]="form.controls.password.value" />
          }
        </label>

        <label class="field">
          <span class="label">Repite la contraseña <span class="req">*</span></span>
          <input
            class="input"
            [type]="reveal() ? 'text' : 'password'"
            formControlName="confirm"
            autocomplete="new-password"
            placeholder="Otra vez"
            [attr.aria-invalid]="form.controls.confirm.invalid && form.controls.confirm.touched"
          />
          <app-field-error [control]="form.controls.confirm" />
        </label>

        <label class="check">
          <input type="checkbox" [checked]="reveal()" (change)="reveal.set(!reveal())" />
          <span>Mostrar contraseñas</span>
        </label>

        <button class="btn btn--primary btn--block" type="submit" [disabled]="busy()">
          @if (busy()) {
            <span class="spinner"></span> Guardando…
          } @else {
            Guardar contraseña <app-icon name="check" [size]="16" />
          }
        </button>

        <p class="auth__switch">
          <a routerLink="/entrar">Volver a entrar</a>
        </p>
      </form>
    </app-auth-frame>
  `,
  styles: [
    `
      .hint a {
        color: var(--lime);
      }
    `,
  ],
})
export class ResetPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly reveal = signal(false);

  protected readonly form = this.fb.group({
    email: [this.route.snapshot.queryParamMap.get('email') ?? '', [Validators.required, Validators.email]],
    code: [this.route.snapshot.queryParamMap.get('code') ?? '', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    password: ['', [Validators.required, Validators.minLength(10)]],
    confirm: ['', [Validators.required, passwordsMatch]],
  });

  constructor() {
    this.form.controls.password.valueChanges.subscribe(() => {
      this.form.controls.confirm.updateValueAndValidity({ emitEvent: false });
    });
  }

  protected submit(): void {
    this.error.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.busy.set(true);
    this.auth.resetPassword(value.email.trim().toLowerCase(), value.code, value.password).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Contraseña actualizada', 'Entra con tu nueva contraseña.');
        void this.router.navigate(['/entrar']);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}

import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toApiError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { FieldErrorComponent } from '../../shared/field-error.component';
import { IconComponent } from '../../shared/icon.component';
import { PasswordStrengthComponent } from '../../shared/password-strength.component';
import { AuthFrameComponent } from './auth-frame.component';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.parent?.get('password')?.value;
  if (!password) return null;
  return password === control.value ? null : { mismatch: true };
}

type RegisterForm = {
  email: AbstractControl;
  password: AbstractControl;
  confirm: AbstractControl;
  displayName: AbstractControl;
  username: AbstractControl;
  city: AbstractControl;
  country: AbstractControl;
  acceptedTerms: AbstractControl;
  ageConfirmed: AbstractControl;
};

function strongPassword(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (!value) return null;
  if (value.length < 10) return { minlength: { requiredLength: 10, actualLength: value.length } };
  if (!/[A-Z]/.test(value)) return { server: 'Incluye al menos una mayúscula' };
  if (!/[a-z]/.test(value)) return { server: 'Incluye al menos una minúscula' };
  if (!/[0-9]/.test(value)) return { server: 'Incluye al menos un número' };
  if (!/[^A-Za-z0-9]/.test(value)) return { server: 'Incluye al menos un símbolo' };
  if (/\s/.test(value)) return { server: 'No uses espacios en la contraseña' };
  return null;
}

@Component({
  selector: 'app-register-page',
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
      eyebrow="Nueva cuenta"
      title="Hazte un lugar."
      subtitle="Tres pasos, datos claros y una contraseña que aguante. Después, publica lo que tienes."
      quote="La identidad es la primera moneda. Sin confianza, no hay intercambio."
      quoteBy="Manifiesto CANJEA · 03"
    >
      <div class="steps" aria-label="Progreso del registro">
        @for (item of stepLabels; track item.n; let i = $index) {
          <div class="step" [class.is-on]="step() === item.n" [class.is-done]="step() > item.n">
            <span class="step__n mono">0{{ item.n }}</span>
            <span class="step__label">{{ item.label }}</span>
            @if (i < 2) {
              <span class="step__line" aria-hidden="true"></span>
            }
          </div>
        }
      </div>

      <form class="stack stack-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (error()) {
          <div class="alert alert--danger" role="alert">
            <app-icon name="alert-circle" [size]="17" />
            <div><strong>Revisa los datos.</strong> {{ error() }}</div>
          </div>
        }

        @if (step() === 1) {
          <div class="step-copy">
            <p class="eyebrow eyebrow--plain">Paso 01 — Acceso</p>
            <h2>Lo que te identifica</h2>
            <p class="hint">Tu correo se verifica con un código. Nada de spam: solo el código y avisos de canje.</p>
          </div>

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
            <span class="label">Contraseña <span class="req">*</span></span>
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
              placeholder="Otra vez, para estar seguros"
              [attr.aria-invalid]="form.controls.confirm.invalid && form.controls.confirm.touched"
            />
            <app-field-error [control]="form.controls.confirm" />
          </label>

          <label class="check">
            <input type="checkbox" [checked]="reveal()" (change)="reveal.set(!reveal())" />
            <span>Mostrar contraseñas mientras escribo</span>
          </label>
        }

        @if (step() === 2) {
          <div class="step-copy">
            <p class="eyebrow eyebrow--plain">Paso 02 — Identidad</p>
            <h2>Cómo te verá el mercado</h2>
            <p class="hint">Tu usuario es único y aparece en tu perfil público. El nombre es el que verán al negociar.</p>
          </div>

          <label class="field">
            <span class="label">Nombre visible <span class="req">*</span></span>
            <input
              class="input"
              type="text"
              formControlName="displayName"
              autocomplete="name"
              placeholder="Luna Vega"
              [attr.aria-invalid]="form.controls.displayName.invalid && form.controls.displayName.touched"
            />
            <app-field-error [control]="form.controls.displayName" />
          </label>

          <label class="field">
            <span class="label">Usuario <span class="req">*</span></span>
            <div class="handle">
              <span class="handle__prefix mono">canjea.app/u/</span>
              <input
                class="input"
                type="text"
                formControlName="username"
                autocomplete="username"
                spellcheck="false"
                placeholder="luna"
                (blur)="checkUsername()"
                [attr.aria-invalid]="form.controls.username.invalid && form.controls.username.touched"
              />
              @if (checking()) {
                <span class="spinner spinner--light handle__spin"></span>
              } @else if (usernameAvailable()) {
                <app-icon class="handle__ok" name="circle-check" [size]="17" />
              }
            </div>
            <app-field-error [control]="form.controls.username" />
            <p class="hint">3 a 20 caracteres. Solo letras, números y guion bajo.</p>
          </label>

          <div class="form-grid">
            <label class="field">
              <span class="label">Ciudad <span class="req">*</span></span>
              <input
                class="input"
                type="text"
                formControlName="city"
                autocomplete="address-level2"
                placeholder="Ciudad de México"
                [attr.aria-invalid]="form.controls.city.invalid && form.controls.city.touched"
              />
              <app-field-error [control]="form.controls.city" />
            </label>

            <label class="field">
              <span class="label">País <span class="req">*</span></span>
              <select class="select" formControlName="country">
                @for (country of countries; track country.code) {
                  <option [value]="country.code">{{ country.name }}</option>
                }
              </select>
              <app-field-error [control]="form.controls.country" />
            </label>
          </div>
        }

        @if (step() === 3) {
          <div class="step-copy">
            <p class="eyebrow eyebrow--plain">Paso 03 — Reglas</p>
            <h2>Antes de entrar</h2>
            <p class="hint">CANJEA es para personas reales. Estas dos casillas no son decorativas: habilitan tu cuenta.</p>
          </div>

          <div class="summary">
            <div class="summary__row">
              <span class="mono">Correo</span>
              <strong>{{ form.controls.email.value }}</strong>
            </div>
            <div class="summary__row">
              <span class="mono">Usuario</span>
              <strong>{{ '@' + (form.controls.username.value || '—') }}</strong>
            </div>
            <div class="summary__row">
              <span class="mono">Ubicación</span>
              <strong>{{ form.controls.city.value || '—' }}, {{ form.controls.country.value }}</strong>
            </div>
            <div class="summary__row">
              <span class="mono">Nombre</span>
              <strong>{{ form.controls.displayName.value || '—' }}</strong>
            </div>
          </div>

          <label class="check">
            <input type="checkbox" formControlName="ageConfirmed" />
            <span>Confirmo que tengo 18 años o más y que puedo celebrar intercambios por mi cuenta.</span>
          </label>
          <app-field-error [control]="form.controls.ageConfirmed" />

          <label class="check">
            <input type="checkbox" formControlName="acceptedTerms" />
            <span>
              Acepto los <a routerLink="/legal/terminos" target="_blank">términos de uso</a> y la
              <a routerLink="/legal/privacidad" target="_blank">política de privacidad</a>, incluida la comisión del 5%
              cuando haya dinero involucrado.
            </span>
          </label>
          <app-field-error [control]="form.controls.acceptedTerms" />

          <div class="alert">
            <app-icon name="shield-check" [size]="17" />
            <div>
              <strong>Tu contraseña se guarda cifrada.</strong> Nunca la compartimos. El dinero de la demo es simulado y
              queda en garantía al aceptar un canje.
            </div>
          </div>
        }

        <div class="actions">
          @if (step() > 1) {
            <button class="btn btn--ghost" type="button" (click)="back()">
              <app-icon name="arrow-left" [size]="15" /> Atrás
            </button>
          }

          @if (step() < 3) {
            <button class="btn btn--primary grow" type="button" (click)="next()">
              Continuar <app-icon name="arrow-right" [size]="16" />
            </button>
          } @else {
            <button class="btn btn--primary grow" type="submit" [disabled]="auth.busy()">
              @if (auth.busy()) {
                <span class="spinner"></span> Creando cuenta…
              } @else {
                Crear mi cuenta <app-icon name="arrow-right" [size]="16" />
              }
            </button>
          }
        </div>

        <p class="auth__switch">
          ¿Ya tienes cuenta?
          <a routerLink="/entrar">Entra aquí</a>
        </p>
      </form>
    </app-auth-frame>
  `,
  styles: [
    `
      .steps {
        display: flex;
        align-items: center;
        gap: 0;
        margin-bottom: 0.4rem;
      }
      .step {
        display: flex;
        align-items: center;
        gap: 7px;
        flex: 1;
        min-width: 0;
        color: var(--muted-2);
      }
      .step__n {
        font-size: 0.56rem;
        letter-spacing: 0.08em;
        color: var(--muted-2);
      }
      .step__label {
        font-family: var(--font-mono);
        font-size: 0.55rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .step__line {
        flex: 1;
        height: 1px;
        background: var(--line);
        margin-inline: 8px;
      }
      .step.is-on {
        color: var(--lime);
      }
      .step.is-on .step__n {
        color: var(--ink);
        background: var(--lime);
        padding: 2px 4px;
        border-radius: 3px;
      }
      .step.is-done {
        color: var(--paper-dim);
      }
      .step.is-done .step__n {
        color: var(--lime);
      }
      .step-copy {
        display: grid;
        gap: 5px;
        padding-bottom: 2px;
      }
      .step-copy h2 {
        font-size: 1.25rem;
        letter-spacing: -0.03em;
      }
      .handle {
        position: relative;
        display: flex;
        align-items: center;
        border: 1px solid var(--line-strong);
        border-radius: var(--radius-sm);
        background: var(--ink);
        overflow: hidden;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .handle:focus-within {
        border-color: var(--lime);
        box-shadow: 0 0 0 3px rgba(201, 255, 61, 0.12);
      }
      .handle__prefix {
        padding-left: 0.8rem;
        font-size: 0.6rem;
        color: var(--muted-2);
        white-space: nowrap;
      }
      .handle .input {
        border: 0;
        background: transparent;
        box-shadow: none;
        padding-left: 0.25rem;
      }
      .handle .input:focus {
        box-shadow: none;
      }
      .handle__ok {
        color: var(--lime);
        margin-right: 0.7rem;
      }
      .handle__spin {
        margin-right: 0.7rem;
      }
      .summary {
        display: grid;
        gap: 0;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: rgba(244, 240, 230, 0.02);
        overflow: hidden;
      }
      .summary__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 8px 12px;
        border-bottom: 1px solid var(--line);
        font-size: 0.8rem;
      }
      .summary__row:last-child {
        border-bottom: 0;
      }
      .summary__row .mono {
        font-size: 0.55rem;
        color: var(--muted-2);
      }
      .summary__row strong {
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .actions {
        display: flex;
        gap: 10px;
        align-items: center;
        padding-top: 4px;
      }
      .form-grid {
        gap: 0.9rem;
      }
    `,
  ],
})
export class RegisterPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly step = signal(1);
  protected readonly reveal = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly checking = signal(false);
  protected readonly usernameAvailable = signal(false);
  protected readonly stepLabels = [
    { n: 1, label: 'Acceso' },
    { n: 2, label: 'Perfil' },
    { n: 3, label: 'Reglas' },
  ];

  protected readonly countries = [
    { code: 'MX', name: 'México' },
    { code: 'AR', name: 'Argentina' },
    { code: 'CO', name: 'Colombia' },
    { code: 'CL', name: 'Chile' },
    { code: 'PE', name: 'Perú' },
    { code: 'ES', name: 'España' },
    { code: 'US', name: 'Estados Unidos' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'GT', name: 'Guatemala' },
  ];

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    password: ['', [Validators.required, strongPassword]],
    confirm: ['', [Validators.required, passwordsMatch]],
    displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20),
        Validators.pattern(/^[a-zA-Z0-9_]+$/),
      ],
    ],
    city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    country: ['MX', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
    acceptedTerms: [false, [Validators.requiredTrue]],
    ageConfirmed: [false, [Validators.requiredTrue]],
  });

  private readonly stepFields: Record<number, (keyof RegisterForm)[]> = {
    1: ['email', 'password', 'confirm'],
    2: ['displayName', 'username', 'city', 'country'],
    3: ['ageConfirmed', 'acceptedTerms'],
  };

  constructor() {
    this.form.controls.password.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.form.controls.confirm.updateValueAndValidity({ emitEvent: false });
    });
    this.form.controls.username.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.usernameAvailable.set(false);
      const control = this.form.controls.username;
      if (control.errors && Object.keys(control.errors).length === 1 && control.errors['usernameTaken']) {
        control.setErrors(null);
      }
    });
  }

  protected readonly currentStepLabel = computed(() => this.stepLabels[this.step() - 1]?.label ?? '');

  protected next(): void {
    this.error.set(null);
    const fields = this.stepFields[this.step()] ?? [];
    let valid = true;
    for (const field of fields) {
      const control = this.form.controls[field];
      control.markAsTouched();
      if (control.invalid) valid = false;
    }
    if (!valid) return;
    if (this.step() === 2) this.checkUsername(true);
    this.step.update((value) => Math.min(3, value + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected back(): void {
    this.step.update((value) => Math.max(1, value - 1));
  }

  protected checkUsername(force = false): void {
    const control = this.form.controls.username;
    const value = control.value.trim();
    if (value.length < 3 || control.invalid) return;
    if (!force && this.usernameAvailable()) return;
    this.checking.set(true);
    this.auth.checkUsername(value).subscribe({
      next: (result) => {
        this.checking.set(false);
        this.usernameAvailable.set(result.available);
        if (!result.available) control.setErrors({ ...(control.errors ?? {}), usernameTaken: true });
      },
      error: () => this.checking.set(false),
    });
  }

  protected submit(): void {
    this.error.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      if (this.form.controls.email.invalid) this.step.set(1);
      else if (this.form.controls.username.invalid) this.step.set(2);
      else this.step.set(3);
      return;
    }
    const value = this.form.getRawValue();
    this.auth
      .register({
        email: value.email.trim().toLowerCase(),
        password: value.password,
        displayName: value.displayName.trim(),
        username: value.username.trim().toLowerCase(),
        city: value.city.trim(),
        country: value.country.toUpperCase(),
        acceptedTerms: value.acceptedTerms,
        ageConfirmed: value.ageConfirmed,
      })
      .subscribe({
        next: () => void this.router.navigate(['/verificar']),
        error: (err) => {
          const apiError = toApiError(err);
          this.error.set(apiError.message);
          if (apiError.details?.['email']) this.form.controls.email.setErrors({ server: apiError.details['email'] });
          if (apiError.details?.['username']) {
            this.form.controls.username.setErrors({ server: apiError.details['username'] });
            this.step.set(2);
          }
        },
      });
  }
}

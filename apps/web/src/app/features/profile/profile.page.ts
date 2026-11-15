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
import { ROLE_LABELS, formatDate, initials } from '../../core/format';
import { mediaUrl } from '../../core/media';
import { ToastService } from '../../core/toast.service';
import { FieldErrorComponent } from '../../shared/field-error.component';
import { IconComponent } from '../../shared/icon.component';
import { PasswordStrengthComponent } from '../../shared/password-strength.component';

function passwordMatches(control: AbstractControl): ValidationErrors | null {
  const password = control.parent?.get('password')?.value;
  if (!password) return null;
  return password === control.value ? null : { mismatch: true };
}

function strongPassword(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (!value) return null;
  if (value.length < 10) return { minlength: { requiredLength: 10, actualLength: value.length } };
  if (!/[A-Z]/.test(value)) return { server: 'Incluye al menos una mayúscula' };
  if (!/[a-z]/.test(value)) return { server: 'Incluye al menos una minúscula' };
  if (!/[0-9]/.test(value)) return { server: 'Incluye al menos un número' };
  if (!/[^A-Za-z0-9]/.test(value)) return { server: 'Incluye al menos un símbolo' };
  if (/\s/.test(value)) return { server: 'No uses espacios' };
  return null;
}

@Component({
  selector: 'app-profile-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    IconComponent,
    FieldErrorComponent,
    PasswordStrengthComponent,
  ],
  template: `
    <header class="page-head">
      <div class="page-head__copy">
        <p class="kicker">Tu identidad</p>
        <h1 class="h1">TU PERFIL,<br /><em class="serif lime">tu reputación.</em></h1>
        <p class="lede">La confianza se construye con datos claros. Mantén tu perfil al día y protege tu cuenta.</p>
      </div>
      <a class="btn btn--ghost btn--sm" [routerLink]="['/u', auth.user()?.username]">
        Ver perfil público <app-icon name="arrow-up-right" [size]="14" />
      </a>
    </header>

    <div class="settings-grid">
      <nav class="settings-nav" aria-label="Secciones del perfil">
        <button
          type="button"
          [class.is-active]="section() === 'perfil'"
          (click)="scrollTo('perfil')"
        >
          <app-icon name="user" [size]="14" /> Perfil público
        </button>
        <button type="button" [class.is-active]="section() === 'seguridad'" (click)="scrollTo('seguridad')">
          <app-icon name="lock" [size]="14" /> Seguridad
        </button>
        <button type="button" [class.is-active]="section() === 'cuenta'" (click)="scrollTo('cuenta')">
          <app-icon name="shield-check" [size]="14" /> Cuenta
        </button>
        <a routerLink="/app/billetera"><app-icon name="wallet" [size]="14" /> Billetera</a>
        <a routerLink="/app/negociaciones"><app-icon name="handshake" [size]="14" /> Negociaciones</a>
      </nav>

      <div class="settings-body">
        <section id="perfil" class="panel settings-section">
          <div class="settings-section__head">
            <h2>Perfil público</h2>
            <p>Así te ven en el mercado y en cada negociación. Tu usuario no se puede cambiar.</p>
          </div>

          <div class="avatar-row">
            <span class="avatar-preview">
              <img [src]="previewUrl()" alt="Vista previa de tu avatar" />
            </span>
            <div class="avatar-row__copy">
              <strong>{{ auth.user()?.displayName }}</strong>
              <span class="mono">&#64;{{ auth.user()?.username }}</span>
              <span class="hint">Elige un avatar generado o pega una URL de imagen.</span>
            </div>
            <span class="badge" [class.badge--lime]="auth.verified()" [class.badge--orange]="!auth.verified()">
              {{ auth.verified() ? 'correo verificado' : 'sin verificar' }}
            </span>
          </div>

          <div class="avatar-picker">
            @for (option of avatarOptions(); track option.seed) {
              <button
                type="button"
                class="avatar-option"
                [class.is-on]="profileForm.controls.avatarUrl.value === option.url"
                (click)="pickAvatar(option.url)"
                [attr.aria-label]="'Usar avatar ' + option.seed"
              >
                <img [src]="option.url" [alt]="''" />
              </button>
            }
          </div>

          @if (profileError()) {
            <div class="alert alert--danger" role="alert">
              <app-icon name="alert-circle" [size]="16" />
              <div>{{ profileError() }}</div>
            </div>
          }

          <form class="form-grid" [formGroup]="profileForm" (ngSubmit)="saveProfile()" novalidate>
            <label class="field">
              <span class="label">Nombre visible <span class="req">*</span></span>
              <input class="input" type="text" formControlName="displayName" autocomplete="name" maxlength="60" />
              <app-field-error [control]="profileForm.controls.displayName" />
            </label>

            <label class="field">
              <span class="label">Usuario</span>
              <input class="input" type="text" [value]="'@' + (auth.user()?.username ?? '')" disabled />
              <span class="hint">El usuario es permanente para no romper enlaces.</span>
            </label>

            <label class="field">
              <span class="label">Ciudad <span class="req">*</span></span>
              <input class="input" type="text" formControlName="city" autocomplete="address-level2" maxlength="80" />
              <app-field-error [control]="profileForm.controls.city" />
            </label>

            <label class="field">
              <span class="label">País <span class="req">*</span></span>
              <select class="select" formControlName="country">
                @for (country of countries; track country.code) {
                  <option [value]="country.code">{{ country.name }}</option>
                }
              </select>
              <app-field-error [control]="profileForm.controls.country" />
            </label>

            <label class="field field--full">
              <span class="label">Biografía</span>
              <textarea
                class="textarea"
                rows="4"
                formControlName="bio"
                maxlength="400"
                placeholder="Qué te gusta intercambiar, qué habilidades tienes, cómo te gusta cerrar tratos…"
              ></textarea>
              <div class="label-row">
                <app-field-error [control]="profileForm.controls.bio" />
                <span class="mono">{{ profileForm.controls.bio.value.length }} / 400</span>
              </div>
            </label>

            <label class="field">
              <span class="label">Teléfono (opcional)</span>
              <input class="input" type="tel" formControlName="phone" autocomplete="tel" maxlength="20" placeholder="+52 55 0000 0000" />
              <app-field-error [control]="profileForm.controls.phone" />
            </label>

            <label class="field">
              <span class="label">Avatar por URL</span>
              <input class="input" type="url" formControlName="avatarUrl" placeholder="/api/media/avatar/tu-seed.svg" />
              <app-field-error [control]="profileForm.controls.avatarUrl" />
            </label>

            <div class="form-actions">
              <a class="btn btn--ghost" [routerLink]="['/u', auth.user()?.username]">Ver cómo se ve</a>
              <button class="btn btn--primary" type="submit" [disabled]="savingProfile()">
                @if (savingProfile()) {
                  <span class="spinner"></span> Guardando…
                } @else {
                  Guardar perfil <app-icon name="check" [size]="15" />
                }
              </button>
            </div>
          </form>
        </section>

        <section id="seguridad" class="panel settings-section">
          <div class="settings-section__head">
            <h2>Seguridad</h2>
            <p>Cambia tu contraseña con frecuencia. Al cambiarla se cierran las sesiones activas.</p>
          </div>

          @if (passwordError()) {
            <div class="alert alert--danger" role="alert">
              <app-icon name="alert-circle" [size]="16" />
              <div>{{ passwordError() }}</div>
            </div>
          }

          @if (passwordDone()) {
            <div class="alert">
              <app-icon name="circle-check" [size]="16" />
              <div><strong>Contraseña actualizada.</strong> Vuelve a entrar con tu nueva contraseña.</div>
            </div>
          }

          <form class="password-grid" [formGroup]="passwordForm" (ngSubmit)="changePassword()" novalidate>
            <label class="field field--full">
              <span class="label">Contraseña actual <span class="req">*</span></span>
              <input
                class="input"
                [type]="reveal() ? 'text' : 'password'"
                formControlName="current"
                autocomplete="current-password"
              />
              <app-field-error [control]="passwordForm.controls.current" />
            </label>

            <label class="field">
              <span class="label">Contraseña nueva <span class="req">*</span></span>
              <input
                class="input"
                [type]="reveal() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="new-password"
              />
              <app-field-error [control]="passwordForm.controls.password" />
            </label>

            <label class="field">
              <span class="label">Repite la nueva <span class="req">*</span></span>
              <input
                class="input"
                [type]="reveal() ? 'text' : 'password'"
                formControlName="confirm"
                autocomplete="new-password"
              />
              <app-field-error [control]="passwordForm.controls.confirm" />
            </label>

            @if (passwordForm.controls.password.value) {
              <div class="field--full">
                <app-password-strength [password]="passwordForm.controls.password.value" />
              </div>
            }

            <label class="check field--full">
              <input type="checkbox" [checked]="reveal()" (change)="reveal.set(!reveal())" />
              <span>Mostrar contraseñas mientras escribo</span>
            </label>

            <div class="form-actions field--full">
              <button class="btn btn--primary" type="submit" [disabled]="savingPassword()">
                @if (savingPassword()) {
                  <span class="spinner"></span> Actualizando…
                } @else {
                  Cambiar contraseña <app-icon name="key" [size]="14" />
                }
              </button>
            </div>
          </form>
        </section>

        <section id="cuenta" class="panel settings-section">
          <div class="settings-section__head">
            <h2>Cuenta</h2>
            <p>Datos de acceso y estado de tu identidad en CANJEA.</p>
          </div>

          <dl class="account-list">
            <div>
              <dt>Correo</dt>
              <dd>
                {{ auth.user()?.email }}
                <span class="badge" [class.badge--lime]="auth.verified()" [class.badge--orange]="!auth.verified()">
                  {{ auth.verified() ? 'verificado' : 'pendiente' }}
                </span>
              </dd>
            </div>
            <div>
              <dt>Usuario</dt>
              <dd>&#64;{{ auth.user()?.username }}</dd>
            </div>
            <div>
              <dt>Rol</dt>
              <dd>{{ roleLabel() }}</dd>
            </div>
            <div>
              <dt>Miembro desde</dt>
              <dd>{{ memberSince() }}</dd>
            </div>
            <div>
              <dt>Calificación</dt>
              <dd>
                <app-icon class="star" name="star" [size]="13" />
                {{ (auth.user()?.ratingAvg ?? 0).toFixed(1) }} · {{ auth.user()?.ratingCount ?? 0 }} reseñas
              </dd>
            </div>
          </dl>

          @if (!auth.verified()) {
            <div class="verify-card">
              <span class="verify-card__icon"><app-icon name="mail" [size]="19" /></span>
              <div>
                <strong>Tu correo aún no está verificado.</strong>
                <span>Verifícalo para publicar, retirar saldo y cerrar canjes con dinero.</span>
              </div>
              <a class="btn btn--lime btn--sm" routerLink="/verificar">Verificar correo</a>
            </div>
          } @else {
            <div class="verify-card verify-card--ok">
              <span class="verify-card__icon"><app-icon name="badge-check" [size]="19" /></span>
              <div>
                <strong>Identidad confirmada.</strong>
                <span>Tu correo está verificado y puedes operar con dinero en garantía.</span>
              </div>
            </div>
          }
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      h1 em {
        font-size: 1.03em;
      }
      .settings-nav button {
        display: flex;
        align-items: center;
        gap: 7px;
        min-height: 40px;
        padding: 0.5rem 0.75rem;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: var(--muted);
        font-size: 0.84rem;
        text-align: left;
        cursor: pointer;
        white-space: nowrap;
      }
      .settings-nav button:hover {
        color: var(--paper);
        background: rgba(243, 239, 230, 0.04);
      }
      .settings-nav button.is-active {
        color: var(--paper);
        background: var(--ink-3);
      }
      .settings-nav a {
        display: flex;
        align-items: center;
        gap: 7px;
        min-height: 40px;
      }
      .settings-body {
        display: grid;
        gap: 1.1rem;
        min-width: 0;
      }
      .settings-section {
        scroll-margin-top: 84px;
      }
      .avatar-row {
        padding-bottom: 1rem;
      }
      .avatar-preview {
        display: grid;
        place-items: center;
        width: 78px;
        height: 78px;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid var(--line-strong);
        background: var(--ink-3);
        flex: 0 0 auto;
      }
      .avatar-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .avatar-row__copy {
        display: grid;
        gap: 0;
        flex: 1;
        min-width: 160px;
      }
      .avatar-row__copy strong {
        font-size: 0.92rem;
      }
      .avatar-row__copy .mono {
        font-size: 0.56rem;
        color: var(--muted-2);
      }
      .avatar-row__copy .hint {
        margin-top: 3px;
      }
      .avatar-picker {
        display: flex;
        gap: 7px;
        flex-wrap: wrap;
        padding-bottom: 1.1rem;
        margin-bottom: 1.1rem;
        border-bottom: 1px solid var(--line);
      }
      .avatar-option {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid var(--line);
        background: var(--ink-3);
        padding: 0;
        cursor: pointer;
        transition: border-color 0.2s ease, transform 0.2s ease;
      }
      .avatar-option:hover {
        transform: translateY(-2px);
        border-color: var(--line-strong);
      }
      .avatar-option.is-on {
        border-color: var(--lime);
        box-shadow: 0 0 0 3px rgba(201, 255, 61, 0.12);
      }
      .avatar-option img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .label-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .label-row .mono {
        font-size: 0.5rem;
        color: var(--muted-2);
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        grid-column: 1 / -1;
        padding-top: 4px;
      }
      .password-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.9rem;
      }
      .field--full {
        grid-column: 1 / -1;
      }
      .account-list {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1px;
        margin: 0 0 1rem;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: var(--line);
        overflow: hidden;
      }
      .account-list > div {
        display: grid;
        gap: 3px;
        padding: 10px 12px;
        background: var(--ink-2);
      }
      .account-list dt {
        font-family: var(--font-mono);
        font-size: 0.52rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .account-list dd {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        margin: 0;
        font-size: 0.82rem;
        color: var(--paper-dim);
        overflow-wrap: anywhere;
      }
      .account-list .badge {
        font-size: 0.48rem;
      }
      .star {
        color: var(--lime);
      }
      .verify-card {
        display: flex;
        align-items: center;
        gap: 11px;
        flex-wrap: wrap;
        padding: 12px;
        border: 1px solid rgba(255, 122, 61, 0.3);
        border-radius: var(--radius-sm);
        background: rgba(255, 122, 61, 0.05);
      }
      .verify-card--ok {
        border-color: rgba(125, 255, 168, 0.25);
        background: rgba(125, 255, 168, 0.04);
      }
      .verify-card__icon {
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: rgba(255, 122, 61, 0.1);
        color: var(--orange);
        flex: 0 0 auto;
      }
      .verify-card--ok .verify-card__icon {
        background: rgba(125, 255, 168, 0.09);
        color: var(--ok);
      }
      .verify-card > div {
        display: grid;
        gap: 1px;
        flex: 1;
        min-width: 200px;
      }
      .verify-card strong {
        font-size: 0.82rem;
      }
      .verify-card span {
        font-size: 0.72rem;
        color: var(--muted);
        line-height: 1.4;
      }
      @media (max-width: 960px) {
        .settings-nav {
          flex-direction: row;
          overflow-x: auto;
          border-bottom: 1px solid var(--line);
          padding-bottom: 0.5rem;
          gap: 6px;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
          scrollbar-width: none;
        }
        .settings-nav::-webkit-scrollbar {
          display: none;
        }
        .settings-nav button,
        .settings-nav a {
          min-height: 44px;
          padding: 0.6rem 0.9rem;
          flex-shrink: 0;
        }
      }
      @media (max-width: 640px) {
        .password-grid,
        .account-list {
          grid-template-columns: 1fr;
        }
        .form-actions {
          flex-direction: column-reverse;
        }
        .form-actions .btn {
          width: 100%;
        }
        .avatar-row {
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class ProfilePage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly section = signal<'perfil' | 'seguridad' | 'cuenta'>('perfil');
  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly profileError = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly passwordDone = signal(false);
  protected readonly reveal = signal(false);

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

  protected readonly profileForm = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    bio: ['', [Validators.maxLength(400)]],
    city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    country: ['MX', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
    phone: ['', [Validators.maxLength(20), Validators.pattern(/^[0-9+()\-\s]*$/)]],
    avatarUrl: ['', [Validators.maxLength(500)]],
  });

  protected readonly passwordForm = this.fb.group({
    current: ['', [Validators.required]],
    password: ['', [Validators.required, strongPassword]],
    confirm: ['', [Validators.required, passwordMatches]],
  });

  protected readonly avatarOptions = computed(() => {
    const username = this.auth.user()?.username ?? 'canjea';
    const label = initials(this.auth.user()?.displayName ?? username);
    return [username, `${username}-2`, `${username}-3`, `${username}-4`, `${username}-5`].map((seed) => ({
      seed,
      url: `/api/media/avatar/${encodeURIComponent(seed)}.svg?n=${encodeURIComponent(label)}`,
    }));
  });

  protected readonly previewUrl = computed(() =>
    mediaUrl(this.profileForm.controls.avatarUrl.value || this.auth.user()?.avatarUrl, this.auth.user()?.username ?? 'canjea'),
  );

  protected readonly roleLabel = computed(() => {
    const role = this.auth.role();
    return role ? (ROLE_LABELS[role] ?? role) : 'Miembro';
  });

  protected readonly memberSince = computed(() => formatDate(this.auth.user()?.createdAt));

  constructor() {
    const user = this.auth.user();
    if (user) {
      this.profileForm.patchValue({
        displayName: user.displayName,
        bio: user.bio ?? '',
        city: user.city,
        country: user.country || 'MX',
        phone: '',
        avatarUrl: user.avatarUrl ?? '',
      });
    }
    this.profileForm.controls.avatarUrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.profileError.set(null));
    this.passwordForm.controls.password.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.passwordForm.controls.confirm.updateValueAndValidity({ emitEvent: false }));
  }

  protected scrollTo(section: 'perfil' | 'seguridad' | 'cuenta'): void {
    this.section.set(section);
    const target = document.getElementById(section);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected pickAvatar(url: string): void {
    this.profileForm.controls.avatarUrl.setValue(url);
  }

  protected saveProfile(): void {
    this.profileError.set(null);
    this.profileForm.markAllAsTouched();
    if (this.profileForm.invalid) return;
    const value = this.profileForm.getRawValue();
    this.savingProfile.set(true);
    this.auth
      .updateProfile({
        displayName: value.displayName.trim(),
        bio: value.bio.trim(),
        city: value.city.trim(),
        country: value.country.toUpperCase(),
        phone: value.phone.trim(),
        avatarUrl: value.avatarUrl.trim(),
      })
      .subscribe({
        next: () => {
          this.savingProfile.set(false);
          this.toast.success('Perfil actualizado', 'Tu información pública ya está al día.');
        },
        error: (error) => {
          this.savingProfile.set(false);
          const apiError = toApiError(error);
          this.profileError.set(apiError.message);
          for (const [field, message] of Object.entries(apiError.details ?? {})) {
            const control = this.profileForm.get(field);
            control?.setErrors({ server: message });
            control?.markAsTouched();
          }
        },
      });
  }

  protected changePassword(): void {
    this.passwordError.set(null);
    this.passwordDone.set(false);
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) return;
    const value = this.passwordForm.getRawValue();
    this.savingPassword.set(true);
    this.auth.changePassword(value.current, value.password).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordDone.set(true);
        this.passwordForm.reset();
        this.toast.success('Contraseña cambiada', 'Vuelve a entrar con tu nueva contraseña.');
        setTimeout(() => void this.router.navigate(['/entrar']), 1400);
      },
      error: (error) => {
        this.savingPassword.set(false);
        this.passwordError.set(toApiError(error).message);
      },
    });
  }
}

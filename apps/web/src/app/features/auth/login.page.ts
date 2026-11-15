import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { errorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { IconComponent } from '../../shared/icon.component';
import { FieldErrorComponent } from '../../shared/field-error.component';
import { AuthFrameComponent } from './auth-frame.component';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, AuthFrameComponent, IconComponent, FieldErrorComponent],
  template: `
    <app-auth-frame
      eyebrow="Bienvenido de vuelta"
      title="Entra a negociar."
      subtitle="Tu mercado, tus canjes y tu billetera siguen donde los dejaste."
      quote="Intercambiar no es perder. Es encontrarle otro destino a lo que ya no usas."
      quoteBy="Manifiesto CANJEA · 02"
    >
      <form class="stack stack-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (error()) {
          <div class="alert alert--danger" role="alert">
            <app-icon name="alert-circle" [size]="17" />
            <div><strong>No pudimos entrar.</strong> {{ error() }}</div>
          </div>
        }

        <label class="field">
          <span class="label">Correo o usuario <span class="req">*</span></span>
          <input
            class="input"
            type="text"
            formControlName="identifier"
            autocomplete="username"
            placeholder="tu@correo.com o @usuario"
            [attr.aria-invalid]="form.controls.identifier.invalid && form.controls.identifier.touched"
          />
          <app-field-error [control]="form.controls.identifier" />
        </label>

        <label class="field">
          <span class="label">Contraseña <span class="req">*</span></span>
          <div class="pwd-wrap">
            <input
              class="input"
              [type]="reveal() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
              placeholder="Tu contraseña"
              [attr.aria-invalid]="form.controls.password.invalid && form.controls.password.touched"
            />
            <button
              class="pwd-toggle"
              type="button"
              (click)="reveal.set(!reveal())"
              [attr.aria-label]="reveal() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            >
              <app-icon [name]="reveal() ? 'eye-off' : 'eye'" [size]="17" />
            </button>
          </div>
          <app-field-error [control]="form.controls.password" />
        </label>

        <div class="row between">
          <label class="check">
            <input type="checkbox" formControlName="remember" />
            <span>Recordarme en este equipo</span>
          </label>
          <a class="link-btn" routerLink="/recuperar">¿Olvidaste tu contraseña?</a>
        </div>

        <button class="btn btn--primary btn--block" type="submit" [disabled]="auth.busy()">
          @if (auth.busy()) {
            <span class="spinner"></span> Entrando…
          } @else {
            Entrar al mercado <app-icon name="arrow-right" [size]="16" />
          }
        </button>

        <div class="divider"><span class="mono">o acceso administrativo</span></div>

        <div class="demo-grid">
          @for (account of demos; track account.email) {
            <button class="demo" type="button" (click)="useDemo(account.email, account.password)">
              <span class="demo__role" [attr.data-role]="account.role">{{ account.role }}</span>
              <span class="demo__mail">{{ account.email }}</span>
              <app-icon name="arrow-up-right" [size]="13" />
            </button>
          }
        </div>

        <p class="auth__switch">
          ¿Todavía no tienes cuenta?
          <a routerLink="/registro">Crea la tuya gratis</a>
        </p>

        <p class="legal mono">
          Al entrar aceptas los <a routerLink="/legal/terminos">términos</a> y la
          <a routerLink="/legal/privacidad">política de privacidad</a>.
        </p>
      </form>
    </app-auth-frame>
  `,
  styles: [
    `
      .pwd-wrap {
        position: relative;
      }
      .pwd-wrap .input {
        padding-right: 3rem;
      }
      .pwd-toggle {
        position: absolute;
        right: 6px;
        top: 50%;
        transform: translateY(-50%);
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: var(--muted);
        cursor: pointer;
      }
      .pwd-toggle:hover {
        color: var(--paper);
        background: rgba(244, 240, 230, 0.05);
      }
      .divider {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--muted-2);
        margin-block: 2px;
      }
      .divider::before,
      .divider::after {
        content: '';
        height: 1px;
        flex: 1;
        background: var(--line);
      }
      .divider .mono {
        font-size: 0.54rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .demo-grid {
        display: grid;
        gap: 7px;
      }
      .demo {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 9px 11px;
        border: 1px dashed var(--line-strong);
        border-radius: var(--radius-sm);
        background: rgba(244, 240, 230, 0.02);
        color: var(--muted);
        font-size: 0.76rem;
        cursor: pointer;
        text-align: left;
        transition: border-color 0.2s ease, background 0.2s ease;
      }
      .demo:hover {
        border-color: var(--lime);
        background: var(--lime-soft);
        color: var(--paper);
      }
      .demo app-icon {
        margin-left: auto;
        color: var(--lime);
      }
      .demo__role {
        font-family: var(--font-mono);
        font-size: 0.54rem;
        letter-spacing: 0.1em;
        padding: 2px 5px;
        border-radius: 4px;
        border: 1px solid var(--line-strong);
        color: var(--muted-2);
      }
      .demo__role[data-role='ADMIN'] {
        color: var(--pink);
        border-color: rgba(255, 77, 141, 0.4);
      }
      .demo__role[data-role='MODERATOR'] {
        color: #b6a4ff;
        border-color: rgba(124, 92, 255, 0.4);
      }
      .demo__role[data-role='USER'] {
        color: var(--lime);
        border-color: rgba(201, 255, 61, 0.35);
      }
      .demo__mail {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .legal {
        text-align: center;
        color: var(--muted-2);
        font-size: 0.52rem;
        letter-spacing: 0.04em;
        line-height: 1.6;
      }
      .legal a {
        color: var(--muted);
      }
      .legal a:hover {
        color: var(--lime);
      }
    `,
  ],
})
export class LoginPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly reveal = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    remember: [true],
  });

  protected readonly demos = [
    { email: 'ivanjmm01@gmail.com', password: '322-520iM.', role: 'ADMIN' },
  ];

  protected readonly redirect = computed(() => this.route.snapshot.queryParamMap.get('redirect') ?? '/app');

  protected useDemo(email: string, password: string): void {
    this.form.patchValue({ identifier: email, password });
    this.form.markAllAsTouched();
  }

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { identifier, password } = this.form.getRawValue();
    this.auth.login(identifier.trim(), password).subscribe({
      next: () => {
        void this.router.navigateByUrl(this.redirect());
      },
      error: (err) => this.error.set(errorMessage(err)),
    });
  }
}

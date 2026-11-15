import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { PwaService } from '../core/pwa.service';
import { AvatarComponent } from './avatar.component';
import { IconComponent } from './icon.component';
import { LogoComponent } from './logo.component';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, LogoComponent, IconComponent, AvatarComponent],
  template: `
    <header class="hdr" [class.is-scrolled]="scrolled()">
      <div class="hdr__inner">
        <app-logo />

        <nav class="hdr__nav" aria-label="Navegación principal">
          <a routerLink="/mercado">Mercado</a>
          <a routerLink="/" fragment="como-funciona">Cómo funciona</a>
          <a routerLink="/" fragment="confianza">Confianza</a>
          @if (pwa.canInstall()) {
            <button class="hdr__install" type="button" (click)="install()">
              <app-icon name="download" [size]="14" /> Instalar
            </button>
          }
        </nav>

        <div class="hdr__actions">
          @if (auth.isAuthenticated()) {
            <a class="hdr__profile" routerLink="/app">
              <app-avatar [user]="auth.user()" size="sm" />
              <span>{{ auth.user()?.displayName }}</span>
            </a>
            <a class="btn btn--lime btn--sm" routerLink="/app">Mi panel <app-icon class="btn__arrow" name="arrow-right" [size]="14" /></a>
          } @else {
            <a class="hdr__login" routerLink="/entrar">Entrar</a>
            <a class="btn btn--lime btn--sm" routerLink="/registro">Crear cuenta <app-icon class="btn__arrow" name="arrow-up-right" [size]="14" /></a>
          }
          <button class="hdr__burger" type="button" (click)="menu.set(!menu())" [attr.aria-expanded]="menu()" aria-label="Abrir menú">
            <app-icon [name]="menu() ? 'x' : 'menu'" [size]="22" />
          </button>
        </div>
      </div>

      @if (menu()) {
        <div class="mobile" role="dialog" aria-label="Menú">
          <nav class="mobile__nav">
            <a routerLink="/mercado" (click)="menu.set(false)">Mercado <app-icon name="arrow-up-right" [size]="18" /></a>
            <a routerLink="/" fragment="como-funciona" (click)="menu.set(false)">Cómo funciona <app-icon name="arrow-up-right" [size]="18" /></a>
            <a routerLink="/" fragment="confianza" (click)="menu.set(false)">Confianza <app-icon name="arrow-up-right" [size]="18" /></a>
            @if (auth.isAuthenticated()) {
              <a routerLink="/app" (click)="menu.set(false)">Mi panel <app-icon name="arrow-up-right" [size]="18" /></a>
              <a routerLink="/app/publicar" (click)="menu.set(false)">Publicar <app-icon name="arrow-up-right" [size]="18" /></a>
            } @else {
              <a routerLink="/entrar" (click)="menu.set(false)">Entrar <app-icon name="arrow-up-right" [size]="18" /></a>
              <a routerLink="/registro" (click)="menu.set(false)">Crear cuenta <app-icon name="arrow-up-right" [size]="18" /></a>
            }
          </nav>
          <p class="mobile__note mono">Intercambia. Negocia. Cobra.</p>
        </div>
      }
    </header>
  `,
  styles: [
    `
      .hdr {
        position: sticky;
        top: 0;
        z-index: 100;
        transition: background 0.3s ease, border-color 0.3s ease;
        border-bottom: 1px solid transparent;
      }
      .hdr.is-scrolled {
        background: rgba(7, 6, 9, 0.78);
        backdrop-filter: blur(18px) saturate(140%);
        border-bottom-color: var(--line);
      }
      .hdr__inner {
        width: min(100% - 40px, 1280px);
        margin-inline: auto;
        height: var(--header-h);
        display: flex;
        align-items: center;
        gap: 1.4rem;
      }
      .hdr__nav {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-left: 1.6rem;
        font-family: var(--font-mono);
        font-size: 0.64rem;
        letter-spacing: 0.13em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .hdr__nav a {
        transition: color 0.2s ease;
      }
      .hdr__nav a:hover {
        color: var(--lime);
      }
      .hdr__install {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border: 0;
        background: transparent;
        color: var(--lime);
        font-family: var(--font-mono);
        font-size: 0.62rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        cursor: pointer;
      }
      .hdr__actions {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 0.9rem;
      }
      .hdr__login {
        font-family: var(--font-mono);
        font-size: 0.64rem;
        letter-spacing: 0.13em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .hdr__login:hover {
        color: var(--paper);
      }
      .hdr__profile {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.8rem;
        color: var(--muted);
      }
      .hdr__profile:hover {
        color: var(--paper);
      }
      .hdr__profile span {
        max-width: 130px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .hdr__burger {
        display: none;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border: 1px solid var(--line);
        border-radius: 50%;
        background: transparent;
        cursor: pointer;
      }
      .mobile {
        position: fixed;
        inset: var(--header-h) 0 auto 0;
        background: rgba(7, 6, 9, 0.98);
        border-bottom: 1px solid var(--line);
        padding: 1.4rem 1.2rem 2rem;
        backdrop-filter: blur(20px);
        animation: rise 0.25s var(--ease);
      }
      .mobile__nav {
        display: grid;
        gap: 0;
      }
      .mobile__nav a {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.95rem 0;
        border-bottom: 1px solid var(--line);
        font-size: 1.35rem;
        letter-spacing: -0.02em;
      }
      .mobile__nav a app-icon {
        color: var(--muted-2);
      }
      .mobile__note {
        margin-top: 1.4rem;
        color: var(--muted-2);
        font-size: 0.58rem;
      }
      @media (max-width: 1020px) {
        .hdr__nav {
          display: none;
        }
        .hdr__burger {
          display: inline-flex;
        }
      }
      @media (max-width: 620px) {
        .hdr__profile span,
        .hdr__login {
          display: none;
        }
        .hdr__actions .btn {
          display: none;
        }
        .hdr__inner {
          width: min(100% - 28px, 1280px);
          gap: 0.6rem;
        }
      }
    `,
  ],
})
export class SiteHeaderComponent {
  protected readonly auth = inject(AuthService);
  protected readonly pwa = inject(PwaService);
  private readonly router = inject(Router);
  protected readonly menu = signal(false);
  protected readonly scrolled = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 12);
  }

  protected install(): void {
    void this.pwa.install();
  }
}

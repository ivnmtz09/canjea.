import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DealService, NotificationService, WalletService } from '../core/data.services';
import { relativeTime } from '../core/format';
import type { Notification } from '../core/models';
import { PwaService } from '../core/pwa.service';
import { ToastService } from '../core/toast.service';
import { AvatarComponent } from '../shared/avatar.component';
import { IconComponent, type IconName } from '../shared/icon.component';
import { LogoComponent } from '../shared/logo.component';

interface NavItem {
  label: string;
  link: string;
  icon: IconName;
  exact?: boolean;
  badge?: 'deals';
  admin?: boolean;
}

@Component({
  selector: 'app-app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LogoComponent, IconComponent, AvatarComponent],
  template: `
    <div class="shell" [class.is-open]="menu()">
      <aside class="sidebar">
        <div class="sidebar__brand">
          <app-logo />
          <button class="sidebar__close" type="button" (click)="menu.set(false)" aria-label="Cerrar menú">
            <app-icon name="x" [size]="18" />
          </button>
        </div>

        <a class="publish" routerLink="/app/publicar" (click)="menu.set(false)">
          <span class="publish__icon"><app-icon name="plus" [size]="18" /></span>
          <span>
            <strong>Publicar algo</strong>
            <small>Oferta o necesidad</small>
          </span>
          <app-icon name="arrow-up-right" [size]="15" />
        </a>

        <nav class="nav" aria-label="Navegación de la app">
          <p class="nav__label mono">Tu cuenta</p>
          @for (item of nav; track item.link) {
            @if (!item.admin || auth.has('stats:read')) {
              <a
                class="nav__item"
                [routerLink]="item.link"
                [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                routerLinkActive="is-active"
                (click)="menu.set(false)"
              >
                <app-icon [name]="item.icon" [size]="17" />
                <span>{{ item.label }}</span>
                @if (item.badge === 'deals' && pendingDeals() > 0) {
                  <span class="nav__pending">{{ pendingDeals() }}</span>
                }
              </a>
            }
          }

          <p class="nav__label mono">Mercado abierto</p>
          <a class="nav__item" routerLink="/mercado" (click)="menu.set(false)">
            <app-icon name="store" [size]="17" />
            <span>Explorar mercado</span>
            <app-icon class="nav__out" name="external" [size]="12" />
          </a>
          <a class="nav__item" routerLink="/" fragment="como-funciona" (click)="menu.set(false)">
            <app-icon name="info" [size]="17" />
            <span>Cómo funciona</span>
          </a>
        </nav>

        <div class="sidebar__foot">
          <a class="wallet-mini" routerLink="/app/billetera" (click)="menu.set(false)">
            <span class="wallet-mini__label mono">Saldo disponible</span>
            <strong>{{ balance() }}</strong>
            @if (escrowCents() > 0) {
              <span class="wallet-mini__escrow mono">{{ escrowLabel() }} en garantía</span>
            }
          </a>

          <div class="user-mini">
            <a class="user-mini__link" routerLink="/app/perfil" (click)="menu.set(false)">
              <app-avatar [user]="auth.user()" size="sm" />
              <span class="user-mini__copy">
                <strong>{{ auth.user()?.displayName }}</strong>
                <small class="mono">{{ roleLabel() }}</small>
              </span>
            </a>
            <button class="user-mini__out" type="button" (click)="logout()" aria-label="Cerrar sesión">
              <app-icon name="log-out" [size]="16" />
            </button>
          </div>
        </div>
      </aside>

      <div class="sidebar-scrim" (click)="menu.set(false)" aria-hidden="true"></div>

      <div class="frame">
        <header class="topbar">
          <button class="topbar__burger" type="button" (click)="menu.set(true)" aria-label="Abrir menú">
            <app-icon name="menu" [size]="20" />
          </button>

          <div class="topbar__crumb">
            <span class="mono">CANJEA</span>
            <app-icon name="chevron-right" [size]="12" />
            <span class="topbar__crumb-title">Mi panel</span>
          </div>

          <div class="topbar__actions">
            @if (pwa.canInstall()) {
              <button class="topbar__install" type="button" (click)="install()">
                <app-icon name="download" [size]="14" /> <span>Instalar app</span>
              </button>
            }
            <a class="topbar__market" routerLink="/mercado">
              <app-icon name="search" [size]="15" /> <span>Buscar en el mercado</span>
              <kbd class="mono">/</kbd>
            </a>
            <button
              class="topbar__bell"
              type="button"
              (click)="toggleNotifications()"
              [attr.aria-expanded]="notificationsOpen()"
              aria-label="Notificaciones"
            >
              <app-icon name="bell" [size]="18" />
              @if (auth.unread() > 0) {
                <span class="topbar__count">{{ auth.unread() > 9 ? '9+' : auth.unread() }}</span>
              }
            </button>
            <a class="topbar__avatar" routerLink="/app/perfil" aria-label="Mi perfil">
              <app-avatar [user]="auth.user()" size="sm" [showVerified]="false" />
            </a>
          </div>
        </header>

        @if (!auth.verified()) {
          <div class="verify-bar">
            <app-icon name="alert-triangle" [size]="15" />
            <span>Tu correo aún no está verificado. Verifícalo para publicar y cerrar canjes.</span>
            <a routerLink="/verificar">Verificar ahora <app-icon name="arrow-right" [size]="13" /></a>
          </div>
        }

        <main id="contenido" class="frame__content">
          <router-outlet />
        </main>
      </div>

      <nav class="bottom-nav" aria-label="Navegación móvil">
        <a routerLink="/app" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }">
          <app-icon name="layout-dashboard" [size]="19" /><span>Panel</span>
        </a>
        <a routerLink="/app/negociaciones" routerLinkActive="is-active">
          <app-icon name="handshake" [size]="19" /><span>Tratos</span>
          @if (pendingDeals() > 0) {
            <span class="bottom-nav__badge">{{ pendingDeals() }}</span>
          }
        </a>
        <a class="bottom-nav__add" routerLink="/app/publicar" aria-label="Publicar">
          <app-icon name="plus" [size]="22" />
        </a>
        <a routerLink="/mercado" routerLinkActive="is-active">
          <app-icon name="store" [size]="19" /><span>Mercado</span>
        </a>
        <a routerLink="/app/billetera" routerLinkActive="is-active">
          <app-icon name="wallet" [size]="19" /><span>Saldo</span>
        </a>
      </nav>

      @if (notificationsOpen()) {
        <div class="notif-scrim" (click)="notificationsOpen.set(false)" aria-hidden="true"></div>
        <section class="notif" role="dialog" aria-label="Notificaciones">
          <header class="notif__head">
            <div>
              <p class="mono">Bandeja</p>
              <h2>Notificaciones</h2>
            </div>
            <button class="notif__close" type="button" (click)="notificationsOpen.set(false)" aria-label="Cerrar">
              <app-icon name="x" [size]="17" />
            </button>
          </header>

          @if (loadingNotifications()) {
            <div class="notif__loading">
              <span class="spinner spinner--light"></span> Cargando…
            </div>
          } @else if (notifications().length === 0) {
            <div class="notif__empty">
              <app-icon name="bell" [size]="24" />
              <p>Nada nuevo por ahora.</p>
              <span class="hint">Cuando alguien proponga un canje, lo verás aquí.</span>
            </div>
          } @else {
            <div class="notif__list">
              @for (item of notifications(); track item.id) {
                <button class="notif__item" [class.is-unread]="!item.readAt" type="button" (click)="openNotification(item)">
                  <span class="notif__dot" [class.is-on]="!item.readAt"></span>
                  <span class="notif__copy">
                    <strong>{{ item.title }}</strong>
                    <span>{{ item.body }}</span>
                    <small class="mono">{{ ago(item.createdAt) }}</small>
                  </span>
                  <app-icon name="chevron-right" [size]="14" />
                </button>
              }
            </div>
          }

          @if (notifications().length > 0) {
            <footer class="notif__foot">
              <button class="link-btn" type="button" (click)="markAllRead()">Marcar todo como leído</button>
            </footer>
          }
        </section>
      }
    </div>
  `,
  styles: [
    `
      .shell {
        display: flex;
        min-height: 100dvh;
        background: var(--ink);
      }
      .sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        width: 262px;
        z-index: 110;
        display: flex;
        flex-direction: column;
        gap: 1.1rem;
        padding: 1.2rem 1rem 1rem;
        border-right: 1px solid var(--line);
        background: #0a0810;
        overflow-y: auto;
      }
      .sidebar__brand {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.2rem 0.35rem 0.3rem;
      }
      .sidebar__close {
        display: none;
        border: 0;
        background: transparent;
        color: var(--muted);
        padding: 6px;
        cursor: pointer;
      }
      .publish {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border-radius: var(--radius);
        background: var(--lime);
        color: var(--ink);
        text-decoration: none;
        border: 1px solid var(--lime);
        box-shadow: 4px 4px 0 rgba(201, 255, 61, 0.16);
        transition: transform 0.2s var(--ease), box-shadow 0.2s var(--ease);
      }
      .publish:hover {
        transform: translate(-1px, -1px);
        box-shadow: 6px 6px 0 rgba(201, 255, 61, 0.2);
      }
      .publish__icon {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: rgba(7, 6, 9, 0.12);
        flex: 0 0 auto;
      }
      .publish span:nth-child(2) {
        display: grid;
        gap: 0;
        flex: 1;
        min-width: 0;
      }
      .publish strong {
        font-size: 0.83rem;
        line-height: 1.2;
      }
      .publish small {
        font-size: 0.64rem;
        opacity: 0.65;
      }
      .nav {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .nav__label {
        font-size: 0.52rem;
        letter-spacing: 0.16em;
        color: var(--muted-2);
        margin: 14px 10px 6px;
        text-transform: uppercase;
      }
      .nav__item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 10px;
        border-radius: 9px;
        color: var(--muted);
        font-size: 0.84rem;
        text-decoration: none;
        border: 1px solid transparent;
        transition: background 0.18s ease, color 0.18s ease;
      }
      .nav__item:hover {
        color: var(--paper);
        background: rgba(244, 240, 230, 0.045);
      }
      .nav__item.is-active {
        color: var(--lime);
        background: var(--lime-soft);
        border-color: rgba(201, 255, 61, 0.25);
      }
      .nav__item app-icon:first-child {
        flex: 0 0 auto;
      }
      .nav__out {
        margin-left: auto;
        color: var(--muted-2);
      }
      .nav__pending {
        margin-left: auto;
        display: grid;
        place-items: center;
        min-width: 19px;
        height: 19px;
        padding: 0 5px;
        border-radius: 99px;
        background: var(--pink);
        color: #fff;
        font-family: var(--font-mono);
        font-size: 0.58rem;
      }
      .sidebar__foot {
        margin-top: auto;
        display: grid;
        gap: 8px;
        padding-top: 10px;
      }
      .wallet-mini {
        display: grid;
        gap: 1px;
        padding: 10px 12px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: linear-gradient(145deg, rgba(201, 255, 61, 0.06), transparent 70%);
        text-decoration: none;
      }
      .wallet-mini__label {
        font-size: 0.49rem;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--muted-2);
      }
      .wallet-mini strong {
        font-family: var(--font-display);
        font-size: 1.2rem;
        letter-spacing: -0.03em;
      }
      .wallet-mini__escrow {
        font-size: 0.5rem;
        color: #b6a4ff;
      }
      .user-mini {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: rgba(244, 240, 230, 0.02);
      }
      .user-mini__link {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
        text-decoration: none;
      }
      .user-mini__copy {
        display: grid;
        min-width: 0;
      }
      .user-mini__copy strong {
        font-size: 0.77rem;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .user-mini__copy small {
        font-size: 0.48rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .user-mini__out {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 0;
        background: transparent;
        color: var(--muted-2);
        cursor: pointer;
        flex: 0 0 auto;
      }
      .user-mini__out:hover {
        color: var(--pink);
        background: var(--pink-soft);
      }
      .sidebar-scrim {
        display: none;
      }
      .frame {
        flex: 1;
        min-width: 0;
        margin-left: 262px;
        display: flex;
        flex-direction: column;
        min-height: 100dvh;
      }
      .topbar {
        position: sticky;
        top: 0;
        z-index: 90;
        display: flex;
        align-items: center;
        gap: 1rem;
        height: 66px;
        padding: 0 clamp(1rem, 3vw, 2.2rem);
        border-bottom: 1px solid var(--line);
        background: rgba(11, 10, 16, 0.82);
        backdrop-filter: blur(16px);
      }
      .topbar__burger {
        display: none;
        place-items: center;
        width: 38px;
        height: 38px;
        border: 1px solid var(--line);
        border-radius: 9px;
        background: transparent;
        color: var(--paper);
        cursor: pointer;
      }
      .topbar__crumb {
        display: flex;
        align-items: center;
        gap: 7px;
        color: var(--muted-2);
        min-width: 0;
      }
      .topbar__crumb .mono {
        font-size: 0.52rem;
        letter-spacing: 0.16em;
      }
      .topbar__crumb-title {
        font-size: 0.78rem;
        color: var(--paper-dim);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .topbar__actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
      }
      .topbar__install {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border: 1px solid rgba(201, 255, 61, 0.3);
        background: var(--lime-soft);
        color: var(--lime);
        border-radius: 999px;
        padding: 6px 11px;
        font-family: var(--font-mono);
        font-size: 0.56rem;
        letter-spacing: 0.06em;
        cursor: pointer;
      }
      .topbar__market {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 220px;
        padding: 8px 10px;
        border: 1px solid var(--line);
        border-radius: 9px;
        color: var(--muted-2);
        font-size: 0.75rem;
        text-decoration: none;
        background: rgba(244, 240, 230, 0.025);
      }
      .topbar__market:hover {
        border-color: var(--line-strong);
        color: var(--muted);
      }
      .topbar__market kbd {
        margin-left: auto;
        font-family: var(--font-mono);
        font-size: 0.56rem;
        padding: 1px 5px;
        border: 1px solid var(--line);
        border-radius: 4px;
        color: var(--muted-2);
      }
      .topbar__bell {
        position: relative;
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        border: 1px solid var(--line);
        border-radius: 9px;
        background: transparent;
        color: var(--paper-dim);
        cursor: pointer;
      }
      .topbar__bell:hover {
        color: var(--paper);
        border-color: var(--line-strong);
      }
      .topbar__count {
        position: absolute;
        top: -5px;
        right: -5px;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        border-radius: 99px;
        background: var(--pink);
        color: #fff;
        border: 2px solid var(--ink);
        font-family: var(--font-mono);
        font-size: 0.55rem;
        display: grid;
        place-items: center;
      }
      .topbar__avatar {
        display: inline-flex;
        border-radius: 50%;
      }
      .verify-bar {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 9px clamp(1rem, 3vw, 2.2rem);
        background: rgba(255, 122, 61, 0.09);
        border-bottom: 1px solid rgba(255, 122, 61, 0.28);
        color: #ffb995;
        font-size: 0.78rem;
      }
      .verify-bar app-icon {
        color: var(--orange);
        flex: 0 0 auto;
      }
      .verify-bar a {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--orange);
        font-family: var(--font-mono);
        font-size: 0.62rem;
        text-decoration: none;
        white-space: nowrap;
      }
      .verify-bar a:hover {
        text-decoration: underline;
      }
      .frame__content {
        flex: 1;
        padding: clamp(1.25rem, 3vw, 2.4rem) clamp(1rem, 3vw, 2.2rem) 5.2rem;
        max-width: 1420px;
        width: 100%;
      }
      @media (min-width: 1600px) {
        .frame__content {
          max-width: 1720px;
          padding: 2.5rem 3.5rem 6rem;
        }
      }
      @media (min-width: 2200px) {
        .frame__content {
          max-width: 2160px;
          padding: 3rem 5rem 6.5rem;
        }
      }
      .bottom-nav {
        display: none;
      }
      .notif-scrim {
        position: fixed;
        inset: 0;
        z-index: 190;
        background: rgba(7, 6, 9, 0.5);
        backdrop-filter: blur(2px);
      }
      .notif {
        position: fixed;
        z-index: 200;
        top: 12px;
        right: 12px;
        width: min(400px, calc(100vw - 24px));
        max-height: calc(100dvh - 24px);
        display: flex;
        flex-direction: column;
        border: 1px solid var(--line-strong);
        border-radius: var(--radius);
        background: #100d16;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7);
        animation: rise 0.25s var(--ease-out);
        overflow: hidden;
      }
      .notif__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding: 15px 16px;
        border-bottom: 1px solid var(--line);
      }
      .notif__head .mono {
        font-size: 0.5rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--lime);
      }
      .notif__head h2 {
        font-size: 1.15rem;
      }
      .notif__close {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: transparent;
        color: var(--muted);
        cursor: pointer;
      }
      .notif__list {
        overflow-y: auto;
      }
      .notif__item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        width: 100%;
        padding: 12px 16px;
        border: 0;
        border-bottom: 1px solid var(--line);
        background: transparent;
        color: var(--paper-dim);
        text-align: left;
        cursor: pointer;
      }
      .notif__item:hover {
        background: rgba(244, 240, 230, 0.03);
      }
      .notif__item.is-unread {
        background: rgba(201, 255, 61, 0.025);
      }
      .notif__dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: transparent;
        margin-top: 6px;
        flex: 0 0 auto;
      }
      .notif__dot.is-on {
        background: var(--lime);
        box-shadow: 0 0 0 3px rgba(201, 255, 61, 0.12);
      }
      .notif__copy {
        display: grid;
        gap: 2px;
        flex: 1;
        min-width: 0;
      }
      .notif__copy strong {
        font-size: 0.8rem;
        color: var(--paper);
        font-weight: 600;
      }
      .notif__copy span {
        font-size: 0.74rem;
        line-height: 1.4;
        color: var(--muted);
      }
      .notif__copy small {
        font-size: 0.52rem;
        color: var(--muted-2);
      }
      .notif__item > app-icon {
        color: var(--muted-2);
        margin-top: 2px;
      }
      .notif__empty {
        display: grid;
        justify-items: center;
        gap: 5px;
        padding: 36px 20px;
        text-align: center;
        color: var(--muted);
      }
      .notif__empty app-icon {
        color: var(--muted-2);
      }
      .notif__empty p {
        font-size: 0.9rem;
      }
      .notif__empty .hint {
        font-size: 0.7rem;
        max-width: 30ch;
      }
      .notif__loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 30px;
        font-size: 0.78rem;
        color: var(--muted);
      }
      .notif__foot {
        padding: 10px 16px;
        border-top: 1px solid var(--line);
        text-align: center;
      }
      @media (max-width: 1080px) {
        .sidebar {
          transform: translateX(-104%);
          transition: transform 0.28s var(--ease-out);
        }
        .shell.is-open .sidebar {
          transform: none;
        }
        .sidebar__close {
          display: grid;
          place-items: center;
        }
        .sidebar-scrim {
          display: block;
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(7, 6, 9, 0.6);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s ease;
        }
        .shell.is-open .sidebar-scrim {
          opacity: 1;
          pointer-events: auto;
        }
        .frame {
          margin-left: 0;
        }
        .topbar__burger {
          display: grid;
        }
        .topbar__market {
          min-width: 0;
          width: 38px;
          height: 38px;
          padding: 0;
          justify-content: center;
        }
        .topbar__market span,
        .topbar__market kbd {
          display: none;
        }
      }
      @media (max-width: 700px) {
        .topbar {
          height: 58px;
        }
        .topbar__crumb .mono,
        .topbar__crumb app-icon {
          display: none;
        }
        .topbar__install {
          display: none;
        }
        .verify-bar {
          font-size: 0.7rem;
          flex-wrap: wrap;
        }
        .verify-bar a {
          margin-left: 22px;
        }
        .frame__content {
          padding: 1rem 1rem calc(6.8rem + env(safe-area-inset-bottom, 0px));
        }
        .bottom-nav {
          position: fixed;
          left: 10px;
          right: 10px;
          bottom: max(10px, env(safe-area-inset-bottom, 10px));
          z-index: 120;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: center;
          gap: 2px;
          padding: 6px 6px calc(6px + env(safe-area-inset-bottom, 0px));
          border: 1px solid var(--line-strong);
          border-radius: 18px;
          background: rgba(14, 11, 19, 0.94);
          backdrop-filter: blur(18px);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
        }
        .bottom-nav a {
          position: relative;
          display: grid;
          justify-items: center;
          gap: 2px;
          padding: 6px 2px;
          border-radius: 12px;
          color: var(--muted-2);
          font-family: var(--font-mono);
          font-size: 0.48rem;
          letter-spacing: 0.04em;
          text-decoration: none;
        }
        .bottom-nav a.is-active {
          color: var(--lime);
          background: var(--lime-soft);
        }
        .bottom-nav__add {
          width: 46px;
          height: 46px;
          justify-self: center;
          place-items: center;
          border-radius: 50% !important;
          background: var(--lime);
          color: var(--ink) !important;
          box-shadow: 0 6px 18px rgba(201, 255, 61, 0.28);
        }
        .bottom-nav__add app-icon {
          color: var(--ink);
        }
        .bottom-nav__badge {
          position: absolute;
          top: -2px;
          right: 8px;
          min-width: 15px;
          height: 15px;
          padding: 0 3px;
          border-radius: 99px;
          background: var(--pink);
          color: #fff;
          font-size: 0.48rem;
          display: grid;
          place-items: center;
        }
      }
      @media (min-width: 701px) {
        .frame__content {
          padding-bottom: 3rem;
        }
      }
    `,
  ],
})
export class AppShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly pwa = inject(PwaService);
  private readonly router = inject(Router);
  private readonly notificationsApi = inject(NotificationService);
  private readonly walletApi = inject(WalletService);
  private readonly dealsApi = inject(DealService);
  private readonly toast = inject(ToastService);

  protected readonly menu = signal(false);
  protected readonly notificationsOpen = signal(false);
  protected readonly notifications = signal<Notification[]>([]);
  protected readonly loadingNotifications = signal(false);
  protected readonly pendingDeals = signal(0);
  protected readonly balanceCents = signal(0);
  protected readonly escrowCents = signal(0);
  protected readonly currency = signal('USD');

  protected readonly nav: NavItem[] = [
    { label: 'Panel', link: '/app', icon: 'layout-dashboard', exact: true },
    { label: 'Negociaciones', link: '/app/negociaciones', icon: 'handshake', badge: 'deals' },
    { label: 'Mis cosas', link: '/app/mis-cosas', icon: 'package' },
    { label: 'Billetera', link: '/app/billetera', icon: 'wallet' },
    { label: 'Mi perfil', link: '/app/perfil', icon: 'user' },
    { label: 'Administración', link: '/app/admin', icon: 'shield-check', admin: true },
  ];

  protected readonly roleLabel = computed(() => {
    switch (this.auth.role()) {
      case 'ADMIN':
        return 'Administración';
      case 'MODERATOR':
        return 'Moderación';
      default:
        return 'Miembro';
    }
  });

  protected readonly balance = computed(() => this.money(this.balanceCents()));
  protected readonly escrowLabel = computed(() => this.money(this.escrowCents()));

  constructor() {
    this.notificationsApi.list().subscribe({
      next: (result) => {
        this.notifications.set(result.items);
        this.auth.setUnread(result.unread);
      },
      error: () => undefined,
    });
    this.walletApi.get().subscribe({
      next: (wallet) => {
        this.balanceCents.set(wallet.balanceCents);
        this.escrowCents.set(wallet.escrowCents);
        this.currency.set(wallet.currency);
      },
      error: () => undefined,
    });
    this.loadPendingDeals();
  }

  private loadPendingDeals(): void {
    this.dealsApi.list({ role: 'incoming' }).subscribe({
      next: (result) => this.pendingDeals.set(result.pendingIncoming ?? 0),
      error: () => undefined,
    });
  }

  protected toggleNotifications(): void {
    this.notificationsOpen.update((value) => !value);
    if (!this.notificationsOpen()) return;
    this.loadingNotifications.set(true);
    this.notificationsApi.list().subscribe({
      next: (result) => {
        this.notifications.set(result.items);
        this.auth.setUnread(result.unread);
        this.loadingNotifications.set(false);
      },
      error: () => this.loadingNotifications.set(false),
    });
  }

  protected openNotification(item: Notification): void {
    if (!item.readAt) {
      this.notificationsApi.markRead(item.id).subscribe({
        next: () => {
          this.notifications.update((items) =>
            items.map((entry) => (entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry)),
          );
          this.auth.setUnread(Math.max(0, this.auth.unread() - 1));
        },
      });
    }
    this.notificationsOpen.set(false);
    if (item.link) void this.router.navigateByUrl(item.link);
  }

  protected markAllRead(): void {
    this.notificationsApi.markAllRead().subscribe({
      next: () => {
        this.notifications.update((items) => items.map((entry) => ({ ...entry, readAt: entry.readAt ?? new Date().toISOString() })));
        this.auth.setUnread(0);
        this.toast.success('Bandeja al día');
      },
      error: () => this.toast.error('No se pudo actualizar la bandeja'),
    });
  }

  protected install(): void {
    void this.pwa.install();
  }

  protected logout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigate(['/']),
      error: () => void this.router.navigate(['/']),
    });
  }

  protected money(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency(),
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  }

  protected ago(iso: string): string {
    return relativeTime(iso);
  }

  @HostListener('window:keydown.escape')
  protected onEscape(): void {
    this.menu.set(false);
    this.notificationsOpen.set(false);
  }

  @HostListener('window:keydown', ['$event'])
  protected onSearchShortcut(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    event.preventDefault();
    void this.router.navigate(['/mercado']);
  }
}

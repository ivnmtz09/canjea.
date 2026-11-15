import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { DealService, WalletService } from '../../core/data.services';
import { formatMoney, relativeTime } from '../../core/format';
import { ListingService } from '../../core/listing.service';
import type { Deal, Listing, Wallet } from '../../core/models';
import { AvatarComponent } from '../../shared/avatar.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { IconComponent } from '../../shared/icon.component';
import { ListingCardComponent } from '../../shared/listing-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    IconComponent,
    AvatarComponent,
    ListingCardComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
  ],
  template: `
    <header class="dash-head">
      <div class="dash-head__copy">
        <p class="kicker">{{ today }} · {{ roleLabel() }}</p>
        <h1 class="dash-head__title">
          Hola, <em class="serif lime">{{ firstName() }}</em>.<br />
          ¿qué se mueve hoy?
        </h1>
        <p class="lede">
          @if (incoming().length) {
            Tienes {{ incoming().length }} propuesta{{ incoming().length === 1 ? '' : 's' }} esperando respuesta.
          } @else {
            Tu mercado está al día. Revisa lo que está circulando o publica algo nuevo.
          }
        </p>
      </div>

      <div class="dash-head__actions">
        <a class="btn btn--primary" routerLink="/app/publicar">
          <app-icon name="plus" [size]="15" /> Publicar
        </a>
        <a class="btn btn--ghost" routerLink="/mercado">
          <app-icon name="search" [size]="15" /> Explorar
        </a>
      </div>
    </header>

    @if (!auth.verified()) {
      <div class="banner">
        <span class="banner__icon"><app-icon name="scan-face" [size]="20" /></span>
        <div class="banner__copy">
          <strong>Falta verificar tu correo.</strong>
          <span>Sin verificación no puedes publicar ni cerrar canjes con dinero. Toma menos de un minuto.</span>
        </div>
        <a class="btn btn--lime btn--sm" routerLink="/verificar">Verificar <app-icon name="arrow-right" [size]="13" /></a>
      </div>
    }

    <section class="stats" aria-label="Resumen">
      <article class="stat-card stat-card--lime">
        <div class="stat-card__top">
          <span class="mono">Saldo disponible</span>
          <app-icon name="wallet" [size]="17" />
        </div>
        <strong class="stat-card__n">{{ money(wallet()?.balanceCents ?? 0) }}</strong>
        <span class="stat-card__foot">
          <app-icon name="lock" [size]="11" /> {{ money(wallet()?.escrowCents ?? 0) }} en garantía
        </span>
      </article>

      <a class="stat-card" routerLink="/app/negociaciones" [queryParams]="{ role: 'incoming' }">
        <div class="stat-card__top">
          <span class="mono">Propuestas</span>
          <app-icon name="handshake" [size]="17" />
        </div>
        <strong class="stat-card__n">{{ pending() }}</strong>
        <span class="stat-card__foot">esperando tu respuesta</span>
      </a>

      <a class="stat-card" routerLink="/app/mis-cosas">
        <div class="stat-card__top">
          <span class="mono">Mis publicaciones</span>
          <app-icon name="package" [size]="17" />
        </div>
        <strong class="stat-card__n">{{ activeListings() }}</strong>
        <span class="stat-card__foot">activas de {{ myListings().length }} totales</span>
      </a>

      <a class="stat-card" routerLink="/app/negociaciones" [queryParams]="{ status: 'COMPLETED' }">
        <div class="stat-card__top">
          <span class="mono">Canjes cerrados</span>
          <app-icon name="circle-check" [size]="17" />
        </div>
        <strong class="stat-card__n">{{ completed() }}</strong>
        <span class="stat-card__foot">tratos completados</span>
      </a>
    </section>

    <div class="dash-grid">
      <section class="panel">
        <header class="panel__head">
          <div>
            <p class="mono panel__kicker">Bandeja de entrada</p>
            <h2 class="panel__title">Propuestas recientes</h2>
          </div>
          <a class="btn btn--soft btn--sm" routerLink="/app/negociaciones">Ver todas</a>
        </header>

        @if (incoming().length === 0) {
          <app-empty-state
            icon="handshake"
            title="Sin propuestas pendientes"
            message="Cuando alguien quiera canjear contigo, aparecerá aquí con todo el detalle."
          >
            <a class="btn btn--ghost btn--sm" routerLink="/mercado">Explorar el mercado</a>
          </app-empty-state>
        } @else {
          <div class="proposals">
            @for (deal of incoming().slice(0, 4); track deal.id) {
              <a class="proposal" [routerLink]="['/app/negociaciones', deal.id]">
                <div class="proposal__thumb">
                  @if (deal.listing?.imageUrl) {
                    <img [src]="deal.listing?.imageUrl" [alt]="deal.listing?.title ?? ''" />
                  } @else {
                    <app-icon name="package" [size]="18" />
                  }
                </div>
                <div class="proposal__copy">
                  <div class="proposal__top">
                    <strong>{{ deal.listing?.title ?? 'Canje' }}</strong>
                    <app-status-badge [status]="deal.status" />
                  </div>
                  <p>{{ deal.counterpart?.displayName }} · {{ deal.message }}</p>
                  <span class="mono">{{ ago(deal.createdAt) }}</span>
                </div>
                <div class="proposal__cash">
                  @if (deal.cashCents > 0) {
                    <span>{{ money(deal.cashCents) }}</span>
                    <small class="mono">en garantía</small>
                  } @else {
                    <span class="mono">trueque</span>
                  }
                </div>
                <app-icon class="proposal__go" name="chevron-right" [size]="16" />
              </a>
            }
          </div>
        }
      </section>

      <aside class="dash-side">
        <section class="wallet-card">
          <div class="wallet-card__glow" aria-hidden="true"></div>
          <p class="mono wallet-card__label">Billetera CANJEA</p>
          <strong class="wallet-card__amount">{{ money(wallet()?.balanceCents ?? 0) }}</strong>
          <div class="wallet-card__split">
            <div><span class="mono">En garantía</span><strong>{{ money(wallet()?.escrowCents ?? 0) }}</strong></div>
            <div><span class="mono">Entradas</span><strong>{{ money(wallet()?.inflowCents ?? 0) }}</strong></div>
            <div><span class="mono">Salidas</span><strong>{{ money(wallet()?.outflowCents ?? 0) }}</strong></div>
          </div>
          <a class="btn btn--lime btn--block btn--sm" routerLink="/app/billetera">
            Gestionar billetera <app-icon name="arrow-right" [size]="13" />
          </a>
          <p class="wallet-card__note mono">Demo · dinero simulado, comisión 5% al cerrar con efectivo.</p>
        </section>

        <section class="panel profile-card">
          <app-avatar [user]="auth.user()" size="lg" [ring]="true" />
          <div class="profile-card__copy">
            <strong>{{ auth.user()?.displayName }}</strong>
            <span class="mono">&#64;{{ auth.user()?.username }}</span>
            <span class="profile-card__loc"><app-icon name="map-pin" [size]="11" /> {{ auth.user()?.city }}</span>
          </div>
          <a class="btn btn--ghost btn--sm btn--block" routerLink="/app/perfil">Editar perfil</a>
        </section>

        <section class="panel quick">
          <p class="mono panel__kicker">Atajos</p>
          <a routerLink="/app/mis-cosas"><app-icon name="package" [size]="15" /> Mis publicaciones <app-icon name="arrow-up-right" [size]="12" /></a>
          <a routerLink="/app/negociaciones"><app-icon name="handshake" [size]="15" /> Negociaciones <app-icon name="arrow-up-right" [size]="12" /></a>
          <a routerLink="/app/billetera"><app-icon name="banknote" [size]="15" /> Recargar saldo <app-icon name="arrow-up-right" [size]="12" /></a>
          @if (auth.has('stats:read')) {
            <a routerLink="/app/admin"><app-icon name="shield-check" [size]="15" /> Administración <app-icon name="arrow-up-right" [size]="12" /></a>
          }
        </section>
      </aside>
    </div>

    <section class="my-listings">
      <div class="section-head">
        <div>
          <p class="eyebrow">Tus cosas</p>
          <h2 class="h1">LO QUE ESTÁ<br /><em class="serif lime">en tu vitrina.</em></h2>
        </div>
        <a class="btn btn--ghost btn--sm" routerLink="/app/mis-cosas">Gestionar todo <app-icon name="arrow-up-right" [size]="14" /></a>
      </div>

      @if (myListings().length === 0) {
        <app-empty-state
          icon="package"
          title="Todavía no publicas nada"
          message="Publica un objeto, una habilidad o un servicio. Es gratis y toma menos de dos minutos."
        >
          <a class="btn btn--primary btn--sm" routerLink="/app/publicar">Publicar mi primera cosa</a>
        </app-empty-state>
      } @else {
        <div class="mini-list">
          @for (item of myListings().slice(0, 4); track item.id) {
            <a class="mini-item" [routerLink]="['/m', item.id]">
              <img [src]="item.imageUrl" [alt]="item.title" />
              <div>
                <strong>{{ item.title }}</strong>
                <span class="mono">{{ item.category?.name }} · {{ item.views }} vistas</span>
              </div>
              <app-status-badge [status]="item.status" kind="listing" />
            </a>
          }
        </div>
      }
    </section>

    @if (marketPicks().length) {
      <section class="picks">
        <div class="section-head">
          <div>
            <p class="eyebrow">Mercado</p>
            <h2 class="h1">ALGO QUE<br /><em class="serif lime">te puede servir.</em></h2>
          </div>
          <a class="btn btn--ghost btn--sm" routerLink="/mercado">Ver todo <app-icon name="arrow-up-right" [size]="14" /></a>
        </div>
        <div class="picks__grid">
          @for (item of marketPicks(); track item.id) {
            <app-listing-card [listing]="item" />
          }
        </div>
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .dash-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1.5rem;
        flex-wrap: wrap;
        margin-bottom: 1.5rem;
      }
      .dash-head__copy {
        display: grid;
        gap: 9px;
        max-width: 62ch;
      }
      .dash-head__title {
        font-size: clamp(2.1rem, 4.4vw, 3.5rem);
        line-height: 0.98;
        letter-spacing: -0.05em;
      }
      .dash-head__title em {
        font-size: 1.04em;
      }
      .dash-head__actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .banner {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        margin-bottom: 1.25rem;
        border: 1px solid rgba(255, 122, 61, 0.32);
        border-radius: var(--radius-sm);
        background: rgba(255, 122, 61, 0.07);
      }
      .banner__icon {
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: rgba(255, 122, 61, 0.12);
        color: var(--orange);
        flex: 0 0 auto;
      }
      .banner__copy {
        display: grid;
        gap: 1px;
        flex: 1;
      }
      .banner__copy strong {
        font-size: 0.84rem;
      }
      .banner__copy span {
        font-size: 0.76rem;
        color: var(--muted);
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 1.25rem;
      }
      .stat-card {
        display: flex;
        flex-direction: column;
        gap: 5px;
        padding: 15px;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: rgba(244, 240, 230, 0.02);
        text-decoration: none;
        min-width: 0;
        transition: border-color 0.2s ease, transform 0.2s ease;
      }
      a.stat-card:hover {
        border-color: var(--line-strong);
        transform: translateY(-2px);
      }
      .stat-card--lime {
        background: linear-gradient(145deg, rgba(201, 255, 61, 0.11), rgba(201, 255, 61, 0.02) 65%);
        border-color: rgba(201, 255, 61, 0.28);
      }
      .stat-card__top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        color: var(--muted-2);
      }
      .stat-card__top .mono {
        font-size: 0.52rem;
        letter-spacing: 0.11em;
        text-transform: uppercase;
      }
      .stat-card__n {
        font-family: var(--font-display);
        font-size: clamp(1.6rem, 2.7vw, 2.2rem);
        font-weight: 600;
        letter-spacing: -0.05em;
        line-height: 1.05;
        overflow-wrap: anywhere;
      }
      .stat-card--lime .stat-card__n {
        color: var(--lime);
      }
      .stat-card__foot {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.68rem;
        color: var(--muted-2);
      }
      .dash-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.5fr);
        gap: 14px;
        align-items: start;
      }
      .panel__kicker {
        font-size: 0.5rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--lime);
      }
      .proposals {
        display: grid;
      }
      .proposal {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 11px 0;
        border-bottom: 1px solid var(--line);
        text-decoration: none;
        color: inherit;
      }
      .proposal:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }
      .proposal:hover .proposal__copy strong {
        color: var(--lime);
      }
      .proposal__thumb {
        width: 48px;
        height: 48px;
        border-radius: 9px;
        overflow: hidden;
        border: 1px solid var(--line);
        background: var(--ink-3);
        display: grid;
        place-items: center;
        color: var(--muted-2);
        flex: 0 0 auto;
      }
      .proposal__thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .proposal__copy {
        display: grid;
        gap: 1px;
        min-width: 0;
        flex: 1;
      }
      .proposal__top {
        display: flex;
        align-items: center;
        gap: 7px;
        flex-wrap: wrap;
      }
      .proposal__top strong {
        font-size: 0.82rem;
        font-weight: 500;
        transition: color 0.2s ease;
      }
      .proposal__copy p {
        font-size: 0.72rem;
        color: var(--muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .proposal__copy .mono {
        font-size: 0.5rem;
        color: var(--muted-2);
      }
      .proposal__cash {
        display: grid;
        justify-items: end;
        gap: 1px;
        flex: 0 0 auto;
      }
      .proposal__cash span {
        font-family: var(--font-mono);
        font-size: 0.72rem;
        color: var(--lime);
      }
      .proposal__cash small {
        font-size: 0.46rem;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .proposal__go {
        color: var(--muted-2);
      }
      .dash-side {
        display: grid;
        gap: 10px;
      }
      .wallet-card {
        position: relative;
        display: grid;
        gap: 8px;
        padding: 16px;
        border: 1px solid rgba(201, 255, 61, 0.28);
        border-radius: var(--radius);
        background: linear-gradient(150deg, rgba(201, 255, 61, 0.12), rgba(124, 92, 255, 0.05) 60%, transparent);
        overflow: hidden;
      }
      .wallet-card__mobile-glow {
        display: none;
      }
      .wallet-card__label {
        font-size: 0.5rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .wallet-card__amount {
        font-family: var(--font-display);
        font-size: clamp(1.8rem, 3vw, 2.4rem);
        letter-spacing: -0.05em;
        line-height: 1;
        color: var(--lime);
      }
      .wallet-card__split {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1px;
        background: var(--line);
        border-block: 1px solid var(--line);
        margin-block: 3px;
      }
      .wallet-card__split div {
        display: grid;
        gap: 1px;
        padding: 7px 0;
        background: transparent;
      }
      .wallet-card__split .mono {
        font-size: 0.44rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .wallet-card__split strong {
        font-family: var(--font-mono);
        font-size: 0.64rem;
        font-weight: 500;
      }
      .wallet-card .btn {
        margin-top: 2px;
      }
      .wallet-card__note {
        font-size: 0.46rem;
        color: var(--muted-2);
        line-height: 1.5;
        letter-spacing: 0.02em;
      }
      .profile-card {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .profile-card__copy {
        display: grid;
        gap: 0;
        min-width: 0;
        flex: 1;
      }
      .profile-card__copy strong {
        font-size: 0.86rem;
        font-weight: 500;
      }
      .profile-card__copy .mono {
        font-size: 0.5rem;
        color: var(--muted-2);
      }
      .profile-card__loc {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 0.68rem;
        color: var(--muted);
      }
      .quick {
        display: grid;
        gap: 0;
        padding-top: 14px;
        padding-bottom: 12px;
      }
      .quick .mono {
        font-size: 0.5rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--muted-2);
        margin-bottom: 7px;
      }
      .quick a {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 0;
        border-top: 1px solid var(--line);
        color: var(--muted);
        font-size: 0.76rem;
        text-decoration: none;
      }
      .quick a:hover {
        color: var(--lime);
      }
      .quick a app-icon:last-child {
        margin-left: auto;
      }
      .my-listings,
      .picks {
        margin-top: 2.6rem;
        padding-top: 1.8rem;
        border-top: 1px solid var(--line);
      }
      .section-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1.5rem;
        flex-wrap: wrap;
        margin-bottom: 1.2rem;
      }
      .section-head .h1 {
        margin-top: 8px;
      }
      .section-head em {
        font-size: 1.02em;
      }
      .mini-list {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 9px;
      }
      .mini-item {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 9px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: rgba(244, 240, 230, 0.02);
        text-decoration: none;
        min-width: 0;
      }
      .mini-item:hover {
        border-color: var(--line-strong);
      }
      .mini-item img {
        width: 44px;
        height: 44px;
        border-radius: 7px;
        object-fit: cover;
        flex: 0 0 auto;
      }
      .mini-item div {
        display: grid;
        gap: 1px;
        min-width: 0;
        flex: 1;
      }
      .mini-item strong {
        font-size: 0.78rem;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .mini-item .mono {
        font-size: 0.5rem;
        color: var(--muted-2);
      }
      .picks__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 12px;
      }
      @media (max-width: 1080px) {
        .stats {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .dash-grid {
          grid-template-columns: 1fr;
        }
        .dash-side {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .wallet-card {
          grid-column: 1 / -1;
        }
      }
      @media (max-width: 720px) {
        .dash-head__actions {
          width: 100%;
        }
        .dash-head__actions .btn {
          flex: 1;
        }
        .banner {
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .banner .btn {
          margin-left: 50px;
        }
        .dash-side {
          grid-template-columns: 1fr;
        }
        .mini-list {
          grid-template-columns: 1fr;
        }
        .proposal__cash {
          display: none;
        }
        .stats {
          gap: 7px;
        }
        .stat-card {
          padding: 11px;
        }
      }
    `,
  ],
})
export class DashboardPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly listingsApi = inject(ListingService);
  private readonly dealsApi = inject(DealService);
  private readonly walletApi = inject(WalletService);

  protected readonly myListings = signal<Listing[]>([]);
  protected readonly incoming = signal<Deal[]>([]);
  protected readonly allDeals = signal<Deal[]>([]);
  protected readonly marketPicks = signal<Listing[]>([]);
  protected readonly wallet = signal<Wallet | null>(null);

  protected readonly today = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());

  protected readonly firstName = computed(() => {
    const name = this.auth.user()?.displayName ?? '';
    return name.split(' ')[0] || 'miembro';
  });

  protected readonly roleLabel = computed(() => {
    switch (this.auth.role()) {
      case 'ADMIN':
        return 'Administración';
      case 'MODERATOR':
        return 'Moderación';
      default:
        return 'Miembro verificado';
    }
  });

  protected readonly activeListings = computed(() => this.myListings().filter((item) => item.status === 'ACTIVE').length);
  protected readonly completed = computed(
    () => this.allDeals().filter((deal) => deal.status === 'COMPLETED').length,
  );
  protected readonly pending = computed(
    () => this.allDeals().filter((deal) => deal.status === 'PROPOSED' && deal.role === 'INCOMING').length,
  );

  ngOnInit(): void {
    forkJoin({
      mine: this.listingsApi.mine().pipe(catchError(() => of({ items: [] as Listing[] }))),
      deals: this.dealsApi.list().pipe(
        catchError(() => of({ items: [] as Deal[], counts: {}, pendingIncoming: 0 })),
      ),
      wallet: this.walletApi.get().pipe(catchError(() => of(null))),
      picks: this.listingsApi
        .list({ limit: 4, sort: 'popular' })
        .pipe(catchError(() => of({ items: [] as Listing[], meta: { page: 1, limit: 4, total: 0, pages: 1 } }))),
    }).subscribe(({ mine, deals, wallet, picks }) => {
      this.myListings.set(mine.items);
      this.allDeals.set(deals.items);
      this.incoming.set(deals.items.filter((deal) => deal.status === 'PROPOSED' && deal.role === 'INCOMING'));
      this.wallet.set(wallet);
      this.marketPicks.set(picks.items);
    });
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.wallet()?.currency ?? 'USD', cents % 100 !== 0);
  }

  protected ago(iso: string): string {
    return relativeTime(iso);
  }
}

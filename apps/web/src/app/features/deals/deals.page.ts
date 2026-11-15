import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { DealService } from '../../core/data.services';
import { DEAL_LABELS, formatMoney, relativeTime } from '../../core/format';
import { mediaUrl } from '../../core/media';
import type { Deal, DealStatus } from '../../core/models';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { IconComponent } from '../../shared/icon.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

type RoleFilter = 'all' | 'incoming' | 'outgoing';
type StatusFilter = 'all' | DealStatus;

@Component({
  selector: 'app-deals-page',
  imports: [RouterLink, IconComponent, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <header class="page-head">
      <div class="page-head__copy">
        <p class="kicker">Mesa de negociación</p>
        <h1 class="h1">TRATOS EN<br /><em class="serif lime">movimiento.</em></h1>
        <p class="lede">
          Propuestas recibidas y enviadas. Acepta, cierra o cancela con el dinero siempre protegido en garantía.
        </p>
      </div>
      <div class="head-actions">
        <a class="btn btn--ghost btn--sm" routerLink="/app/publicar">
          <app-icon name="plus" [size]="14" /> Publicar
        </a>
        <a class="btn btn--primary btn--sm" routerLink="/mercado">
          <app-icon name="store" [size]="14" /> Explorar mercado
        </a>
      </div>
    </header>

    <section class="deal-summary" aria-label="Resumen de negociaciones">
      <div class="deal-summary__item deal-summary__item--pending">
        <span class="mono">Por responder</span>
        <strong>{{ pendingIncoming() }}</strong>
        <small>propuestas recibidas</small>
      </div>
      <div class="deal-summary__item">
        <span class="mono">En curso</span>
        <strong>{{ count('ACCEPTED') }}</strong>
        <small>listas para cerrar</small>
      </div>
      <div class="deal-summary__item">
        <span class="mono">Completadas</span>
        <strong>{{ count('COMPLETED') }}</strong>
        <small>canjes cerrados</small>
      </div>
      <div class="deal-summary__item">
        <span class="mono">Total</span>
        <strong>{{ totalCount() }}</strong>
        <small>en tu historial</small>
      </div>
    </section>

    @if (pendingIncoming() > 0) {
      <div class="pending-banner">
        <span class="pending-banner__icon"><app-icon name="inbox" [size]="18" /></span>
        <div>
          <strong>Tienes {{ pendingIncoming() }} propuesta{{ pendingIncoming() === 1 ? '' : 's' }} sin responder.</strong>
          <span>Responder rápido mantiene tu reputación y libera el calendario de ambos.</span>
        </div>
        <button class="btn btn--lime btn--sm" type="button" (click)="setRole('incoming')">
          Ver recibidas <app-icon name="arrow-right" [size]="13" />
        </button>
      </div>
    }

    <div class="filters">
      <div class="segmented" role="group" aria-label="Dirección de la negociación">
        @for (option of roles; track option.value) {
          <button type="button" [class.is-active]="role() === option.value" (click)="setRole(option.value)">
            <app-icon [name]="option.icon" [size]="13" /> {{ option.label }}
          </button>
        }
      </div>

      <div class="search-wrap filters__search">
        <app-icon name="search" [size]="15" />
        <input
          class="input input--search"
          type="search"
          placeholder="Buscar por publicación o persona"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
          aria-label="Buscar negociaciones"
        />
      </div>
    </div>

    <div class="tabs" role="tablist" aria-label="Estado de la negociación">
      @for (tab of statusTabs; track tab.value) {
        <button
          type="button"
          role="tab"
          [class.is-active]="status() === tab.value"
          [attr.aria-selected]="status() === tab.value"
          (click)="setStatus(tab.value)"
        >
          {{ tab.label }}
          <span class="count">{{ tab.value === 'all' ? totalCount() : count(tab.value) }}</span>
        </button>
      }
    </div>

    @if (loading()) {
      <div class="deal-list">
        @for (item of [1, 2, 3]; track item) {
          <div class="skeleton" style="height: 96px"></div>
        }
      </div>
    } @else if (visible().length === 0) {
      <app-empty-state
        icon="handshake"
        [title]="emptyTitle()"
        [message]="emptyMessage()"
      >
        <a class="btn btn--primary btn--sm" routerLink="/mercado">Buscar algo para canjear</a>
        @if (role() !== 'all' || status() !== 'all' || query()) {
          <button class="btn btn--ghost btn--sm" type="button" (click)="clearFilters()">Limpiar filtros</button>
        }
      </app-empty-state>
    } @else {
      <div class="deal-list">
        @for (deal of visible(); track deal.id) {
          <a class="deal-row" [routerLink]="['/app/negociaciones', deal.id]">
            <div class="deal-row__thumb">
              <img [src]="image(deal)" [alt]="deal.listing?.title ?? 'Negociación'" loading="lazy" />
            </div>

            <div class="deal-row__body">
              <div class="deal-row__line">
                <span class="deal-row__title">{{ deal.listing?.title ?? 'Canje' }}</span>
                <app-status-badge [status]="deal.status" />
                <span class="badge" [class.badge--violet]="deal.role === 'INCOMING'" [class.badge--sky]="deal.role === 'OUTGOING'">
                  {{ deal.role === 'INCOMING' ? 'Recibida' : 'Enviada' }}
                </span>
              </div>
              <div class="deal-row__meta">
                <span class="deal-row__person">
                  @if (deal.counterpart?.avatarUrl) {
                    <img [src]="deal.counterpart?.avatarUrl ?? ''" [alt]="deal.counterpart?.displayName ?? ''" />
                  }
                  {{ deal.role === 'INCOMING' ? 'De' : 'Para' }} {{ deal.counterpart?.displayName ?? 'usuario' }}
                </span>
                <span class="dot" aria-hidden="true"></span>
                <span>{{ deal.message }}</span>
              </div>
            </div>

            <div class="deal-row__side">
              @if (deal.cashCents > 0) {
                <span class="deal-row__cash">{{ money(deal.cashCents, deal.currency) }}</span>
                <span class="deal-row__time mono">{{ cashHint(deal) }}</span>
              } @else {
                <span class="deal-row__cash deal-row__cash--barter">Trueque</span>
                <span class="deal-row__time mono">sin dinero</span>
              }
              <span class="deal-row__time">{{ ago(deal.updatedAt) }}</span>
            </div>

            <app-icon class="deal-row__go" name="chevron-right" [size]="16" />
          </a>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .head-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      h1 em {
        font-size: 1.03em;
      }
      .deal-summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1px;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: var(--line);
        overflow: hidden;
        margin-bottom: 1.15rem;
      }
      .deal-summary__item {
        display: grid;
        gap: 1px;
        padding: 14px 16px;
        background: var(--ink-2);
      }
      .deal-summary__item--pending {
        background: linear-gradient(150deg, rgba(201, 255, 61, 0.1), var(--ink-2) 70%);
      }
      .deal-summary__item .mono {
        font-size: 0.52rem;
        letter-spacing: 0.13em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .deal-summary__item strong {
        font-family: var(--font-display);
        font-size: 1.7rem;
        line-height: 1;
        letter-spacing: -0.04em;
      }
      .deal-summary__item small {
        font-size: 0.64rem;
        color: var(--muted-2);
      }
      .pending-banner {
        display: flex;
        align-items: center;
        gap: 11px;
        flex-wrap: wrap;
        padding: 11px 13px;
        margin-bottom: 1.15rem;
        border: 1px solid rgba(201, 255, 61, 0.28);
        border-radius: var(--radius-sm);
        background: rgba(201, 255, 61, 0.045);
      }
      .pending-banner__icon {
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: var(--lime-soft);
        color: var(--lime);
        flex: 0 0 auto;
      }
      .pending-banner div {
        display: grid;
        gap: 1px;
        flex: 1;
        min-width: 200px;
      }
      .pending-banner strong {
        font-size: 0.82rem;
      }
      .pending-banner span {
        font-size: 0.72rem;
        color: var(--muted);
      }
      .filters {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 0.4rem;
      }
      .filters__search {
        flex: 0 1 300px;
        margin-left: auto;
      }
      .filters__search .input {
        min-height: 40px;
        font-size: 0.8rem;
      }
      .tabs {
        margin-top: 0.9rem;
      }
      .deal-row {
        grid-template-columns: 96px minmax(0, 1fr) auto auto;
      }
      .deal-row__body {
        min-width: 0;
        display: grid;
        gap: 3px;
      }
      .deal-row__line {
        display: flex;
        align-items: center;
        gap: 7px;
        flex-wrap: wrap;
        min-width: 0;
      }
      .deal-row__title {
        font-weight: 600;
        font-size: 0.92rem;
        letter-spacing: -0.01em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
      }
      .deal-row__line .badge {
        font-size: 0.52rem;
        padding: 2px 5px;
      }
      .deal-row__meta {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
        font-family: var(--font-sans);
        font-size: 0.72rem;
        color: var(--muted);
      }
      .deal-row__meta > span:last-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .deal-row__person {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--paper-dim);
        white-space: nowrap;
      }
      .deal-row__person img {
        width: 17px;
        height: 17px;
        border-radius: 50%;
        object-fit: cover;
      }
      .dot {
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: var(--muted-2);
        flex: 0 0 auto;
      }
      .deal-row__cash--barter {
        color: var(--paper-dim);
        font-size: 0.82rem;
      }
      .deal-row__go {
        color: var(--muted-2);
      }
      @media (max-width: 700px) {
        .deal-summary {
          grid-template-columns: repeat(2, 1fr);
        }
        .filters__search {
          flex-basis: 100%;
        }
        .deal-row {
          grid-template-columns: 68px minmax(0, 1fr);
        }
        .deal-row__go {
          display: none;
        }
        .deal-row__side {
          grid-column: 1 / -1;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }
        .deal-row__meta > span:last-child {
          display: none;
        }
      }
    `,
  ],
})
export class DealsPage implements OnInit {
  private readonly dealsApi = inject(DealService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly deals = signal<Deal[]>([]);
  protected readonly counts = signal<Record<string, number>>({});
  protected readonly pendingIncoming = signal(0);
  protected readonly loading = signal(true);
  protected readonly role = signal<RoleFilter>('all');
  protected readonly status = signal<StatusFilter>('all');
  protected readonly query = signal('');

  protected readonly roles: { value: RoleFilter; label: string; icon: 'handshake' | 'inbox' | 'send' }[] = [
    { value: 'all', label: 'Todas', icon: 'handshake' },
    { value: 'incoming', label: 'Recibidas', icon: 'inbox' },
    { value: 'outgoing', label: 'Enviadas', icon: 'send' },
  ];

  protected readonly statusTabs: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'PROPOSED', label: 'Propuestas' },
    { value: 'ACCEPTED', label: 'Aceptadas' },
    { value: 'COMPLETED', label: 'Completadas' },
    { value: 'REJECTED', label: 'Rechazadas' },
    { value: 'CANCELLED', label: 'Canceladas' },
  ];

  protected readonly totalCount = computed(() =>
    Object.values(this.counts()).reduce((total, value) => total + Number(value ?? 0), 0),
  );

  protected readonly visible = computed(() => {
    const term = this.query().trim().toLowerCase();
    if (!term) return this.deals();
    return this.deals().filter(
      (deal) =>
        (deal.listing?.title ?? '').toLowerCase().includes(term) ||
        (deal.counterpart?.displayName ?? '').toLowerCase().includes(term) ||
        (deal.counterpart?.username ?? '').toLowerCase().includes(term) ||
        deal.message.toLowerCase().includes(term),
    );
  });

  protected readonly emptyTitle = computed(() => {
    if (this.query()) return 'Nada coincide con esa búsqueda';
    if (this.status() !== 'all') return `No hay negociaciones en «${DEAL_LABELS[this.status() as keyof typeof DEAL_LABELS] ?? this.status()}»`;
    if (this.role() === 'incoming') return 'No has recibido propuestas';
    if (this.role() === 'outgoing') return 'No has enviado propuestas';
    return 'Todavía no hay negociaciones';
  });

  protected readonly emptyMessage = computed(() =>
    this.role() === 'outgoing'
      ? 'Encuentra algo en el mercado y propón un canje. Si ofreces dinero, queda en garantía hasta cerrar.'
      : 'Cuando alguien proponga un canje por una de tus publicaciones, aparecerá aquí.',
  );

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const role = params.get('role');
      this.role.set(role === 'incoming' || role === 'outgoing' ? role : 'all');
      const status = params.get('status');
      this.status.set(
        status && ['PROPOSED', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(status)
          ? (status as StatusFilter)
          : 'all',
      );
      this.load();
    });
  }

  protected count(status: DealStatus): number {
    return Number(this.counts()[status] ?? 0);
  }

  protected setRole(role: RoleFilter): void {
    this.role.set(role);
    this.apply();
  }

  protected setStatus(status: StatusFilter): void {
    this.status.set(status);
    this.apply();
  }

  protected clearFilters(): void {
    this.query.set('');
    this.role.set('all');
    this.status.set('all');
    this.apply();
  }

  protected image(deal: Deal): string {
    return mediaUrl(deal.listing?.imageUrl, deal.listing?.id ?? deal.id);
  }

  protected money(cents: number, currency: string): string {
    return formatMoney(cents, currency);
  }

  protected cashHint(deal: Deal): string {
    switch (deal.status) {
      case 'ACCEPTED':
        return 'en garantía';
      case 'COMPLETED':
        return 'liberado';
      case 'PROPOSED':
        return 'propuesto';
      default:
        return 'devuelto';
    }
  }

  protected ago(iso: string): string {
    return relativeTime(iso);
  }

  private apply(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        role: this.role() === 'all' ? null : this.role(),
        status: this.status() === 'all' ? null : this.status(),
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private load(): void {
    this.loading.set(true);
    this.dealsApi
      .list({ role: this.role(), status: this.status() })
      .pipe(catchError(() => of({ items: [] as Deal[], counts: {}, pendingIncoming: 0 })))
      .subscribe((result) => {
        this.deals.set(result.items);
        this.counts.set(result.counts ?? {});
        this.pendingIncoming.set(result.pendingIncoming ?? 0);
        this.loading.set(false);
      });
  }
}

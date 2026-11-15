import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { toApiError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { AdminService } from '../../core/data.services';
import { DEAL_LABELS, ROLE_LABELS, formatMoney, formatNumber, relativeTime } from '../../core/format';
import type { AdminStats, AdminUser, AuditLog, DealStatus, Role } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { AvatarComponent } from '../../shared/avatar.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { IconComponent } from '../../shared/icon.component';

type AdminTab = 'resumen' | 'usuarios' | 'auditoria';

@Component({
  selector: 'app-admin-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    AvatarComponent,
    IconComponent,
    EmptyStateComponent,
  ],
  template: `
    <header class="page-head">
      <div class="page-head__copy">
        <p class="kicker">Sala de control</p>
        <h1 class="h1">TODO EL MERCADO,<br /><em class="serif lime">bajo la lupa.</em></h1>
        <p class="lede">Métricas, cuentas y trazabilidad. Lo que pasa en CANJEA queda registrado y se puede auditar.</p>
      </div>
      <div class="head-actions">
        <span class="badge" [class.badge--violet]="auth.role() === 'MODERATOR'" [class.badge--lime]="auth.role() === 'ADMIN'">
          {{ auth.role() === 'ADMIN' ? 'administración' : 'moderación' }}
        </span>
        <a class="btn btn--ghost btn--sm" routerLink="/mercado">
          <app-icon name="store" [size]="14" /> Ver mercado
        </a>
      </div>
    </header>

    <div class="tabs admin-tabs" role="tablist" aria-label="Secciones de administración">
      <button type="button" role="tab" [class.is-active]="tab() === 'resumen'" [attr.aria-selected]="tab() === 'resumen'" (click)="tab.set('resumen')">
        <app-icon name="layout-dashboard" [size]="14" /> Resumen
      </button>
      <button type="button" role="tab" [class.is-active]="tab() === 'usuarios'" [attr.aria-selected]="tab() === 'usuarios'" (click)="openUsers()">
        <app-icon name="users" [size]="14" /> Usuarios
      </button>
      @if (canAudit) {
        <button type="button" role="tab" [class.is-active]="tab() === 'auditoria'" [attr.aria-selected]="tab() === 'auditoria'" (click)="openAudit()">
          <app-icon name="receipt" [size]="14" /> Auditoría
        </button>
      }
    </div>

    @if (tab() === 'resumen') {
      @if (loadingStats()) {
        <div class="admin-grid">
          @for (item of [1, 2, 3, 4]; track item) {
            <div class="skeleton" style="height: 118px"></div>
          }
        </div>
        <div class="skeleton" style="height: 280px"></div>
      } @else if (stats(); as data) {
        <section class="admin-grid" aria-label="Métricas principales">
          <article class="stat-card">
            <span class="stat-card__label"><app-icon name="users" [size]="13" /> Usuarios</span>
            <strong class="stat-card__value">{{ formatNumber(data.totals.users) }}</strong>
            <span class="stat-card__hint">{{ formatNumber(data.totals.verifiedUsers) }} con correo verificado</span>
          </article>
          <article class="stat-card">
            <span class="stat-card__label"><app-icon name="package" [size]="13" /> Publicaciones</span>
            <strong class="stat-card__value">{{ formatNumber(data.totals.activeListings) }}</strong>
            <span class="stat-card__hint">{{ formatNumber(data.totals.listings) }} creadas en total</span>
          </article>
          <article class="stat-card">
            <span class="stat-card__label"><app-icon name="handshake" [size]="13" /> Canjes cerrados</span>
            <strong class="stat-card__value">{{ formatNumber(data.totals.completedDeals) }}</strong>
            <span class="stat-card__hint">{{ formatNumber(data.totals.deals) }} negociaciones abiertas o cerradas</span>
          </article>
          <article class="stat-card">
            <span class="stat-card__label"><app-icon name="circle-dollar" [size]="13" /> GMV protegido</span>
            <strong class="stat-card__value">{{ money(data.totals.gmvCents, data.platform.currency) }}</strong>
            <span class="stat-card__hint">
              Comisiones: {{ money(data.totals.feesCents, data.platform.currency) }}
            </span>
          </article>
        </section>

        <div class="admin-columns">
          <section class="panel">
            <div class="panel__head">
              <div>
                <p class="mono kicker-mini">Oferta activa</p>
                <h2 class="panel__title">Publicaciones por categoría</h2>
              </div>
              <span class="mono">{{ data.byCategory.length }} categorías</span>
            </div>

            @if (data.byCategory.length === 0) {
              <app-empty-state icon="package" title="Sin publicaciones todavía" message="Cuando el mercado arranque, aquí verás la distribución." />
            } @else {
              <div class="bar-chart">
                @for (row of data.byCategory; track row.name) {
                  <div class="bar-row">
                    <span class="bar-row__label">{{ row.name }}</span>
                    <span class="bar-row__track"><span class="bar-row__fill" [style.width.%]="barWidth(row.count)"></span></span>
                    <span class="bar-row__value">{{ row.count }}</span>
                  </div>
                }
              </div>
            }
          </section>

          <section class="panel">
            <div class="panel__head">
              <div>
                <p class="mono kicker-mini">Embudo</p>
                <h2 class="panel__title">Negociaciones por estado</h2>
              </div>
            </div>

            <div class="status-grid">
              @for (status of dealStatuses; track status) {
                <div class="status-cell" [class.is-zero]="statusCount(status) === 0">
                  <span class="mono">{{ dealLabel(status) }}</span>
                  <strong>{{ statusCount(status) }}</strong>
                </div>
              }
            </div>

            <div class="platform-strip">
              <div>
                <span class="mono">Comisión</span>
                <strong>{{ feePct() }}%</strong>
              </div>
              <div>
                <span class="mono">Moneda</span>
                <strong>{{ data.platform.currency }}</strong>
              </div>
              <div>
                <span class="mono">Entorno</span>
                <strong>{{ data.platform.environment }}</strong>
              </div>
            </div>
          </section>
        </div>

        <section class="panel">
          <div class="panel__head">
            <div>
              <p class="mono kicker-mini">Recién llegados</p>
              <h2 class="panel__title">Últimos registros</h2>
            </div>
            <button class="btn btn--ghost btn--sm" type="button" (click)="openUsers()">
              Gestionar usuarios <app-icon name="arrow-right" [size]="13" />
            </button>
          </div>

          <div class="recent-users">
            @for (user of data.recentUsers; track user.id) {
              <a class="recent-user" [routerLink]="['/u', user.username]">
                <app-avatar [user]="asUser(user)" size="sm" />
                <div>
                  <strong>{{ user.displayName }}</strong>
                  <span class="mono">&#64;{{ user.username }} · {{ ago(user.createdAt) }}</span>
                </div>
                <span class="badge badge--muted">{{ roleLabel(user.role) }}</span>
                <app-icon name="arrow-up-right" [size]="13" />
              </a>
            }
          </div>
        </section>
      }
    }

    @if (tab() === 'usuarios') {
      <section class="panel panel--flush users-panel">
        <div class="users-toolbar">
          <div class="search-wrap">
            <app-icon name="search" [size]="15" />
            <input
              class="input input--search"
              type="search"
              placeholder="Buscar por nombre, usuario o correo"
              [formControl]="userQuery"
              aria-label="Buscar usuarios"
            />
          </div>

          <div class="segmented" role="group" aria-label="Filtrar por rol">
            <button type="button" [class.is-active]="roleFilter() === ''" (click)="setRoleFilter('')">Todos</button>
            @for (role of roles; track role) {
              <button type="button" [class.is-active]="roleFilter() === role" (click)="setRoleFilter(role)">{{ roleLabel(role) }}</button>
            }
          </div>

          <select class="select users-status" [formControl]="statusFilter" aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="SUSPENDED">Suspendidos</option>
          </select>
        </div>

        @if (loadingUsers()) {
          <div class="users-loading">
            @for (item of [1, 2, 3, 4, 5]; track item) {
              <div class="skeleton" style="height: 58px"></div>
            }
          </div>
        } @else if (users().length === 0) {
          <app-empty-state icon="users" title="Ningún usuario coincide" message="Prueba con otro término, rol o estado.">
            <button class="btn btn--ghost btn--sm" type="button" (click)="clearUserFilters()">Limpiar filtros</button>
          </app-empty-state>
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Actividad</th>
                  <th>Saldo</th>
                  <th class="align-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (user of users(); track user.id) {
                  <tr [class.is-suspended]="user.status === 'SUSPENDED'">
                    <td>
                      <div class="user-cell">
                        <app-avatar [user]="user" size="sm" />
                        <div>
                          <a class="user-cell__name" [routerLink]="['/u', user.username]">{{ user.displayName }}</a>
                          <span class="mono">&#64;{{ user.username }} · {{ user.email }}</span>
                        </div>
                        @if (user.id === auth.user()?.id) {
                          <span class="badge badge--violet">tú</span>
                        }
                      </div>
                    </td>
                    <td>
                      @if (canManageRoles && user.id !== auth.user()?.id) {
                        <select
                          class="select select--mini"
                          [value]="user.role"
                          [disabled]="busyId() === user.id"
                          (change)="changeRole(user, $any($event.target).value)"
                          [attr.aria-label]="'Rol de ' + user.username"
                        >
                          @for (role of roles; track role) {
                            <option [value]="role">{{ roleLabel(role) }}</option>
                          }
                        </select>
                      } @else {
                        <span class="badge badge--muted">{{ roleLabel(user.role) }}</span>
                      }
                    </td>
                    <td>
                      <span class="badge" [class.badge--lime]="user.status === 'ACTIVE'" [class.badge--pink]="user.status === 'SUSPENDED'">
                        {{ user.status === 'ACTIVE' ? 'Activo' : 'Suspendido' }}
                      </span>
                    </td>
                    <td>
                      <span class="activity">
                        <span><app-icon name="package" [size]="11" /> {{ user.listingsCount }}</span>
                        <span><app-icon name="handshake" [size]="11" /> {{ user.dealsCount }}</span>
                      </span>
                    </td>
                    <td>
                      <span class="money-cell">{{ money(user.balanceCents) }}</span>
                      @if (user.escrowCents > 0) {
                        <span class="money-cell__escrow mono">{{ money(user.escrowCents) }} en garantía</span>
                      }
                    </td>
                    <td class="align-right">
                      @if (canSuspend && user.role !== 'ADMIN' && user.id !== auth.user()?.id) {
                        <button
                          class="btn btn--sm"
                          [class.btn--ghost]="user.status === 'ACTIVE'"
                          [class.btn--soft]="user.status === 'SUSPENDED'"
                          type="button"
                          [disabled]="busyId() === user.id"
                          (click)="toggleStatus(user)"
                        >
                          @if (busyId() === user.id) {
                            <span class="spinner"></span>
                          } @else if (user.status === 'ACTIVE') {
                            Suspender
                          } @else {
                            Reactivar
                          }
                        </button>
                      } @else {
                        <span class="mono muted">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="pager">
            <span class="mono">{{ rangeLabel() }}</span>
            <div class="pager__actions">
              <button class="btn btn--ghost btn--sm" type="button" [disabled]="page() <= 1 || loadingUsers()" (click)="goPage(page() - 1)">
                <app-icon name="chevron-left" [size]="13" /> Anterior
              </button>
              <span class="mono">Página {{ page() }} de {{ usersMeta().pages }}</span>
              <button class="btn btn--ghost btn--sm" type="button" [disabled]="page() >= usersMeta().pages || loadingUsers()" (click)="goPage(page() + 1)">
                Siguiente <app-icon name="chevron-right" [size]="13" />
              </button>
            </div>
          </div>
        }
      </section>
    }

    @if (tab() === 'auditoria' && canAudit) {
      <section class="panel panel--flush">
        <div class="panel__head audit-head">
          <div>
            <p class="mono kicker-mini">Trazabilidad</p>
            <h2 class="panel__title">Registro de acciones</h2>
          </div>
          <button class="btn btn--ghost btn--sm" type="button" [disabled]="loadingAudit()" (click)="loadAudit(auditPage())">
            <app-icon name="refresh" [size]="13" /> Actualizar
          </button>
        </div>

        @if (loadingAudit()) {
          <div class="users-loading">
            @for (item of [1, 2, 3, 4]; track item) {
              <div class="skeleton" style="height: 48px"></div>
            }
          </div>
        } @else if (auditLogs().length === 0) {
          <app-empty-state icon="receipt" title="Sin registros todavía" message="Las acciones sensibles aparecerán aquí." />
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Acción</th>
                  <th>Actor</th>
                  <th>Entidad</th>
                  <th>IP</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                @for (log of auditLogs(); track log.id) {
                  <tr>
                    <td><span class="mono action-code">{{ log.action }}</span></td>
                    <td>
                      @if (log.actor) {
                        <span class="actor">&#64;{{ log.actor.username }}</span>
                      } @else {
                        <span class="mono muted">sistema</span>
                      }
                    </td>
                    <td>
                      <span class="mono">{{ log.entity }}</span>
                      @if (log.entityId) {
                        <span class="mono muted">· {{ shortId(log.entityId) }}</span>
                      }
                    </td>
                    <td><span class="mono">{{ log.ip ?? '—' }}</span></td>
                    <td>
                      <span class="audit-date">{{ ago(log.createdAt) }}</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="pager">
            <span class="mono">{{ formatNumber(auditTotal()) }} registros</span>
            <div class="pager__actions">
              <button class="btn btn--ghost btn--sm" type="button" [disabled]="auditPage() <= 1 || loadingAudit()" (click)="loadAudit(auditPage() - 1)">
                <app-icon name="chevron-left" [size]="13" /> Anterior
              </button>
              <span class="mono">Página {{ auditPage() }}</span>
              <button class="btn btn--ghost btn--sm" type="button" [disabled]="auditLogs().length < 30 || loadingAudit()" (click)="loadAudit(auditPage() + 1)">
                Siguiente <app-icon name="chevron-right" [size]="13" />
              </button>
            </div>
          </div>
        }
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .head-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      h1 em {
        font-size: 1.03em;
      }
      .admin-tabs {
        margin-bottom: 1.2rem;
      }
      .admin-columns {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(0, 0.85fr);
        gap: 1rem;
        margin-bottom: 1.1rem;
        align-items: start;
      }
      .kicker-mini {
        font-size: 0.5rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--lime);
      }
      .status-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: var(--line);
        overflow: hidden;
      }
      .status-cell {
        display: grid;
        gap: 2px;
        padding: 10px 11px;
        background: var(--ink-2);
      }
      .status-cell.is-zero {
        opacity: 0.5;
      }
      .status-cell .mono {
        font-size: 0.5rem;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .status-cell strong {
        font-family: var(--font-display);
        font-size: 1.25rem;
        letter-spacing: -0.04em;
      }
      .platform-strip {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-top: 0.9rem;
        padding-top: 0.9rem;
        border-top: 1px solid var(--line);
      }
      .platform-strip > div {
        display: grid;
        gap: 1px;
      }
      .platform-strip .mono {
        font-size: 0.48rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .platform-strip strong {
        font-family: var(--font-mono);
        font-size: 0.76rem;
        color: var(--paper-dim);
        text-transform: capitalize;
      }
      .recent-users {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 6px;
      }
      .recent-user {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(244, 240, 230, 0.015);
        color: inherit;
        text-decoration: none;
      }
      .recent-user:hover {
        border-color: var(--line-strong);
        background: var(--ink-3);
      }
      .recent-user > div {
        display: grid;
        gap: 0;
        flex: 1;
        min-width: 0;
      }
      .recent-user strong {
        font-size: 0.8rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .recent-user .mono {
        font-size: 0.5rem;
        color: var(--muted-2);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .recent-user > app-icon {
        color: var(--muted-2);
      }
      .users-panel {
        padding: 0;
      }
      .users-toolbar {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        padding: 0.9rem 1rem;
        border-bottom: 1px solid var(--line);
      }
      .users-toolbar .segmented {
        flex: 0 0 auto;
      }
      .users-toolbar .search-wrap {
        flex: 1 1 240px;
        max-width: 340px;
      }
      .users-status {
        width: auto;
        min-width: 168px;
        min-height: 40px;
        font-size: 0.78rem;
      }
      .users-loading {
        display: grid;
        gap: 6px;
        padding: 1rem;
      }
      .user-cell {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 210px;
      }
      .user-cell > div {
        display: grid;
        gap: 0;
        min-width: 0;
      }
      .user-cell__name {
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--paper);
        text-decoration: none;
        white-space: nowrap;
      }
      .user-cell__name:hover {
        color: var(--lime);
      }
      .user-cell .mono {
        font-size: 0.5rem;
        color: var(--muted-2);
        white-space: nowrap;
      }
      .user-cell .badge {
        font-size: 0.46rem;
        padding: 1px 4px;
      }
      .select--mini {
        min-height: 30px;
        padding: 3px 24px 3px 8px;
        font-family: var(--font-mono);
        font-size: 0.58rem;
        width: auto;
        min-width: 102px;
        background-position: right 7px center;
      }
      .activity {
        display: inline-flex;
        gap: 10px;
        font-family: var(--font-mono);
        font-size: 0.64rem;
        color: var(--muted);
      }
      .activity span {
        display: inline-flex;
        align-items: center;
        gap: 3px;
      }
      .money-cell {
        display: block;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        color: var(--paper);
      }
      .money-cell__escrow {
        display: block;
        margin-top: 1px;
        font-size: 0.48rem;
        color: var(--muted-2);
      }
      .align-right {
        text-align: right;
      }
      .muted {
        color: var(--muted-2);
      }
      tr.is-suspended td {
        opacity: 0.72;
      }
      .pager {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        padding: 0.8rem 1rem;
        border-top: 1px solid var(--line);
      }
      .pager .mono {
        font-size: 0.56rem;
        color: var(--muted);
      }
      .pager__actions {
        display: flex;
        align-items: center;
        gap: 7px;
        flex-wrap: wrap;
      }
      .audit-head {
        padding: 1rem;
        margin: 0;
      }
      .action-code {
        font-size: 0.6rem;
        color: var(--lime);
      }
      .actor {
        font-size: 0.76rem;
        color: var(--paper-dim);
      }
      .audit-date {
        font-family: var(--font-mono);
        font-size: 0.58rem;
        color: var(--muted);
      }
      @media (max-width: 1100px) {
        .admin-columns {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 700px) {
        .users-toolbar .search-wrap {
          flex-basis: 100%;
          max-width: none;
        }
        .users-toolbar .segmented {
          overflow-x: auto;
          max-width: 100%;
        }
        .users-status {
          width: 100%;
        }
        .pager {
          flex-direction: column;
          align-items: stretch;
        }
        .pager__actions {
          justify-content: space-between;
        }
      }
    `,
  ],
})
export class AdminPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly adminApi = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly tab = signal<AdminTab>('resumen');
  protected readonly stats = signal<AdminStats | null>(null);
  protected readonly loadingStats = signal(true);
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly usersMeta = signal({ page: 1, limit: 12, total: 0, pages: 1 });
  protected readonly loadingUsers = signal(false);
  protected readonly usersLoaded = signal(false);
  protected readonly page = signal(1);
  protected readonly roleFilter = signal<'' | Role>('');
  protected readonly busyId = signal<string | null>(null);
  protected readonly auditLogs = signal<AuditLog[]>([]);
  protected readonly auditPage = signal(1);
  protected readonly auditTotal = signal(0);
  protected readonly loadingAudit = signal(false);
  protected readonly auditLoaded = signal(false);

  protected readonly roles: Role[] = ['USER', 'MODERATOR', 'ADMIN'];
  protected readonly dealStatuses: DealStatus[] = ['PROPOSED', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'CANCELLED'];
  protected readonly formatNumber = formatNumber;

  protected readonly canManageRoles = this.auth.has('role:manage');
  protected readonly canSuspend = this.auth.has('user:suspend');
  protected readonly canAudit = this.auth.has('audit:read');

  protected readonly userQuery = this.fb.control('');
  protected readonly statusFilter = this.fb.control('');

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadStats();
    this.userQuery.valueChanges.subscribe(() => {
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.page.set(1);
        this.loadUsers();
      }, 320);
    });
    this.statusFilter.valueChanges.subscribe(() => {
      this.page.set(1);
      this.loadUsers();
    });
  }

  protected roleLabel(role: Role): string {
    return ROLE_LABELS[role] ?? role;
  }

  protected dealLabel(status: DealStatus): string {
    return DEAL_LABELS[status] ?? status;
  }

  protected money(cents: number, currency = 'USD'): string {
    return formatMoney(cents, currency);
  }

  protected ago(iso: string): string {
    return relativeTime(iso);
  }

  protected statusCount(status: DealStatus): number {
    return this.stats()?.byStatus?.[status] ?? 0;
  }

  protected barWidth(count: number): number {
    const rows = this.stats()?.byCategory ?? [];
    const max = Math.max(1, ...rows.map((row) => row.count));
    return Math.max(2, Math.round((count / max) * 100));
  }

  protected feePct(): string {
    const bps = this.stats()?.platform.feeBps ?? 0;
    return String(bps / 100);
  }

  protected asUser(user: { id: string; username: string; displayName: string; role: Role; createdAt: string }) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: null,
      bio: '',
      city: '',
      country: '',
      role: user.role,
      emailVerified: false,
      ratingAvg: 0,
      ratingCount: 0,
      createdAt: user.createdAt,
    };
  }

  protected shortId(id: string): string {
    return id.length > 10 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
  }

  protected rangeLabel(): string {
    const meta = this.usersMeta();
    if (meta.total === 0) return 'Sin resultados';
    const from = (meta.page - 1) * meta.limit + 1;
    const to = Math.min(meta.total, meta.page * meta.limit);
    return `${from}–${to} de ${formatNumber(meta.total)} usuarios`;
  }

  protected openUsers(): void {
    this.tab.set('usuarios');
    if (!this.usersLoaded()) this.loadUsers();
  }

  protected openAudit(): void {
    this.tab.set('auditoria');
    if (!this.auditLoaded()) this.loadAudit(1);
  }

  protected setRoleFilter(role: '' | Role): void {
    this.roleFilter.set(role);
    this.page.set(1);
    this.loadUsers();
  }

  protected clearUserFilters(): void {
    this.roleFilter.set('');
    this.userQuery.setValue('');
    this.statusFilter.setValue('');
    this.page.set(1);
    this.loadUsers();
  }

  protected goPage(page: number): void {
    this.page.set(Math.max(1, page));
    this.loadUsers();
  }

  protected changeRole(user: AdminUser, role: string): void {
    if (!role || role === user.role) return;
    this.busyId.set(user.id);
    this.adminApi.setRole(user.id, role).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.users.update((items) =>
          items.map((item) => (item.id === user.id ? { ...item, ...updated, listingsCount: item.listingsCount, dealsCount: item.dealsCount, balanceCents: item.balanceCents, escrowCents: item.escrowCents } : item)),
        );
        this.toast.success('Rol actualizado', `${user.displayName} ahora es ${this.roleLabel(role as Role)}.`);
      },
      error: (error) => {
        this.busyId.set(null);
        this.toast.error('No se pudo cambiar el rol', toApiError(error).message);
        this.users.update((items) => items.map((item) => (item.id === user.id ? { ...item, role: user.role } : item)));
      },
    });
  }

  protected toggleStatus(user: AdminUser): void {
    const next = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    this.busyId.set(user.id);
    this.adminApi.setStatus(user.id, next, next === 'SUSPENDED' ? 'Decisión de moderación' : undefined).subscribe({
      next: (result) => {
        this.busyId.set(null);
        this.users.update((items) => items.map((item) => (item.id === user.id ? { ...item, status: result.status } : item)));
        this.toast.success(next === 'SUSPENDED' ? 'Cuenta suspendida' : 'Cuenta reactivada', user.displayName);
      },
      error: (error) => {
        this.busyId.set(null);
        this.toast.error('No se pudo actualizar la cuenta', toApiError(error).message);
      },
    });
  }

  protected loadAudit(page: number): void {
    if (!this.canAudit) return;
    this.auditPage.set(Math.max(1, page));
    this.loadingAudit.set(true);
    this.adminApi
      .audit(page)
      .pipe(catchError(() => of({ items: [] as AuditLog[], meta: { total: 0 } })))
      .subscribe((result) => {
        this.auditLogs.set(result.items);
        this.auditTotal.set(result.meta.total);
        this.auditLoaded.set(true);
        this.loadingAudit.set(false);
      });
  }

  private loadStats(): void {
    this.loadingStats.set(true);
    this.adminApi
      .stats()
      .pipe(
        catchError((error) => {
          this.toast.error('No pudimos cargar las métricas', toApiError(error).message);
          return of(null);
        }),
      )
      .subscribe((stats) => {
        if (stats) this.stats.set(stats);
        this.loadingStats.set(false);
      });
  }

  private loadUsers(): void {
    this.loadingUsers.set(true);
    this.adminApi
      .users({
        q: this.userQuery.value.trim() || undefined,
        role: this.roleFilter() || undefined,
        status: this.statusFilter.value || undefined,
        page: this.page(),
        limit: 12,
      })
      .pipe(
        catchError((error) => {
          this.toast.error('No pudimos cargar los usuarios', toApiError(error).message);
          return of({ items: [] as AdminUser[], meta: { page: 1, limit: 12, total: 0, pages: 1 } });
        }),
      )
      .subscribe((result) => {
        this.users.set(result.items);
        this.usersMeta.set(result.meta);
        this.usersLoaded.set(true);
        this.loadingUsers.set(false);
      });
  }
}

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { toApiError } from '../../core/api.service';
import { CONDITION_LABELS, MODALITY_LABELS, formatMoney, relativeTime } from '../../core/format';
import { ListingService } from '../../core/listing.service';
import { mediaUrl } from '../../core/media';
import type { Listing, ListingStatus } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { FieldErrorComponent } from '../../shared/field-error.component';
import { IconComponent } from '../../shared/icon.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

type StuffTab = 'all' | 'active' | 'paused' | 'archived' | 'favorites';

@Component({
  selector: 'app-my-stuff-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    IconComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    FieldErrorComponent,
  ],
  template: `
    <header class="page-head">
      <div class="page-head__copy">
        <p class="kicker">Tu vitrina</p>
        <h1 class="h1">MIS COSAS,<br /><em class="serif lime">bajo control.</em></h1>
        <p class="lede">Administra lo que ofreces y lo que buscas. Pausa, edita o retira sin perder el historial.</p>
      </div>
      <div class="head-actions">
        <a class="btn btn--ghost btn--sm" routerLink="/app/negociaciones">
          <app-icon name="handshake" [size]="14" /> Negociaciones
        </a>
        <a class="btn btn--primary btn--sm" routerLink="/app/publicar">
          <app-icon name="plus" [size]="14" /> Publicar algo
        </a>
      </div>
    </header>

    <section class="summary" aria-label="Resumen de publicaciones">
      <div class="summary__item">
        <span class="mono">Totales</span>
        <strong>{{ mine().length }}</strong>
      </div>
      <div class="summary__item">
        <span class="mono">Activas</span>
        <strong class="accent">{{ count('ACTIVE') }}</strong>
      </div>
      <div class="summary__item">
        <span class="mono">Pausadas</span>
        <strong>{{ count('PAUSED') }}</strong>
      </div>
      <div class="summary__item">
        <span class="mono">Favoritos guardados</span>
        <strong>{{ favorites().length }}</strong>
      </div>
    </section>

    <div class="toolbar">
      <div class="tabs" role="tablist" aria-label="Filtrar publicaciones">
        @for (tab of tabs; track tab.value) {
          <button
            type="button"
            role="tab"
            [class.is-active]="activeTab() === tab.value"
            [attr.aria-selected]="activeTab() === tab.value"
            (click)="activeTab.set(tab.value)"
          >
            {{ tab.label }}
            <span class="count">{{ tabCount(tab.value) }}</span>
          </button>
        }
      </div>

      <div class="search-wrap toolbar__search">
        <app-icon name="search" [size]="15" />
        <input
          class="input input--search"
          type="search"
          placeholder="Buscar en mis publicaciones"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
          aria-label="Buscar en mis publicaciones"
        />
      </div>
    </div>

    @if (loading()) {
      <div class="cards">
        @for (item of [1, 2, 3, 4]; track item) {
          <div class="skeleton manage-card" style="height: 320px"></div>
        }
      </div>
    } @else if (visible().length === 0) {
      @if (activeTab() === 'favorites') {
        <app-empty-state
          icon="heart"
          title="Todavía no guardas favoritos"
          message="Toca el corazón en cualquier publicación para guardarla y volver después."
        >
          <a class="btn btn--primary btn--sm" routerLink="/mercado">Explorar el mercado</a>
        </app-empty-state>
      } @else {
        <app-empty-state
          icon="package"
          title="No hay publicaciones en esta vista"
          message="Publica lo que tienes o lo que buscas. También puedes cambiar de filtro para ver el resto."
        >
          <a class="btn btn--primary btn--sm" routerLink="/app/publicar">Crear publicación</a>
          @if (query()) {
            <button class="btn btn--ghost btn--sm" type="button" (click)="query.set('')">Limpiar búsqueda</button>
          }
        </app-empty-state>
      }
    } @else {
      <div class="cards">
        @for (item of visible(); track item.id) {
          <article class="manage-card" [class.is-paused]="item.status === 'PAUSED'">
            <a class="manage-card__media" [routerLink]="activeTab() === 'favorites' ? ['/m', item.id] : ['/m', item.id]">
              <img [src]="image(item)" [alt]="item.title" loading="lazy" />
              <span class="manage-card__layer"></span>
              <span class="badge" [class.badge--pink]="item.kind === 'NEED'" [class.badge--lime]="item.kind === 'OFFER'">
                {{ item.kind === 'OFFER' ? 'Ofrece' : 'Busca' }}
              </span>
              <app-status-badge class="manage-card__status" [status]="item.status" kind="listing" />
            </a>

            <div class="manage-card__body">
              <div class="manage-card__meta">
                <span class="mono">{{ item.category?.name ?? 'General' }}</span>
                <span class="mono"><app-icon name="eye" [size]="11" /> {{ item.views }}</span>
                <span class="mono"><app-icon name="heart" [size]="11" /> {{ item.favoritesCount }}</span>
              </div>

              <a class="manage-card__title" [routerLink]="['/m', item.id]">{{ item.title }}</a>

              <div class="manage-card__row">
                <span class="manage-card__price">{{ price(item) }}</span>
                <span class="manage-card__loc"><app-icon name="map-pin" [size]="11" /> {{ item.location }}</span>
              </div>

              <p class="manage-card__time mono">
                {{ item.status === 'PAUSED' ? 'Pausada' : 'Actualizada' }} {{ ago(item.updatedAt) }}
              </p>

              @if (activeTab() === 'favorites') {
                <div class="manage-card__actions">
                  <a class="btn btn--soft btn--sm grow" [routerLink]="['/m', item.id]">
                    Ver publicación <app-icon name="arrow-up-right" [size]="12" />
                  </a>
                  <button class="icon-btn" type="button" (click)="unfavorite(item)" aria-label="Quitar de favoritos">
                    <app-icon name="heart" [size]="15" />
                  </button>
                </div>
              } @else {
                <div class="manage-card__actions">
                  <button class="btn btn--soft btn--sm" type="button" (click)="openEdit(item)">
                    <app-icon name="pencil" [size]="12" /> Editar
                  </button>
                  @if (item.status === 'ACTIVE') {
                    <button class="btn btn--ghost btn--sm" type="button" [disabled]="busyId() === item.id" (click)="setStatus(item, 'PAUSED')">
                      <app-icon name="pause" [size]="12" /> Pausar
                    </button>
                  } @else if (item.status === 'PAUSED') {
                    <button class="btn btn--ghost btn--sm" type="button" [disabled]="busyId() === item.id" (click)="setStatus(item, 'ACTIVE')">
                      <app-icon name="play" [size]="12" /> Activar
                    </button>
                  }
                  @if (item.status !== 'ARCHIVED' && item.status !== 'REMOVED') {
                    <button class="icon-btn" type="button" [disabled]="busyId() === item.id" (click)="askRemove(item)" aria-label="Retirar publicación">
                      <app-icon name="trash" [size]="14" />
                    </button>
                  }
                </div>
              }
            </div>
          </article>
        }
      </div>
    }

    @if (editing(); as item) {
      <div class="sheet-scrim" (click)="closeEdit()" aria-hidden="true"></div>
      <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="edit-title">
        <header class="sheet__head">
          <div>
            <p class="mono">Editar publicación</p>
            <h2 id="edit-title">{{ item.title }}</h2>
          </div>
          <button class="icon-btn" type="button" (click)="closeEdit()" aria-label="Cerrar">
            <app-icon name="x" [size]="17" />
          </button>
        </header>

        <form class="sheet__body" [formGroup]="editForm" (ngSubmit)="saveEdit()" novalidate>
          @if (editError()) {
            <div class="alert alert--danger" role="alert">
              <app-icon name="alert-circle" [size]="16" />
              <div>{{ editError() }}</div>
            </div>
          }

          <label class="field">
            <span class="label">Título <span class="req">*</span></span>
            <input class="input" type="text" formControlName="title" maxlength="90" />
            <app-field-error [control]="editForm.controls.title" />
          </label>

          <label class="field">
            <span class="label">Descripción <span class="req">*</span></span>
            <textarea class="textarea" formControlName="description" rows="6" maxlength="2000"></textarea>
            <app-field-error [control]="editForm.controls.description" />
            <span class="hint">{{ editForm.controls.description.value.length }} / 2000</span>
          </label>

          <div class="form-grid">
            <label class="field">
              <span class="label">Condición</span>
              <select class="select" formControlName="condition">
                @for (option of conditions; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </label>

            <label class="field">
              <span class="label">Zona de entrega</span>
              <input class="input" type="text" formControlName="location" maxlength="80" />
              <app-field-error [control]="editForm.controls.location" />
            </label>
          </div>

          @if (item.modality !== 'BARTER') {
            <label class="field">
              <span class="label">Valor en dinero ({{ item.currency }})</span>
              <input class="input" type="number" min="1" step="0.01" formControlName="price" />
              <app-field-error [control]="editForm.controls.price" />
            </label>
          }

          <div class="sheet__note">
            <app-icon name="info" [size]="15" />
            <span>Los cambios se reflejan de inmediato en el mercado. La moderación puede revisar el contenido.</span>
          </div>

          <div class="sheet__actions">
            <button class="btn btn--ghost" type="button" (click)="closeEdit()">Cancelar</button>
            <button class="btn btn--primary grow" type="submit" [disabled]="saving()">
              @if (saving()) {
                <span class="spinner"></span> Guardando…
              } @else {
                Guardar cambios <app-icon name="check" [size]="15" />
              }
            </button>
          </div>
        </form>
      </section>
    }

    @if (pendingRemove(); as item) {
      <div class="sheet-scrim" (click)="cancelRemove()" aria-hidden="true"></div>
      <section class="confirm" role="alertdialog" aria-modal="true" aria-labelledby="remove-title">
        <span class="confirm__icon"><app-icon name="trash" [size]="20" /></span>
        <h2 id="remove-title">¿Retirar «{{ item.title }}»?</h2>
        <p>La publicación dejará de aparecer en el mercado. El historial de negociaciones se conserva.</p>
        <div class="confirm__actions">
          <button class="btn btn--ghost" type="button" (click)="cancelRemove()">Cancelar</button>
          <button class="btn btn--danger" type="button" [disabled]="busyId() === item.id" (click)="remove(item)">
            Retirar publicación
          </button>
        </div>
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
        gap: 8px;
        flex-wrap: wrap;
      }
      h1 em {
        font-size: 1.03em;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1px;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: var(--line);
        overflow: hidden;
        margin-bottom: 1.4rem;
      }
      .summary__item {
        display: grid;
        gap: 2px;
        padding: 14px 16px;
        background: var(--ink-2);
      }
      .summary__item .mono {
        font-size: 0.52rem;
        letter-spacing: 0.13em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .summary__item strong {
        font-family: var(--font-display);
        font-size: 1.65rem;
        letter-spacing: -0.04em;
        line-height: 1;
      }
      .toolbar {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 1.2rem;
      }
      .toolbar .tabs {
        flex: 1;
        margin-bottom: 0;
      }
      .toolbar__search {
        max-width: 300px;
        flex: 0 1 300px;
      }
      .toolbar__search .input {
        min-height: 40px;
        font-size: 0.8rem;
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 14px;
      }
      .manage-card {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: var(--ink-2);
        overflow: hidden;
        transition: border-color 0.2s ease, transform 0.2s ease;
      }
      .manage-card:hover {
        border-color: var(--line-strong);
        transform: translateY(-2px);
      }
      .manage-card.is-paused {
        opacity: 0.82;
      }
      .manage-card__media {
        position: relative;
        display: block;
        aspect-ratio: 4 / 3;
        background: var(--ink-3);
        overflow: hidden;
      }
      .manage-card__media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .manage-card__layer {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(7, 6, 9, 0.15), transparent 40%, rgba(7, 6, 9, 0.55));
      }
      .manage-card__media > .badge {
        position: absolute;
        left: 9px;
        top: 9px;
      }
      .manage-card__status {
        position: absolute;
        right: 9px;
        top: 9px;
      }
      .manage-card__body {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 12px;
        flex: 1;
        min-width: 0;
      }
      .manage-card__meta {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--muted-2);
      }
      .manage-card__meta .mono {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 0.52rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .manage-card__meta app-icon {
        color: var(--muted-2);
      }
      .manage-card__title {
        font-size: 0.98rem;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.25;
        color: var(--paper);
        text-decoration: none;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: 2.4em;
      }
      .manage-card__title:hover {
        color: var(--lime);
      }
      .manage-card__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: auto;
      }
      .manage-card__price {
        font-family: var(--font-mono);
        font-size: 0.76rem;
        color: var(--lime);
        white-space: nowrap;
      }
      .manage-card__loc {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        font-size: 0.64rem;
        color: var(--muted-2);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 55%;
      }
      .manage-card__time {
        font-size: 0.5rem;
        color: var(--muted-2);
      }
      .manage-card__actions {
        display: flex;
        align-items: center;
        gap: 5px;
        flex-wrap: wrap;
        padding-top: 8px;
        border-top: 1px solid var(--line);
        margin-top: 3px;
      }
      .manage-card__actions .btn {
        padding: 5px 8px;
        font-size: 0.68rem;
      }
      .icon-btn {
        display: grid;
        place-items: center;
        width: 31px;
        height: 31px;
        border: 1px solid var(--line);
        border-radius: 7px;
        background: transparent;
        color: var(--muted);
        cursor: pointer;
        flex: 0 0 auto;
      }
      .icon-btn:hover {
        border-color: var(--line-strong);
        color: var(--paper);
      }
      .icon-btn:last-child:hover {
        color: var(--pink);
        border-color: rgba(255, 77, 141, 0.4);
        background: var(--pink-soft);
      }
      .sheet-scrim {
        position: fixed;
        inset: 0;
        z-index: 200;
        background: rgba(7, 6, 9, 0.65);
        backdrop-filter: blur(3px);
      }
      .sheet {
        position: fixed;
        z-index: 210;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(480px, 100vw);
        display: flex;
        flex-direction: column;
        background: #0e0b13;
        border-left: 1px solid var(--line-strong);
        box-shadow: -30px 0 80px rgba(0, 0, 0, 0.6);
        overflow-y: auto;
        animation: sheet-in 0.3s var(--ease-out);
      }
      @keyframes sheet-in {
        from {
          transform: translateX(100%);
        }
        to {
          transform: translateX(0);
        }
      }
      .sheet__head {
        position: sticky;
        top: 0;
        z-index: 1;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding: 16px 18px;
        border-bottom: 1px solid var(--line);
        background: #0e0b13;
      }
      .sheet__head .mono {
        font-size: 0.5rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--lime);
      }
      .sheet__head h2 {
        font-size: 1.2rem;
        letter-spacing: -0.03em;
        margin-top: 2px;
      }
      .sheet__body {
        display: grid;
        gap: 13px;
        padding: 18px;
      }
      .sheet__note {
        display: flex;
        gap: 7px;
        padding: 9px 11px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: rgba(244, 240, 230, 0.02);
        font-size: 0.7rem;
        line-height: 1.45;
        color: var(--muted);
      }
      .sheet__note app-icon {
        color: var(--lime);
        flex: 0 0 auto;
        margin-top: 1px;
      }
      .sheet__actions {
        display: flex;
        gap: 8px;
        padding-top: 4px;
      }
      .confirm {
        position: fixed;
        z-index: 220;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: min(420px, calc(100vw - 2rem));
        display: grid;
        gap: 10px;
        padding: 22px;
        border: 1px solid var(--line-strong);
        border-radius: var(--radius);
        background: var(--ink-2);
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7);
      }
      .confirm__icon {
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: var(--pink-soft);
        color: var(--pink);
      }
      .confirm h2 {
        font-size: 1.25rem;
        letter-spacing: -0.03em;
      }
      .confirm p {
        font-size: 0.84rem;
        line-height: 1.55;
        color: var(--muted);
      }
      .confirm__actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 5px;
      }
      @media (max-width: 700px) {
        .summary {
          grid-template-columns: repeat(2, 1fr);
        }
        .toolbar__search {
          flex-basis: 100%;
          max-width: none;
        }
        .cards {
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 10px;
        }
        .manage-card__actions .btn span {
          display: none;
        }
        .sheet {
          top: auto;
          left: 0;
          width: 100%;
          max-height: 92dvh;
          border-left: 0;
          border-top: 1px solid var(--line-strong);
          border-radius: 18px 18px 0 0;
        }
        @keyframes sheet-in {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      }
    `,
  ],
})
export class MyStuffPage implements OnInit {
  private readonly listingsApi = inject(ListingService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly mine = signal<Listing[]>([]);
  protected readonly favorites = signal<Listing[]>([]);
  protected readonly loading = signal(true);
  protected readonly activeTab = signal<StuffTab>('all');
  protected readonly query = signal('');
  protected readonly editing = signal<Listing | null>(null);
  protected readonly pendingRemove = signal<Listing | null>(null);
  protected readonly saving = signal(false);
  protected readonly busyId = signal<string | null>(null);
  protected readonly editError = signal<string | null>(null);

  protected readonly tabs: { value: StuffTab; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'active', label: 'Activas' },
    { value: 'paused', label: 'Pausadas' },
    { value: 'archived', label: 'Archivadas' },
    { value: 'favorites', label: 'Favoritos' },
  ];

  protected readonly conditions = Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }));

  protected readonly editForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(90)]],
    description: ['', [Validators.required, Validators.minLength(30), Validators.maxLength(2000)]],
    condition: ['GOOD', [Validators.required]],
    location: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    price: [0, [Validators.min(0)]],
  });

  protected readonly visible = computed(() => {
    const tab = this.activeTab();
    const term = this.query().trim().toLowerCase();
    const source = tab === 'favorites' ? this.favorites() : this.mine();
    const filtered = tab === 'favorites' ? source : source.filter((item) => this.matchesTab(item, tab));
    if (!term) return filtered;
    return filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        (item.category?.name ?? '').toLowerCase().includes(term) ||
        item.tags.some((tag) => tag.toLowerCase().includes(term)),
    );
  });

  ngOnInit(): void {
    forkJoin({
      mine: this.listingsApi.mine().pipe(catchError(() => of({ items: [] as Listing[] }))),
      favorites: this.listingsApi.favorites().pipe(catchError(() => of({ items: [] as Listing[] }))),
    }).subscribe(({ mine, favorites }) => {
      this.mine.set(mine.items);
      this.favorites.set(favorites.items);
      this.loading.set(false);
    });
  }

  protected count(status: ListingStatus): number {
    return this.mine().filter((item) => item.status === status).length;
  }

  protected tabCount(tab: StuffTab): number {
    if (tab === 'all') return this.mine().length;
    if (tab === 'favorites') return this.favorites().length;
    if (tab === 'active') return this.count('ACTIVE');
    if (tab === 'paused') return this.count('PAUSED');
    return this.count('ARCHIVED') + this.count('REMOVED');
  }

  protected image(item: Listing): string {
    return mediaUrl(item.imageUrl, item.id);
  }

  protected price(item: Listing): string {
    if (item.modality === 'BARTER') return 'Trueque';
    const money = formatMoney(item.priceCents, item.currency);
    return item.modality === 'BOTH' ? `${money} · o trueque` : money;
  }

  protected ago(iso: string): string {
    return relativeTime(iso);
  }

  protected modalityLabel(item: Listing): string {
    return MODALITY_LABELS[item.modality] ?? item.modality;
  }

  protected openEdit(item: Listing): void {
    this.editError.set(null);
    this.editForm.reset({
      title: item.title,
      description: item.description,
      condition: item.condition,
      location: item.location,
      price: item.priceCents > 0 ? item.priceCents / 100 : 0,
    });
    this.editing.set(item);
  }

  protected closeEdit(): void {
    this.editing.set(null);
    this.editError.set(null);
  }

  protected saveEdit(): void {
    const item = this.editing();
    if (!item) return;
    this.editForm.markAllAsTouched();
    if (this.editForm.invalid) return;
    const value = this.editForm.getRawValue();
    const priceCents = item.modality === 'BARTER' ? 0 : Math.round(Number(value.price) * 100);
    if (item.modality !== 'BARTER' && priceCents < 100) {
      this.editForm.controls.price.setErrors({ min: true });
      return;
    }
    this.saving.set(true);
    this.editError.set(null);
    this.listingsApi
      .update(item.id, {
        title: value.title.trim(),
        description: value.description.trim(),
        condition: value.condition,
        location: value.location.trim(),
        priceCents,
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.replaceMine(updated);
          this.closeEdit();
          this.toast.success('Publicación actualizada', 'Los cambios ya están visibles.');
        },
        error: (error) => {
          this.saving.set(false);
          this.editError.set(toApiError(error).message);
        },
      });
  }

  protected setStatus(item: Listing, status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'): void {
    this.busyId.set(item.id);
    this.listingsApi.setStatus(item.id, status).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.replaceMine(updated);
        this.toast.success(status === 'ACTIVE' ? 'Publicación activa' : 'Publicación pausada');
      },
      error: (error) => {
        this.busyId.set(null);
        this.toast.error('No se pudo actualizar', toApiError(error).message);
      },
    });
  }

  protected askRemove(item: Listing): void {
    this.pendingRemove.set(item);
  }

  protected cancelRemove(): void {
    this.pendingRemove.set(null);
  }

  protected remove(item: Listing): void {
    this.busyId.set(item.id);
    this.listingsApi.remove(item.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.pendingRemove.set(null);
        this.mine.update((items) => items.filter((entry) => entry.id !== item.id));
        this.favorites.update((items) => items.filter((entry) => entry.id !== item.id));
        this.toast.success('Publicación retirada', 'Ya no aparece en el mercado.');
      },
      error: (error) => {
        this.busyId.set(null);
        this.toast.error('No se pudo retirar', toApiError(error).message);
      },
    });
  }

  protected unfavorite(item: Listing): void {
    this.listingsApi.toggleFavorite(item.id).subscribe({
      next: () => {
        this.favorites.update((items) => items.filter((entry) => entry.id !== item.id));
        this.toast.info('Quitado de favoritos');
      },
      error: (error) => this.toast.error('No se pudo actualizar', toApiError(error).message),
    });
  }

  private matchesTab(item: Listing, tab: StuffTab): boolean {
    if (tab === 'all') return true;
    if (tab === 'active') return item.status === 'ACTIVE';
    if (tab === 'paused') return item.status === 'PAUSED';
    return item.status === 'ARCHIVED' || item.status === 'REMOVED';
  }

  private replaceMine(updated: Listing): void {
    this.mine.update((items) => items.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)));
    this.favorites.update((items) => items.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)));
  }
}

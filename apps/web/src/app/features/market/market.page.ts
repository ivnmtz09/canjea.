import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { CategoryService, ListingService, type ListingQuery } from '../../core/listing.service';
import type { Category, Listing, PageMeta } from '../../core/models';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { IconComponent, type IconName } from '../../shared/icon.component';
import { ListingCardComponent } from '../../shared/listing-card.component';
import { SiteFooterComponent } from '../../shared/site-footer.component';
import { SiteHeaderComponent } from '../../shared/site-header.component';

@Component({
  selector: 'app-market-page',
  imports: [
    RouterLink,
    SiteHeaderComponent,
    SiteFooterComponent,
    ListingCardComponent,
    EmptyStateComponent,
    IconComponent,
  ],
  template: `
    <app-site-header />

    <main id="contenido">
      <section class="market-hero">
        <div class="market-hero__glow" aria-hidden="true"></div>
        <div class="container">
          <nav class="breadcrumb" aria-label="Ruta">
            <a routerLink="/">Inicio</a>
            <app-icon name="chevron-right" [size]="11" />
            <span>Mercado</span>
          </nav>

          <div class="market-hero__grid">
            <div>
              <p class="eyebrow">Mercado abierto</p>
              <h1 class="display market-hero__title">
                TODO ESTÁ<br /><em class="serif lime">en circulación.</em>
              </h1>
              <p class="lede market-hero__lede">
                Objetos, habilidades, servicios y tiempo. Encuentra lo que necesitas y propón un canje —
                con trueque, con dinero, o con ambos.
              </p>
            </div>

            <div class="market-hero__stats">
              <div class="stat">
                <span class="stat__n">{{ meta().total }}</span>
                <span class="mono">publicaciones</span>
              </div>
              <div class="stat">
                <span class="stat__n">{{ categories().length }}</span>
                <span class="mono">categorías</span>
              </div>
              <div class="stat">
                <span class="stat__n">2</span>
                <span class="mono">formas de pago</span>
              </div>
              <div class="market-hero__stamp mono">
                <app-icon name="repeat" [size]="13" /> trueque o efectivo
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="container market">
        <div class="filters">
          <form class="search-wrap" (submit)="submitSearch($event)">
            <app-icon name="search" [size]="16" />
            <input
              id="market-search"
              name="q"
              class="input input--search"
              type="search"
              placeholder="Buscar bici, guitarra, diseño, monitor…"
              [value]="q()"
              (input)="q.set($any($event.target).value)"
              aria-label="Buscar publicaciones"
              autocomplete="off"
            />
            <button class="search-go" type="submit" aria-label="Buscar">
              <app-icon name="arrow-right" [size]="15" />
            </button>
          </form>

          <div class="segmented filters__kind" role="group" aria-label="Tipo de publicación">
            <button type="button" [class.is-active]="kind() === 'ALL'" (click)="setKind('ALL')">Todo</button>
            <button type="button" [class.is-active]="kind() === 'OFFER'" (click)="setKind('OFFER')">
              <app-icon name="package" [size]="13" /> Se ofrece
            </button>
            <button type="button" [class.is-active]="kind() === 'NEED'" (click)="setKind('NEED')">
              <app-icon name="search" [size]="13" /> Se necesita
            </button>
          </div>

          <label class="filter-select" for="filter-modality">
            <span class="mono">Pago</span>
            <select id="filter-modality" name="modality" class="select" [value]="modality()" (change)="setModality($any($event.target).value)">
              <option value="">Cualquiera</option>
              <option value="BARTER">Solo trueque</option>
              <option value="CASH">Solo dinero</option>
              <option value="BOTH">Trueque o dinero</option>
            </select>
          </label>

          <label class="filter-select filter-select--sort" for="filter-sort">
            <span class="mono">Orden</span>
            <select id="filter-sort" name="sort" class="select" [value]="sort()" (change)="setSort($any($event.target).value)">
              <option value="recent">Recientes</option>
              <option value="popular">Populares</option>
              <option value="price_asc">Precio: menor</option>
              <option value="price_desc">Precio: mayor</option>
            </select>
          </label>
        </div>

        <div class="cats">
          <button class="chip" [class.is-active]="category() === ''" type="button" (click)="setCategory('')">
            Todas
          </button>
          @for (cat of categories(); track cat.id) {
            <button class="chip" [class.is-active]="category() === cat.slug" type="button" (click)="setCategory(cat.slug)">
              <app-icon [name]="iconFor(cat.slug)" [size]="13" /> {{ cat.name }}
              <span class="cats__count mono">{{ cat.listingsCount }}</span>
            </button>
          }
        </div>

        <div class="market__bar">
          <p class="mono market__count">
            {{ meta().total }} {{ meta().total === 1 ? 'resultado' : 'resultados' }}
            @if (q()) {
              · «{{ q() }}»
            }
          </p>
          @if (activeFilters()) {
            <button class="link-btn" type="button" (click)="clearFilters()">
              <app-icon name="x" [size]="13" /> Limpiar filtros
            </button>
          }
        </div>

        @if (loading()) {
          <div class="grid grid--cards">
            @for (item of [1, 2, 3, 4, 5, 6, 7, 8]; track item) {
              <div class="skeleton-card">
                <div class="skeleton" style="aspect-ratio: 4 / 3"></div>
                <div class="skeleton skeleton--line" style="width: 78%"></div>
                <div class="skeleton skeleton--line" style="width: 48%"></div>
              </div>
            }
          </div>
        } @else if (items().length === 0) {
          <app-empty-state
            icon="search"
            title="Nada coincide con esa búsqueda"
            message="Prueba con otra palabra, cambia de categoría o publica lo que estás buscando."
          >
            <a class="btn btn--lime btn--sm" routerLink="/app/publicar">Publicar una necesidad</a>
            <button class="btn btn--ghost btn--sm" type="button" (click)="clearFilters()">Limpiar filtros</button>
          </app-empty-state>
        } @else {
          <div class="grid grid--cards">
            @for (listing of items(); track listing.id) {
              <app-listing-card [listing]="listing" />
            }
          </div>

          @if (meta().pages > 1) {
            <nav class="pagination" aria-label="Páginas">
              <button class="page-btn" type="button" [disabled]="meta().page <= 1" (click)="goTo(meta().page - 1)">
                <app-icon name="chevron-left" [size]="15" /> Anterior
              </button>

              <div class="page-numbers">
                @for (page of pageNumbers(); track page) {
                  @if (page === 0) {
                    <span class="page-gap">…</span>
                  } @else {
                    <button
                      class="page-num"
                      type="button"
                      [class.is-active]="page === meta().page"
                      (click)="goTo(page)"
                    >
                      {{ page }}
                    </button>
                  }
                }
              </div>

              <button class="page-btn" type="button" [disabled]="meta().page >= meta().pages" (click)="goTo(meta().page + 1)">
                Siguiente <app-icon name="chevron-right" [size]="15" />
              </button>
            </nav>
          }
        }
      </section>
    </main>

    <app-site-footer />
  `,
  styles: [
    `
      .market-hero {
        position: relative;
        padding: clamp(1.5rem, 4vw, 3rem) 0 clamp(1.5rem, 3vw, 2.5rem);
        border-bottom: 1px solid var(--line);
        overflow: hidden;
      }
      .market-hero__glow {
        position: absolute;
        top: -60%;
        right: -5%;
        width: 680px;
        height: 680px;
        background: radial-gradient(circle, rgba(124, 92, 255, 0.16), transparent 65%);
        pointer-events: none;
      }
      .market-hero__grid {
        display: grid;
        grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.6fr);
        gap: 2.5rem;
        align-items: end;
        position: relative;
      }
      .market-hero__title {
        margin: 14px 0 18px;
        font-size: clamp(2.6rem, 6.5vw, 5.6rem);
      }
      .market-hero__title em {
        color: var(--lime);
        font-size: 1.02em;
      }
      .market-hero__lede {
        max-width: 52ch;
        font-size: 0.98rem;
      }
      .market-hero__stats {
        position: relative;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1px;
        background: var(--line);
        border: 1px solid var(--line);
        border-radius: var(--radius);
        overflow: hidden;
      }
      .stat {
        display: grid;
        gap: 2px;
        padding: 18px;
        background: var(--ink);
      }
      .stat__n {
        font-family: var(--font-display);
        font-size: clamp(1.8rem, 3.4vw, 2.8rem);
        font-weight: 600;
        letter-spacing: -0.05em;
        line-height: 1;
      }
      .stat .mono {
        font-size: 0.54rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .market-hero__stamp {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 11px;
        background: var(--lime);
        color: var(--ink);
        font-size: 0.58rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-weight: 600;
      }
      .market {
        padding-block: clamp(1.5rem, 3vw, 2.4rem) 4rem;
      }
      .filters {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 1rem;
      }
      .search-wrap {
        flex: 1 1 280px;
        max-width: 430px;
      }
      .search-wrap .input {
        padding-right: 46px;
      }
      .search-go {
        position: absolute;
        right: 5px;
        top: 50%;
        transform: translateY(-50%);
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--ink-3);
        color: var(--lime);
        cursor: pointer;
      }
      .search-go:hover {
        background: var(--lime);
        color: var(--ink);
      }
      .filters__kind {
        flex: 0 0 auto;
      }
      .filter-select {
        display: flex;
        align-items: center;
        gap: 7px;
        flex: 0 0 auto;
      }
      .filter-select .mono {
        font-size: 0.52rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .filter-select .select {
        width: auto;
        min-height: 42px;
        font-size: 0.78rem;
        padding-block: 0.4rem;
      }
      .filter-select--sort {
        margin-left: auto;
      }
      .cats {
        display: flex;
        gap: 7px;
        overflow-x: auto;
        padding-bottom: 4px;
        scrollbar-width: thin;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-x: contain;
      }
      .cats__count {
        font-size: 0.5rem;
        color: var(--muted-2);
        padding-left: 5px;
        border-left: 1px solid rgba(244, 240, 230, 0.18);
      }
      .chip.is-active .cats__count {
        color: rgba(7, 6, 9, 0.6);
        border-color: rgba(7, 6, 9, 0.2);
      }
      .market__bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-block: 1.2rem 1rem;
        padding-top: 0.9rem;
        border-top: 1px solid var(--line);
      }
      .market__count {
        font-size: 0.58rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .market__bar .link-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.72rem;
      }
      .grid--cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 16px;
      }
      .skeleton-card {
        display: grid;
        gap: 9px;
        padding: 10px;
        border: 1px solid var(--line);
        border-radius: var(--radius);
      }
      .pagination {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-top: 2.4rem;
        padding-top: 1.4rem;
        border-top: 1px solid var(--line);
        flex-wrap: wrap;
      }
      .page-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border: 1px solid var(--line);
        background: var(--ink-2);
        color: var(--paper-dim);
        border-radius: 999px;
        padding: 8px 14px;
        font-size: 0.76rem;
        cursor: pointer;
      }
      .page-btn:hover:not(:disabled) {
        border-color: var(--lime);
        color: var(--lime);
      }
      .page-btn:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
      .page-numbers {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .page-num {
        display: grid;
        place-items: center;
        width: 33px;
        height: 33px;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
        color: var(--muted);
        font-family: var(--font-mono);
        font-size: 0.68rem;
        cursor: pointer;
      }
      .page-num:hover {
        border-color: var(--line);
        color: var(--paper);
      }
      .page-num.is-active {
        background: var(--lime);
        color: var(--ink);
        font-weight: 700;
      }
      .page-gap {
        color: var(--muted-2);
        padding-inline: 3px;
      }
      @media (max-width: 900px) {
        .market-hero__grid {
          grid-template-columns: 1fr;
          gap: 1.6rem;
        }
        .market-hero__stats {
          grid-template-columns: repeat(3, 1fr);
        }
        .market-hero__stamp {
          grid-column: auto;
        }
        .stat {
          padding: 13px;
        }
        .market-hero__stamp {
          display: none;
        }
      }
      @media (max-width: 680px) {
        .filter-select--sort {
          margin-left: 0;
        }
        .filters {
          gap: 8px;
        }
        .search-wrap {
          max-width: none;
          flex-basis: 100%;
        }
        .filters__kind {
          width: 100%;
        }
        .filters__kind button {
          flex: 1;
          justify-content: center;
        }
        .filter-select {
          flex: 1;
        }
        .filter-select .select {
          flex: 1;
        }
        .grid--cards {
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 10px;
        }
        .pagination {
          justify-content: center;
        }
        .page-numbers {
          order: -1;
          width: 100%;
          justify-content: center;
        }
      }
      @media (max-width: 380px) {
        .grid--cards {
          grid-template-columns: 1fr;
          gap: 12px;
        }
      }
      @media (min-width: 1600px) {
        .grid--cards {
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 22px;
        }
      }
      @media (min-width: 2200px) {
        .grid--cards {
          grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
          gap: 26px;
        }
      }
    `,
  ],
})
export class MarketPage implements OnInit {
  private readonly listingsApi = inject(ListingService);
  private readonly categoriesApi = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly items = signal<Listing[]>([]);
  protected readonly meta = signal<PageMeta>({ page: 1, limit: 12, total: 0, pages: 1 });
  protected readonly categories = signal<Category[]>([]);
  protected readonly loading = signal(true);

  protected readonly q = signal('');
  protected readonly kind = signal<'ALL' | 'OFFER' | 'NEED'>('ALL');
  protected readonly category = signal('');
  protected readonly modality = signal<'' | 'BARTER' | 'CASH' | 'BOTH'>('');
  protected readonly sort = signal<'recent' | 'popular' | 'price_asc' | 'price_desc'>('recent');

  protected readonly activeFilters = computed(
    () => Boolean(this.q() || this.kind() !== 'ALL' || this.category() || this.modality() || this.sort() !== 'recent'),
  );

  protected readonly pageNumbers = computed(() => {
    const { page, pages } = this.meta();
    if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
    const result: number[] = [1];
    if (page > 3) result.push(0);
    for (let item = Math.max(2, page - 1); item <= Math.min(pages - 1, page + 1); item += 1) result.push(item);
    if (page < pages - 2) result.push(0);
    result.push(pages);
    return result;
  });

  private readonly categoryIcons: Record<string, IconName> = {
    tecnologia: 'cpu',
    hogar: 'home',
    bicicletas: 'bike',
    musica: 'music',
    diseno: 'pen-tool',
    servicios: 'wrench',
    comida: 'coffee',
    libros: 'book',
    gaming: 'gamepad',
    moda: 'shirt',
  };

  ngOnInit(): void {
    this.categoriesApi.list().pipe(catchError(() => of({ items: [], total: 0 }))).subscribe((result) => {
      this.categories.set(result.items);
    });

    this.route.queryParamMap.subscribe((params) => {
      this.q.set(params.get('q') ?? '');
      const kind = params.get('kind');
      this.kind.set(kind === 'OFFER' || kind === 'NEED' ? kind : 'ALL');
      this.category.set(params.get('category') ?? '');
      const modality = params.get('modality');
      this.modality.set(
        modality === 'BARTER' || modality === 'CASH' || modality === 'BOTH' ? modality : '',
      );
      const sort = params.get('sort');
      this.sort.set(
        sort === 'popular' || sort === 'price_asc' || sort === 'price_desc' ? sort : 'recent',
      );
      this.load(Number(params.get('page') ?? 1));
    });
  }

  protected iconFor(slug: string): IconName {
    return this.categoryIcons[slug] ?? 'tag';
  }

  protected setKind(value: 'ALL' | 'OFFER' | 'NEED'): void {
    this.kind.set(value);
    this.apply(1);
  }

  protected setCategory(value: string): void {
    this.category.set(value);
    this.apply(1);
  }

  protected setModality(value: string): void {
    this.modality.set(value as '' | 'BARTER' | 'CASH' | 'BOTH');
    this.apply(1);
  }

  protected setSort(value: string): void {
    this.sort.set(value as 'recent' | 'popular' | 'price_asc' | 'price_desc');
    this.apply(1);
  }

  protected submitSearch(event: Event): void {
    event.preventDefault();
    this.apply(1);
  }

  protected goTo(page: number): void {
    this.apply(page);
  }

  protected clearFilters(): void {
    this.q.set('');
    this.kind.set('ALL');
    this.category.set('');
    this.modality.set('');
    this.sort.set('recent');
    void this.router.navigate(['/mercado']);
  }

  private apply(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.q().trim() || null,
        kind: this.kind() === 'ALL' ? null : this.kind(),
        category: this.category() || null,
        modality: this.modality() || null,
        sort: this.sort() === 'recent' ? null : this.sort(),
        page: page > 1 ? page : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private load(page: number): void {
    this.loading.set(true);
    const query: ListingQuery = {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: 12,
      sort: this.sort(),
    };
    const q = this.q().trim();
    const kind = this.kind();
    const category = this.category();
    const modality = this.modality();
    if (q) query.q = q;
    if (kind !== 'ALL') query.kind = kind;
    if (category) query.category = category;
    if (modality) query.modality = modality;

    this.listingsApi
      .list(query)
      .pipe(catchError(() => of({ items: [], meta: { page: 1, limit: 12, total: 0, pages: 1 } })))
      .subscribe((result) => {
        this.items.set(result.items);
        this.meta.set(result.meta);
        this.loading.set(false);
      });
  }
}

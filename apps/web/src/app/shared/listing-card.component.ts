import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { CATEGORY_ICONS, formatMoney, relativeTime } from '../core/format';
import { ListingService } from '../core/listing.service';
import { mediaUrl } from '../core/media';
import type { Listing } from '../core/models';
import { ToastService } from '../core/toast.service';
import { AvatarComponent } from './avatar.component';
import { IconComponent, type IconName } from './icon.component';

@Component({
  selector: 'app-listing-card',
  imports: [RouterLink, AvatarComponent, IconComponent],
  template: `
    <a class="lcard" [class.lcard--need]="listing().kind === 'NEED'" [routerLink]="['/m', listing().id]">
      <div class="lcard__media">
        <img [src]="image()" [alt]="listing().title" loading="lazy" />
        <div class="lcard__shade"></div>
        <span class="badge lcard__kind" [class.badge--pink]="listing().kind === 'NEED'" [class.badge--lime]="listing().kind === 'OFFER'">
          {{ listing().kind === 'OFFER' ? 'Ofrece' : 'Busca' }}
        </span>
        <button class="lcard__fav" type="button" [class.is-on]="favorite()" (click)="toggleFavorite($event)" [attr.aria-label]="favorite() ? 'Quitar de favoritos' : 'Guardar en favoritos'">
          <app-icon name="heart" [size]="16" [strokeWidth]="favorite() ? 2.4 : 1.8" />
        </button>
        <span class="lcard__views mono"><app-icon name="eye" [size]="12" />{{ listing().views }}</span>
      </div>
      <div class="lcard__body">
        <div class="lcard__meta">
          <span class="mono">{{ listing().category?.name ?? 'General' }}</span>
          <span class="mono lcard__loc"><app-icon name="map-pin" [size]="11" />{{ listing().location }}</span>
        </div>
        <h3 class="lcard__title">{{ listing().title }}</h3>
        <div class="lcard__foot">
          <div class="lcard__owner">
            <app-avatar [user]="listing().owner" size="xs" [showVerified]="false" />
            <span>{{ listing().owner?.displayName ?? 'Miembro' }}</span>
          </div>
          <div class="lcard__price" [class.is-barter]="listing().modality === 'BARTER'">{{ priceLabel() }}</div>
        </div>
      </div>
    </a>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      .lcard {
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100%;
        background: rgba(244, 240, 230, 0.025);
        border: 1px solid var(--line);
        border-radius: var(--radius);
        overflow: hidden;
        transition: border-color 0.2s var(--ease), transform 0.25s var(--ease), background 0.2s var(--ease);
      }
      .lcard:hover {
        border-color: rgba(201, 255, 61, 0.55);
        transform: translateY(-4px);
        background: rgba(244, 240, 230, 0.04);
      }
      .lcard--need:hover {
        border-color: rgba(255, 77, 141, 0.55);
      }
      .lcard__media {
        position: relative;
        aspect-ratio: 4 / 3;
        overflow: hidden;
        background: var(--surface);
      }
      .lcard__media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s var(--ease);
      }
      .lcard:hover .lcard__media img {
        transform: scale(1.045);
      }
      .lcard__shade {
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgba(7, 6, 9, 0.55), transparent 45%);
        pointer-events: none;
      }
      .lcard__kind {
        position: absolute;
        left: 10px;
        top: 10px;
        backdrop-filter: blur(6px);
      }
      .lcard__fav {
        position: absolute;
        right: 10px;
        top: 10px;
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1px solid rgba(244, 240, 230, 0.25);
        background: rgba(7, 6, 9, 0.55);
        color: var(--paper);
        cursor: pointer;
        backdrop-filter: blur(8px);
        transition: all 0.2s var(--ease);
      }
      .lcard__fav:hover,
      .lcard__fav.is-on {
        color: var(--pink);
        border-color: var(--pink);
        background: rgba(255, 77, 141, 0.16);
      }
      .lcard__views {
        position: absolute;
        left: 10px;
        bottom: 10px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.58rem;
        color: rgba(244, 240, 230, 0.75);
        letter-spacing: 0.06em;
      }
      .lcard__body {
        display: flex;
        flex-direction: column;
        gap: 9px;
        padding: 14px;
        flex: 1;
      }
      .lcard__meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        color: var(--muted-2);
      }
      .lcard__meta .mono {
        font-size: 0.56rem;
        letter-spacing: 0.12em;
      }
      .lcard__loc {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 55%;
        text-transform: none;
        letter-spacing: 0.02em;
        font-family: var(--font-sans);
        font-size: 0.68rem;
      }
      .lcard__title {
        font-size: 1.08rem;
        line-height: 1.18;
        letter-spacing: -0.025em;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: 2.4em;
      }
      .lcard__foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-top: auto;
        padding-top: 4px;
      }
      .lcard__owner {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
        color: var(--muted);
        font-size: 0.72rem;
      }
      .lcard__owner span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .lcard__price {
        font-family: var(--font-mono);
        font-size: 0.82rem;
        font-weight: 500;
        color: var(--paper);
        white-space: nowrap;
      }
      .lcard__price.is-barter {
        color: var(--lime);
        font-size: 0.64rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
    `,
  ],
})
export class ListingCardComponent {
  readonly listing = input.required<Listing>();
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly listings = inject(ListingService);
  private readonly toast = inject(ToastService);

  protected readonly favorite = signal(false);
  protected readonly favoriteCount = signal(0);
  protected readonly image = computed(() => mediaUrl(this.listing().imageUrl, this.listing().id));
  protected readonly priceLabel = computed(() => {
    const item = this.listing();
    if (item.modality === 'BARTER') return 'Trueque';
    const money = formatMoney(item.priceCents, item.currency);
    return item.modality === 'BOTH' ? `${money} · o trueque` : money;
  });
  protected readonly categoryIcon = computed<IconName>(
    () => (CATEGORY_ICONS[this.listing().category?.slug ?? ''] as IconName) ?? 'tag',
  );
  protected readonly time = computed(() => relativeTime(this.listing().createdAt));

  constructor() {
    effect(() => {
      this.favorite.set(this.listing().isFavorite);
      this.favoriteCount.set(this.listing().favoritesCount);
    });
  }

  protected toggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/entrar'], { queryParams: { redirect: `/m/${this.listing().id}` } });
      return;
    }
    this.listings.toggleFavorite(this.listing().id).subscribe({
      next: (result) => {
        this.favorite.set(result.favorited);
        this.favoriteCount.set(result.favoritesCount);
        this.toast.success(result.favorited ? 'Guardado en favoritos' : 'Quitado de favoritos');
      },
      error: (error) => this.toast.error('No se pudo actualizar', error?.message),
    });
  }
}

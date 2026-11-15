import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiService, toApiError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ROLE_LABELS, formatDate, formatNumber, relativeTime } from '../../core/format';
import type { ProfileResponse, Review } from '../../core/models';
import { AvatarComponent } from '../../shared/avatar.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { IconComponent } from '../../shared/icon.component';
import { ListingCardComponent } from '../../shared/listing-card.component';
import { SiteFooterComponent } from '../../shared/site-footer.component';
import { SiteHeaderComponent } from '../../shared/site-header.component';

@Component({
  selector: 'app-public-profile-page',
  imports: [
    RouterLink,
    SiteHeaderComponent,
    SiteFooterComponent,
    AvatarComponent,
    IconComponent,
    ListingCardComponent,
    EmptyStateComponent,
  ],
  template: `
    <app-site-header />

    <main id="contenido">
      @if (loading()) {
        <div class="container profile-loading">
          <div class="skeleton" style="height: 210px; border-radius: 20px"></div>
          <div class="skeleton" style="height: 320px; border-radius: 16px"></div>
        </div>
      } @else if (error()) {
        <div class="container">
          <app-empty-state icon="alert-circle" title="No encontramos este perfil" [message]="error() ?? ''">
            <a class="btn btn--primary btn--sm" routerLink="/mercado">Explorar el mercado</a>
          </app-empty-state>
        </div>
      } @else if (profile(); as data) {
        <section class="profile-hero">
          <div class="profile-hero__glow" aria-hidden="true"></div>
          <div class="container">
            <nav class="breadcrumb" aria-label="Ruta">
              <a routerLink="/">Inicio</a>
              <app-icon name="chevron-right" [size]="11" />
              <a routerLink="/mercado">Mercado</a>
              <app-icon name="chevron-right" [size]="11" />
              <span>{{ data.user.displayName }}</span>
            </nav>

            <div class="profile-hero__grid">
              <div class="profile-hero__identity">
                <app-avatar [user]="data.user" size="xl" [ring]="true" />

                <div class="profile-hero__copy">
                  <div class="profile-hero__badges">
                    <span class="badge badge--lime">{{ roleLabel() }}</span>
                    @if (data.user.emailVerified) {
                      <span class="badge"><app-icon name="badge-check" [size]="11" /> identidad verificada</span>
                    }
                    @if (data.isSelf) {
                      <span class="badge badge--violet">tu perfil</span>
                    }
                  </div>

                  <h1 class="h2">{{ data.user.displayName }}</h1>
                  <p class="profile-hero__handle mono">&#64;{{ data.user.username }}</p>

                  <p class="profile-hero__meta">
                    <span><app-icon name="map-pin" [size]="13" /> {{ data.user.city }}, {{ data.user.country }}</span>
                    <span class="dot" aria-hidden="true"></span>
                    <span><app-icon name="calendar" [size]="13" /> desde {{ memberSince() }}</span>
                  </p>

                  @if (data.user.bio) {
                    <p class="profile-hero__bio">{{ data.user.bio }}</p>
                  } @else {
                    <p class="profile-hero__bio profile-hero__bio--empty">
                      Todavía no escribió una biografía. Su reputación habla por él.
                    </p>
                  }

                  <div class="profile-hero__actions">
                    @if (data.isSelf) {
                      <a class="btn btn--primary btn--sm" routerLink="/app/perfil">
                        <app-icon name="pencil" [size]="14" /> Editar mi perfil
                      </a>
                      <a class="btn btn--ghost btn--sm" routerLink="/app/publicar">
                        <app-icon name="plus" [size]="14" /> Publicar
                      </a>
                    } @else if (auth.isAuthenticated()) {
                      <a class="btn btn--primary btn--sm" routerLink="/mercado">
                        <app-icon name="handshake" [size]="14" /> Proponer un canje
                      </a>
                    } @else {
                      <a class="btn btn--primary btn--sm" routerLink="/registro">
                        <app-icon name="user-check" [size]="14" /> Crear cuenta para negociar
                      </a>
                      <a class="btn btn--ghost btn--sm" routerLink="/entrar">Ya tengo cuenta</a>
                    }
                  </div>
                </div>
              </div>

              <aside class="trust-panel">
                <p class="mono kicker-mini">Reputación</p>
                <div class="trust-panel__rating">
                  <strong>{{ (data.user.ratingAvg ?? 0).toFixed(1) }}</strong>
                  <div>
                    <span class="stars" aria-hidden="true">
                      @for (star of stars; track star) {
                        <app-icon name="star" [size]="14" [strokeWidth]="1.6" [class.is-on]="star <= roundedRating()" />
                      }
                    </span>
                    <span class="mono">{{ formatNumber(data.user.ratingCount) }} reseñas</span>
                  </div>
                </div>

                <div class="trust-panel__stats">
                  <div>
                    <span class="mono">Publicaciones</span>
                    <strong>{{ formatNumber(data.stats.activeListings) }}</strong>
                  </div>
                  <div>
                    <span class="mono">Canjes cerrados</span>
                    <strong>{{ formatNumber(data.stats.completedDeals) }}</strong>
                  </div>
                  <div>
                    <span class="mono">Respuesta</span>
                    <strong>{{ data.stats.responseTime }}</strong>
                  </div>
                </div>

                <p class="trust-panel__note">
                  <app-icon name="shield-check" [size]="14" />
                  Cada canje con dinero queda protegido en garantía hasta que ambas partes confirman.
                </p>
              </aside>
            </div>
          </div>
        </section>

        <section class="section--tight">
          <div class="container profile-grid">
            <div>
              <div class="section-head">
                <div>
                  <p class="eyebrow">Vitrina</p>
                  <h2 class="h3">Lo que {{ firstName() }} tiene en circulación</h2>
                </div>
                <span class="mono">{{ data.listings.length }} activas</span>
              </div>

              @if (data.listings.length === 0) {
                <app-empty-state
                  icon="package"
                  title="Sin publicaciones activas"
                  message="Cuando publique algo nuevo, aparecerá aquí automáticamente."
                >
                  <a class="btn btn--primary btn--sm" routerLink="/mercado">Ver el mercado</a>
                </app-empty-state>
              } @else {
                <div class="profile-listings">
                  @for (listing of data.listings; track listing.id) {
                    <app-listing-card [listing]="listing" />
                  }
                </div>
              }
            </div>

            <aside class="profile-reviews panel">
              <div class="panel__head panel__head--compact">
                <div>
                  <p class="mono kicker-mini">Confianza</p>
                  <h2 class="panel__title">Reseñas recibidas</h2>
                </div>
                <span class="badge badge--lime">{{ data.reviews.length }}</span>
              </div>

              @if (data.reviews.length === 0) {
                <div class="reviews-empty">
                  <app-icon name="star" [size]="22" />
                  <strong>Aún sin reseñas</strong>
                  <p>La primera reseña aparece cuando se cierra un canje.</p>
                </div>
              } @else {
                <div class="review-list">
                  @for (review of data.reviews; track review.id) {
                    <article class="review-row">
                      <app-avatar [user]="reviewAuthor(review)" size="sm" />
                      <div class="review-row__body">
                        <div class="review-row__top">
                          <a class="review-row__name" [routerLink]="['/u', review.author.username]">
                            {{ review.author.displayName }}
                          </a>
                          <span class="stars stars--sm" aria-label="Calificación">
                            @for (star of stars; track star) {
                              <app-icon name="star" [size]="11" [class.is-on]="star <= review.rating" />
                            }
                          </span>
                          <span class="review-row__date">{{ ago(review.createdAt) }}</span>
                        </div>
                        @if (review.comment) {
                          <p>{{ review.comment }}</p>
                        } @else {
                          <p class="muted">Canje cerrado sin comentario.</p>
                        }
                      </div>
                    </article>
                  }
                </div>
              }
            </aside>
          </div>
        </section>
      }
    </main>

    <app-site-footer />
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .profile-loading {
        display: grid;
        gap: 1rem;
        padding-block: 2rem;
      }
      .profile-hero {
        position: relative;
        overflow: hidden;
        padding-block: 1.6rem 2.4rem;
        border-bottom: 1px solid var(--line);
      }
      .profile-hero__glow {
        position: absolute;
        inset: -40% 35% auto -10%;
        height: 420px;
        background: radial-gradient(circle at 30% 30%, rgba(124, 92, 255, 0.16), transparent 62%);
        pointer-events: none;
      }
      .profile-hero__grid {
        position: relative;
        display: grid;
        grid-template-columns: minmax(0, 1.55fr) minmax(0, 0.65fr);
        gap: 2.2rem;
        align-items: start;
        margin-top: 1.4rem;
      }
      .profile-hero__identity {
        display: flex;
        align-items: flex-start;
        gap: 1.35rem;
      }
      .profile-hero__copy {
        display: grid;
        gap: 0.32rem;
        min-width: 0;
      }
      .profile-hero__badges {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 0.25rem;
      }
      .profile-hero__badges .badge {
        font-size: 0.56rem;
      }
      .profile-hero__copy h1 {
        letter-spacing: -0.045em;
      }
      .profile-hero__handle {
        font-size: 0.7rem;
        color: var(--lime);
      }
      .profile-hero__meta {
        display: flex;
        align-items: center;
        gap: 7px;
        flex-wrap: wrap;
        margin-top: 0.5rem;
        font-size: 0.78rem;
        color: var(--muted);
      }
      .profile-hero__meta span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .profile-hero__bio {
        max-width: 62ch;
        margin-top: 0.75rem;
        font-size: 0.9rem;
        line-height: 1.65;
        color: var(--paper-dim);
      }
      .profile-hero__bio--empty {
        color: var(--muted);
        font-style: italic;
        font-family: var(--font-serif);
        font-size: 1.02rem;
      }
      .profile-hero__actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 1.1rem;
      }
      .dot {
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: var(--muted-2);
      }
      .trust-panel {
        display: grid;
        gap: 0.8rem;
        padding: 1rem 1.1rem;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: linear-gradient(160deg, rgba(201, 255, 61, 0.05), var(--ink-2) 55%);
      }
      .kicker-mini {
        font-size: 0.5rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--lime);
      }
      .trust-panel__rating {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .trust-panel__rating > strong {
        font-family: var(--font-display);
        font-size: 2.6rem;
        line-height: 1;
        letter-spacing: -0.06em;
        color: var(--lime);
      }
      .trust-panel__rating > div {
        display: grid;
        gap: 3px;
      }
      .trust-panel__rating .mono {
        font-size: 0.55rem;
        color: var(--muted);
      }
      .stars {
        display: inline-flex;
        gap: 2px;
        color: var(--muted-2);
      }
      .stars app-icon.is-on {
        color: var(--lime);
      }
      .stars--sm {
        gap: 1px;
      }
      .trust-panel__stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--line);
        overflow: hidden;
      }
      .trust-panel__stats > div {
        display: grid;
        gap: 2px;
        padding: 8px 9px;
        background: var(--ink-2);
      }
      .trust-panel__stats .mono {
        font-size: 0.46rem;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .trust-panel__stats strong {
        font-size: 0.88rem;
        font-weight: 600;
      }
      .trust-panel__note {
        display: flex;
        gap: 6px;
        font-size: 0.67rem;
        line-height: 1.45;
        color: var(--muted);
      }
      .trust-panel__note app-icon {
        color: var(--lime);
        flex: 0 0 auto;
        margin-top: 1px;
      }
      .section-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
      }
      .section-head .mono {
        font-size: 0.6rem;
        color: var(--muted);
      }
      .profile-listings {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 14px;
      }
      .profile-reviews {
        position: sticky;
        top: 90px;
      }
      .panel__head--compact {
        margin-bottom: 0.4rem;
      }
      .reviews-empty {
        display: grid;
        gap: 3px;
        place-items: center;
        padding: 1.8rem 1rem;
        text-align: center;
        color: var(--muted);
      }
      .reviews-empty app-icon {
        color: var(--muted-2);
        margin-bottom: 0.3rem;
      }
      .reviews-empty strong {
        font-size: 0.86rem;
        color: var(--paper-dim);
      }
      .reviews-empty p {
        font-size: 0.74rem;
        line-height: 1.5;
        max-width: 30ch;
      }
      .muted {
        color: var(--muted) !important;
        font-style: italic;
      }
      @media (max-width: 960px) {
        .profile-hero__grid {
          grid-template-columns: 1fr;
        }
        .trust-panel {
          max-width: 560px;
        }
        .profile-reviews {
          position: static;
        }
      }
      @media (max-width: 600px) {
        .profile-hero__identity {
          flex-direction: column;
          gap: 0.9rem;
        }
        .profile-listings {
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
        }
      }
    `,
  ],
})
export class PublicProfilePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);

  protected readonly profile = signal<ProfileResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly formatNumber = formatNumber;

  protected readonly firstName = computed(() => {
    const name = this.profile()?.user.displayName ?? 'esta persona';
    return name.split(' ')[0];
  });

  protected readonly roleLabel = computed(() => {
    const role = this.profile()?.user.role;
    return role ? (ROLE_LABELS[role] ?? role) : 'Miembro';
  });

  protected readonly memberSince = computed(() => {
    const created = this.profile()?.user.createdAt;
    return created ? formatDate(created) : '—';
  });

  protected readonly roundedRating = computed(() => Math.round(this.profile()?.user.ratingAvg ?? 0));

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const username = params.get('username') ?? '';
      this.load(username);
    });
  }

  protected ago(iso: string): string {
    return relativeTime(iso);
  }

  protected reviewAuthor(review: Review) {
    return {
      id: review.author.username,
      username: review.author.username,
      displayName: review.author.displayName,
      avatarUrl: review.author.avatarUrl,
      bio: '',
      city: '',
      country: '',
      role: 'USER' as const,
      emailVerified: false,
      ratingAvg: 0,
      ratingCount: 0,
      createdAt: '',
    };
  }

  private load(username: string): void {
    if (!username) {
      this.error.set('El perfil solicitado no es válido.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.api
      .get<ProfileResponse>(`/users/${encodeURIComponent(username)}`)
      .pipe(
        catchError((error) => {
          this.error.set(toApiError(error).message);
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe((profile) => {
        if (!profile) return;
        this.profile.set(profile);
        this.loading.set(false);
      });
  }
}

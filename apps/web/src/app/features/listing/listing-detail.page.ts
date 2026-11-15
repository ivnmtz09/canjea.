import { Component, OnInit, computed, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { toApiError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { DealService } from '../../core/data.services';
import { CONDITION_LABELS, MODALITY_LABELS, formatMoney, relativeTime } from '../../core/format';
import { ListingService } from '../../core/listing.service';
import { mediaUrl } from '../../core/media';
import type { Listing } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { AvatarComponent } from '../../shared/avatar.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { FieldErrorComponent } from '../../shared/field-error.component';
import { IconComponent } from '../../shared/icon.component';
import { ListingCardComponent } from '../../shared/listing-card.component';
import { SiteFooterComponent } from '../../shared/site-footer.component';
import { SiteHeaderComponent } from '../../shared/site-header.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-listing-detail-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    SiteHeaderComponent,
    SiteFooterComponent,
    ListingCardComponent,
    EmptyStateComponent,
    AvatarComponent,
    IconComponent,
    StatusBadgeComponent,
    FieldErrorComponent,
  ],
  template: `
    <app-site-header />

    <main id="contenido" class="detail">
      @if (loading()) {
        <div class="container detail__loading">
          <div class="skeleton detail__skeleton"></div>
          <div class="stack stack-3">
            <div class="skeleton skeleton--line" style="width: 40%"></div>
            <div class="skeleton skeleton--line" style="width: 80%; height: 26px"></div>
            <div class="skeleton skeleton--line" style="width: 55%"></div>
          </div>
        </div>
      } @else if (error()) {
        <div class="container">
          <app-empty-state icon="alert-circle" title="No encontramos esta publicación" [message]="error() ?? ''">
            <a class="btn btn--primary btn--sm" routerLink="/mercado">Volver al mercado</a>
          </app-empty-state>
        </div>
      } @else if (listing(); as item) {
        <div class="container">
          <nav class="breadcrumb" aria-label="Ruta">
            <a routerLink="/">Inicio</a>
            <app-icon name="chevron-right" [size]="11" />
            <a routerLink="/mercado">Mercado</a>
            <app-icon name="chevron-right" [size]="11" />
            <a [routerLink]="['/mercado']" [queryParams]="{ category: item.category?.slug }">{{ item.category?.name }}</a>
            <app-icon name="chevron-right" [size]="11" />
            <span>{{ item.title }}</span>
          </nav>

          <div class="detail__grid">
            <div class="detail__media">
              <div class="poster">
                <img [src]="image()" [alt]="item.title" />
                <div class="poster__badges">
                  <span class="badge" [class.badge--lime]="item.kind === 'OFFER'" [class.badge--pink]="item.kind === 'NEED'">
                    {{ item.kind === 'OFFER' ? 'Se ofrece' : 'Se necesita' }}
                  </span>
                  <app-status-badge [status]="item.status" kind="listing" />
                </div>
                <button
                  class="poster__fav"
                  type="button"
                  [class.is-on]="favorite()"
                  (click)="toggleFavorite()"
                  [attr.aria-label]="favorite() ? 'Quitar de favoritos' : 'Guardar en favoritos'"
                >
                  <app-icon name="heart" [size]="18" [strokeWidth]="favorite() ? 2.4 : 1.8" />
                  <span>{{ favoriteCount() }}</span>
                </button>
                <span class="poster__index mono">PUBLICACIÓN {{ item.id.slice(-6).toUpperCase() }}</span>
              </div>

              <div class="detail__meta-row">
                <span class="mono"><app-icon name="eye" [size]="12" /> {{ item.views }} vistas</span>
                <span class="mono"><app-icon name="clock" [size]="12" /> {{ ago(item.createdAt) }}</span>
                <span class="mono"><app-icon name="map-pin" [size]="12" /> {{ item.location }}</span>
              </div>
            </div>

            <aside class="detail__side">
              <p class="eyebrow eyebrow--plain">{{ item.category?.name ?? 'General' }}</p>
              <h1 class="detail__title">{{ item.title }}</h1>

              <div class="price">
                <span class="price__value">{{ priceMain() }}</span>
                @if (item.modality === 'BOTH') {
                  <span class="price__alt">o trueque por algo que tengas</span>
                }
                @if (item.modality !== 'BARTER' && item.priceCents > 0) {
                  <span class="price__note mono">Fondos protegidos en garantía hasta cerrar</span>
                }
              </div>

              <div class="specs">
                <div class="spec">
                  <span class="mono">Condición</span>
                  <strong>{{ conditionLabel() }}</strong>
                </div>
                <div class="spec">
                  <span class="mono">Forma de pago</span>
                  <strong>{{ modalityLabel() }}</strong>
                </div>
                <div class="spec">
                  <span class="mono">Ubicación</span>
                  <strong>{{ item.location }}</strong>
                </div>
                <div class="spec">
                  <span class="mono">Publicado</span>
                  <strong>{{ ago(item.createdAt) }}</strong>
                </div>
              </div>

              @if (isOwner()) {
                <div class="owner-actions">
                  <div class="alert">
                    <app-icon name="user-check" [size]="17" />
                    <div><strong>Esta publicación es tuya.</strong> Puedes pausarla o editarla desde Mis cosas.</div>
                  </div>
                  <a class="btn btn--primary btn--block" routerLink="/app/mis-cosas">
                    Gestionar mis publicaciones <app-icon name="arrow-right" [size]="15" />
                  </a>
                </div>
              } @else if (item.status !== 'ACTIVE') {
                <div class="alert alert--warn">
                  <app-icon name="alert-triangle" [size]="17" />
                  <div><strong>Esta publicación ya no está disponible.</strong> Puedes explorar otras similares.</div>
                </div>
                <a class="btn btn--ghost btn--block" routerLink="/mercado">Ver el mercado</a>
              } @else {
                <button class="btn btn--primary btn--block btn--lg" type="button" (click)="openDeal()">
                  Proponer un canje <app-icon name="handshake" [size]="17" />
                </button>
                <p class="side__hint">
                  <app-icon name="shield-check" [size]="12" /> Si ofreces dinero, queda retenido hasta que ambas partes cierren.
                </p>
              }

              @if (item.owner; as owner) {
                <a class="owner" [routerLink]="['/u', owner.username]">
                  <app-avatar [user]="owner" size="lg" />
                  <div class="owner__copy">
                    <span class="mono">Publicado por</span>
                    <strong>{{ owner.displayName }}</strong>
                    <span class="owner__rating">
                      <app-icon name="star" [size]="11" />
                      {{ owner.ratingAvg.toFixed(1) }} · {{ owner.ratingCount }} calificaciones
                    </span>
                  </div>
                  <app-icon name="arrow-up-right" [size]="15" />
                </a>
              }

              <a class="report" href="mailto:hola@canjea.app?subject=Reporte%20de%20publicaci%C3%B3n">
                <app-icon name="flag" [size]="12" /> Reportar esta publicación
              </a>
            </aside>
          </div>

          <div class="detail__body">
            <article class="detail__desc panel">
              <h2 class="h3">Sobre esta publicación</h2>
              <p class="detail__text">{{ item.description }}</p>

              @if (item.tags.length) {
                <div class="detail__tags">
                  @for (tag of item.tags; track tag) {
                    <span class="tag">#{{ tag }}</span>
                  }
                </div>
              }
            </article>

            <div class="detail__trust">
              <div class="mini">
                <app-icon name="lock" [size]="18" />
                <div><strong>Escrow</strong><span>El dinero no se mueve solo.</span></div>
              </div>
              <div class="mini">
                <app-icon name="badge-check" [size]="18" />
                <div><strong>Identidad</strong><span>Perfiles con correo verificado.</span></div>
              </div>
              <div class="mini">
                <app-icon name="star" [size]="18" />
                <div><strong>Reputación</strong><span>Calificaciones tras cada canje.</span></div>
              </div>
              <div class="mini">
                <app-icon name="repeat" [size]="18" />
                <div><strong>Sin costo</strong><span>Publicar es gratis.</span></div>
              </div>
            </div>
          </div>

          @if (related().length) {
            <section class="related">
              <div class="related__head">
                <div>
                  <p class="eyebrow">También en el mercado</p>
                  <h2 class="h1">PARA TI,<br /><em class="serif lime">cerca de esto.</em></h2>
                </div>
                <a class="btn btn--ghost btn--sm" routerLink="/mercado">Ver todo <app-icon name="arrow-up-right" [size]="14" /></a>
              </div>
              <div class="related__grid">
                @for (other of related(); track other.id) {
                  <app-listing-card [listing]="other" />
                }
              </div>
            </section>
          }
        </div>
      }
    </main>

    @if (dealOpen()) {
      <div class="sheet-scrim" (click)="closeDeal()" aria-hidden="true"></div>
      <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="deal-title">
        <header class="sheet__head">
          <div>
            <p class="mono">Nueva propuesta</p>
            <h2 id="deal-title">Proponer un canje</h2>
          </div>
          <button class="sheet__close" type="button" (click)="closeDeal()" aria-label="Cerrar">
            <app-icon name="x" [size]="18" />
          </button>
        </header>

        @if (listing(); as item) {
          <div class="sheet__target">
            <img [src]="image()" [alt]="item.title" />
            <div>
              <span class="mono">Quieres</span>
              <strong>{{ item.title }}</strong>
              <span class="sheet__owner">de {{ item.owner?.displayName }}</span>
            </div>
          </div>

          <form class="sheet__body" [formGroup]="dealForm" (ngSubmit)="sendDeal()" novalidate>
            @if (dealError()) {
              <div class="alert alert--danger" role="alert">
                <app-icon name="alert-circle" [size]="17" />
                <div>
                  {{ dealError() }}
                  @if (needsTopUp()) {
                    <a class="topup-link" routerLink="/app/billetera" (click)="closeDeal()">Recargar saldo</a>
                  }
                </div>
              </div>
            }

            @if (item.modality !== 'BARTER') {
              <label class="field">
                <span class="label">
                  Dinero que ofreces ({{ item.currency }})
                  @if (item.modality === 'CASH') {
                    <span class="req">*</span>
                  }
                </span>
                <input
                  class="input"
                  type="number"
                  min="0"
                  step="0.01"
                  inputmode="decimal"
                  formControlName="cash"
                  placeholder="0.00"
                />
                <app-field-error [control]="dealForm.controls.cash" />
                @if (item.modality === 'BOTH') {
                  <p class="hint">Puedes dejar 0 si tu propuesta es solo trueque.</p>
                } @else {
                  <p class="hint">Esta publicación solo se canjea por dinero.</p>
                }
              </label>
            }

            @if (myListings().length) {
              <label class="field">
                <span class="label">¿Ofreces algo tuyo? (opcional)</span>
                <select class="select" formControlName="offerListingId">
                  <option value="">No, solo dinero o mi propuesta</option>
                  @for (mine of myListings(); track mine.id) {
                    <option [value]="mine.id">{{ mine.title }}</option>
                  }
                </select>
              </label>
            }

            <label class="field">
              <span class="label">Mensaje <span class="req">*</span></span>
              <textarea
                class="textarea"
                formControlName="message"
                rows="5"
                placeholder="Cuéntale qué ofreces, por qué te interesa y cómo coordinarían la entrega."
              ></textarea>
              <app-field-error [control]="dealForm.controls.message" />
              <div class="message-meta">
                <span class="hint">Mínimo 10 caracteres. Si no ofreces dinero ni publicación, al menos 20.</span>
                <span class="mono">{{ dealForm.controls.message.value.length }} / 1000</span>
              </div>
            </label>

            <div class="sheet__summary">
              <span class="mono">Quedará en garantía</span>
              <strong>{{ escrowPreview() }}</strong>
            </div>

            <div class="sheet__actions">
              <button class="btn btn--ghost" type="button" (click)="closeDeal()">Cancelar</button>
              <button class="btn btn--primary grow" type="submit" [disabled]="sending()">
                @if (sending()) {
                  <span class="spinner"></span> Enviando…
                } @else {
                  Enviar propuesta <app-icon name="send" [size]="15" />
                }
              </button>
            </div>
            <p class="sheet__legal mono">
              Al enviar aceptas que el monto quede retenido. Si el dueño rechaza, se devuelve completo.
            </p>
          </form>
        }
      </section>
    }

    <app-site-footer />
  `,
  styles: [
    `
      .detail {
        padding-block: 1.2rem 3rem;
        min-height: 60vh;
      }
      .detail__loading {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 2rem;
        padding-block: 2rem;
      }
      .detail__skeleton {
        aspect-ratio: 4 / 3;
        border-radius: var(--radius);
      }
      .detail__grid {
        display: grid;
        grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
        gap: clamp(1.5rem, 4vw, 3rem);
        align-items: start;
        margin-top: 0.4rem;
      }
      .poster {
        position: relative;
        border: 1px solid var(--line-strong);
        border-radius: var(--radius);
        overflow: hidden;
        background: var(--ink-3);
        aspect-ratio: 4 / 3;
        box-shadow: 16px 16px 0 rgba(124, 92, 255, 0.1);
      }
      .poster img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .poster__badges {
        position: absolute;
        left: 12px;
        top: 12px;
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .poster__fav {
        position: absolute;
        right: 12px;
        top: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 11px;
        border: 1px solid rgba(244, 240, 230, 0.25);
        border-radius: 999px;
        background: rgba(7, 6, 9, 0.6);
        color: var(--paper);
        font-family: var(--font-mono);
        font-size: 0.62rem;
        backdrop-filter: blur(10px);
        cursor: pointer;
      }
      .poster__fav:hover,
      .poster__fav.is-on {
        color: var(--pink);
        border-color: var(--pink);
        background: rgba(255, 77, 141, 0.16);
      }
      .poster__index {
        position: absolute;
        left: 14px;
        bottom: 12px;
        font-size: 0.5rem;
        letter-spacing: 0.14em;
        color: rgba(244, 240, 230, 0.55);
      }
      .detail__meta-row {
        display: flex;
        gap: 1.2rem;
        flex-wrap: wrap;
        margin-top: 12px;
        color: var(--muted-2);
      }
      .detail__meta-row .mono {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.56rem;
        letter-spacing: 0.06em;
      }
      .detail__side {
        display: flex;
        flex-direction: column;
        gap: 14px;
        position: sticky;
        top: calc(var(--header-h) + 16px);
      }
      .detail__title {
        font-size: clamp(1.8rem, 3.6vw, 3rem);
        line-height: 1;
        letter-spacing: -0.045em;
      }
      .price {
        display: grid;
        gap: 2px;
        padding: 14px 0;
        border-block: 1px solid var(--line);
      }
      .price__value {
        font-family: var(--font-display);
        font-size: clamp(1.8rem, 3.4vw, 2.6rem);
        font-weight: 600;
        letter-spacing: -0.045em;
        line-height: 1;
        color: var(--lime);
      }
      .price__alt {
        font-family: var(--font-serif);
        font-style: italic;
        font-size: 1.05rem;
        color: var(--muted);
      }
      .price__note {
        font-size: 0.5rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted-2);
        margin-top: 3px;
      }
      .specs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1px;
        background: var(--line);
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        overflow: hidden;
      }
      .spec {
        display: grid;
        gap: 2px;
        padding: 9px 11px;
        background: var(--ink-2);
      }
      .spec .mono {
        font-size: 0.49rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .spec strong {
        font-size: 0.78rem;
        font-weight: 500;
      }
      .side__hint {
        display: flex;
        align-items: flex-start;
        gap: 5px;
        color: var(--muted-2);
        font-size: 0.66rem;
        line-height: 1.4;
        margin-top: -6px;
      }
      .side__hint app-icon {
        color: var(--lime);
        margin-top: 1px;
        flex: 0 0 auto;
      }
      .owner {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 11px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: rgba(244, 240, 230, 0.02);
        text-decoration: none;
        transition: border-color 0.2s ease, background 0.2s ease;
      }
      .owner:hover {
        border-color: var(--line-strong);
        background: rgba(244, 240, 230, 0.04);
      }
      .owner__copy {
        display: grid;
        gap: 0;
        flex: 1;
        min-width: 0;
      }
      .owner__copy .mono {
        font-size: 0.48rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .owner__copy strong {
        font-size: 0.86rem;
        font-weight: 500;
      }
      .owner__rating {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 0.68rem;
        color: var(--muted);
      }
      .owner__rating app-icon {
        color: var(--lime);
      }
      .owner > app-icon {
        color: var(--muted-2);
      }
      .report {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--muted-2);
        font-family: var(--font-mono);
        font-size: 0.52rem;
        letter-spacing: 0.06em;
        text-decoration: none;
      }
      .report:hover {
        color: var(--pink);
      }
      .detail__body {
        display: grid;
        grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.6fr);
        gap: 1.25rem;
        margin-top: 2rem;
      }
      .detail__desc h2 {
        margin-bottom: 10px;
      }
      .detail__text {
        color: var(--paper-dim);
        font-size: 0.94rem;
        line-height: 1.7;
        white-space: pre-line;
        max-width: 70ch;
      }
      .detail__tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 1.2rem;
      }
      .detail__trust {
        display: grid;
        gap: 8px;
        align-content: start;
      }
      .mini {
        display: flex;
        gap: 9px;
        padding: 10px 12px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: rgba(244, 240, 230, 0.02);
        color: var(--lime);
      }
      .mini div {
        display: grid;
        gap: 1px;
      }
      .mini strong {
        font-size: 0.72rem;
        color: var(--paper);
        font-weight: 600;
      }
      .mini span {
        font-size: 0.66rem;
        color: var(--muted-2);
      }
      .related {
        margin-top: 3rem;
        padding-top: 2rem;
        border-top: 1px solid var(--line);
      }
      .related__head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1.5rem;
        flex-wrap: wrap;
        margin-bottom: 1.2rem;
      }
      .related__head .h1 {
        margin-top: 8px;
      }
      .related__head em {
        font-size: 1.02em;
      }
      .related__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        gap: 14px;
      }
      .sheet-scrim {
        position: fixed;
        inset: 0;
        z-index: 200;
        background: rgba(7, 6, 9, 0.65);
        backdrop-filter: blur(4px);
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
        animation: sheet-in 0.32s var(--ease-out);
        overflow-y: auto;
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
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding: 18px 20px;
        border-bottom: 1px solid var(--line);
        position: sticky;
        top: 0;
        background: #0e0b13;
        z-index: 1;
      }
      .sheet__head .mono {
        font-size: 0.52rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--lime);
      }
      .sheet__head h2 {
        font-size: 1.4rem;
      }
      .sheet__close {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border: 1px solid var(--line);
        border-radius: 9px;
        background: transparent;
        color: var(--muted);
        cursor: pointer;
      }
      .sheet__target {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 14px 20px;
        border-bottom: 1px solid var(--line);
        background: rgba(244, 240, 230, 0.02);
      }
      .sheet__target img {
        width: 54px;
        height: 54px;
        border-radius: 9px;
        object-fit: cover;
        border: 1px solid var(--line);
      }
      .sheet__target div {
        display: grid;
        gap: 0;
        min-width: 0;
      }
      .sheet__target .mono {
        font-size: 0.48rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .sheet__target strong {
        font-size: 0.82rem;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .sheet__owner {
        font-size: 0.68rem;
        color: var(--muted-2);
      }
      .sheet__body {
        display: grid;
        gap: 14px;
        padding: 18px 20px 24px;
      }
      .message-meta {
        display: flex;
        justify-content: space-between;
        gap: 0.7rem;
        flex-wrap: wrap;
      }
      .message-meta .mono {
        font-size: 0.52rem;
        color: var(--muted-2);
      }
      .sheet__summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 10px 12px;
        border: 1px dashed rgba(201, 255, 61, 0.35);
        border-radius: var(--radius-sm);
        background: rgba(201, 255, 61, 0.03);
      }
      .sheet__summary .mono {
        font-size: 0.5rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .sheet__summary strong {
        color: var(--lime);
        font-family: var(--font-mono);
        font-size: 0.9rem;
      }
      .sheet__actions {
        display: flex;
        gap: 9px;
        padding-top: 4px;
      }
      .sheet__legal {
        font-size: 0.5rem;
        color: var(--muted-2);
        line-height: 1.5;
        letter-spacing: 0.02em;
      }
      .topup-link {
        display: inline-block;
        margin-left: 5px;
        color: var(--lime);
        font-weight: 600;
      }
      @media (max-width: 960px) {
        .detail__grid,
        .detail__body {
          grid-template-columns: 1fr;
        }
        .detail__side {
          position: static;
        }
        .detail__trust {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 600px) {
        .detail {
          padding-top: 0.8rem;
        }
        .breadcrumb {
          display: none;
        }
        .detail__trust {
          grid-template-columns: 1fr;
        }
        .poster {
          box-shadow: none;
          border-radius: var(--radius-sm);
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
export class ListingDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly listingsApi = inject(ListingService);
  private readonly dealsApi = inject(DealService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthService);

  protected readonly listing = signal<Listing | null>(null);
  protected readonly related = signal<Listing[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly favorite = signal(false);
  protected readonly favoriteCount = signal(0);
  protected readonly dealOpen = signal(false);
  protected readonly sending = signal(false);
  protected readonly dealError = signal<string | null>(null);
  protected readonly needsTopUp = signal(false);
  protected readonly myListings = signal<Listing[]>([]);

  protected readonly dealForm = this.fb.group({
    cash: [0, [Validators.min(0), Validators.max(100000)]],
    offerListingId: [''],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
  });

  protected readonly image = computed(() => mediaUrl(this.listing()?.imageUrl, this.listing()?.id ?? 'canjea'));
  protected readonly isOwner = computed(() => {
    const owner = this.listing()?.owner;
    return Boolean(owner && this.auth.user()?.id === owner.id);
  });
  protected readonly priceMain = computed(() => {
    const item = this.listing();
    if (!item) return '';
    if (item.modality === 'BARTER') return 'Trueque directo';
    return formatMoney(item.priceCents, item.currency);
  });
  protected readonly conditionLabel = computed(() => {
    const value = this.listing()?.condition;
    return value ? CONDITION_LABELS[value as keyof typeof CONDITION_LABELS] ?? value : '—';
  });
  protected readonly modalityLabel = computed(() => {
    const value = this.listing()?.modality;
    return value ? MODALITY_LABELS[value] ?? value : '—';
  });
  protected readonly escrowPreview = computed(() => {
    const cash = Number(this.dealForm.controls.cash.value) || 0;
    const currency = this.listing()?.currency ?? 'USD';
    return cash > 0 ? formatMoney(Math.round(cash * 100), currency) : formatMoney(0, currency);
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id') ?? '';
      if (id) {
        this.fetchListing(id);
      }
    });

    this.dealForm.valueChanges.subscribe(() => this.dealError.set(null));
  }

  private fetchListing(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    this.listingsApi
      .get(id)
      .pipe(
        catchError((error) => {
          this.error.set(toApiError(error).message);
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (!result) return;
        this.listing.set(result);
        this.related.set(result.related ?? []);
        this.favorite.set(result.isFavorite);
        this.favoriteCount.set(result.favoritesCount);
        this.loading.set(false);
        if (result.modality !== 'BARTER') this.dealForm.controls.cash.setValue(result.priceCents / 100);
      });
  }

  protected ago(iso: string): string {
    return relativeTime(iso);
  }

  protected toggleFavorite(): void {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/entrar'], { queryParams: { redirect: this.router.url } });
      return;
    }
    const item = this.listing();
    if (!item) return;
    this.listingsApi.toggleFavorite(item.id).subscribe({
      next: (result) => {
        this.favorite.set(result.favorited);
        this.favoriteCount.set(result.favoritesCount);
      },
      error: () => this.toast.error('No se pudo actualizar el favorito'),
    });
  }

  protected openDeal(): void {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/entrar'], { queryParams: { redirect: this.router.url } });
      return;
    }
    if (!this.auth.verified()) {
      this.toast.info('Verifica tu correo', 'Antes de negociar necesitas verificar tu correo.');
      void this.router.navigate(['/verificar']);
      return;
    }
    this.dealOpen.set(true);
    this.listingsApi.mine().subscribe({
      next: (result) => this.myListings.set(result.items.filter((item) => item.status === 'ACTIVE')),
      error: () => this.myListings.set([]),
    });
  }

  protected closeDeal(): void {
    this.dealOpen.set(false);
    this.dealError.set(null);
    this.needsTopUp.set(false);
  }

  protected sendDeal(): void {
    const item = this.listing();
    if (!item) return;
    this.dealForm.markAllAsTouched();
    if (this.dealForm.invalid) return;
    const value = this.dealForm.getRawValue();
    const cashCents = Math.round((Number(value.cash) || 0) * 100);
    if (item.modality === 'CASH' && cashCents <= 0) {
      this.dealError.set('Esta publicación solo se canjea por dinero. Indica un monto.');
      return;
    }
    if (cashCents === 0 && !value.offerListingId && value.message.trim().length < 20) {
      this.dealError.set('Describe tu oferta con al menos 20 caracteres o adjunta una publicación.');
      return;
    }
    this.sending.set(true);
    this.dealsApi
      .create({
        listingId: item.id,
        message: value.message.trim(),
        offerListingId: value.offerListingId || null,
        cashCents,
      })
      .subscribe({
        next: (deal) => {
          this.sending.set(false);
          this.dealOpen.set(false);
          this.toast.success('Propuesta enviada', 'Te avisaremos cuando el dueño responda.');
          void this.router.navigate(['/app/negociaciones', deal.id]);
        },
        error: (error) => {
          this.sending.set(false);
          const apiError = toApiError(error);
          this.needsTopUp.set(apiError.code === 'INSUFFICIENT_FUNDS' || Boolean(apiError.details?.['action']));
          this.dealError.set(apiError.message);
        },
      });
  }
}

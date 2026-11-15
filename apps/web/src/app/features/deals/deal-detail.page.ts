import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { toApiError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { DealService } from '../../core/data.services';
import { DEAL_LABELS, formatDate, formatMoney, relativeTime } from '../../core/format';
import { mediaUrl } from '../../core/media';
import type { Deal } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { AvatarComponent } from '../../shared/avatar.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { IconComponent } from '../../shared/icon.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

type PendingAction = 'accept' | 'reject' | 'complete' | 'cancel' | 'review' | null;

@Component({
  selector: 'app-deal-detail-page',
  imports: [RouterLink, IconComponent, StatusBadgeComponent, AvatarComponent, EmptyStateComponent],
  template: `
    @if (loading()) {
      <div class="loading-state">
        <div class="skeleton" style="height: 60px; width: 55%"></div>
        <div class="skeleton" style="height: 260px"></div>
      </div>
    } @else if (error()) {
      <app-empty-state icon="alert-circle" title="No pudimos abrir esta negociación" [message]="error() ?? ''">
        <a class="btn btn--primary btn--sm" routerLink="/app/negociaciones">Volver a negociaciones</a>
      </app-empty-state>
    } @else if (deal(); as item) {
      <a class="back-link" routerLink="/app/negociaciones">
        <app-icon name="arrow-left" [size]="14" /> Todas las negociaciones
      </a>

      <header class="deal-head">
        <div class="deal-head__copy">
          <div class="deal-head__badges">
            <app-status-badge [status]="item.status" />
            <span class="badge" [class.badge--violet]="item.role === 'INCOMING'" [class.badge--sky]="item.role === 'OUTGOING'">
              {{ item.role === 'INCOMING' ? 'Propuesta recibida' : 'Propuesta enviada' }}
            </span>
            @if (item.cashCents > 0) {
              <span class="badge badge--lime"><app-icon name="lock" [size]="10" /> con garantía</span>
            }
          </div>
          <h1 class="h1">{{ item.listing?.title ?? 'Negociación' }}</h1>
          <p class="deal-head__meta">
            <app-icon name="calendar" [size]="13" /> Abierta {{ ago(item.createdAt) }}
            <span class="dot" aria-hidden="true"></span>
            Actualizada {{ ago(item.updatedAt) }}
          </p>
        </div>

        <div class="deal-head__amount">
          <span class="mono">{{ amountLabel() }}</span>
          <strong>{{ item.cashCents > 0 ? money(item.cashCents, item.currency) : 'Trueque' }}</strong>
          <small>{{ amountHint() }}</small>
        </div>
      </header>

      <div class="timeline">
        <div class="timeline__step is-done">
          <span>01 · Propuesta</span>
          <strong>{{ formatDate(item.createdAt, false) }}</strong>
        </div>
        <div
          class="timeline__step"
          [class.is-done]="item.status === 'ACCEPTED' || item.status === 'COMPLETED'"
          [class.is-closed]="item.status === 'REJECTED' || item.status === 'CANCELLED'"
        >
          <span>02 · Aceptación</span>
          <strong>{{ acceptedLabel() }}</strong>
        </div>
        <div class="timeline__step" [class.is-done]="item.status === 'COMPLETED'">
          <span>03 · Cierre</span>
          <strong>{{ item.status === 'COMPLETED' ? formatDate(item.completedAt, false) : 'Pendiente' }}</strong>
        </div>
      </div>

      <div class="deal-detail">
        <div class="deal-main">
          <section class="panel">
            <div class="panel__head">
              <div>
                <p class="mono kicker-mini">Lo que se intercambia</p>
                <h2 class="panel__title">Objetos del trato</h2>
              </div>
              <span class="mono">{{ DEAL_LABELS[item.status] ?? item.status }}</span>
            </div>

            <div class="deal-items">
              <a class="deal-item" [routerLink]="['/m', item.listing?.id]">
                <img [src]="listingImage()" [alt]="item.listing?.title ?? ''" />
                <div>
                  <span class="deal-item__label">{{ item.role === 'INCOMING' ? 'Tu publicación' : 'Publicación que pediste' }}</span>
                  <span class="deal-item__title">{{ item.listing?.title ?? 'Publicación' }}</span>
                </div>
              </a>

              <span class="deal-swap"><app-icon name="arrow-up-down" [size]="20" /></span>

              @if (item.offerListing) {
                <a class="deal-item" [routerLink]="['/m', item.offerListing?.id]">
                  <img [src]="offerImage()" [alt]="item.offerListing?.title ?? ''" />
                  <div>
                    <span class="deal-item__label">Oferta adjunta</span>
                    <span class="deal-item__title">{{ item.offerListing?.title }}</span>
                  </div>
                </a>
              } @else {
                <div class="deal-item deal-item--ghost">
                  <span class="deal-item__ghost-icon"><app-icon name="banknote" [size]="19" /></span>
                  <div>
                    <span class="deal-item__label">Oferta</span>
                    <span class="deal-item__title">
                      {{ item.cashCents > 0 ? money(item.cashCents, item.currency) + ' en efectivo' : 'Propuesta abierta' }}
                    </span>
                  </div>
                </div>
              }
            </div>
          </section>

          <section class="panel">
            <div class="panel__head">
              <div>
                <p class="mono kicker-mini">Mensaje de la propuesta</p>
                <h2 class="panel__title">Palabras del trato</h2>
              </div>
              <span class="mono">{{ ago(item.createdAt) }}</span>
            </div>
            <blockquote class="quote">“{{ item.message }}”</blockquote>
            <div class="message-author">
              <app-avatar [user]="item.counterpart" size="sm" />
              <div>
                <strong>{{ item.counterpart?.displayName }}</strong>
                <span class="mono">&#64;{{ item.counterpart?.username }} · {{ item.counterpart?.city }}</span>
              </div>
              @if (item.counterpart?.emailVerified) {
                <span class="badge badge--lime"><app-icon name="badge-check" [size]="10" /> verificado</span>
              }
            </div>
          </section>

          <section class="panel">
            <div class="panel__head">
              <div>
                <p class="mono kicker-mini">Registro</p>
                <h2 class="panel__title">Historial del canje</h2>
              </div>
            </div>
            <ol class="history">
              @for (event of history(); track event.label) {
                <li [class.is-done]="event.done">
                  <span class="history__dot"></span>
                  <div>
                    <strong>{{ event.label }}</strong>
                    <span class="mono">{{ event.meta }}</span>
                  </div>
                </li>
              }
            </ol>
          </section>
        </div>

        <aside class="deal-side">
          <section class="panel summary-panel">
            <p class="mono kicker-mini">Resumen económico</p>
            <div class="summary-line">
              <span>Monto de la propuesta</span>
              <strong>{{ money(item.cashCents, item.currency) }}</strong>
            </div>
            @if (item.cashCents > 0) {
              <div class="summary-line">
                <span>Comisión CANJEA (5%)</span>
                <strong class="muted">{{ money(feeCents(), item.currency) }}</strong>
              </div>
              <div class="summary-line summary-line--total">
                <span>Recibe el dueño</span>
                <strong class="accent">{{ money(netCents(), item.currency) }}</strong>
              </div>
              <p class="summary-note">
                <app-icon [name]="item.status === 'COMPLETED' ? 'circle-check' : 'lock'" [size]="13" />
                @if (item.status === 'COMPLETED') {
                  El pago fue liberado al completarse el canje, después de la comisión de servicio.
                } @else if (item.status === 'CANCELLED' || item.status === 'REJECTED') {
                  El dinero retenido volvió al proponente. No se cobró comisión.
                } @else {
                  El dinero queda retenido desde la aceptación y se libera al completar. Si se cancela, vuelve al proponente.
                }
              </p>
            } @else {
              <p class="summary-note">
                <app-icon name="repeat" [size]="13" />
                Este trato es solo trueque. No hay comisión ni movimiento de dinero.
              </p>
            }
          </section>

          <section class="panel">
            <p class="mono kicker-mini">Contraparte</p>
            <a class="counterpart" [routerLink]="['/u', item.counterpart?.username]">
              <app-avatar [user]="item.counterpart" size="lg" [ring]="true" />
              <div>
                <strong>{{ item.counterpart?.displayName }}</strong>
                <span class="mono">&#64;{{ item.counterpart?.username }}</span>
                <span class="counterpart__rating">
                  <app-icon name="star" [size]="11" />
                  {{ (item.counterpart?.ratingAvg ?? 0).toFixed(1) }} · {{ item.counterpart?.ratingCount ?? 0 }} reseñas
                </span>
              </div>
              <app-icon name="arrow-up-right" [size]="14" />
            </a>
          </section>

          @if (item.flags?.canRespond || item.flags?.canComplete || item.flags?.canCancel) {
            <section class="panel action-panel">
              <p class="mono kicker-mini">Acciones disponibles</p>

              @if (actionError()) {
                <div class="alert alert--danger" role="alert">
                  <app-icon name="alert-circle" [size]="16" />
                  <div>
                    {{ actionError() }}
                    @if (needsTopUp()) {
                      <a class="topup" routerLink="/app/billetera">Recargar billetera</a>
                    }
                  </div>
                </div>
              }

              @if (pending() === 'accept') {
                <div class="inline-form">
                  <strong class="confirm-title">¿Aceptar esta propuesta?</strong>
                  <p class="hint">
                    @if (item.cashCents > 0) {
                      Se retendrán {{ money(item.cashCents, item.currency) }} de {{ item.counterpart?.displayName }} en garantía.
                    } @else {
                      La publicación quedará marcada como en canje y se rechazarán las demás propuestas.
                    }
                    Las otras propuestas para esta publicación se cerrarán.
                  </p>
                  <div class="inline-actions">
                    <button class="btn btn--ghost btn--sm" type="button" (click)="pending.set(null)">Volver</button>
                    <button class="btn btn--primary btn--sm grow" type="button" [disabled]="acting()" (click)="accept()">
                      @if (acting()) { <span class="spinner"></span> } @else { Sí, aceptar <app-icon name="check" [size]="13" /> }
                    </button>
                  </div>
                </div>
              } @else if (pending() === 'reject') {
                <div class="inline-form">
                  <strong class="confirm-title">¿Rechazar la propuesta?</strong>
                  <p class="hint">La otra persona recibirá el aviso. La publicación seguirá activa para otros canjes.</p>
                  <div class="inline-actions">
                    <button class="btn btn--ghost btn--sm" type="button" (click)="pending.set(null)">Volver</button>
                    <button class="btn btn--danger btn--sm grow" type="button" [disabled]="acting()" (click)="reject()">
                      Rechazar propuesta
                    </button>
                  </div>
                </div>
              } @else if (pending() === 'complete') {
                <div class="inline-form">
                  <strong class="confirm-title">¿Cerrar el canje como completado?</strong>
                  <p class="hint">
                    Confirma que ambos recibieron lo acordado.
                    @if (item.cashCents > 0) {
                      Se liberarán {{ money(netCents(), item.currency) }} al dueño después de la comisión.
                    }
                  </p>
                  <div class="inline-actions">
                    <button class="btn btn--ghost btn--sm" type="button" (click)="pending.set(null)">Volver</button>
                    <button class="btn btn--primary btn--sm grow" type="button" [disabled]="acting()" (click)="complete()">
                      @if (acting()) { <span class="spinner"></span> } @else { Confirmar cierre <app-icon name="check-check" [size]="13" /> }
                    </button>
                  </div>
                </div>
              } @else if (pending() === 'cancel') {
                <div class="inline-form">
                  <strong class="confirm-title">¿Cancelar la negociación?</strong>
                  <p class="hint">
                    @if (item.cashCents > 0 && item.status === 'ACCEPTED') {
                      El monto retenido se devolverá al proponente.
                    } @else {
                      El trato se cerrará sin movimiento de dinero.
                    }
                  </p>
                  <label class="field">
                    <span class="label">Motivo (opcional)</span>
                    <input
                      class="input"
                      type="text"
                      maxlength="300"
                      placeholder="Ej. no logramos coordinar la entrega"
                      [value]="cancelReason()"
                      (input)="cancelReason.set($any($event.target).value)"
                    />
                  </label>
                  <div class="inline-actions">
                    <button class="btn btn--ghost btn--sm" type="button" (click)="pending.set(null)">Volver</button>
                    <button class="btn btn--danger btn--sm grow" type="button" [disabled]="acting()" (click)="cancel()">
                      Cancelar negociación
                    </button>
                  </div>
                </div>
              } @else {
                @if (item.flags?.canRespond) {
                  <button class="btn btn--primary btn--block" type="button" (click)="pending.set('accept')">
                    <app-icon name="check" [size]="16" /> Aceptar propuesta
                  </button>
                  <button class="btn btn--ghost btn--block" type="button" (click)="pending.set('reject')">
                    <app-icon name="x" [size]="15" /> Rechazar
                  </button>
                }
                @if (item.flags?.canComplete) {
                  <button class="btn btn--primary btn--block" type="button" (click)="pending.set('complete')">
                    <app-icon name="check-check" [size]="16" /> Marcar como completado
                  </button>
                }
                @if (item.flags?.canCancel) {
                  <button class="btn btn--ghost btn--block btn--sm" type="button" (click)="pending.set('cancel')">
                    Cancelar negociación
                  </button>
                }
              }
            </section>
          }

          @if (item.flags?.canReview) {
            <section class="panel review-panel">
              <p class="mono kicker-mini">Deja una reseña</p>
              <h2 class="panel__title">¿Cómo fue el trato?</h2>
              <div class="rating-picker" role="group" aria-label="Calificación">
                @for (star of stars; track star) {
                  <button
                    type="button"
                    [class.is-on]="rating() >= star"
                    (click)="rating.set(star)"
                    [attr.aria-label]="star + ' estrellas'"
                    [attr.aria-pressed]="rating() === star"
                  >
                    <app-icon name="star" [size]="24" [strokeWidth]="1.6" />
                  </button>
                }
              </div>
              <label class="field">
                <span class="label">Comentario (opcional)</span>
                <textarea
                  class="textarea"
                  rows="4"
                  maxlength="600"
                  placeholder="Cuenta cómo fue la comunicación, la entrega y el estado de lo recibido."
                  [value]="reviewComment()"
                  (input)="reviewComment.set($any($event.target).value)"
                ></textarea>
              </label>
              <button class="btn btn--primary btn--block" type="button" [disabled]="acting() || rating() === 0" (click)="submitReview()">
                @if (acting()) { <span class="spinner"></span> } @else { Publicar reseña <app-icon name="send" [size]="14" /> }
              </button>
            </section>
          } @else if (item.status === 'COMPLETED') {
            <div class="done-note">
              <app-icon name="circle-check" [size]="17" />
              <div>
                <strong>Canje cerrado</strong>
                <span>La reseña ya quedó registrada o la otra parte aún puede dejarla.</span>
              </div>
            </div>
          }
        </aside>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .loading-state {
        display: grid;
        gap: 14px;
      }
      .deal-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1.5rem;
        flex-wrap: wrap;
      }
      .deal-head__copy {
        display: grid;
        gap: 8px;
        max-width: 64ch;
      }
      .deal-head__badges {
        display: flex;
        align-items: center;
        gap: 7px;
        flex-wrap: wrap;
      }
      .deal-head__badges .badge {
        font-size: 0.56rem;
      }
      .deal-head h1 {
        letter-spacing: -0.05em;
      }
      .deal-head__meta {
        display: flex;
        align-items: center;
        gap: 7px;
        flex-wrap: wrap;
        font-family: var(--font-mono);
        font-size: 0.62rem;
        color: var(--muted);
      }
      .deal-head__amount {
        display: grid;
        gap: 1px;
        padding: 12px 16px;
        border: 1px solid rgba(201, 255, 61, 0.26);
        border-radius: var(--radius-sm);
        background: linear-gradient(150deg, rgba(201, 255, 61, 0.08), transparent);
        min-width: 210px;
      }
      .deal-head__amount .mono {
        font-size: 0.5rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .deal-head__amount strong {
        font-family: var(--font-display);
        font-size: 1.65rem;
        letter-spacing: -0.04em;
        color: var(--lime);
        line-height: 1.05;
      }
      .deal-head__amount small {
        font-size: 0.64rem;
        color: var(--muted-2);
      }
      .dot {
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: var(--muted-2);
      }
      .timeline {
        margin-top: 1.4rem;
      }
      .timeline__step {
        display: grid;
        gap: 1px;
      }
      .timeline__step span {
        font-size: 0.56rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .timeline__step strong {
        font-family: var(--font-sans);
        font-size: 0.72rem;
        font-weight: 500;
        color: var(--muted-2);
      }
      .timeline__step.is-done strong {
        color: var(--paper);
      }
      .timeline__step.is-closed {
        border-top-color: rgba(255, 95, 95, 0.4);
      }
      .deal-main {
        display: grid;
        gap: 14px;
      }
      .deal-side {
        display: grid;
        gap: 12px;
        align-content: start;
      }
      .kicker-mini {
        font-size: 0.5rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--lime);
      }
      .deal-item--ghost {
        border-style: dashed;
        background: rgba(244, 240, 230, 0.015);
      }
      .deal-item__ghost-icon {
        display: grid;
        place-items: center;
        width: 56px;
        height: 56px;
        border-radius: 7px;
        border: 1px solid var(--line);
        background: var(--ink-2);
        color: var(--lime);
        flex: none;
      }
      .deal-item > div {
        min-width: 0;
      }
      .message-author {
        display: flex;
        align-items: center;
        gap: 9px;
        padding-top: 12px;
        border-top: 1px solid var(--line);
      }
      .message-author > div {
        display: grid;
        gap: 0;
        flex: 1;
        min-width: 0;
      }
      .message-author strong {
        font-size: 0.82rem;
        font-weight: 600;
      }
      .message-author .mono {
        font-size: 0.56rem;
        color: var(--muted-2);
      }
      .message-author .badge {
        font-size: 0.5rem;
      }
      .history {
        display: grid;
        gap: 0;
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .history li {
        display: flex;
        gap: 11px;
        padding: 9px 0;
        border-bottom: 1px solid var(--line);
      }
      .history li:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }
      .history__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        border: 1px solid var(--line-strong);
        background: var(--ink-3);
        margin-top: 5px;
        flex: 0 0 auto;
      }
      .history li.is-done .history__dot {
        background: var(--lime);
        border-color: var(--lime);
        box-shadow: 0 0 0 3px rgba(201, 255, 61, 0.12);
      }
      .history li > div {
        display: grid;
        gap: 1px;
      }
      .history strong {
        font-size: 0.8rem;
        font-weight: 500;
      }
      .history .mono {
        font-size: 0.55rem;
        color: var(--muted-2);
      }
      .summary-panel {
        display: grid;
        gap: 4px;
      }
      .summary-line {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
        padding: 7px 0;
        border-bottom: 1px solid var(--line);
        font-size: 0.8rem;
        color: var(--muted);
      }
      .summary-line strong {
        font-family: var(--font-mono);
        font-size: 0.82rem;
        color: var(--paper);
        white-space: nowrap;
      }
      .summary-line--total strong {
        font-size: 1rem;
      }
      .summary-note {
        display: flex;
        gap: 7px;
        margin-top: 8px;
        font-size: 0.68rem;
        line-height: 1.45;
        color: var(--muted-2);
      }
      .summary-note app-icon {
        color: var(--lime);
        flex: 0 0 auto;
        margin-top: 1px;
      }
      .counterpart {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 9px;
        padding: 10px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: rgba(244, 240, 230, 0.02);
        text-decoration: none;
      }
      .counterpart:hover {
        border-color: var(--line-strong);
      }
      .counterpart > div {
        display: grid;
        gap: 0;
        flex: 1;
        min-width: 0;
      }
      .counterpart strong {
        font-size: 0.84rem;
        font-weight: 600;
      }
      .counterpart .mono {
        font-size: 0.52rem;
        color: var(--muted-2);
      }
      .counterpart__rating {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 0.66rem;
        color: var(--muted);
      }
      .counterpart__rating app-icon {
        color: var(--lime);
      }
      .counterpart > app-icon {
        color: var(--muted-2);
      }
      .action-panel {
        display: grid;
        gap: 8px;
      }
      .confirm-title {
        font-size: 0.86rem;
      }
      .inline-actions {
        display: flex;
        gap: 7px;
      }
      .topup {
        display: inline-block;
        margin-left: 4px;
        color: var(--lime);
        font-weight: 600;
      }
      .review-panel {
        display: grid;
        gap: 9px;
      }
      .review-panel .rating-picker {
        margin: 2px 0;
      }
      .done-note {
        display: flex;
        gap: 9px;
        padding: 11px 13px;
        border: 1px solid rgba(125, 255, 168, 0.28);
        border-radius: var(--radius-sm);
        background: rgba(125, 255, 168, 0.05);
        color: var(--ok);
      }
      .done-note > div {
        display: grid;
        gap: 1px;
      }
      .done-note strong {
        font-size: 0.8rem;
      }
      .done-note span {
        font-size: 0.68rem;
        color: var(--muted);
        line-height: 1.4;
      }
      @media (max-width: 960px) {
        .timeline {
          gap: 0;
        }
        .timeline__step {
          padding-top: 1.2rem;
        }
      }
      @media (max-width: 600px) {
        .timeline {
          margin-top: 1rem;
        }
        .timeline__step span {
          font-size: 0.48rem;
        }
        .timeline__step strong {
          font-size: 0.62rem;
        }
        .deal-head__amount {
          width: 100%;
        }
      }
    `,
  ],
})
export class DealDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dealsApi = inject(DealService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  protected readonly deal = signal<Deal | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly acting = signal(false);
  protected readonly pending = signal<PendingAction>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly needsTopUp = signal(false);
  protected readonly cancelReason = signal('');
  protected readonly rating = signal(0);
  protected readonly reviewComment = signal('');
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly DEAL_LABELS = DEAL_LABELS;

  private readonly dealId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly feeCents = computed(() => Math.round((this.deal()?.cashCents ?? 0) * 0.05));
  protected readonly netCents = computed(() => Math.max(0, (this.deal()?.cashCents ?? 0) - this.feeCents()));

  protected readonly listingImage = computed(() => {
    const item = this.deal();
    return mediaUrl(item?.listing?.imageUrl, item?.listing?.id ?? item?.id ?? 'canjea');
  });
  protected readonly offerImage = computed(() => {
    const item = this.deal();
    return mediaUrl(item?.offerListing?.imageUrl, item?.offerListing?.id ?? item?.id ?? 'canjea');
  });

  protected readonly amountLabel = computed(() => {
    const item = this.deal();
    if (!item || item.cashCents <= 0) return 'Modalidad';
    switch (item.status) {
      case 'COMPLETED':
        return 'Monto liberado';
      case 'ACCEPTED':
        return 'Monto en garantía';
      case 'PROPOSED':
        return 'Monto propuesto';
      default:
        return 'Monto devuelto';
    }
  });

  protected readonly amountHint = computed(() => {
    const item = this.deal();
    if (!item || item.cashCents <= 0) return 'Sin dinero involucrado';
    switch (item.status) {
      case 'COMPLETED':
        return 'Pagado al dueño tras la comisión';
      case 'ACCEPTED':
        return 'Protegido hasta cerrar el canje';
      case 'PROPOSED':
        return 'Se retiene cuando se acepta';
      default:
        return 'Devuelto al proponente';
    }
  });

  protected readonly acceptedLabel = computed(() => {
    const item = this.deal();
    if (!item) return '';
    if (item.status === 'PROPOSED') return 'Pendiente';
    if (item.status === 'REJECTED') return 'Rechazada';
    if (item.status === 'CANCELLED') return 'Cancelada';
    return formatDate(item.updatedAt, false);
  });

  protected readonly history = computed(() => {
    const item = this.deal();
    if (!item) return [];
    const events = [
      { label: 'Propuesta enviada', meta: formatDate(item.createdAt), done: true },
      {
        label: item.status === 'REJECTED' ? 'Propuesta rechazada' : item.status === 'CANCELLED' ? 'Negociación cancelada' : 'Propuesta aceptada',
        meta:
          item.status === 'PROPOSED'
            ? 'Esperando respuesta del dueño'
            : item.status === 'REJECTED' || item.status === 'CANCELLED'
              ? formatDate(item.updatedAt)
              : formatDate(item.updatedAt),
        done: item.status !== 'PROPOSED',
      },
      {
        label: 'Canje completado',
        meta: item.status === 'COMPLETED' ? formatDate(item.completedAt) : 'Pendiente de cierre',
        done: item.status === 'COMPLETED',
      },
    ];
    return events;
  });

  ngOnInit(): void {
    this.load();
  }

  protected ago(iso: string | null | undefined): string {
    return relativeTime(iso);
  }

  protected formatDate(iso: string | null | undefined, withYear = true): string {
    return formatDate(iso, withYear);
  }

  protected money(cents: number, currency = 'USD'): string {
    return formatMoney(cents, currency);
  }

  protected accept(): void {
    this.act(
      () => this.dealsApi.respond(this.dealId, 'accept'),
      'Propuesta aceptada',
      'La publicación quedó en canje y el monto en garantía.',
    );
  }

  protected reject(): void {
    this.act(() => this.dealsApi.respond(this.dealId, 'reject'), 'Propuesta rechazada');
  }

  protected complete(): void {
    this.act(
      () => this.dealsApi.complete(this.dealId),
      'Canje completado',
      'El pago quedó liberado y ya puedes dejar una reseña.',
    );
  }

  protected cancel(): void {
    this.act(
      () => this.dealsApi.cancel(this.dealId, this.cancelReason().trim() || undefined),
      'Negociación cancelada',
      'Si había dinero retenido, volvió al proponente.',
    );
  }

  protected submitReview(): void {
    if (this.rating() < 1) {
      this.toast.error('Elige una calificación', 'Toca de 1 a 5 estrellas.');
      return;
    }
    this.acting.set(true);
    this.actionError.set(null);
    this.dealsApi.review(this.dealId, this.rating(), this.reviewComment().trim()).subscribe({
      next: (updated) => {
        this.acting.set(false);
        this.apply(updated);
        this.toast.success('Reseña publicada', 'Gracias por cuidar la reputación del mercado.');
      },
      error: (error) => this.fail(error),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.dealsApi
      .get(this.dealId)
      .pipe(
        catchError((error) => {
          this.error.set(toApiError(error).message);
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (!result) return;
        this.deal.set(result);
        this.loading.set(false);
      });
  }

  private act(request: () => ReturnType<DealService['respond']>, title: string, message?: string): void {
    this.acting.set(true);
    this.actionError.set(null);
    this.needsTopUp.set(false);
    request().subscribe({
      next: (updated) => {
        this.acting.set(false);
        this.pending.set(null);
        this.apply(updated);
        this.toast.success(title, message);
        if (updated?.id) void this.router.navigate(['/app/negociaciones', updated.id], { replaceUrl: true });
      },
      error: (error) => {
        this.acting.set(false);
        const apiError = toApiError(error);
        this.actionError.set(apiError.message);
        this.needsTopUp.set(apiError.code === 'INSUFFICIENT_FUNDS' || Boolean(apiError.details?.['action']));
      },
    });
  }

  private apply(updated: Deal): void {
    this.deal.update((current) => (current ? { ...current, ...updated } : updated));
  }

  private fail(error: unknown): void {
    this.acting.set(false);
    this.actionError.set(toApiError(error).message);
    this.toast.error('No se pudo completar la acción', toApiError(error).message);
  }
}

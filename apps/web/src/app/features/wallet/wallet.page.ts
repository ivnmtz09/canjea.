import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { toApiError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { WalletService } from '../../core/data.services';
import { TRANSACTION_LABELS, formatMoney, relativeTime } from '../../core/format';
import type { Transaction, Wallet } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { FieldErrorComponent } from '../../shared/field-error.component';
import { IconComponent, type IconName } from '../../shared/icon.component';

type TxFilter = 'all' | 'in' | 'out';

@Component({
  selector: 'app-wallet-page',
  imports: [RouterLink, ReactiveFormsModule, IconComponent, FieldErrorComponent, EmptyStateComponent],
  template: `
    <header class="page-head">
      <div class="page-head__copy">
        <p class="kicker">Billetera demo</p>
        <h1 class="h1">DINERO CLARO,<br /><em class="serif lime">tratos claros.</em></h1>
        <p class="lede">
          Recarga saldo simulado, respalda ofertas con dinero y retira cuando tengas fondos disponibles. La garantía se
          libera al cerrar el canje.
        </p>
      </div>
      <div class="head-actions">
        <a class="btn btn--ghost btn--sm" routerLink="/app/negociaciones">
          <app-icon name="handshake" [size]="14" /> Negociaciones
        </a>
        <a class="btn btn--primary btn--sm" routerLink="/app/publicar">
          <app-icon name="plus" [size]="14" /> Publicar
        </a>
      </div>
    </header>

    @if (loading()) {
      <div class="skeleton" style="height: 230px; border-radius: var(--radius-lg)"></div>
    } @else if (wallet(); as data) {
      <section class="wallet-hero">
        <div class="balance-card">
          <span class="balance-card__label">Saldo disponible</span>
          <strong class="balance-card__value">{{ money(data.balanceCents, data.currency) }}</strong>
          <span class="balance-card__note mono">
            <app-icon name="shield-check" [size]="12" /> dinero simulado · entorno demo
          </span>

          <div class="balance-card__meta">
            <div>
              <span>En garantía</span>
              <strong>{{ money(data.escrowCents, data.currency) }}</strong>
            </div>
            <div>
              <span>Entradas</span>
              <strong>{{ money(data.inflowCents, data.currency) }}</strong>
            </div>
            <div>
              <span>Salidas</span>
              <strong>{{ money(data.outflowCents, data.currency) }}</strong>
            </div>
          </div>
        </div>

        <div class="wallet-forms">
          <section class="panel">
            <div class="panel__head panel__head--compact">
              <div>
                <p class="mono kicker-mini">Recargar</p>
                <h2 class="panel__title">Añadir saldo</h2>
              </div>
              <span class="badge badge--lime">instantáneo</span>
            </div>

            @if (topupError()) {
              <p class="error-text">{{ topupError() }}</p>
            }

            <div class="preset-row">
              @for (preset of presets; track preset) {
                <button type="button" [class.is-on]="topupCents() === preset * 100" (click)="setTopup(preset)">
                  {{ money(preset * 100, data.currency) }}
                </button>
              }
            </div>

            <form class="inline-money" [formGroup]="topupForm" (ngSubmit)="topUp()" novalidate>
              <label class="field grow">
                <span class="label">Monto ({{ data.currency }})</span>
                <div class="money-input">
                  <span class="money-input__symbol">$</span>
                  <input class="input" type="number" min="5" max="2000" step="0.01" inputmode="decimal" formControlName="amount" />
                  <span class="money-input__code mono">{{ data.currency }}</span>
                </div>
                <app-field-error [control]="topupForm.controls.amount" />
              </label>
              <button class="btn btn--primary" type="submit" [disabled]="toppingUp()">
                @if (toppingUp()) { <span class="spinner"></span> } @else { Recargar <app-icon name="plus" [size]="14" /> }
              </button>
            </form>
            <p class="hint">Mínimo {{ money(500, data.currency) }} · máximo {{ money(200000, data.currency) }} por operación.</p>
          </section>

          <section class="panel">
            <div class="panel__head panel__head--compact">
              <div>
                <p class="mono kicker-mini">Retirar</p>
                <h2 class="panel__title">Sacar saldo</h2>
              </div>
              <span class="badge" [class.badge--lime]="auth.verified()" [class.badge--orange]="!auth.verified()">
                {{ auth.verified() ? 'habilitado' : 'requiere verificación' }}
              </span>
            </div>

            @if (!auth.verified()) {
              <div class="alert">
                <app-icon name="alert-triangle" [size]="16" />
                <div>
                  <strong>Verifica tu correo para retirar.</strong>
                  <a class="inline-link" routerLink="/verificar">Verificar ahora</a>
                </div>
              </div>
            }

            @if (withdrawError()) {
              <p class="error-text">{{ withdrawError() }}</p>
            }

            <form class="inline-money" [formGroup]="withdrawForm" (ngSubmit)="withdraw()" novalidate>
              <label class="field grow">
                <span class="label">Monto ({{ data.currency }})</span>
                <div class="money-input">
                  <span class="money-input__symbol">$</span>
                  <input class="input" type="number" min="5" step="0.01" inputmode="decimal" formControlName="amount" />
                  <span class="money-input__code mono">{{ data.currency }}</span>
                </div>
                <app-field-error [control]="withdrawForm.controls.amount" />
              </label>
              <button class="btn btn--ghost" type="submit" [disabled]="withdrawing() || !auth.verified()">
                @if (withdrawing()) { <span class="spinner"></span> } @else { Retirar <app-icon name="arrow-down" [size]="14" /> }
              </button>
            </form>
            <p class="hint">
              Disponible: {{ money(data.balanceCents, data.currency) }}. El saldo en garantía no se puede retirar hasta
              cerrar el canje.
            </p>
          </section>
        </div>
      </section>

      <section class="panel movements">
        <div class="panel__head">
          <div>
            <p class="mono kicker-mini">Movimientos</p>
            <h2 class="panel__title">Historial de la billetera</h2>
          </div>
          <div class="segmented" role="group" aria-label="Filtrar movimientos">
            <button type="button" [class.is-active]="filter() === 'all'" (click)="filter.set('all')">Todos</button>
            <button type="button" [class.is-active]="filter() === 'in'" (click)="filter.set('in')">Entradas</button>
            <button type="button" [class.is-active]="filter() === 'out'" (click)="filter.set('out')">Salidas</button>
          </div>
        </div>

        @if (transactions().length === 0) {
          <app-empty-state
            icon="receipt"
            title="Sin movimientos todavía"
            message="Recarga saldo o cierra un canje con dinero para ver el primer movimiento aquí."
          >
            <button class="btn btn--primary btn--sm" type="button" (click)="focusTopUp()">Recargar saldo</button>
          </app-empty-state>
        } @else {
          <div class="tx-list">
            @for (tx of transactions(); track tx.id) {
              <div class="tx-row">
                <span class="tx-icon" [class.is-pos]="tx.amountCents > 0" [class.is-neg]="tx.amountCents < 0">
                  <app-icon [name]="txIcon(tx)" [size]="16" />
                </span>
                <div class="tx-row__copy">
                  <span class="tx-row__title">{{ label(tx) }}</span>
                  <span class="tx-row__meta">{{ ago(tx.createdAt) }} · {{ tx.status }}</span>
                </div>
                @if (tx.dealId) {
                  <a class="tx-link" [routerLink]="['/app/negociaciones', tx.dealId]" aria-label="Ver negociación">
                    <app-icon name="chevron-right" [size]="14" />
                  </a>
                }
                <span class="tx-amount" [class.is-pos]="tx.amountCents > 0" [class.is-neg]="tx.amountCents < 0">
                  {{ tx.amountCents > 0 ? '+' : '−' }}{{ money(Math.abs(tx.amountCents), data.currency) }}
                </span>
              </div>
            }
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
        gap: 8px;
        flex-wrap: wrap;
      }
      h1 em {
        font-size: 1.03em;
      }
      .kicker-mini {
        font-size: 0.5rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--lime);
      }
      .panel__head--compact {
        margin-bottom: 0.8rem;
      }
      .balance-card__note {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.52rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .preset-row {
        margin-bottom: 0.7rem;
      }
      .preset-row button.is-on {
        border-color: var(--lime);
        color: var(--lime);
        background: var(--lime-soft);
      }
      .inline-money {
        display: flex;
        align-items: flex-end;
        gap: 8px;
      }
      .inline-money .grow {
        flex: 1;
        min-width: 0;
      }
      .inline-money .btn {
        min-height: 46px;
        white-space: nowrap;
      }
      .money-input {
        position: relative;
        display: flex;
        align-items: center;
      }
      .money-input__symbol {
        position: absolute;
        left: 12px;
        color: var(--lime);
        font-family: var(--font-mono);
        font-size: 0.85rem;
      }
      .money-input .input {
        padding-left: 26px;
        padding-right: 46px;
        font-family: var(--font-mono);
      }
      .money-input__code {
        position: absolute;
        right: 10px;
        font-size: 0.52rem;
        color: var(--muted-2);
      }
      .inline-link {
        display: inline-block;
        margin-left: 4px;
        color: var(--lime);
        font-weight: 600;
      }
      .movements {
        margin-top: 1.25rem;
      }
      .tx-icon.is-pos {
        color: var(--lime);
        background: rgba(201, 255, 61, 0.08);
      }
      .tx-icon.is-neg {
        color: var(--pink);
        background: var(--pink-soft);
      }
      .tx-link {
        display: grid;
        place-items: center;
        width: 26px;
        height: 26px;
        border-radius: 6px;
        color: var(--muted-2);
        text-decoration: none;
        flex: 0 0 auto;
      }
      .tx-link:hover {
        color: var(--lime);
        background: var(--lime-soft);
      }
      .segmented {
        flex: 0 0 auto;
      }
      @media (max-width: 700px) {
        .inline-money {
          flex-direction: column;
          align-items: stretch;
        }
        .inline-money .btn {
          width: 100%;
        }
        .panel__head .segmented {
          width: 100%;
        }
        .panel__head .segmented button {
          flex: 1;
        }
        .tx-row__meta {
          display: block;
        }
      }
    `,
  ],
})
export class WalletPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly walletApi = inject(WalletService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly wallet = signal<Wallet | null>(null);
  protected readonly loading = signal(true);
  protected readonly toppingUp = signal(false);
  protected readonly withdrawing = signal(false);
  protected readonly topupError = signal<string | null>(null);
  protected readonly withdrawError = signal<string | null>(null);
  protected readonly topupCents = signal(0);
  protected readonly filter = signal<TxFilter>('all');
  protected readonly presets = [50, 100, 250, 500];
  protected readonly Math = Math;

  protected readonly topupForm = this.fb.group({
    amount: [100, [Validators.required, Validators.min(5), Validators.max(2000)]],
  });

  protected readonly withdrawForm = this.fb.group({
    amount: [50, [Validators.required, Validators.min(5)]],
  });

  protected readonly transactions = computed(() => {
    const items = this.wallet()?.transactions ?? [];
    const filter = this.filter();
    if (filter === 'in') return items.filter((tx) => tx.amountCents > 0);
    if (filter === 'out') return items.filter((tx) => tx.amountCents < 0);
    return items;
  });

  ngOnInit(): void {
    this.topupForm.controls.amount.valueChanges.subscribe((value) => {
      this.topupCents.set(Math.round((Number(value) || 0) * 100));
      this.topupError.set(null);
    });
    this.load();
  }

  protected setTopup(value: number): void {
    this.topupForm.controls.amount.setValue(value);
    this.topupCents.set(value * 100);
  }

  protected focusTopUp(): void {
    this.setTopup(100);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected topUp(): void {
    this.topupError.set(null);
    this.topupForm.markAllAsTouched();
    if (this.topupForm.invalid) return;
    const cents = Math.round(Number(this.topupForm.controls.amount.value) * 100);
    if (cents < 500) {
      this.topupError.set('El mínimo por recarga es $5.00.');
      return;
    }
    this.toppingUp.set(true);
    this.walletApi.topUp(cents).subscribe({
      next: (wallet) => {
        this.toppingUp.set(false);
        this.wallet.set(wallet);
        this.toast.success('Saldo recargado', `${this.money(cents, wallet.currency)} disponibles.`);
      },
      error: (error) => {
        this.toppingUp.set(false);
        this.topupError.set(toApiError(error).message);
      },
    });
  }

  protected withdraw(): void {
    this.withdrawError.set(null);
    this.withdrawForm.markAllAsTouched();
    if (this.withdrawForm.invalid) return;
    const cents = Math.round(Number(this.withdrawForm.controls.amount.value) * 100);
    const data = this.wallet();
    if (data && cents > data.balanceCents) {
      this.withdrawError.set('No puedes retirar más que tu saldo disponible.');
      return;
    }
    this.withdrawing.set(true);
    this.walletApi.withdraw(cents).subscribe({
      next: (wallet) => {
        this.withdrawing.set(false);
        this.wallet.set(wallet);
        this.toast.success('Retiro registrado', `${this.money(cents, wallet.currency)} salieron de tu saldo demo.`);
      },
      error: (error) => {
        this.withdrawing.set(false);
        this.withdrawError.set(toApiError(error).message);
      },
    });
  }

  protected money(cents: number, currency = 'USD'): string {
    return formatMoney(cents, currency);
  }

  protected ago(iso: string): string {
    return relativeTime(iso);
  }

  protected label(tx: Transaction): string {
    return TRANSACTION_LABELS[tx.type] ?? tx.description ?? tx.type;
  }

  protected txIcon(tx: Transaction): IconName {
    switch (tx.type) {
      case 'TOPUP':
      case 'BONUS':
        return 'circle-plus';
      case 'ESCROW_HOLD':
        return 'lock';
      case 'ESCROW_RELEASE':
      case 'ESCROW_REFUND':
        return 'shield-check';
      case 'FEE':
        return 'receipt';
      case 'PAYOUT':
        return 'banknote';
      default:
        return 'circle-dollar';
    }
  }

  private load(): void {
    this.loading.set(true);
    this.walletApi
      .get()
      .pipe(
        catchError((error) => {
          this.toast.error('No pudimos cargar la billetera', toApiError(error).message);
          return of(null);
        }),
      )
      .subscribe((wallet) => {
        if (wallet) {
          this.wallet.set(wallet);
          if (wallet.balanceCents > 0) {
            const suggested = Math.min(100, Math.max(5, Math.floor(wallet.balanceCents / 100)));
            this.withdrawForm.controls.amount.setValue(suggested);
          }
        }
        this.loading.set(false);
      });
  }
}

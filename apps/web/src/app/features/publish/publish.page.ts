import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { toApiError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CategoryService, ListingService } from '../../core/listing.service';
import type { Category } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { FieldErrorComponent } from '../../shared/field-error.component';
import { IconComponent } from '../../shared/icon.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-publish-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    IconComponent,
    FieldErrorComponent,
    StatusBadgeComponent,
  ],
  template: `
    <header class="pub-head">
      <div>
        <p class="kicker">Nueva publicación</p>
        <h1 class="pub-head__title">PON ALGO<br /><em class="serif lime">a circular.</em></h1>
        <p class="lede">Publicar es gratis. Sé claro con lo que ofreces o buscas: los buenos canjes empiezan con buena información.</p>
      </div>
      <a class="back-link" routerLink="/app/mis-cosas">
        <app-icon name="arrow-left" [size]="14" /> Mis publicaciones
      </a>
    </header>

    <form class="pub-grid" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="pub-main">
        <section class="panel">
          <div class="panel__head">
            <div>
              <p class="mono panel__kicker">01 · Intención</p>
              <h2 class="panel__title">¿Qué haces con esto?</h2>
            </div>
          </div>

          <div class="kind-grid" role="group" aria-label="Tipo de publicación">
            <button
              class="kind"
              type="button"
              [class.is-on]="form.controls.kind.value === 'OFFER'"
              (click)="setKind('OFFER')"
            >
              <span class="kind__icon"><app-icon name="package" [size]="20" /></span>
              <span class="kind__copy">
                <strong>Ofrezco</strong>
                <small>Tengo un objeto, habilidad o servicio disponible.</small>
              </span>
              <span class="kind__check"><app-icon name="check" [size]="13" /></span>
            </button>

            <button
              class="kind"
              type="button"
              [class.is-on]="form.controls.kind.value === 'NEED'"
              (click)="setKind('NEED')"
            >
              <span class="kind__icon"><app-icon name="search" [size]="20" /></span>
              <span class="kind__copy">
                <strong>Necesito</strong>
                <small>Busco algo y ofrezco trueque o dinero a cambio.</small>
              </span>
              <span class="kind__check"><app-icon name="check" [size]="13" /></span>
            </button>
          </div>

          <div class="form-grid">
            <label class="field field--full">
              <span class="label">Título <span class="req">*</span></span>
              <input
                class="input"
                type="text"
                formControlName="title"
                maxlength="90"
                placeholder="Ej. Bicicleta urbana cuadro cromoly"
                [attr.aria-invalid]="form.controls.title.invalid && form.controls.title.touched"
              />
              <app-field-error [control]="form.controls.title" />
              <div class="count-row">
                <span class="hint">Mínimo 6 caracteres. Sin gritos ni MAYÚSCULAS enteras.</span>
                <span class="mono">{{ form.controls.title.value.length }} / 90</span>
              </div>
            </label>

            <label class="field field--full">
              <span class="label">Descripción <span class="req">*</span></span>
              <textarea
                class="textarea"
                formControlName="description"
                maxlength="2000"
                rows="7"
                placeholder="Cuenta el estado, qué incluye, qué te gustaría recibir y cualquier detalle que evite malentendidos."
                [attr.aria-invalid]="form.controls.description.invalid && form.controls.description.touched"
              ></textarea>
              <app-field-error [control]="form.controls.description" />
              <div class="count-row">
                <span class="hint">Mínimo 30 caracteres. Las fotos ayudan, pero el texto cierra el trato.</span>
                <span class="mono">{{ form.controls.description.value.length }} / 2000</span>
              </div>
            </label>

            <label class="field">
              <span class="label">Categoría <span class="req">*</span></span>
              <select class="select" formControlName="categoryId">
                <option value="">Elige una categoría</option>
                @for (category of categories(); track category.id) {
                  <option [value]="category.id">{{ category.name }}</option>
                }
              </select>
              <app-field-error [control]="form.controls.categoryId" />
            </label>

            <label class="field">
              <span class="label">Estado <span class="req">*</span></span>
              <select class="select" formControlName="condition">
                <option value="NEW">Nuevo</option>
                <option value="LIKE_NEW">Casi nuevo</option>
                <option value="GOOD">Buen estado</option>
                <option value="FAIR">Con uso</option>
                <option value="SERVICE">Servicio / habilidad</option>
              </select>
              <app-field-error [control]="form.controls.condition" />
            </label>

            <label class="field field--full">
              <span class="label">Zona de entrega o encuentro <span class="req">*</span></span>
              <input
                class="input"
                type="text"
                formControlName="location"
                maxlength="80"
                placeholder="Ej. Roma Norte, CDMX"
                [attr.aria-invalid]="form.controls.location.invalid && form.controls.location.touched"
              />
              <app-field-error [control]="form.controls.location" />
            </label>
          </div>
        </section>

        <section class="panel">
          <div class="panel__head">
            <div>
              <p class="mono panel__kicker">02 · Cómo quieres cerrar</p>
              <h2 class="panel__title">Pago y valor</h2>
            </div>
          </div>

          <div class="modality-grid" role="group" aria-label="Modalidad de canje">
            @for (option of modalities; track option.value) {
              <button
                class="modality"
                type="button"
                [class.is-on]="form.controls.modality.value === option.value"
                (click)="setModality(option.value)"
              >
                <app-icon [name]="option.icon" [size]="19" />
                <strong>{{ option.title }}</strong>
                <small>{{ option.text }}</small>
              </button>
            }
          </div>
          <app-field-error [control]="form.controls.modality" />

          @if (form.controls.modality.value !== 'BARTER') {
            <div class="price-row">
              <label class="field price-field">
                <span class="label">Valor en dinero (USD) <span class="req">*</span></span>
                <div class="money-input">
                  <span class="money-input__symbol">$</span>
                  <input
                    class="input"
                    type="number"
                    min="1"
                    step="0.01"
                    inputmode="decimal"
                    formControlName="price"
                    placeholder="0.00"
                  />
                  <span class="money-input__code mono">USD</span>
                </div>
                <app-field-error [control]="form.controls.price" />
              </label>
              <div class="price-help">
                <app-icon name="shield-check" [size]="16" />
                <p>
                  Si alguien acepta pagar, el monto queda <strong>en garantía</strong>. Se libera cuando ambas partes
                  confirman el canje. CANJEA retiene 5% al dueño al cerrar.
                </p>
              </div>
            </div>
          }

          <div class="tags-block">
            <span class="label">Etiquetas <span class="muted">(opcional, máximo 5)</span></span>
            <div class="tags-input">
              @for (tag of tags(); track tag) {
                <span class="tag">
                  #{{ tag }}
                  <button type="button" (click)="removeTag(tag)" [attr.aria-label]="'Quitar ' + tag">
                    <app-icon name="x" [size]="11" />
                  </button>
                </span>
              }
              @if (tags().length < 5) {
                <input
                  type="text"
                  maxlength="24"
                  placeholder="Escribe y presiona Enter"
                  [value]="tagDraft()"
                  (input)="tagDraft.set($any($event.target).value)"
                  (keydown.enter)="addTag($event)"
                  (blur)="addTag($event)"
                  aria-label="Añadir etiqueta"
                />
              }
            </div>
            @if (tagError()) {
              <p class="field__error">{{ tagError() }}</p>
            }
            <p class="hint">Ayudan a que te encuentren. Sin repetir y sin símbolos raros.</p>
          </div>
        </section>

        <section class="panel">
          <div class="panel__head">
            <div>
              <p class="mono panel__kicker">03 · Imagen</p>
              <h2 class="panel__title">Arte generativo CANJEA</h2>
            </div>
            <button class="btn btn--soft btn--sm" type="button" (click)="shuffleArt()">
              <app-icon name="refresh" [size]="14" /> Generar otro
            </button>
          </div>
          <p class="hint art-hint">
            No necesitas subir fotos para la demo. Generamos un póster único a partir del título; puedes cambiarlo
            cuantas veces quieras.
          </p>
          <div class="art-grid">
            <div class="art-preview">
              <img [src]="artUrl()" alt="Vista previa del arte generado" />
              <span class="art-preview__seed mono">{{ artSeed() }}</span>
            </div>
            <div class="art-side">
              <div class="art-rules">
                <p><app-icon name="image" [size]="14" /> Composición generada en el servidor.</p>
                <p><app-icon name="zap" [size]="14" /> Carga rápida y sin dependencias externas.</p>
                <p><app-icon name="sparkles" [size]="14" /> Paleta CANJEA: lima, violeta y rosa.</p>
              </div>
              <a class="btn btn--ghost btn--sm" routerLink="/app/mis-cosas">Ver mis publicaciones</a>
            </div>
          </div>
        </section>

        @if (error()) {
          <div class="alert alert--danger" role="alert">
            <app-icon name="alert-circle" [size]="17" />
            <div>{{ error() }}</div>
          </div>
        }

        <div class="publish-actions">
          <a class="btn btn--ghost" routerLink="/app">Cancelar</a>
          <button class="btn btn--primary grow" type="submit" [disabled]="saving()">
            @if (saving()) {
              <span class="spinner"></span> Publicando…
            } @else {
              Publicar ahora <app-icon name="arrow-right" [size]="16" />
            }
          </button>
        </div>
      </div>

      <aside class="pub-side">
        <div class="preview panel">
          <div class="preview__head">
            <span class="mono">Vista previa</span>
            <app-status-badge status="ACTIVE" kind="listing" />
          </div>

          <div class="preview__card">
            <div class="preview__media">
              <img [src]="artUrl()" alt="" />
              <span class="badge" [class.badge--pink]="form.controls.kind.value === 'NEED'" [class.badge--lime]="form.controls.kind.value === 'OFFER'">
                {{ form.controls.kind.value === 'OFFER' ? 'Se ofrece' : 'Se necesita' }}
              </span>
            </div>
            <div class="preview__body">
              <span class="mono">{{ categoryName() }}</span>
              <strong>{{ form.controls.title.value || 'Tu título aparecerá aquí' }}</strong>
              <span class="preview__price">{{ previewPrice() }}</span>
              <span class="preview__loc"><app-icon name="map-pin" [size]="11" /> {{ form.controls.location.value || 'Tu zona' }}</span>
            </div>
          </div>

          <ul class="preview__tips">
            <li><app-icon name="check" [size]="13" /> Título concreto, sin adornos</li>
            <li><app-icon name="check" [size]="13" /> Describe el estado real</li>
            <li><app-icon name="check" [size]="13" /> Di qué esperas recibir</li>
            <li><app-icon name="check" [size]="13" /> Zona clara para el encuentro</li>
          </ul>

          <div class="preview__trust">
            <app-icon name="shield-check" [size]="16" />
            <span>Publicación revisable por moderación. Sin costo de publicación.</span>
          </div>
        </div>

        <div class="panel side-note">
          <p class="mono side-note__label">Antes de publicar</p>
          <p>No publiques objetos robados, servicios ilegales ni datos personales de terceros. La moderación puede retirar publicaciones.</p>
          <a routerLink="/legal/terminos">Leer los términos <app-icon name="arrow-up-right" [size]="12" /></a>
        </div>
      </aside>
    </form>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .pub-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1.5rem;
        flex-wrap: wrap;
        margin-bottom: 1.5rem;
      }
      .pub-head > div {
        display: grid;
        gap: 9px;
        max-width: 60ch;
      }
      .pub-head__title {
        font-size: clamp(2.1rem, 4.6vw, 3.6rem);
        line-height: 0.96;
        letter-spacing: -0.05em;
      }
      .pub-head__title em {
        font-size: 1.03em;
      }
      .pub-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.5fr);
        gap: 14px;
        align-items: start;
      }
      .pub-main {
        display: grid;
        gap: 14px;
        min-width: 0;
      }
      .panel__kicker {
        font-size: 0.5rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--lime);
      }
      .kind-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 1.2rem;
      }
      .kind {
        display: flex;
        align-items: flex-start;
        gap: 9px;
        padding: 13px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: rgba(244, 240, 230, 0.02);
        color: var(--paper);
        text-align: left;
        cursor: pointer;
        transition: border-color 0.2s ease, background 0.2s ease;
      }
      .kind:hover {
        border-color: var(--line-strong);
      }
      .kind.is-on {
        border-color: var(--lime);
        background: var(--lime-soft);
      }
      .kind__icon {
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: 9px;
        border: 1px solid var(--line);
        color: var(--muted);
        flex: 0 0 auto;
      }
      .kind.is-on .kind__icon {
        color: var(--ink);
        background: var(--lime);
        border-color: var(--lime);
      }
      .kind__copy {
        display: grid;
        gap: 1px;
        flex: 1;
        min-width: 0;
      }
      .kind__copy strong {
        font-size: 0.84rem;
      }
      .kind__copy small {
        font-size: 0.68rem;
        color: var(--muted);
        line-height: 1.35;
      }
      .kind__check {
        display: grid;
        place-items: center;
        width: 19px;
        height: 19px;
        border-radius: 50%;
        border: 1px solid var(--line);
        color: transparent;
        flex: 0 0 auto;
      }
      .kind.is-on .kind__check {
        background: var(--lime);
        border-color: var(--lime);
        color: var(--ink);
      }
      .count-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
      }
      .count-row .mono {
        font-size: 0.5rem;
        color: var(--muted-2);
        flex: 0 0 auto;
      }
      .modality-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-bottom: 1.1rem;
      }
      .modality {
        display: grid;
        gap: 3px;
        padding: 11px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: rgba(244, 240, 230, 0.02);
        color: var(--muted);
        text-align: left;
        cursor: pointer;
        transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
      }
      .modality strong {
        font-size: 0.76rem;
        color: var(--paper);
        font-weight: 500;
      }
      .modality small {
        font-size: 0.64rem;
        line-height: 1.35;
        color: var(--muted-2);
      }
      .modality.is-on {
        border-color: var(--lime);
        background: var(--lime-soft);
        color: var(--lime);
      }
      .price-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 12px;
        align-items: center;
        padding: 12px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: rgba(244, 240, 230, 0.02);
        margin-bottom: 1.1rem;
      }
      .price-field {
        min-width: 0;
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
        font-size: 0.9rem;
      }
      .money-input .input {
        padding-left: 27px;
        padding-right: 50px;
        font-family: var(--font-mono);
        font-size: 1rem;
      }
      .money-input__code {
        position: absolute;
        right: 11px;
        font-size: 0.54rem;
        color: var(--muted-2);
      }
      .price-help {
        display: flex;
        gap: 8px;
        color: var(--muted);
        font-size: 0.7rem;
        line-height: 1.45;
      }
      .price-help app-icon {
        color: var(--lime);
        flex: 0 0 auto;
        margin-top: 1px;
      }
      .price-help strong {
        color: var(--paper);
        font-weight: 600;
      }
      .tags-block {
        display: grid;
        gap: 6px;
      }
      .tags-input {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 5px;
        min-height: 46px;
        padding: 6px 8px;
        border: 1px solid var(--line-strong);
        border-radius: var(--radius-sm);
        background: var(--ink);
      }
      .tags-input:focus-within {
        border-color: var(--lime);
        box-shadow: 0 0 0 3px rgba(201, 255, 61, 0.12);
      }
      .tags-input .tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 6px;
        font-size: 0.66rem;
        color: var(--lime);
        background: var(--lime-soft);
        border-color: rgba(201, 255, 61, 0.28);
      }
      .tags-input .tag button {
        display: grid;
        place-items: center;
        border: 0;
        background: transparent;
        color: var(--lime);
        cursor: pointer;
        padding: 0;
      }
      .tags-input input {
        flex: 1;
        min-width: 140px;
        border: 0;
        background: transparent;
        color: var(--paper);
        font-size: 0.8rem;
        outline: none;
        padding: 4px;
      }
      .art-hint {
        margin-bottom: 10px;
      }
      .art-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 12px;
        align-items: start;
      }
      .art-preview {
        position: relative;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        overflow: hidden;
        aspect-ratio: 4 / 3;
        background: var(--ink-3);
      }
      .art-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .art-preview__seed {
        position: absolute;
        left: 8px;
        bottom: 7px;
        font-size: 0.48rem;
        letter-spacing: 0.08em;
        color: rgba(244, 240, 230, 0.6);
        text-transform: uppercase;
      }
      .art-side {
        display: grid;
        gap: 10px;
        align-content: start;
      }
      .art-rules {
        display: grid;
        gap: 7px;
      }
      .art-rules p {
        display: flex;
        align-items: flex-start;
        gap: 7px;
        font-size: 0.74rem;
        color: var(--muted);
        line-height: 1.4;
      }
      .art-rules app-icon {
        color: var(--lime);
        margin-top: 1px;
        flex: 0 0 auto;
      }
      .publish-actions {
        display: flex;
        gap: 9px;
        align-items: center;
        padding: 4px 0 10px;
      }
      .pub-side {
        position: sticky;
        top: 82px;
        display: grid;
        gap: 10px;
      }
      .preview {
        display: grid;
        gap: 11px;
      }
      .preview__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .preview__head .mono {
        font-size: 0.5rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .preview__card {
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        overflow: hidden;
        background: var(--ink);
      }
      .preview__media {
        position: relative;
        aspect-ratio: 4 / 3;
        background: var(--ink-3);
      }
      .preview__media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .preview__media .badge {
        position: absolute;
        left: 8px;
        top: 8px;
      }
      .preview__body {
        display: grid;
        gap: 3px;
        padding: 10px;
      }
      .preview__body .mono {
        font-size: 0.48rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .preview__body strong {
        font-size: 0.9rem;
        line-height: 1.2;
        min-height: 2.3em;
      }
      .preview__price {
        font-family: var(--font-mono);
        font-size: 0.76rem;
        color: var(--lime);
      }
      .preview__loc {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 0.62rem;
        color: var(--muted-2);
      }
      .preview__tips {
        display: grid;
        gap: 5px;
      }
      .preview__tips li {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.72rem;
        color: var(--muted);
      }
      .preview__tips app-icon {
        color: var(--lime);
      }
      .preview__trust {
        display: flex;
        gap: 7px;
        padding-top: 9px;
        border-top: 1px solid var(--line);
        color: var(--muted-2);
        font-size: 0.64rem;
        line-height: 1.4;
      }
      .preview__trust app-icon {
        color: var(--lime);
        flex: 0 0 auto;
        margin-top: 1px;
      }
      .side-note {
        display: grid;
        gap: 7px;
      }
      .side-note__label {
        font-size: 0.48rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .side-note p {
        font-size: 0.72rem;
        color: var(--muted);
        line-height: 1.5;
      }
      .side-note a {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.66rem;
        color: var(--lime);
        text-decoration: none;
      }
      @media (max-width: 1080px) {
        .pub-grid {
          grid-template-columns: 1fr;
        }
        .pub-side {
          position: static;
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 640px) {
        .kind-grid,
        .modality-grid,
        .price-row,
        .art-grid,
        .pub-side {
          grid-template-columns: 1fr;
        }
        .pub-head .back-link {
          display: none;
        }
      }
    `,
  ],
})
export class PublishPage implements OnInit {
  private readonly categoriesApi = inject(CategoryService);
  private readonly listingsApi = inject(ListingService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly categories = signal<Category[]>([]);
  protected readonly tags = signal<string[]>([]);
  protected readonly tagDraft = signal('');
  protected readonly tagError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly artVersion = signal(0);
  protected readonly revision = signal(0);

  protected readonly modalities = [
    { value: 'BARTER' as const, title: 'Solo trueque', text: 'Cambio por otro objeto o servicio.', icon: 'repeat' as const },
    { value: 'CASH' as const, title: 'Solo dinero', text: 'Vendo por efectivo con garantía.', icon: 'banknote' as const },
    { value: 'BOTH' as const, title: 'Ambos', text: 'Acepto trueque o dinero.', icon: 'arrow-up-down' as const },
  ];

  protected readonly form = this.fb.group({
    kind: ['OFFER', [Validators.required]],
    title: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(90)]],
    description: ['', [Validators.required, Validators.minLength(30), Validators.maxLength(2000)]],
    categoryId: ['', [Validators.required]],
    condition: ['GOOD', [Validators.required]],
    modality: ['BOTH', [Validators.required]],
    price: [0, [Validators.min(0)]],
    location: [this.auth.user()?.city ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
  });

  protected readonly artSeed = computed(() => {
    this.artVersion();
    this.revision();
    const title = this.form.controls.title.value.trim();
    const base = slug(title || 'nueva-publicacion');
    return `${base || 'nueva-publicacion'}-${(this.artVersion() + 1).toString(36)}`;
  });

  protected readonly artUrl = computed(() => `/api/media/art/${encodeURIComponent(this.artSeed())}.svg`);
  protected readonly categoryName = computed(() => {
    this.revision();
    return (
      this.categories().find((category) => category.id === this.form.controls.categoryId.value)?.name ?? 'Categoría'
    );
  });

  protected readonly previewPrice = computed(() => {
    this.revision();
    const modality = this.form.controls.modality.value;
    if (modality === 'BARTER') return 'Trueque';
    const value = Number(this.form.controls.price.value) || 0;
    const money = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
    return modality === 'BOTH' ? `${money} · o trueque` : money;
  });

  ngOnInit(): void {
    this.categoriesApi
      .list()
      .pipe(catchError(() => of({ items: [], total: 0 })))
      .subscribe((result) => this.categories.set(result.items));

    this.form.valueChanges.subscribe(() => this.revision.update((value) => value + 1));
    this.form.controls.modality.valueChanges.subscribe((value) => {
      if (value === 'BARTER') this.form.controls.price.setValue(0);
      if (value !== 'BARTER' && Number(this.form.controls.price.value) <= 0) {
        this.form.controls.price.setValue(1);
      }
    });
  }

  protected setKind(kind: 'OFFER' | 'NEED'): void {
    this.form.controls.kind.setValue(kind);
  }

  protected setModality(value: 'BARTER' | 'CASH' | 'BOTH'): void {
    this.form.controls.modality.setValue(value);
  }

  protected shuffleArt(): void {
    this.artVersion.update((value) => value + 1);
  }

  protected addTag(event: Event): void {
    event.preventDefault();
    const value = this.tagDraft().trim().toLowerCase().replace(/^#/, '');
    if (!value) return;
    if (value.length < 2) {
      this.tagError.set('La etiqueta es muy corta.');
      return;
    }
    if (this.tags().includes(value)) {
      this.tagError.set('Esa etiqueta ya está.');
      return;
    }
    if (this.tags().length >= 5) {
      this.tagError.set('Máximo 5 etiquetas.');
      return;
    }
    this.tags.update((tags) => [...tags, value]);
    this.tagDraft.set('');
    this.tagError.set(null);
  }

  protected removeTag(tag: string): void {
    this.tags.update((tags) => tags.filter((item) => item !== tag));
  }

  protected submit(): void {
    this.error.set(null);
    this.form.markAllAsTouched();
    const modality = this.form.controls.modality.value;
    if (modality !== 'BARTER' && Number(this.form.controls.price.value) < 1) {
      this.form.controls.price.setErrors({ server: 'Indica al menos $1.00 para canje con dinero' });
    }
    if (this.form.invalid) {
      this.toast.error('Revisa el formulario', 'Faltan datos o hay valores fuera de rango.');
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.listingsApi
      .create({
        kind: value.kind as 'OFFER' | 'NEED',
        title: value.title.trim(),
        description: value.description.trim(),
        categoryId: value.categoryId,
        condition: value.condition,
        modality: value.modality,
        priceCents: modality === 'BARTER' ? 0 : Math.round(Number(value.price) * 100),
        currency: 'USD',
        location: value.location.trim(),
        tags: this.tags(),
        imageUrl: this.artUrl(),
      })
      .subscribe({
        next: (listing) => {
          this.saving.set(false);
          this.toast.success('Publicación creada', 'Ya está visible en el mercado.');
          void this.router.navigate(['/m', listing.id]);
        },
        error: (error) => {
          this.saving.set(false);
          const apiError = toApiError(error);
          this.error.set(apiError.message);
          this.toast.error('No se pudo publicar', apiError.message);
        },
      });
  }
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 42);
}

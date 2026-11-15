import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { SiteFooterComponent } from '../../shared/site-footer.component';
import { SiteHeaderComponent } from '../../shared/site-header.component';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, SiteHeaderComponent, SiteFooterComponent, IconComponent],
  template: `
    <app-site-header />

    <main id="contenido" class="not-found">
      <span class="not-found__code">ERROR 404 · FUERA DE RUTA</span>
      <h1>ESTA<br /><em class="serif lime">se perdió.</em></h1>
      <p class="lede">
        La página que buscas no existe, cambió de lugar o la publicación se retiró del mercado. Todavía hay mucho por
        intercambiar.
      </p>
      <div class="nf-actions">
        <a class="btn btn--primary" routerLink="/mercado">
          <app-icon name="store" [size]="15" /> Ir al mercado
        </a>
        <a class="btn btn--ghost" routerLink="/">
          <app-icon name="arrow-left" [size]="15" /> Volver al inicio
        </a>
      </div>
      <div class="nf-links">
        <a routerLink="/mercado" class="nf-link">
          <app-icon name="package" [size]="16" />
          <div><strong>Explorar publicaciones</strong><span>Objetos y habilidades esperando canje.</span></div>
          <app-icon name="arrow-up-right" [size]="14" />
        </a>
        <a routerLink="/registro" class="nf-link">
          <app-icon name="user-check" [size]="16" />
          <div><strong>Abrir una cuenta</strong><span>Publica, negocia y cobra en minutos.</span></div>
          <app-icon name="arrow-up-right" [size]="14" />
        </a>
      </div>
    </main>

    <app-site-footer />
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .not-found {
        min-height: calc(100dvh - var(--header-h));
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 1rem;
        padding: 3rem 1.5rem 4rem;
      }
      .not-found h1 {
        font-size: clamp(3.4rem, 11vw, 8rem);
        letter-spacing: -0.065em;
        line-height: 0.88;
      }
      .not-found h1 em {
        font-size: 1.02em;
      }
      .not-found .lede {
        max-width: 48ch;
      }
      .nf-actions {
        display: flex;
        gap: 9px;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 0.4rem;
      }
      .nf-links {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        width: min(620px, 100%);
        margin-top: 1.4rem;
        text-align: left;
      }
      .nf-link {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: var(--ink-2);
        color: inherit;
        text-decoration: none;
        transition: border-color 0.2s ease, background 0.2s ease;
      }
      .nf-link:hover {
        border-color: var(--line-strong);
        background: var(--ink-3);
      }
      .nf-link > app-icon:first-child {
        color: var(--lime);
        flex: 0 0 auto;
      }
      .nf-link > app-icon:last-child {
        color: var(--muted-2);
        margin-left: auto;
      }
      .nf-link div {
        display: grid;
        gap: 1px;
        min-width: 0;
      }
      .nf-link strong {
        font-size: 0.82rem;
        font-weight: 600;
      }
      .nf-link span {
        font-size: 0.7rem;
        color: var(--muted);
      }
      @media (max-width: 600px) {
        .nf-links {
          grid-template-columns: 1fr;
        }
        .nf-actions .btn {
          width: 100%;
        }
      }
    `,
  ],
})
export class NotFoundPage {}

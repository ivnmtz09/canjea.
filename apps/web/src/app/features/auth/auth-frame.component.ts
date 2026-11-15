import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { LogoComponent } from '../../shared/logo.component';

@Component({
  selector: 'app-auth-frame',
  imports: [RouterLink, LogoComponent, IconComponent],
  template: `
    <div class="auth">
      <aside class="auth__side" aria-hidden="true">
        <div class="auth__art">
          <img src="/api/media/art/auth-manos.svg" alt="" />
          <img src="/api/media/art/auth-trueque.svg" alt="" />
          <img src="/api/media/art/auth-objetos.svg" alt="" />
          <img src="/api/media/art/auth-ciudad.svg" alt="" />
        </div>
        <div class="auth__grain"></div>

        <div class="side__top">
          <app-logo />
          <span class="side__tag mono">Mercado abierto · 2026</span>
        </div>

        <div class="side__word">CANJEA</div>

        <div class="auth__quote">
          <blockquote>“{{ quote() }}”</blockquote>
          <cite>{{ quoteBy() }}</cite>
          <div class="side__stats">
            <div><strong>+1,200</strong><span>canjes cerrados</span></div>
            <div><strong>5%</strong><span>solo con dinero</span></div>
            <div><strong>0</strong><span>costo de entrada</span></div>
          </div>
        </div>
      </aside>

      <main class="auth__main">
        <div class="auth__form">
          <div class="form__top">
            <a class="back-link" routerLink="/">
              <app-icon name="arrow-left" [size]="14" /> Volver al mercado
            </a>
            <span class="form__badge mono"><app-icon name="lock" [size]="12" /> conexión segura</span>
          </div>

          <div class="auth__head">
            <p class="eyebrow">{{ eyebrow() }}</p>
            <h1>{{ title() }}</h1>
            <p>{{ subtitle() }}</p>
          </div>

          <ng-content />

        </div>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .auth__side {
        background: #0a0810;
        padding: clamp(1.4rem, 3vw, 2.6rem);
      }
      .auth__art {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        opacity: 0.42;
        filter: saturate(0.8);
      }
      .auth__art img {
        min-height: 0;
      }
      .auth__grain {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(201, 255, 61, 0.055) 1px, transparent 1px),
          linear-gradient(90deg, rgba(201, 255, 61, 0.055) 1px, transparent 1px);
        background-size: 46px 46px;
        mask-image: radial-gradient(circle at 30% 30%, black, transparent 72%);
        z-index: 0;
      }
      .side__top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .side__tag {
        font-size: 0.54rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--lime);
        border: 1px solid rgba(201, 255, 61, 0.28);
        background: rgba(7, 6, 9, 0.55);
        padding: 5px 9px;
        backdrop-filter: blur(8px);
      }
      .side__word {
        position: absolute;
        right: -0.08em;
        top: 38%;
        font-size: clamp(5rem, 11vw, 11rem);
        font-weight: 700;
        letter-spacing: -0.07em;
        line-height: 0.7;
        color: transparent;
        -webkit-text-stroke: 1px rgba(244, 240, 230, 0.13);
        user-select: none;
        z-index: 0;
      }
      .auth__quote {
        position: relative;
        z-index: 1;
      }
      .auth__quote blockquote {
        max-width: 24ch;
        text-wrap: balance;
      }
      .auth__quote cite {
        color: var(--lime);
      }
      .side__stats {
        display: flex;
        gap: 1.5rem;
        margin-top: 1.5rem;
        padding-top: 1.1rem;
        border-top: 1px solid var(--line);
      }
      .side__stats div {
        display: grid;
        gap: 1px;
      }
      .side__stats strong {
        font-size: 1.05rem;
        letter-spacing: -0.03em;
      }
      .side__stats span {
        font-family: var(--font-mono);
        font-size: 0.5rem;
        letter-spacing: 0.13em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .form__top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.4rem;
      }
      .form__top .back-link {
        margin-bottom: 0;
      }
      .form__badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.52rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted-2);
        white-space: nowrap;
      }
      .auth__form {
        animation: rise 0.4s var(--ease-out) both;
      }
      @media (max-width: 900px) {
        .auth__side {
          display: none;
        }
        .auth {
          grid-template-columns: 1fr;
        }
        .auth__main {
          min-height: 100dvh;
          padding: 2rem 1.25rem;
        }
      }
    `,
  ],
})
export class AuthFrameComponent {
  readonly eyebrow = input('Acceso');
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly quote = input('Lo que te sobra, es justo lo que alguien está buscando.');
  readonly quoteBy = input('Manifiesto CANJEA');
}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from './icon.component';
import { LogoComponent } from './logo.component';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, LogoComponent, IconComponent],
  template: `
    <footer class="ftr">
      <div class="ftr__ticker" aria-hidden="true">
        <div class="ftr__track">
          @for (item of ['Intercambia', 'Negocia', 'Cobra', 'Repite', 'Intercambia', 'Negocia', 'Cobra', 'Repite']; track $index) {
            <span>{{ item }}</span><span class="ftr__sep" aria-hidden="true"></span>
          }
        </div>
      </div>

      <div class="ftr__main">
        <div class="ftr__brand">
          <app-logo />
          <p class="ftr__claim">
            El mercado donde tus cosas<br />
            valen por lo que <span class="serif lime">pueden dar</span>.
          </p>
          <div class="ftr__demo">
            <span class="mono">Administración</span>
            <code>ivanjmm01&#64;gmail.com</code>
          </div>
        </div>

        <nav class="ftr__cols" aria-label="Enlaces del pie">
          <div>
            <h3 class="mono">Plataforma</h3>
            <a routerLink="/mercado">Mercado</a>
            <a routerLink="/app/publicar">Publicar</a>
            <a routerLink="/app/negociaciones">Negociaciones</a>
            <a routerLink="/app/billetera">Billetera</a>
          </div>
          <div>
            <h3 class="mono">Confianza</h3>
            <a routerLink="/" fragment="confianza">Cómo cuidamos el canje</a>
            <a routerLink="/" fragment="roles">Roles y permisos</a>
            <a routerLink="/legal/terminos">Términos</a>
            <a routerLink="/legal/privacidad">Privacidad</a>
          </div>
          <div>
            <h3 class="mono">Contacto</h3>
            <a href="mailto:hola@canjea.app">hola@canjea.app</a>
            <span class="ftr__muted">Ciudad de México</span>
            <span class="ftr__muted">Lun–Vie · 9 a 18 h</span>
            <div class="ftr__social">
              <a href="#" aria-label="Instagram"><app-icon name="instagram" [size]="17" /></a>
              <a href="#" aria-label="GitHub"><app-icon name="github" [size]="17" /></a>
              <a href="#" aria-label="LinkedIn"><app-icon name="linkedin" [size]="17" /></a>
            </div>
          </div>
        </nav>
      </div>

      <div class="ftr__word" aria-label="CANJEA">CANJEA</div>

      <div class="ftr__bottom">
        <span class="mono">© 2026 CANJEA · Mercado abierto de intercambio</span>
        <span class="mono">Hecho con manos, no con emojis</span>
      </div>
    </footer>
  `,
  styles: [
    `
      .ftr {
        position: relative;
        margin-top: 40px;
        border-top: 1px solid var(--line);
        background: linear-gradient(180deg, rgba(201, 255, 61, 0.03), transparent 30%);
        overflow: hidden;
      }
      .ftr__ticker {
        border-bottom: 1px solid var(--line);
        overflow: hidden;
        padding: 12px 0;
      }
      .ftr__track {
        display: flex;
        align-items: center;
        gap: 26px;
        width: max-content;
        animation: marquee 26s linear infinite;
        font-family: var(--font-mono);
        font-size: 0.66rem;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--muted-2);
      }
      .ftr__track span {
        white-space: nowrap;
      }
      .ftr__sep {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--lime);
        flex: 0 0 auto;
      }
      .ftr__main {
        width: min(100% - 40px, 1280px);
        margin-inline: auto;
        display: grid;
        grid-template-columns: 1.1fr 1.4fr;
        gap: 3rem;
        padding-block: clamp(40px, 6vw, 70px);
      }
      .ftr__claim {
        margin-top: 1.2rem;
        font-size: 1.45rem;
        line-height: 1.2;
        letter-spacing: -0.03em;
        max-width: 30ch;
      }
      .ftr__claim .serif {
        font-size: 1.55rem;
      }
      .ftr__demo {
        display: inline-grid;
        gap: 3px;
        margin-top: 1.5rem;
        padding: 0.7rem 0.9rem;
        border: 1px dashed var(--line-strong);
        border-radius: var(--radius);
        color: var(--muted);
      }
      .ftr__demo .mono {
        font-size: 0.54rem;
        color: var(--muted-2);
      }
      .ftr__demo code {
        font-family: var(--font-mono);
        font-size: 0.72rem;
        color: var(--lime);
      }
      .ftr__cols {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 2rem;
      }
      .ftr__cols > div {
        display: grid;
        align-content: start;
        gap: 0.55rem;
      }
      .ftr__cols h3 {
        color: var(--lime);
        font-size: 0.6rem;
        margin-bottom: 0.5rem;
      }
      .ftr__cols a,
      .ftr__muted {
        font-size: 0.83rem;
        color: var(--muted);
        transition: color 0.2s ease;
      }
      .ftr__cols a:hover {
        color: var(--paper);
      }
      .ftr__social {
        display: flex;
        gap: 8px;
        margin-top: 0.5rem;
      }
      .ftr__social a {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border: 1px solid var(--line);
        border-radius: 50%;
      }
      .ftr__social a:hover {
        color: var(--lime);
        border-color: var(--lime);
      }
      .ftr__word {
        font-size: clamp(5rem, 22vw, 18rem);
        line-height: 0.72;
        letter-spacing: -0.06em;
        font-weight: 700;
        text-align: center;
        color: transparent;
        -webkit-text-stroke: 1px rgba(244, 240, 230, 0.16);
        padding-block: 0 0.06em;
        user-select: none;
      }
      .ftr__bottom {
        width: min(100% - 40px, 1280px);
        margin-inline: auto;
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        padding-block: 1.2rem;
        border-top: 1px solid var(--line);
        color: var(--muted-2);
      }
      .ftr__bottom .mono {
        font-size: 0.55rem;
        letter-spacing: 0.1em;
      }
      @media (max-width: 900px) {
        .ftr__main {
          grid-template-columns: 1fr;
          gap: 2.4rem;
        }
      }
      @media (max-width: 620px) {
        .ftr__cols {
          grid-template-columns: 1fr 1fr;
          gap: 1.6rem;
        }
        .ftr__main {
          width: min(100% - 28px, 1280px);
        }
        .ftr__word {
          font-size: 26vw;
        }
      }
    `,
  ],
})
export class SiteFooterComponent {}

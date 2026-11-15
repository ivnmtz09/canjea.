import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { SiteFooterComponent } from '../../shared/site-footer.component';
import { SiteHeaderComponent } from '../../shared/site-header.component';

interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

interface LegalDoc {
  slug: string;
  label: string;
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  icon: 'scale' | 'shield' | 'lock';
  sections: LegalSection[];
}

const DOCS: LegalDoc[] = [
  {
    slug: 'terminos',
    label: 'Términos de uso',
    eyebrow: 'Marco general',
    title: 'LAS REGLAS DEL JUEGO.',
    intro:
      'CANJEA es un mercado abierto donde personas intercambian objetos, habilidades y servicios. Estos términos describen qué puedes esperar de la plataforma y qué esperamos de ti.',
    updated: '1 de noviembre de 2026',
    icon: 'scale',
    sections: [
      {
        id: 'que-es',
        title: '1. Qué es CANJEA',
        paragraphs: [
          'CANJEA conecta a personas que quieren intercambiar bienes o servicios mediante trueque, dinero o una combinación de ambos. La plataforma no es dueña de los artículos publicados ni participa en la entrega física: facilita el acuerdo, el registro y la protección de pagos.',
          'Al crear una cuenta aceptas estos términos, la política de privacidad y las reglas de garantía. Si no estás de acuerdo, no uses el servicio.',
        ],
      },
      {
        id: 'cuenta',
        title: '2. Tu cuenta',
        paragraphs: [
          'Debes tener al menos 18 años y proporcionar información veraz. Una persona puede mantener una sola cuenta principal. Eres responsable de la seguridad de tus credenciales y de toda actividad realizada desde tu sesión.',
        ],
        bullets: [
          'Verifica tu correo para publicar, retirar saldo y cerrar canjes con dinero.',
          'No compartas tu contraseña ni tus códigos de verificación.',
          'Notifícanos de inmediato si detectas un acceso no autorizado.',
        ],
      },
      {
        id: 'publicaciones',
        title: '3. Publicaciones y contenido',
        paragraphs: [
          'Solo puedes publicar artículos lícitos que tengas derecho a transferir, o servicios que puedas prestar legalmente. Está prohibido publicar armas, drogas, documentos robados, réplicas presentadas como originales, contenido sexual, especies protegidas o cualquier bien cuya venta esté restringida.',
          'La moderación puede pausar, corregir o retirar publicaciones que incumplan estas reglas, sin perjuicio de las acciones legales que correspondan.',
        ],
      },
      {
        id: 'negociaciones',
        title: '4. Negociaciones y cumplimiento',
        paragraphs: [
          'Una propuesta aceptada crea un compromiso entre las partes. Debes responder con rapidez, cumplir lo acordado y confirmar el cierre solo cuando hayas recibido lo pactado.',
          'CANJEA puede intervenir en disputas, solicitar evidencia y cancelar operaciones cuando existan señales de fraude, suplantación o abuso. Las decisiones de moderación buscan proteger a la comunidad y no sustituyen a la autoridad judicial.',
        ],
      },
      {
        id: 'comisiones',
        title: '5. Comisiones y pagos',
        paragraphs: [
          'Los canjes con dinero tienen una comisión de servicio del 5% sobre el monto protegido, descontada al liberar el pago al propietario. El trueque sin dinero no genera comisión.',
          'El saldo de la billetera es un registro operativo del entorno de demostración. Los retiros requieren identidad verificada y están sujetos a revisión antifraude.',
        ],
      },
      {
        id: 'sanciones',
        title: '6. Suspensión y cierre',
        paragraphs: [
          'Podemos suspender o cerrar cuentas que incumplan estos términos, manipulen reseñas, suplanten identidades o intenten eludir la garantía. Si tu cuenta se suspende, conservaremos el historial necesario para resolver disputas y cumplir obligaciones legales.',
          'Puedes solicitar el cierre de tu cuenta escribiendo a soporte. Los canjes en curso deben resolverse antes del cierre.',
        ],
      },
    ],
  },
  {
    slug: 'privacidad',
    label: 'Privacidad',
    eyebrow: 'Tus datos',
    title: 'LO QUE GUARDAMOS, Y POR QUÉ.',
    intro:
      'Recogemos lo mínimo necesario para que el mercado funcione: identidad, reputación y movimientos. No vendemos datos personales ni usamos tu información para publicidad de terceros.',
    updated: '1 de noviembre de 2026',
    icon: 'lock',
    sections: [
      {
        id: 'datos',
        title: '1. Datos que recogemos',
        paragraphs: [
          'Al registrarte guardamos tu nombre visible, usuario, correo, ciudad, país y contraseña cifrada. De forma opcional puedes añadir teléfono, biografía y avatar.',
        ],
        bullets: [
          'Datos de uso: publicaciones, favoritos, negociaciones, reseñas y movimientos de billetera.',
          'Datos técnicos: dirección IP, agente de usuario y registros de seguridad.',
          'Datos de verificación: estado del correo y códigos temporales, que caducan automáticamente.',
        ],
      },
      {
        id: 'uso',
        title: '2. Cómo los usamos',
        paragraphs: [
          'Usamos tus datos para operar el mercado, prevenir fraude, calcular tu reputación, procesar garantías y enviarte avisos relacionados con tus negociaciones. También para cumplir obligaciones legales y responder a requerimientos de autoridad competente.',
        ],
      },
      {
        id: 'visibilidad',
        title: '3. Qué es público',
        paragraphs: [
          'Tu nombre visible, usuario, avatar, ciudad, país, biografía, publicaciones activas y reseñas son visibles para cualquier visitante. Tu correo, teléfono, saldo y movimientos solo son visibles para ti y, cuando la ley lo permite, para el equipo de administración.',
        ],
      },
      {
        id: 'conservacion',
        title: '4. Conservación y seguridad',
        paragraphs: [
          'Conservamos la información mientras tu cuenta esté activa y durante los plazos necesarios para resolver disputas y cumplir obligaciones legales. Las contraseñas se almacenan con derivación scrypt y nunca se muestran en texto claro. Las sesiones usan tokens de acceso cortos y cookies httpOnly rotativas.',
        ],
      },
      {
        id: 'derechos',
        title: '5. Tus derechos',
        paragraphs: [
          'Puedes acceder, corregir o exportar tus datos desde tu perfil, y solicitar la eliminación de la cuenta. Algunos registros se conservan bloqueados durante el plazo legal aplicable. Para ejercer estos derechos escribe a privacidad@canjea.app.',
        ],
      },
    ],
  },
  {
    slug: 'garantia',
    label: 'Garantía y disputas',
    eyebrow: 'Dinero protegido',
    title: 'EL DINERO ESPERA. LA CONFIANZA CRECE.',
    intro:
      'Cuando un canje incluye dinero, el monto no llega directamente al vendedor. Queda retenido por CANJEA hasta que ambas partes confirman el cierre. Si algo sale mal, hay un camino claro.',
    updated: '1 de noviembre de 2026',
    icon: 'shield',
    sections: [
      {
        id: 'retencion',
        title: '1. Retención al aceptar',
        paragraphs: [
          'Al aceptar una propuesta con dinero, el monto se descuenta del saldo disponible del proponente y se registra como garantía. El propietario ve el compromiso, pero no puede disponer del dinero hasta completar el canje.',
          'Si el proponente no tiene saldo suficiente, la aceptación se rechaza y se le invita a recargar la billetera. No se genera deuda ni saldo negativo.',
        ],
      },
      {
        id: 'liberacion',
        title: '2. Liberación al completar',
        paragraphs: [
          'Al marcar el canje como completado, la garantía se libera al propietario menos la comisión de servicio del 5%. El movimiento queda registrado en el historial de ambas partes y habilita la publicación de reseñas.',
        ],
      },
      {
        id: 'cancelacion',
        title: '3. Cancelación y devolución',
        paragraphs: [
          'Si la negociación se cancela antes de completarse, el monto retenido vuelve íntegro al proponente. La comisión solo se cobra cuando el canje se cierra con éxito.',
          'Cancelar de forma reiterada después de aceptar puede afectar tu reputación y tu acceso a futuras garantías.',
        ],
      },
      {
        id: 'disputas',
        title: '4. Cómo abrir una disputa',
        paragraphs: [
          'Si no recibiste lo acordado o el artículo no corresponde a lo publicado, no marques el canje como completado. Escribe a soporte desde la negociación con evidencia: fotos, mensajes y descripción de lo ocurrido.',
        ],
        bullets: [
          'La moderación revisa el historial de la conversación y la evidencia aportada.',
          'Puede liberar el pago, devolverlo al proponente o mantenerlo retenido mientras se investiga.',
          'Las resoluciones se comunican por correo y quedan registradas en la auditoría de la plataforma.',
        ],
      },
      {
        id: 'limites',
        title: '5. Límites de la garantía',
        paragraphs: [
          'La garantía cubre el dinero entregado a través de CANJEA, no el valor de los objetos intercambiados fuera de la plataforma. Acuerda siempre entregas verificables y evita pagos por canales externos. Un pago fuera de la plataforma no puede protegerse ni reembolsarse.',
        ],
      },
    ],
  },
];

@Component({
  selector: 'app-legal-page',
  imports: [RouterLink, SiteHeaderComponent, SiteFooterComponent, IconComponent],
  template: `
    <app-site-header />

    <main id="contenido" class="legal">
      <div class="container">
        <nav class="breadcrumb" aria-label="Ruta">
          <a routerLink="/">Inicio</a>
          <app-icon name="chevron-right" [size]="11" />
          <span>Legal</span>
          <app-icon name="chevron-right" [size]="11" />
          <span>{{ doc().label }}</span>
        </nav>

        <header class="legal-hero">
          <p class="eyebrow">{{ doc().eyebrow }}</p>
          <h1 class="display legal-hero__title">{{ doc().title }}</h1>
          <p class="lede legal-hero__lede">{{ doc().intro }}</p>
          <p class="legal-hero__meta mono">
            <app-icon name="calendar" [size]="13" /> Última actualización · {{ doc().updated }}
          </p>
        </header>

        <div class="legal-grid">
          <aside class="legal-nav" aria-label="Documentos legales">
            <p class="mono-label">Documentos</p>
            @for (item of docs; track item.slug) {
              <a [routerLink]="['/legal', item.slug]" [class.is-active]="item.slug === doc().slug">
                <app-icon [name]="item.icon" [size]="15" />
                <span>{{ item.label }}</span>
              </a>
            }

            <p class="mono-label legal-nav__sub">En esta página</p>
            @for (section of doc().sections; track section.id) {
              <a class="legal-nav__anchor" [routerLink]="[]" [fragment]="section.id">{{ section.title }}</a>
            }

            <div class="legal-nav__help">
              <app-icon name="message" [size]="16" />
              <div>
                <strong>¿Dudas legales?</strong>
                <span>Escribe a legal&#64;canjea.app y te respondemos en 3 días hábiles.</span>
              </div>
            </div>
          </aside>

          <article class="legal-body">
            @for (section of doc().sections; track section.id) {
              <section [id]="section.id" class="legal-section">
                <h2>{{ section.title }}</h2>
                @for (paragraph of section.paragraphs; track $index) {
                  <p>{{ paragraph }}</p>
                }
                @if (section.bullets?.length) {
                  <ul>
                    @for (bullet of section.bullets; track $index) {
                      <li><app-icon name="check" [size]="13" /> <span>{{ bullet }}</span></li>
                    }
                  </ul>
                }
              </section>
            }

            <div class="legal-foot">
              <app-icon name="info" [size]="17" />
              <p>
                Este documento es una versión informativa para la demo de CANJEA. No constituye asesoría legal. Para
                operar en producción, cada cláusula debe revisarse con un abogado de la jurisdicción correspondiente.
              </p>
            </div>
          </article>
        </div>
      </div>
    </main>

    <app-site-footer />
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .legal {
        padding-bottom: clamp(3rem, 6vw, 5rem);
      }
      .legal-hero {
        max-width: 820px;
        padding-block: 1.6rem 2.4rem;
      }
      .legal-hero__title {
        margin-top: 0.7rem;
        font-size: clamp(2.4rem, 5.6vw, 4.4rem);
      }
      .legal-hero__lede {
        margin-top: 1rem;
        max-width: 64ch;
      }
      .legal-hero__meta {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-top: 1.1rem;
        font-size: 0.58rem;
        color: var(--muted);
      }
      .legal-grid {
        display: grid;
        grid-template-columns: 250px minmax(0, 1fr);
        gap: 3rem;
        align-items: start;
        padding-top: 1.6rem;
        border-top: 1px solid var(--line);
      }
      .legal-nav {
        position: sticky;
        top: 92px;
        display: grid;
        gap: 3px;
      }
      .legal-nav .mono-label {
        margin-bottom: 0.35rem;
      }
      .legal-nav__sub {
        margin-top: 1.2rem;
      }
      .legal-nav a {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 0.44rem 0.6rem;
        border-radius: 7px;
        color: var(--muted);
        font-size: 0.82rem;
        text-decoration: none;
        line-height: 1.35;
      }
      .legal-nav a:hover {
        color: var(--paper);
        background: rgba(243, 239, 230, 0.04);
      }
      .legal-nav a.is-active {
        color: var(--lime);
        background: var(--lime-soft);
        font-weight: 600;
      }
      .legal-nav__anchor {
        padding-left: 0.6rem !important;
        font-size: 0.74rem !important;
        color: var(--muted-2) !important;
        border-left: 1px solid var(--line);
        border-radius: 0 !important;
        margin-left: 0.6rem;
      }
      .legal-nav__anchor:hover {
        color: var(--paper-dim) !important;
        background: transparent !important;
      }
      .legal-nav__help {
        display: flex;
        gap: 8px;
        margin-top: 1.5rem;
        padding: 11px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: var(--ink-2);
      }
      .legal-nav__help app-icon {
        color: var(--lime);
        flex: 0 0 auto;
        margin-top: 1px;
      }
      .legal-nav__help div {
        display: grid;
        gap: 2px;
      }
      .legal-nav__help strong {
        font-size: 0.76rem;
      }
      .legal-nav__help span {
        font-size: 0.68rem;
        line-height: 1.45;
        color: var(--muted);
      }
      .legal-body {
        max-width: 76ch;
      }
      .legal-section {
        padding-bottom: 2rem;
        scroll-margin-top: 92px;
      }
      .legal-section + .legal-section {
        padding-top: 1.8rem;
        border-top: 1px solid var(--line);
      }
      .legal-section h2 {
        font-size: 1.3rem;
        letter-spacing: -0.03em;
        margin-bottom: 0.75rem;
      }
      .legal-section p {
        margin-bottom: 0.85rem;
        font-size: 0.92rem;
        line-height: 1.75;
        color: var(--paper-dim);
      }
      .legal-section p:last-child {
        margin-bottom: 0;
      }
      .legal-section ul {
        display: grid;
        gap: 7px;
        margin: 0.9rem 0 0;
        padding: 0;
        list-style: none;
      }
      .legal-section li {
        display: flex;
        gap: 8px;
        font-size: 0.88rem;
        line-height: 1.6;
        color: var(--paper-dim);
      }
      .legal-section li app-icon {
        color: var(--lime);
        flex: 0 0 auto;
        margin-top: 4px;
      }
      .legal-foot {
        display: flex;
        gap: 10px;
        padding: 14px 16px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: var(--ink-2);
      }
      .legal-foot app-icon {
        color: var(--muted);
        flex: 0 0 auto;
        margin-top: 2px;
      }
      .legal-foot p {
        font-size: 0.76rem;
        line-height: 1.6;
        color: var(--muted);
      }
      @media (max-width: 960px) {
        .legal-grid {
          grid-template-columns: 1fr;
          gap: 1.6rem;
        }
        .legal-nav {
          position: static;
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--line);
        }
        .legal-nav .mono-label,
        .legal-nav__sub,
        .legal-nav a.legal-nav__anchor,
        .legal-nav__help {
          display: none;
        }
        .legal-nav a {
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 0.38rem 0.7rem;
          font-size: 0.74rem;
        }
      }
    `,
  ],
})
export class LegalPage {
  private readonly route = inject(ActivatedRoute);
  private readonly slug = signal(this.route.snapshot.paramMap.get('doc') ?? DOCS[0].slug);
  protected readonly docs = DOCS;

  protected readonly doc = computed<LegalDoc>(() => {
    return this.docs.find((item) => item.slug === this.slug()) ?? this.docs[0];
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      this.slug.set(params.get('doc') ?? DOCS[0].slug);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { CategoryService, ListingService } from '../../core/listing.service';
import type { Category, Listing } from '../../core/models';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { IconComponent, type IconName } from '../../shared/icon.component';
import { ListingCardComponent } from '../../shared/listing-card.component';
import { RevealDirective } from '../../shared/reveal.directive';
import { SiteFooterComponent } from '../../shared/site-footer.component';
import { SiteHeaderComponent } from '../../shared/site-header.component';

const FALLBACK_LISTINGS: Listing[] = [
  {
    id: 'demo-1',
    kind: 'OFFER',
    title: 'Bicicleta urbana cuadro cromoly',
    description: 'Bici armada a mano, lista para rodar.',
    category: { id: 'c1', slug: 'bicicletas', name: 'Bicicletas', icon: 'bike' },
    condition: 'GOOD',
    modality: 'BOTH',
    priceCents: 420000,
    currency: 'USD',
    imageUrl: '/api/media/art/bicicleta-urbana.svg',
    tags: ['bici'],
    location: 'Ciudad de México',
    status: 'ACTIVE',
    views: 96,
    favoritesCount: 4,
    isFavorite: false,
    owner: { id: 'u1', username: 'luna', displayName: 'Luna Vega', avatarUrl: '/api/media/avatar/luna.svg?n=LV', bio: '', city: 'CDMX', country: 'MX', role: 'USER', emailVerified: true, ratingAvg: 4.9, ratingCount: 12, createdAt: '' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    kind: 'OFFER',
    title: 'Clases de guitarra eléctrica',
    description: 'Nivel básico a intermedio, material incluido.',
    category: { id: 'c2', slug: 'musica', name: 'Música', icon: 'music' },
    condition: 'SERVICE',
    modality: 'BARTER',
    priceCents: 0,
    currency: 'USD',
    imageUrl: '/api/media/art/clases-guitarra.svg',
    tags: ['guitarra'],
    location: 'Guadalajara',
    status: 'ACTIVE',
    views: 74,
    favoritesCount: 7,
    isFavorite: false,
    owner: { id: 'u2', username: 'kai', displayName: 'Kai Rivera', avatarUrl: '/api/media/avatar/kai.svg?n=KR', bio: '', city: 'GDL', country: 'MX', role: 'USER', emailVerified: true, ratingAvg: 4.8, ratingCount: 7, createdAt: '' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    kind: 'NEED',
    title: 'Busco monitor 27" para home office',
    description: 'Pago en efectivo o cambio por identidad visual.',
    category: { id: 'c3', slug: 'tecnologia', name: 'Tecnología', icon: 'cpu' },
    condition: 'SERVICE',
    modality: 'BOTH',
    priceCents: 500000,
    currency: 'USD',
    imageUrl: '/api/media/art/monitor-home-office.svg',
    tags: ['monitor'],
    location: 'Ciudad de México',
    status: 'ACTIVE',
    views: 58,
    favoritesCount: 2,
    isFavorite: false,
    owner: { id: 'u3', username: 'dani', displayName: 'Dani Demo', avatarUrl: '/api/media/avatar/dani.svg?n=DD', bio: '', city: 'CDMX', country: 'MX', role: 'USER', emailVerified: true, ratingAvg: 5, ratingCount: 1, createdAt: '' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

@Component({
  selector: 'app-landing-page',
  imports: [
    RouterLink,
    SiteHeaderComponent,
    SiteFooterComponent,
    ListingCardComponent,
    IconComponent,
    RevealDirective,
    EmptyStateComponent,
  ],
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.scss',
})
export class LandingPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly listingsApi = inject(ListingService);
  private readonly categoriesApi = inject(CategoryService);

  protected readonly featured = signal<Listing[]>([]);
  protected readonly heroListings = signal<Listing[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly totalListings = signal(0);
  protected readonly loading = signal(true);
  protected readonly filter = signal<'ALL' | 'OFFER' | 'NEED'>('ALL');
  protected readonly filtered = computed(() => {
    const items = this.featured();
    const filter = this.filter();
    return filter === 'ALL' ? items : items.filter((item) => item.kind === filter);
  });

  protected readonly steps: { n: string; icon: IconName; title: string; text: string; tag: string }[] = [
    {
      n: '01',
      icon: 'user',
      title: 'Crea tu identidad',
      text: 'Registro con correo verificado, contraseña fuerte y perfil público. Sin formularios eternos.',
      tag: 'Cuenta segura',
    },
    {
      n: '02',
      icon: 'package',
      title: 'Publica lo que tienes y lo que buscas',
      text: 'Objetos, habilidades, servicios o tiempo. Elige trueque, dinero o ambos y ponle condiciones.',
      tag: 'Oferta + necesidad',
    },
    {
      n: '03',
      icon: 'handshake',
      title: 'Negocia y cierra',
      text: 'Recibe propuestas, acuerda detalles y completa el canje. Si hay dinero, queda en garantía hasta cerrar.',
      tag: 'Trato protegido',
    },
  ];

  protected readonly categoryIcons: Record<string, IconName> = {
    tecnologia: 'cpu',
    hogar: 'home',
    bicicletas: 'bike',
    musica: 'music',
    diseno: 'pen-tool',
    servicios: 'wrench',
    comida: 'coffee',
    libros: 'book',
    gaming: 'gamepad',
    moda: 'shirt',
  };

  ngOnInit(): void {
    forkJoin({
      featured: this.listingsApi.list({ limit: 6, sort: 'popular' }).pipe(catchError(() => of({ items: [], meta: { page: 1, limit: 6, total: 0, pages: 1 } }))),
      categories: this.categoriesApi.list().pipe(catchError(() => of({ items: [], total: 0 }))),
    }).subscribe(({ featured, categories }) => {
      const items = featured.items.length ? featured.items : FALLBACK_LISTINGS;
      this.featured.set(items);
      this.heroListings.set(items.slice(0, 3));
      this.categories.set(categories.items);
      this.totalListings.set(categories.total || featured.meta.total || 20);
      this.loading.set(false);
    });
  }

  protected iconFor(slug: string): IconName {
    return this.categoryIcons[slug] ?? 'tag';
  }

  protected installLabel(): string {
    return this.auth.isAuthenticated() ? 'Ir a mi panel' : 'Crear cuenta gratis';
  }
}

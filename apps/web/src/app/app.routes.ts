import { Routes } from '@angular/router';
import { authGuard, guestGuard, permissionGuard } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'CANJEA — intercambia, negocia, cobra',
    loadComponent: () => import('./features/landing/landing.page').then((m) => m.LandingPage),
  },
  {
    path: 'mercado',
    title: 'Mercado — CANJEA',
    loadComponent: () => import('./features/market/market.page').then((m) => m.MarketPage),
  },
  {
    path: 'm/:id',
    title: 'Publicación — CANJEA',
    loadComponent: () =>
      import('./features/listing/listing-detail.page').then((m) => m.ListingDetailPage),
  },
  {
    path: 'u/:username',
    title: 'Perfil — CANJEA',
    loadComponent: () =>
      import('./features/profile/public-profile.page').then((m) => m.PublicProfilePage),
  },
  {
    path: 'entrar',
    title: 'Entrar — CANJEA',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    title: 'Crear cuenta — CANJEA',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'verificar',
    title: 'Verifica tu correo — CANJEA',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/verify.page').then((m) => m.VerifyPage),
  },
  {
    path: 'recuperar',
    title: 'Recuperar contraseña — CANJEA',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/forgot.page').then((m) => m.ForgotPage),
  },
  {
    path: 'restablecer',
    title: 'Nueva contraseña — CANJEA',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/reset.page').then((m) => m.ResetPage),
  },
  {
    path: 'legal/:doc',
    title: 'Legal — CANJEA',
    loadComponent: () => import('./features/legal/legal.page').then((m) => m.LegalPage),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Mi panel — CANJEA',
        loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'negociaciones',
        title: 'Negociaciones — CANJEA',
        loadComponent: () => import('./features/deals/deals.page').then((m) => m.DealsPage),
      },
      {
        path: 'negociaciones/:id',
        title: 'Negociación — CANJEA',
        loadComponent: () => import('./features/deals/deal-detail.page').then((m) => m.DealDetailPage),
      },
      {
        path: 'publicar',
        title: 'Publicar — CANJEA',
        canActivate: [permissionGuard('listing:create')],
        loadComponent: () => import('./features/publish/publish.page').then((m) => m.PublishPage),
      },
      {
        path: 'mis-cosas',
        title: 'Mis cosas — CANJEA',
        loadComponent: () => import('./features/my-stuff/my-stuff.page').then((m) => m.MyStuffPage),
      },
      {
        path: 'billetera',
        title: 'Billetera — CANJEA',
        loadComponent: () => import('./features/wallet/wallet.page').then((m) => m.WalletPage),
      },
      {
        path: 'perfil',
        title: 'Mi perfil — CANJEA',
        loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: 'admin',
        title: 'Administración — CANJEA',
        canActivate: [permissionGuard('stats:read')],
        loadComponent: () => import('./features/admin/admin.page').then((m) => m.AdminPage),
      },
    ],
  },
  {
    path: '**',
    title: 'No encontrado — CANJEA',
    loadComponent: () => import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];

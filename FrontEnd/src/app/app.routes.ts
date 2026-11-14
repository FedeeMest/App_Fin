import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { MainLayout } from './layout/main-layout';

export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./pages/auth').then((m) => m.AuthPage), data: { modo: 'login' } },
  { path: 'registro', canActivate: [guestGuard], loadComponent: () => import('./pages/auth').then((m) => m.AuthPage), data: { modo: 'registro' } },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', loadComponent: () => import('./pages/dashboard').then((m) => m.DashboardPage) },
      { path: 'movimientos', loadComponent: () => import('./pages/movimientos').then((m) => m.MovimientosPage) },
      { path: 'cuentas', loadComponent: () => import('./pages/cuentas').then((m) => m.CuentasPage) },
      { path: 'categorias', loadComponent: () => import('./pages/categorias').then((m) => m.CategoriasPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];

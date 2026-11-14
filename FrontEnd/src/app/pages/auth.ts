import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-auth',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center p-4">
      <form class="card w-full max-w-sm space-y-4" (ngSubmit)="enviar()">
        <h1 class="text-center text-2xl font-bold text-brand-700">💰 App Fin</h1>
        <p class="text-center text-slate-500">{{ registro ? 'Creá tu cuenta' : 'Iniciá sesión' }}</p>

        @if (registro) {
          <div><label class="label">Nombre completo</label>
            <input class="input" name="nombre" [(ngModel)]="nombre_completo" required autocomplete="name" /></div>
          <div><label class="label">Email</label>
            <input class="input" type="email" name="email" [(ngModel)]="email" required autocomplete="email" /></div>
        }
        <div><label class="label">Usuario</label>
          <input class="input" name="username" [(ngModel)]="username" required autocomplete="username" autocapitalize="none" /></div>
        <div><label class="label">Contraseña {{ registro ? '(mín. 8 caracteres)' : '' }}</label>
          <input class="input" type="password" name="password" [(ngModel)]="password" required
                 [attr.autocomplete]="registro ? 'new-password' : 'current-password'" /></div>

        @if (error()) { <p class="rounded-lg bg-red-50 p-2 text-sm text-red-700">{{ error() }}</p> }

        <button class="btn w-full" [disabled]="cargando()">{{ registro ? 'Registrarme' : 'Entrar' }}</button>
        <p class="text-center text-sm text-slate-500">
          @if (registro) { ¿Ya tenés cuenta? <a routerLink="/login" class="text-brand-700 underline">Ingresá</a> }
          @else { ¿No tenés cuenta? <a routerLink="/registro" class="text-brand-700 underline">Registrate</a> }
        </p>
      </form>
    </div>
  `,
})
export class AuthPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  registro = inject(ActivatedRoute).snapshot.data['modo'] === 'registro';

  username = ''; password = ''; email = ''; nombre_completo = '';
  error = signal('');
  cargando = signal(false);

  enviar() {
    this.error.set('');
    this.cargando.set(true);
    const req = this.registro
      ? this.auth.registro({ username: this.username, email: this.email, password: this.password, nombre_completo: this.nombre_completo })
      : this.auth.login(this.username, this.password);
    req.subscribe({
      next: () => this.router.navigate(['/inicio']),
      error: (e) => { this.error.set(e.error?.message ?? 'No se pudo conectar con el servidor'); this.cargando.set(false); },
    });
  }
}

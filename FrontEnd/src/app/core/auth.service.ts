import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

interface AuthResponse { token: string; usuario: { nombre: string } }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private url = `${environment.apiUrl}/auth`;

  token = signal<string | null>(localStorage.getItem('token'));
  nombre = signal<string>(localStorage.getItem('nombre') ?? '');

  login(username: string, password: string) {
    return this.http.post<AuthResponse>(`${this.url}/login`, { username, password }).pipe(tap((r) => this.guardar(r)));
  }

  registro(datos: { username: string; email: string; password: string; nombre_completo: string }) {
    return this.http.post<AuthResponse>(`${this.url}/register`, datos).pipe(tap((r) => this.guardar(r)));
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
    this.token.set(null);
    this.nombre.set('');
    this.router.navigate(['/login']);
  }

  private guardar(r: AuthResponse) {
    localStorage.setItem('token', r.token);
    localStorage.setItem('nombre', r.usuario.nombre);
    this.token.set(r.token);
    this.nombre.set(r.usuario.nombre);
  }
}

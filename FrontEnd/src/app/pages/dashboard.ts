import { Component, ElementRef, OnDestroy, ViewChild, effect, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../core/api.service';
import { Cuenta, Resumen, ResumenCuotas } from '../core/models';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, FormsModule, RouterLink],
  template: `
    <div class="mb-4 flex items-center justify-between gap-2">
      <h1 class="text-xl font-bold">Resumen</h1>
      <input type="month" class="input !w-auto" [ngModel]="mes()" (ngModelChange)="mes.set($event)" />
    </div>

    <div class="card mb-4 bg-brand-600 !text-white">
      <div class="text-sm opacity-80">Saldo total</div>
      <div class="text-3xl font-bold">{{ saldoTotal() | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</div>
    </div>

    <div class="mb-4 grid grid-cols-3 gap-2 sm:gap-4">
      <div class="card"><div class="text-xs text-slate-500">Ingresos</div>
        <div class="font-semibold text-emerald-600">{{ resumen()?.ingresos ?? 0 | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</div></div>
      <div class="card"><div class="text-xs text-slate-500">Gastos</div>
        <div class="font-semibold text-rose-600">{{ resumen()?.gastos ?? 0 | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</div></div>
      <div class="card"><div class="text-xs text-slate-500">Balance</div>
        <div class="font-semibold">{{ resumen()?.balance ?? 0 | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</div></div>
    </div>

    @if (cuotas(); as q) {
      @if (q.compras_activas > 0) {
        <a routerLink="/cuotas" class="card mb-4 flex items-center justify-between">
          <div><div class="text-xs text-slate-500">Cuotas a pagar este mes</div>
            <div class="font-semibold">{{ q.total_mes_actual | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</div></div>
          <div class="text-right text-xs text-slate-500">Deuda total<br /><span class="text-sm font-semibold text-slate-800">{{ q.deuda_total | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</span></div>
        </a>
      }
    }

    <div class="card">
      <h2 class="mb-3 font-semibold">Gastos por categoría</h2>
      @if (hayGastos()) {
        <div class="relative mx-auto h-64 max-w-sm"><canvas #grafico></canvas></div>
      } @else { <p class="py-8 text-center text-slate-400">Sin gastos en este mes</p> }
    </div>
  `,
})
export class DashboardPage implements OnDestroy {
  private api = inject(ApiService);
  mes = signal(new Date().toISOString().slice(0, 7));
  resumen = signal<Resumen | null>(null);
  cuentas = signal<Cuenta[]>([]);
  cuotas = signal<ResumenCuotas | null>(null);
  private chart?: Chart;
  private canvas?: ElementRef<HTMLCanvasElement>;

  @ViewChild('grafico') set grafico(el: ElementRef<HTMLCanvasElement> | undefined) { this.canvas = el; this.dibujar(); }

  saldoTotal = () => this.cuentas().reduce((s, c) => s + c.saldo, 0);
  hayGastos = () => Object.keys(this.resumen()?.porCategoria ?? {}).length > 0;

  constructor() {
    this.api.cuentas().subscribe((c) => this.cuentas.set(c));
    this.api.resumenCuotas(1).subscribe((q) => this.cuotas.set(q));
    effect(() => {
      const mes = this.mes();
      if (!mes) return;
      this.api.resumen(mes).subscribe((r) => { this.resumen.set(r); setTimeout(() => this.dibujar()); });
    });
  }

  private dibujar() {
    this.chart?.destroy();
    this.chart = undefined;
    const r = this.resumen();
    if (!this.canvas || !r || !this.hayGastos()) return;
    this.chart = new Chart(this.canvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: Object.keys(r.porCategoria),
        datasets: [{ data: Object.values(r.porCategoria), backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b', '#84cc16'] }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
    });
  }

  ngOnDestroy() { this.chart?.destroy(); }
}

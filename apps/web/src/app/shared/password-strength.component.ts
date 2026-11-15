import { Component, computed, input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-password-strength',
  imports: [IconComponent],
  template: `
    <div class="pwd">
      <div class="pwd__bars" aria-hidden="true">
        @for (bar of [0, 1, 2, 3]; track bar) {
          <span class="pwd__bar" [class.is-on]="score() > bar" [attr.data-tone]="tone()"></span>
        }
      </div>
      <div class="pwd__head">
        <span class="mono" [attr.data-tone]="tone()">{{ strengthLabel() }}</span>
        <span class="pwd__hint">{{ score() }}/4</span>
      </div>
      <ul class="pwd__list">
        @for (check of checks(); track check.label) {
          <li [class.is-ok]="check.ok">
            <app-icon [name]="check.ok ? 'circle-check' : 'circle-minus'" [size]="13" />
            {{ check.label }}
          </li>
        }
      </ul>
    </div>
  `,
  styles: [
    `
      .pwd {
        display: grid;
        gap: 8px;
        margin-top: 4px;
      }
      .pwd__bars {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 5px;
      }
      .pwd__bar {
        height: 4px;
        border-radius: 99px;
        background: rgba(244, 240, 230, 0.12);
        transition: background 0.25s ease;
      }
      .pwd__bar.is-on[data-tone='danger'] {
        background: var(--danger);
      }
      .pwd__bar.is-on[data-tone='warn'] {
        background: var(--orange);
      }
      .pwd__bar.is-on[data-tone='ok'] {
        background: var(--lime);
      }
      .pwd__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .pwd__head .mono {
        font-size: 0.58rem;
        letter-spacing: 0.14em;
      }
      .pwd__head .mono[data-tone='danger'] {
        color: var(--danger);
      }
      .pwd__head .mono[data-tone='warn'] {
        color: var(--orange);
      }
      .pwd__head .mono[data-tone='ok'] {
        color: var(--lime);
      }
      .pwd__hint {
        font-family: var(--font-mono);
        font-size: 0.6rem;
        color: var(--muted-2);
      }
      .pwd__list {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 2px 10px;
      }
      .pwd__list li {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.7rem;
        color: var(--muted-2);
        transition: color 0.2s ease;
      }
      .pwd__list li.is-ok {
        color: var(--muted);
      }
      .pwd__list li.is-ok app-icon {
        color: var(--lime);
      }
      @media (max-width: 480px) {
        .pwd__list {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class PasswordStrengthComponent {
  readonly password = input.required<string>();
  readonly checks = computed(() => {
    const value = this.password() ?? '';
    return [
      { label: '10 caracteres o más', ok: value.length >= 10 },
      { label: 'Mayúscula y minúscula', ok: /[A-Z]/.test(value) && /[a-z]/.test(value) },
      { label: 'Al menos un número', ok: /\d/.test(value) },
      { label: 'Al menos un símbolo', ok: /[^A-Za-z0-9]/.test(value) },
    ];
  });
  readonly score = computed(() => this.checks().filter((check) => check.ok).length);
  readonly tone = computed(() => (this.score() <= 1 ? 'danger' : this.score() < 4 ? 'warn' : 'ok'));
  readonly strengthLabel = computed(() => ['Muy débil', 'Muy débil', 'Débil', 'Fuerte', 'Excelente'][this.score()]);
}

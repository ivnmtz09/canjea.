import { Component, input } from '@angular/core';
import { IconComponent, type IconName } from './icon.component';

@Component({
  selector: 'app-empty-state',
  imports: [IconComponent],
  template: `
    <div class="empty-state">
      <span class="empty-state__icon"><app-icon [name]="icon()" [size]="22" /></span>
      <div>
        <p class="empty-state__title">{{ title() }}</p>
        @if (message()) {
          <p class="empty-state__msg">{{ message() }}</p>
        }
      </div>
      <ng-content />
    </div>
  `,
  styles: [
    `
      .empty-state__title {
        font-size: 1.02rem;
        font-weight: 600;
        color: var(--paper);
      }
      .empty-state__msg {
        margin-top: 0.3rem;
        font-size: 0.86rem;
        max-width: 44ch;
      }
    `,
  ],
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input('');
  readonly icon = input<IconName>('sparkles');
}

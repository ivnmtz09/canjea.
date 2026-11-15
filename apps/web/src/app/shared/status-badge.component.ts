import { Component, computed, input } from '@angular/core';
import { DEAL_LABELS, STATUS_LABELS } from '../core/format';

const TONES: Record<string, string> = {
  ACTIVE: 'lime',
  PROPOSED: 'violet',
  ACCEPTED: 'lime',
  COMPLETED: 'ok',
  REJECTED: 'danger',
  CANCELLED: 'muted',
  DISPUTED: 'pink',
  PAUSED: 'muted',
  MATCHED: 'violet',
  ARCHIVED: 'muted',
  REMOVED: 'danger',
};

@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [class]="'badge--' + tone()">{{ label() }}</span>`,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .badge--lime {
        border-color: var(--lime);
        color: var(--lime);
        background: var(--lime-soft);
      }
      .badge--violet {
        border-color: rgba(124, 92, 255, 0.55);
        color: #b3a2ff;
        background: var(--violet-soft);
      }
      .badge--ok {
        border-color: rgba(125, 255, 168, 0.4);
        color: var(--ok);
        background: rgba(125, 255, 168, 0.1);
      }
      .badge--danger {
        border-color: rgba(255, 95, 95, 0.5);
        color: var(--danger);
        background: rgba(255, 95, 95, 0.1);
      }
      .badge--pink {
        border-color: rgba(255, 77, 141, 0.55);
        color: var(--pink);
        background: var(--pink-soft);
      }
      .badge--muted {
        color: var(--muted);
      }
    `,
  ],
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  readonly kind = input<'deal' | 'listing'>('deal');
  readonly label = computed(() => {
    const labels = this.kind() === 'deal' ? DEAL_LABELS : STATUS_LABELS;
    return (labels as Record<string, string>)[this.status()] ?? this.status();
  });
  readonly tone = computed(() => TONES[this.status()] ?? 'muted');
}

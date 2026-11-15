import { Component, computed, input } from '@angular/core';
import { mediaUrl } from '../core/media';
import { initials } from '../core/format';
import type { User } from '../core/models';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-avatar',
  imports: [IconComponent],
  template: `
    <span class="avatar" [class]="'avatar--' + size()" [class.avatar--ring]="ring()">
      <img [src]="src()" [alt]="'Avatar de ' + name()" loading="lazy" />
      @if (showVerified() && user()?.emailVerified) {
        <span class="avatar__check" title="Identidad verificada">
          <app-icon name="check" [size]="9" [strokeWidth]="3" />
        </span>
      }
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .avatar {
        position: relative;
        display: inline-flex;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        overflow: visible;
        flex: 0 0 auto;
        background: var(--surface-2);
      }
      .avatar img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
        border: 1px solid var(--line-strong);
      }
      .avatar--ring img {
        box-shadow: 0 0 0 2px var(--ink), 0 0 0 3px rgba(201, 255, 61, 0.5);
      }
      .avatar--xs {
        width: 24px;
        height: 24px;
      }
      .avatar--sm {
        width: 32px;
        height: 32px;
      }
      .avatar--md {
        width: 40px;
        height: 40px;
      }
      .avatar--lg {
        width: 56px;
        height: 56px;
      }
      .avatar--xl {
        width: 92px;
        height: 92px;
      }
      .avatar__check {
        position: absolute;
        right: -2px;
        bottom: -2px;
        display: grid;
        place-items: center;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--lime);
        color: var(--ink);
        border: 2px solid var(--ink);
      }
      .avatar--xs .avatar__check,
      .avatar--sm .avatar__check {
        width: 13px;
        height: 13px;
      }
    `,
  ],
})
export class AvatarComponent {
  readonly user = input<User | null>(null);
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly ring = input(false);
  readonly showVerified = input(true);
  readonly src = computed(() => mediaUrl(this.user()?.avatarUrl, this.user()?.username ?? 'canjea'));
  readonly name = computed(() => this.user()?.displayName ?? this.initialsFallback());
  private initialsFallback(): string {
    return initials(this.user()?.displayName ?? 'CANJEA');
  }
}

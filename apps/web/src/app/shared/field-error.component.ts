import { Component, effect, input, signal } from '@angular/core';
import type { AbstractControl } from '@angular/forms';
import { IconComponent } from './icon.component';

const DEFAULT_MESSAGES: Record<string, string> = {
  required: 'Este campo es obligatorio',
  email: 'Escribe un correo válido',
  minlength: 'El texto es demasiado corto',
  maxlength: 'El texto es demasiado largo',
  min: 'El valor es demasiado bajo',
  max: 'El valor es demasiado alto',
  pattern: 'El formato no es válido',
  mismatch: 'Los valores no coinciden',
  whitespace: 'No uses solo espacios',
  usernameTaken: 'Ese usuario ya está ocupado',
  emailTaken: 'Ese correo ya tiene cuenta',
  server: 'Revisa este campo',
  invalidType: 'El tipo de dato no es válido',
};

@Component({
  selector: 'app-field-error',
  imports: [IconComponent],
  template: `
    @if (message(); as msg) {
      <p class="field__error" role="alert"><app-icon name="alert-circle" [size]="13" />{{ msg }}</p>
    }
  `,
})
export class FieldErrorComponent {
  readonly control = input<AbstractControl | null>(null);
  private readonly _message = signal<string | null>(null);
  readonly message = this._message.asReadonly();

  constructor() {
    effect((onCleanup) => {
      const control = this.control();
      this._message.set(this.extract(control));
      if (!control) return;
      const subscription = control.events.subscribe(() => this._message.set(this.extract(control)));
      onCleanup(() => subscription.unsubscribe());
    });
  }

  private extract(control: AbstractControl | null): string | null {
    if (!control || !control.errors || !(control.touched || control.dirty)) return null;
    const [key, value] = Object.entries(control.errors)[0] ?? [];
    if (!key) return null;

    if (key === 'server' && typeof value === 'string') return value;
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'message' in value && typeof value.message === 'string') return value.message;

    switch (key) {
      case 'minlength':
        return `Mínimo ${value?.requiredLength ?? ''} caracteres`;
      case 'maxlength':
        return `Máximo ${value?.requiredLength ?? ''} caracteres`;
      case 'min':
        return `El mínimo permitido es ${value?.min}`;
      case 'max':
        return `El máximo permitido es ${value?.max}`;
      default:
        return DEFAULT_MESSAGES[key] ?? 'Valor inválido';
    }
  }
}

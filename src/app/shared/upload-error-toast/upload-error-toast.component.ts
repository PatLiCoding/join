import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upload-error-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload-error-toast.component.html',
  styleUrls: ['./upload-error-toast.component.scss'],
})
export class UploadErrorToastComponent implements OnDestroy {
  private _message: string | null = '';
  private timer?: ReturnType<typeof setTimeout>;

  @Output() close = new EventEmitter<void>();

  @Input()
  set errorMessage(val: string | null) {
    this._message = val;
    clearTimeout(this.timer);
    if (val) {
      this.timer = setTimeout(() => this.close.emit(), 4000);
    }
  }

  get errorMessage(): string | null {
    return this._message;
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }
}

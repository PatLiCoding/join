import { Injectable } from '@angular/core';

/**
 * Locks and unlocks page scrolling on mobile viewports while a modal dialog is open.
 * Shared across dialog components to avoid duplicating the same viewport logic.
 */
@Injectable({ providedIn: 'root' })
export class ScrollLockService {
  private readonly scrollLockClass = 'dialog-scroll-lock';
  private readonly mobileBreakpoint = 1000;
  private isLocked = false;

  /**
   * Locks body scroll, but only on mobile-sized viewports.
   */
  lock(): void {
    if (typeof document === 'undefined' || !this.isMobileViewport()) {
      return;
    }
    document.body.classList.add(this.scrollLockClass);
    this.isLocked = true;
  }

  /**
   * Unlocks body scroll if it was previously locked by this service.
   */
  unlock(): void {
    if (typeof document === 'undefined' || !this.isLocked) {
      return;
    }
    document.body.classList.remove(this.scrollLockClass);
    this.isLocked = false;
  }

  /**
   * Checks whether the current viewport counts as mobile.
   * @returns True if the viewport width is at or below the mobile breakpoint.
   */
  private isMobileViewport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth <= this.mobileBreakpoint;
  }
}

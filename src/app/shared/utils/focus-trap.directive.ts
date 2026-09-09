import { Directive, ElementRef, AfterViewInit, HostListener, inject } from '@angular/core';

/**
 * Attribute directive that traps Tab-key focus within its host element.
 * Moves initial focus to the first focusable child on render, prevents
 * Tab/Shift+Tab from moving focus outside the host, and pulls focus back
 * whenever it lands on an element hidden from assistive tech (e.g. a
 * closing Viewer.js overlay that parks focus on its own hidden container).
 *
 * Usage: `<div class="my-dialog" appFocusTrap>`
 */
@Directive({
  selector: '[appFocusTrap]',
  standalone: true,
  exportAs: 'appFocusTrap',
})
export class FocusTrapDirective implements AfterViewInit {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly focusableSelector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /** Last element focused inside the host, used to restore focus if it gets lost. */
  private lastFocusedInRoot: HTMLElement | null = null;

  /**
   * Angular lifecycle hook called after the view initializes.
   * Moves focus into the host element for keyboard accessibility.
   */
  ngAfterViewInit(): void {
    setTimeout(() => this.focusFirstElement(), 0);
  }

  /**
   * Focuses the first focusable element within the host.
   */
  private focusFirstElement(): void {
    const focusable = this.getFocusableElements();
    focusable[0]?.focus();
  }

  /**
   * Returns all currently focusable elements within the host.
   */
  private getFocusableElements(): HTMLElement[] {
    const root = this.elementRef.nativeElement;
    return Array.from(root.querySelectorAll<HTMLElement>(this.focusableSelector));
  }

  /**
   * Traps Tab navigation within the host so focus cannot escape it.
   * @param event Keyboard event.
   */
  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const focusable = this.getFocusableElements();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    this.wrapFocus(event, first, last);
  }

  /**
   * Wraps focus from the last to the first element (or vice versa) when tabbing.
   * @param event Keyboard event.
   * @param first First focusable element.
   * @param last Last focusable element.
   */
  private wrapFocus(event: KeyboardEvent, first: HTMLElement, last: HTMLElement): void {
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /**
   * Tracks focus while it is inside the host, and pulls it back if it
   * ends up on an element that is hidden from assistive tech — which
   * happens when an overlay outside the host (like Viewer.js) parks
   * focus on its own container during its close/cleanup transition.
   * @param event Focus event.
   */
  @HostListener('document:focusin', ['$event'])
  onDocumentFocusIn(event: FocusEvent): void {
    const root = this.elementRef.nativeElement;
    const target = event.target as HTMLElement;
    if (root.contains(target)) {
      this.lastFocusedInRoot = target;
      return;
    }
    if (this.isHiddenFromAssistiveTech(target)) {
      this.restoreLastFocus();
    }
  }

  /**
   * Checks whether an element is hidden from assistive technology,
   * i.e. it should never legitimately hold keyboard focus.
   * @param el Element to check.
   */
  private isHiddenFromAssistiveTech(el: HTMLElement): boolean {
    return el.getAttribute('aria-hidden') === 'true' && el.tabIndex === -1;
  }

  /**
   * Restores focus to the last known element inside the host, or the
   * first focusable one as a fallback. Intended to be called externally
   * by components that open overlays (e.g. Viewer.js) outside the host's
   * DOM subtree, once that overlay has fully closed.
   */
  restoreLastFocus(): void {
    if (this.lastFocusedInRoot && document.body.contains(this.lastFocusedInRoot)) {
      this.lastFocusedInRoot.focus();
    } else {
      this.focusFirstElement();
    }
  }
}

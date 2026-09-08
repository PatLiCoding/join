/**
 * Reusable helper that shows a toast after a delay and hides it again
 * after a fixed duration, with automatic cleanup of pending timeouts.
 */
export class DelayedToast {
  /** ID reference for the active show timeout, used to delay displaying the element. */
  private showTimeoutId?: ReturnType<typeof setTimeout>;
  /** ID reference for the active hide timeout, used to delay hiding or dismissing the element. */
  private hideTimeoutId?: ReturnType<typeof setTimeout>;

  /**
   * @param onVisibilityChange Callback invoked with the toast's visibility state.
   * @param delayBeforeShow Milliseconds to wait before the toast appears.
   * @param visibleDuration Milliseconds the toast stays visible before hiding.
   */
  constructor(
    private readonly onVisibilityChange: (visible: boolean) => void,
    private readonly delayBeforeShow: number,
    private readonly visibleDuration: number,
  ) {}

  /**
   * Schedules the toast to appear after the configured delay and hide again afterwards.
   * Clears any previously pending schedule first.
   */
  schedule(): void {
    this.clear();
    this.showTimeoutId = window.setTimeout(() => {
      this.onVisibilityChange(true);
      this.hideTimeoutId = window.setTimeout(() => {
        this.onVisibilityChange(false);
      }, this.visibleDuration);
    }, this.delayBeforeShow);
  }

  /**
   * Clears any pending show/hide timeouts.
   */
  clear(): void {
    clearTimeout(this.showTimeoutId);
    clearTimeout(this.hideTimeoutId);

    this.showTimeoutId = undefined;
    this.hideTimeoutId = undefined;
  }
}

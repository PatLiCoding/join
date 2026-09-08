/**
 * Runs a callback once a matching CSS animation ends on the target element,
 * or after a fallback timeout — whichever happens first. Guarantees the
 * callback fires exactly once and cleans up its own listener/timeout.
 * @param target Element to observe for the animation.
 * @param animationNames Animation names that should count as completion.
 * @param fallbackMs Fallback delay in milliseconds if no matching animation fires.
 * @param onComplete Callback invoked once the animation ends or the fallback fires.
 */
export function runOnAnimationEndOrTimeout(
  target: HTMLElement,
  animationNames: string[],
  fallbackMs: number,
  onComplete: () => void,
): void {
  let fallbackId: number | undefined;
  const handleEnd = (event: AnimationEvent) => {
    if (event.target !== target || !animationNames.includes(event.animationName)) return;
    if (fallbackId !== undefined) window.clearTimeout(fallbackId);
    target.removeEventListener('animationend', handleEnd);
    onComplete();
  };
  fallbackId = window.setTimeout(() => {
    target.removeEventListener('animationend', handleEnd);
    onComplete();
  }, fallbackMs);
  target.addEventListener('animationend', handleEnd);
}

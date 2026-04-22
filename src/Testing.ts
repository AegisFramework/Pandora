/**
 * Test helpers for Pandora components.
 *
 * These utilities are re-exported as the `testing` namespace from the main
 * entry (`import { testing } from '@aegis-framework/pandora'`). They smooth
 * over the async nature of component rendering so your specs can assert
 * against stable DOM: wait for microtask renders to flush, mount a tag into
 * the document, and reset global Registry state between cases.
 */

import Component from './Component';
import Registry from './Registry';

/**
 * Flush pending microtask renders.
 *
 * Pandora batches state changes into microtask-scheduled renders. Call
 * `flush` after mutating state so the DOM reflects those changes before your
 * assertions run. Two passes are awaited to cover renders that queue further
 * microtasks during the first pass.
 *
 * @returns A promise that resolves once queued renders have settled.
 *
 * @example
 * const el = await mount('my-counter');
 * el.count = 3;
 * await flush();
 * expect(el.textContent).toContain('3');
 */
export async function flush(): Promise<void> {
  await new Promise<void>(resolve => queueMicrotask(resolve));

  await new Promise<void>(resolve => queueMicrotask(resolve));
}

/**
 * Wait until a component reports that it is ready.
 *
 * Resolves immediately if `element.isReady` is already `true`. Otherwise,
 * polls on `requestAnimationFrame` and rejects if the component does not
 * finish its first render within `timeout` milliseconds.
 *
 * @param element - The component element to observe.
 * @param timeout - How long to wait before rejecting, in milliseconds. Defaults to 5000.
 * @returns A promise that resolves once the component is ready.
 *
 * @example
 * const el = document.querySelector('user-avatar')!;
 * await whenReady(el);
 */
export function whenReady(element: Element, timeout: number = 5000): Promise<void> {
  const comp = element as Component;
  if (comp.isReady) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Component <${element.tagName.toLowerCase()}> did not become ready within ${timeout}ms`));
    }, timeout);

    const check = () => {
      if (comp.isReady) {
        clearTimeout(timer);
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };

    requestAnimationFrame(check);
  });
}

/**
 * Reset Registry state between tests.
 *
 * Clears every state key, subscription, and middleware so each spec starts
 * from a clean slate. Component class registrations are not touched. Call
 * this in a `beforeEach` to isolate tests from one another.
 *
 * @example
 * beforeEach(() => {
 *   resetRegistry();
 * });
 */
export function resetRegistry(): void {
  Registry.clearState();
  Registry.clearSubscriptions();
  Registry.clearMiddleware();
}

/**
 * Create a component, append it to the DOM, and wait for it to be ready.
 *
 * Wraps the tag in a throwaway container so that attributes and children
 * are parsed in a single pass. Defaults to mounting into `document.body`
 * when no container is provided.
 *
 * @param tagName - The custom element tag to mount (for example `'my-counter'`).
 * @param container - The parent node to append into. Defaults to `document.body`.
 * @param innerHTML - Optional markup to place inside the element's opening and closing tags.
 * @returns The mounted component once it has finished its first render.
 *
 * @example
 * const el = await mount('my-greeting', document.body, '<span slot="name">Ada</span>');
 * expect(el.textContent).toContain('Ada');
 */
export async function mount(tagName: string, container?: Element, innerHTML?: string): Promise<Component> {
  const root = container ?? document.body;
  const wrapper = document.createElement('div');

  wrapper.innerHTML = `<${tagName}>${innerHTML ?? ''}</${tagName}>`;

  const element = wrapper.firstElementChild as Component;

  root.appendChild(element);
  await whenReady(element);

  return element;
}

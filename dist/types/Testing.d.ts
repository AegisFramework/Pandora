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
export declare function flush(): Promise<void>;
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
export declare function whenReady(element: Element, timeout?: number): Promise<void>;
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
export declare function resetRegistry(): void;
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
export declare function mount(tagName: string, container?: Element, innerHTML?: string): Promise<Component>;
//# sourceMappingURL=Testing.d.ts.map
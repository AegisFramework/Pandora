import Component from './Component';
type ComponentClass = typeof Component & {
    tag: string;
    _registered?: boolean;
};
type StateSubscriber<T = unknown> = (newValue: T, oldValue: T | undefined) => void;
type LifecycleCallback = (component: Component, tag: string) => void;
type ErrorCallback = (error: Error, component: Component, tag: string, lifecycle: string) => void;
type MiddlewareType = 'render';
type RenderType = 'string' | 'lit';
type Middleware = (component: Component, value: unknown, renderType?: RenderType) => unknown;
type ComponentLoader = () => Promise<ComponentClass | {
    default: ComponentClass;
}>;
interface ComponentStats {
    tag: string;
    instanceCount: number;
    isRegistered: boolean;
    isLazy: boolean;
}
/**
 * Pandora's central registry for custom elements, global state, lifecycle
 * observers, and the render middleware pipeline.
 *
 * Everything you register with `@Register` flows through here, and you can
 * also talk to it directly: keep a catalog of tags, hot-swap implementations
 * with `evolve()`, share values across the tree with `setState()` /
 * `subscribe()`, watch every mount and unmount, or wrap render output with
 * `use('render', ...)`.
 *
 * Most APIs are designed to be used from anywhere in your app — import the
 * default export and call the static methods directly. There's no instance
 * to construct.
 *
 * @example
 * import Registry, { Component, Register } from '@aegis-framework/pandora';
 *
 * @Register('theme-toggle')
 * class ThemeToggle extends Component {
 *   render() {
 *     return `<button>Toggle</button>`;
 *   }
 * }
 *
 * Registry.setState('theme', 'dark');
 * const unsubscribe = Registry.subscribe('theme', (next) => {
 *   document.documentElement.dataset.theme = next as string;
 * });
 */
declare class Registry {
    /** Backing store for the `debug` accessor; defaults off so logging stays quiet in production. @internal */
    private static _debug;
    private static components;
    private static implementations;
    private static state;
    private static subscribers;
    private static mountCallbacks;
    private static unmountCallbacks;
    private static errorCallbacks;
    private static aliases;
    private static lazyLoaders;
    private static lazyLoadPromises;
    private static middleware;
    /** Flipped true on the first `_init()` call so subsequent entry points skip re-wiring Component hooks. @internal */
    private static _initialized;
    /**
     * One-time bootstrap that wires Component's hook slots to Registry methods.
     * The `_initialized` guard keeps repeated entry points (register, lazy,
     * onMount, etc.) from re-installing the hooks on every call.
     *
     * @internal
     */
    private static _init;
    /**
     * Associates a tag name with a component class and defines it on
     * `window.customElements`.
     *
     * You usually don't call this yourself — `@Register('my-tag')` does it for
     * you — but it's useful when you construct component classes dynamically
     * or register them from a bootstrapper. Throws if the tag is already
     * taken; reach for `evolve()` to swap an implementation instead.
     *
     * @param tag - The custom element tag to register under.
     * @param component - The component class to associate with the tag.
     *
     * @example
     * class MyGreeting extends Component {
     *   render() { return `<p>Hello</p>`; }
     * }
     *
     * Registry.register('my-greeting', MyGreeting);
     */
    static register(tag: string, component: ComponentClass): void;
    /**
     * Activates a deferred component by running the same work as `register()`.
     *
     * Use this with components decorated `@Register('my-tag', { defer: true })`
     * when you're ready to define them on `customElements`. Behaviorally
     * identical to `register()`; the different name just makes intent clearer
     * at the call site.
     *
     * @param tag - The tag to activate.
     * @param component - The component class to define.
     *
     * @example
     * @Register('lazy-chart', { defer: true })
     * class LazyChart extends Component { render() { return ''; } }
     *
     * // Later, when you're ready to light it up:
     * Registry.define('lazy-chart', LazyChart);
     */
    static define(tag: string, component: ComponentClass): void;
    /**
     * Returns the class currently backing a tag, including any version
     * installed by `evolve()` or a resolved lazy loader.
     *
     * Unlike `get()`, which always returns the originally-registered class,
     * this method follows `evolve()` swaps so tooling and debuggers can
     * inspect the live behavior.
     *
     * @param tag - The tag to look up.
     * @returns The active implementation, or `undefined` if the tag is unknown.
     *
     * @example
     * const CurrentButton = Registry.getImplementation('my-button');
     */
    static getImplementation(tag: string): ComponentClass | undefined;
    /**
     * Applies a source class's prototype, field defaults, metadata, and
     * decorator effects to a live instance. Used for both the evolve() swap
     * and lazy-load upgrade paths: we can't redefine the custom element, so
     * we replay the new class's behavior onto each existing instance.
     *
     * @internal
     */
    static _applyImplementation(instance: Component, source: ComponentClass, _merge?: boolean): void;
    /**
     * Hot-swaps the implementation behind a registered tag, so every future
     * instance uses the new class.
     *
     * The browser only lets you call `customElements.define()` once per tag,
     * so Pandora keeps the original class bound to the tag and replays the
     * new class's prototype methods, field defaults, and decorator effects
     * onto each live instance. Aliases created with `alias()` also pick up
     * the swap.
     *
     * Pass `true` as the third argument to force an immediate re-render of
     * every live instance (including aliased ones). Without it, already-mounted
     * components keep running the old code until they naturally re-render.
     *
     * @param tag - The existing tag whose implementation you're replacing.
     * @param component - The new component class to install.
     * @param rerender - When `true`, re-renders every mounted instance right away.
     *
     * @example
     * class MyCounter extends Component {
     *   render() { return `<span>v1</span>`; }
     * }
     * Registry.register('my-counter', MyCounter);
     *
     * class MyCounterV2 extends Component {
     *   render() { return `<span>v2</span>`; }
     * }
     * Registry.evolve('my-counter', MyCounterV2, true);
     */
    static evolve(tag: string, component: ComponentClass, rerender?: boolean): void;
    /**
     * Finds every live instance of a tag in the document.
     *
     * With one argument, returns the matching `NodeList` so you can iterate
     * it yourself. Pass a callback as the second argument and Pandora will
     * iterate for you and return nothing. Throws if the tag isn't registered.
     *
     * @param tag - The tag whose instances you want.
     * @param callback - Optional iterator invoked once per instance.
     * @returns A `NodeList` when no callback is provided; otherwise `void`.
     *
     * @example
     * // Collect every instance:
     * const buttons = Registry.instances('my-button');
     *
     * // Or iterate them directly:
     * Registry.instances('my-button', (el) => {
     *   (el as HTMLElement).classList.add('ready');
     * });
     */
    static instances(tag: string): NodeListOf<Element>;
    static instances(tag: string, callback: (instance: Element) => void): void;
    /**
     * Builds a detached element for a registered tag and seeds its initial
     * props and attributes.
     *
     * The returned element is created with `document.createElement` but not
     * attached anywhere — you choose where it lives by calling
     * `parent.appendChild(...)` or similar. Values are assigned as properties;
     * for plain fields without a reactive setter, string, number, and truthy
     * boolean values also mirror to the matching attribute.
     *
     * @param tag - The registered tag to create.
     * @param props - Initial property values keyed by field name.
     * @returns A detached component instance ready to attach.
     *
     * @example
     * const avatar = Registry.instantiate('user-avatar', {
     *   userId: 'u_42',
     *   size: 48
     * });
     * document.body.appendChild(avatar);
     */
    static instantiate(tag: string, props: Record<string, any>): Component;
    /**
     * Checks whether any component is registered under the given tag.
     *
     * Includes aliases and lazy components, since both are tracked in the
     * same catalog.
     *
     * @param tag - The tag to check.
     * @returns `true` if the tag is known to Registry.
     *
     * @example
     * if (!Registry.has('theme-toggle')) {
     *   Registry.register('theme-toggle', ThemeToggle);
     * }
     */
    static has(tag: string): boolean;
    /**
     * Returns the originally-registered class for a tag.
     *
     * If you want the current implementation (honoring `evolve()`), use
     * `getImplementation()` instead.
     *
     * @param tag - The tag to look up.
     * @returns The registered class, or `undefined` if the tag is unknown.
     *
     * @example
     * const ThemeToggle = Registry.get('theme-toggle');
     */
    static get(tag: string): ComponentClass | undefined;
    /**
     * Stores a value under the given key and synchronously notifies every
     * `subscribe()` callback registered on that key.
     *
     * Subscribers run in registration order and receive `(newValue, oldValue)`.
     * If a callback throws, the error propagates — wrap risky work yourself.
     *
     * @param key - The state key.
     * @param value - The new value.
     *
     * @example
     * Registry.setState('theme', 'dark');
     * Registry.setState('user', { id: 'u_42', name: 'Ada' });
     */
    static setState<T>(key: string, value: T): void;
    /**
     * Reads the current value stored under a key.
     *
     * Returns `undefined` if nothing has been set, which is indistinguishable
     * from a value that was explicitly set to `undefined` — use `hasState()`
     * if you need to tell them apart.
     *
     * @param key - The state key to read.
     * @returns The current value, or `undefined` if the key is unset.
     *
     * @example
     * const theme = Registry.getState<'light' | 'dark'>('theme');
     */
    static getState<T>(key: string): T | undefined;
    /**
     * Checks whether a state key has been set.
     *
     * Useful when you need to distinguish "never set" from "set to `undefined`."
     *
     * @param key - The state key to check.
     * @returns `true` if the key exists in the store.
     *
     * @example
     * if (!Registry.hasState('theme')) {
     *   Registry.setState('theme', 'light');
     * }
     */
    static hasState(key: string): boolean;
    /**
     * Removes a state key and notifies subscribers with `(undefined, oldValue)`.
     *
     * Returns `false` if the key wasn't present, so subscribers aren't called
     * for no-ops.
     *
     * @param key - The state key to delete.
     * @returns `true` if the key existed and was removed.
     *
     * @example
     * Registry.deleteState('user');
     */
    static deleteState(key: string): boolean;
    /**
     * Listens for changes to a state key.
     *
     * The callback fires only on future `setState()` and `deleteState()` calls —
     * it does not run immediately with the current value, so call `getState()`
     * yourself if you need to seed initial UI. Call the returned function to
     * stop listening.
     *
     * @param key - The state key to watch.
     * @param callback - Receives `(newValue, oldValue)` whenever the key changes.
     * @returns A function that removes this subscription.
     *
     * @example
     * const stop = Registry.subscribe<'light' | 'dark'>('theme', (next, prev) => {
     *   console.log(`theme changed from ${prev} to ${next}`);
     * });
     *
     * // Later, when you no longer care:
     * stop();
     */
    static subscribe<T>(key: string, callback: StateSubscriber<T>): () => void;
    /**
     * Removes a specific callback from a state key's subscription list.
     *
     * Most of the time you'll use the function returned by `subscribe()`
     * instead — this overload is available when you need to hold a reference
     * to the callback separately.
     *
     * @param key - The state key you subscribed to.
     * @param callback - The exact callback reference to remove.
     *
     * @example
     * const onThemeChange = (next: unknown) => console.log(next);
     * Registry.subscribe('theme', onThemeChange);
     * Registry.unsubscribe('theme', onThemeChange);
     */
    static unsubscribe<T>(key: string, callback: StateSubscriber<T>): void;
    /**
     * Returns a shallow copy of every key/value pair currently in the store.
     *
     * Handy for debugging, snapshotting, or serializing state. The copy is
     * shallow, so nested objects still share references with the live state.
     *
     * @returns A new object with all current state entries.
     *
     * @example
     * const snapshot = Registry.getAllState();
     * console.log(snapshot);
     */
    static getAllState(): Record<string, unknown>;
    /**
     * Removes every state key and notifies subscribers for each one.
     *
     * Each key is deleted via `deleteState()`, so subscribers receive
     * `(undefined, oldValue)` per key in insertion order. This is most useful
     * between tests; reach for `deleteState()` for targeted cleanup.
     *
     * @example
     * afterEach(() => {
     *   Registry.clearState();
     * });
     */
    static clearState(): void;
    /**
     * Drops every subscription registered via `subscribe()`.
     *
     * After this call, stored values remain untouched, but no callbacks will
     * fire on future changes. Intended for test teardown — in app code,
     * prefer the unsubscribe function each subscription returns.
     *
     * @example
     * afterEach(() => {
     *   Registry.clearSubscriptions();
     * });
     */
    static clearSubscriptions(): void;
    /**
     * Removes every middleware registered through `use()`.
     *
     * Mainly for test isolation, since middleware survives between specs
     * otherwise.
     *
     * @example
     * afterEach(() => {
     *   Registry.clearMiddleware();
     * });
     */
    static clearMiddleware(): void;
    /**
     * Toggles Pandora's debug logging.
     *
     * When `true`, Registry and Component write lifecycle events to the
     * console (`Registered`, `Mounted`, `Evolved`, error traces, and so on).
     * Defaults to `false`.
     *
     * @example
     * Registry.debug = true;
     */
    static get debug(): boolean;
    static set debug(value: boolean);
    /**
     * Writes a `[Pandora] …` message to the console when debug mode is on.
     *
     * Use this for your own logging if you want it to stay silent in
     * production but pop up when you flip `Registry.debug = true`.
     *
     * @param message - Text to log.
     * @param data - Optional extra value logged alongside the message.
     *
     * @example
     * Registry.debug = true;
     * Registry.log('user signed in', { id: 'u_42' });
     */
    static log(message: string, data?: unknown): void;
    /**
     * Returns every tag currently known to Registry.
     *
     * Includes aliases and lazy placeholders alongside normally-registered
     * tags.
     *
     * @returns An array of tag names.
     *
     * @example
     * console.log(Registry.list()); // ['my-greeting', 'theme-toggle', ...]
     */
    static list(): string[];
    /**
     * Reports current info about registered components: how many are mounted,
     * whether they're active, and whether they're still lazy.
     *
     * Called with a tag, returns a single stats object (throws if the tag is
     * unknown). Called with no argument, returns an array covering every
     * registered tag.
     *
     * @param tag - Optional specific tag to inspect.
     * @returns Stats for one tag or an array of stats for all tags.
     *
     * @example
     * Registry.stats('my-button');
     * // { tag: 'my-button', instanceCount: 3, isRegistered: true, isLazy: false }
     *
     * Registry.stats();
     * // [{ tag: 'my-button', ... }, { tag: 'theme-toggle', ... }]
     */
    static stats(tag?: string): ComponentStats | ComponentStats[];
    /**
     * Observes every component mount across your app.
     *
     * Your callback runs once for each component after its `connectedCallback`
     * resolves, receiving the instance and its tag. Useful for analytics,
     * wiring up dev tooling, or running a setup step whenever any Pandora
     * component appears.
     *
     * @param callback - Invoked with `(component, tag)` on every mount.
     * @returns A function that removes this observer.
     *
     * @example
     * const stop = Registry.onMount((component, tag) => {
     *   console.log(`<${tag}> mounted`, component);
     * });
     */
    static onMount(callback: LifecycleCallback): () => void;
    /**
     * Observes every component unmount across your app.
     *
     * Fires after `disconnectedCallback` completes, receiving the instance
     * and its tag. Pair it with `onMount()` to track lifecycles globally.
     *
     * @param callback - Invoked with `(component, tag)` on every unmount.
     * @returns A function that removes this observer.
     *
     * @example
     * Registry.onUnmount((component, tag) => {
     *   console.log(`<${tag}> unmounted`);
     * });
     */
    static onUnmount(callback: LifecycleCallback): () => void;
    /**
     * Fans a mount event out to every onMount observer. Each callback is
     * wrapped in try/catch so one misbehaving handler can't take down the
     * rest of the chain or the mounting component itself.
     *
     * @internal
     */
    static _notifyMount(component: Component, tag: string): void;
    /**
     * Fans an unmount event out to every onUnmount observer. Same
     * per-callback error isolation as _notifyMount so teardown keeps moving
     * even when a single observer throws.
     *
     * @internal
     */
    static _notifyUnmount(component: Component, tag: string): void;
    /**
     * Installs a global error handler for component lifecycle errors.
     *
     * When a component throws during mount, render, or another lifecycle
     * step, each registered handler runs with `(error, component, tag,
     * lifecycle)`. If no handlers are registered, the error is re-thrown so
     * you still see failures in development.
     *
     * @param callback - Invoked with details about the failure.
     * @returns A function that removes this handler.
     *
     * @example
     * Registry.onError((error, component, tag, lifecycle) => {
     *   console.error(`<${tag}> crashed in ${lifecycle}`, error);
     *   reportToSentry(error, { tag, lifecycle });
     * });
     */
    static onError(callback: ErrorCallback): () => void;
    /**
     * Dispatches a component lifecycle error. When no onError observers are
     * registered we re-throw so failures stay visible during development;
     * once any observer is installed, errors flow through the callback
     * chain (each wrapped in try/catch to isolate misbehaving handlers).
     *
     * @internal
     */
    static _notifyError(error: Error, component: Component, tag: string, lifecycle: string): void;
    /**
     * Creates a second tag that renders the same component as an existing one.
     *
     * Under the hood, Pandora defines a lightweight subclass of the original
     * component and registers it under the new tag, so both tags render
     * independently while sharing behavior. Later `evolve()` calls on the
     * original flow through to the alias automatically.
     *
     * Set the alias up *before* any `<alias-tag>` element appears in the
     * document — this is what actually defines the custom element. Throws if
     * the alias name is already taken or the original isn't registered.
     *
     * @param aliasTag - The new tag name to register.
     * @param originalTag - The existing tag to mirror.
     *
     * @example
     * Registry.register('my-button', MyButton);
     * Registry.alias('primary-button', 'my-button');
     *
     * // <primary-button> now behaves just like <my-button>.
     */
    static alias(aliasTag: string, originalTag: string): void;
    /**
     * Looks up the tag a given alias points to.
     *
     * @param aliasTag - A tag that was created with `alias()`.
     * @returns The underlying tag, or `undefined` if `aliasTag` isn't an alias.
     *
     * @example
     * Registry.alias('primary-button', 'my-button');
     * Registry.getOriginalTag('primary-button'); // 'my-button'
     * Registry.getOriginalTag('my-button');      // undefined
     */
    static getOriginalTag(aliasTag: string): string | undefined;
    /**
     * Reports whether a tag was created via `alias()`.
     *
     * @param tag - The tag to check.
     * @returns `true` if this tag is an alias of another registered tag.
     *
     * @example
     * Registry.isAlias('primary-button'); // true
     * Registry.isAlias('my-button');      // false
     */
    static isAlias(tag: string): boolean;
    /**
     * Registers a tag whose implementation is fetched on demand.
     *
     * Pandora defines a placeholder custom element right away, so you can put
     * `<lazy-chart>` in markup immediately. The first time one connects, the
     * loader runs, its resolved class is applied to every pending instance,
     * and the loader is discarded — subsequent instances reuse the already-
     * loaded implementation without calling the loader again.
     *
     * The loader can return either the class directly or a module namespace
     * with a `default` export, so dynamic `import()` calls work out of the box.
     *
     * @param tag - The tag to reserve for lazy loading.
     * @param loader - Async function that resolves to the component class.
     *
     * @example
     * Registry.lazy('lazy-chart', () => import('./LazyChart'));
     *
     * // Somewhere in your markup:
     * // <lazy-chart data-metric="signups"></lazy-chart>
     */
    static lazy(tag: string, loader: ComponentLoader): void;
    /**
     * Runs a registered lazy loader once, resolves its module-or-class
     * result, and installs the class as the live implementation for the
     * tag. We delete the loader afterwards so later instances short-circuit
     * and reuse the cached implementation instead of re-invoking import().
     *
     * @internal
     */
    static _loadLazyComponent(tag: string): Promise<void>;
    /**
     * Reports whether a tag is still waiting to be lazily loaded.
     *
     * Returns `true` only while the loader has not yet run; once a lazy
     * component has loaded (via mount or `preload()`), this returns `false`.
     *
     * @param tag - The tag to check.
     * @returns `true` if the loader is registered and hasn't fired yet.
     *
     * @example
     * if (Registry.isLazy('lazy-chart')) {
     *   await Registry.preload('lazy-chart');
     * }
     */
    static isLazy(tag: string): boolean;
    /**
     * Runs a lazy component's loader without having to mount it first.
     *
     * Handy for warming up components you'll need soon (route transitions,
     * about-to-open dialogs). No-ops if the tag isn't lazy or has already
     * been loaded.
     *
     * @param tag - The lazy tag to load ahead of time.
     *
     * @example
     * // Prime the chart before the user opens the dashboard:
     * await Registry.preload('lazy-chart');
     */
    static preload(tag: string): Promise<void>;
    /**
     * Installs a middleware function into one of Pandora's pipelines.
     *
     * Today the only supported type is `'render'`, which receives each
     * component's render output before it's applied to the DOM. Multiple
     * middleware run in registration order, and each one sees the value the
     * previous one returned, so you can chain transforms. The `renderType`
     * argument tells you whether the value is a plain string template or a
     * lit-html `TemplateResult`, so you can handle them appropriately.
     *
     * If a middleware throws, the error is logged via `console.error` and
     * the pipeline continues with the value it received, so one faulty
     * middleware can't break the chain.
     *
     * @param type - The middleware pipeline to hook into (currently `'render'`).
     * @param middleware - Receives `(component, value, renderType?)` and returns the new value.
     * @returns A function that removes this middleware.
     *
     * @example
     * const stop = Registry.use('render', (component, value, renderType) => {
     *   if (renderType === 'string' && typeof value === 'string') {
     *     return value.replace(/TODO/g, '<mark>TODO</mark>');
     *   }
     *   return value;
     * });
     */
    static use(type: MiddlewareType, middleware: Middleware): () => void;
    /**
     * Threads a value through every registered middleware in insertion
     * order, each one seeing the previous one's return value. Throws are
     * caught and logged — the faulty middleware contributes nothing and the
     * previous result passes through unchanged so one bad hook can't break
     * the render pipeline.
     *
     * @internal
     */
    static _applyMiddleware(type: MiddlewareType, component: Component, value: unknown, renderType?: RenderType): unknown;
    /**
     * Quick probe used by Component on hot render paths to skip building a
     * middleware context when nothing is registered for this type.
     *
     * @internal
     */
    static _hasMiddleware(type: MiddlewareType): boolean;
}
export default Registry;
//# sourceMappingURL=Registry.d.ts.map
import Component from './Component';
import { DECORATOR_EFFECTS, DECORATOR_TEARDOWNS } from './Util';

/** Tracks the last implementation class applied to an instance, to skip no-op reapplication. */
const APPLIED_IMPL: unique symbol = Symbol('pandora:appliedImpl');

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
type ComponentLoader = () => Promise<ComponentClass | { default: ComponentClass }>;

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
class Registry {
  /** Backing store for the `debug` accessor; defaults off so logging stays quiet in production. @internal */
  private static _debug: boolean = false;

  private static components: Record<string, ComponentClass> = {};

  private static implementations: Record<string, ComponentClass> = {};

  private static state: Record<string, unknown> = {};
  private static subscribers: Record<string, Set<StateSubscriber>> = {};

  private static mountCallbacks: Set<LifecycleCallback> = new Set();
  private static unmountCallbacks: Set<LifecycleCallback> = new Set();
  private static errorCallbacks: Set<ErrorCallback> = new Set();
  private static aliases: Record<string, string> = {};
  private static lazyLoaders: Record<string, ComponentLoader> = {};
  private static lazyLoadPromises: Partial<Record<string, Promise<void>>> = {};

  private static middleware: Record<MiddlewareType, Set<Middleware>> = {
    render: new Set()
  };

  /** Flipped true on the first `_init()` call so subsequent entry points skip re-wiring Component hooks. @internal */
  private static _initialized = false;

  /**
   * One-time bootstrap that wires Component's hook slots to Registry methods.
   * The `_initialized` guard keeps repeated entry points (register, lazy,
   * onMount, etc.) from re-installing the hooks on every call.
   *
   * @internal
   */
  private static _init(): void {
    if (this._initialized) return;
    this._initialized = true;

    Component._onMount = (component, tag) => this._notifyMount(component, tag);
    Component._onUnmount = (component, tag) => this._notifyUnmount(component, tag);
    Component._onError = (error, component, tag, lifecycle) => this._notifyError(error, component, tag, lifecycle);
    Component._applyMiddleware = (type, component, value, renderType) => this._applyMiddleware(type as MiddlewareType, component, value, renderType);
    Component._hasMiddleware = (type) => this._hasMiddleware(type as MiddlewareType);
    Component._subscribe = (key, cb) => this.subscribe(key, cb);
    Component._getGlobalState = (key) => this.getState(key);
    Component._applyCurrentImplementation = (instance, tag) => {
      // If evolve() has swapped in a different class since this instance was
      // constructed, re-apply it so the instance behaves like the new version.
      // We track the last-applied class on the instance to skip no-ops when
      // the implementation hasn't moved since we last touched it.
      const current = this.implementations[tag];
      if (!current) return;
      const inst = instance as unknown as Record<symbol, unknown>;
      const last = inst[APPLIED_IMPL] as ComponentClass | undefined;
      const base = last ?? (instance.constructor as ComponentClass);
      if (current === base) return;
      this._applyImplementation(instance, current, false);
    };
  }

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
  static register(tag: string, component: ComponentClass): void {
    this._init();

    if (typeof this.components[tag] === 'undefined') {
      this.components[tag] = component;
      this.implementations[tag] = component;
      component.tag = tag;

      window.customElements.define(tag, component);

      this.components[tag]._registered = true;
      this.log(`Registered: <${tag}>`);
    } else {
      throw new Error('A component with this tag has already been registered. Use the evolve() function to modify the component.');
    }
  }

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
  static define(tag: string, component: ComponentClass): void {
    this.register(tag, component);
  }

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
  static getImplementation(tag: string): ComponentClass | undefined {
    return this.implementations[tag] || this.components[tag];
  }

  /**
   * Applies a source class's prototype, field defaults, metadata, and
   * decorator effects to a live instance. Used for both the evolve() swap
   * and lazy-load upgrade paths: we can't redefine the custom element, so
   * we replay the new class's behavior onto each existing instance.
   *
   * @internal
   */
  static _applyImplementation(instance: Component, source: ComponentClass, _merge: boolean = false): void {
    const proto = source.prototype as unknown as Record<string, unknown>;
    const protoMethods = Object.getOwnPropertyNames(proto);
    const inst = instance as unknown as Record<string, unknown>;
    (instance as unknown as Record<symbol, unknown>)[APPLIED_IMPL] = source;

    for (const method of protoMethods) {
      if (method === 'constructor') continue;
      const descriptor = Object.getOwnPropertyDescriptor(proto, method);
      if (!descriptor) continue;

      if (typeof descriptor.value === 'function') {
        inst[method] = descriptor.value.bind(instance);
      } else if (descriptor.get || descriptor.set) {
        // Copy accessor descriptors onto the prototype so @Computed and
        // other accessor-based decorators remain reachable. Instance-level
        // overrides are installed later when we replay decorator effects.
        Object.defineProperty(Object.getPrototypeOf(instance), method, descriptor);
      }
    }

    // We construct a throwaway instance of the source class to run its
    // decorator initializers (which capture field defaults in closures for
    // later replay) and to harvest plain field defaults we can copy over.
    //
    // For evolved or lazy classes, `source` isn't what was handed to
    // customElements.define(), so Reflect.construct(source, [], source)
    // would throw. Passing the registered class as new.target satisfies
    // the browser while still running source's constructor body.
    try {
      const registeredClass = customElements.get(source.tag) ?? source;
      const temp = Reflect.construct(source, [], registeredClass) as unknown as Record<string, unknown>;
      for (const key of Object.keys(temp)) {
        if (!(key in inst) || inst[key] === undefined) {
          inst[key] = temp[key];
        }
      }
    } catch (error) {
      // Abstract classes and unusual constructors can fail this step. We
      // surface it so component authors aren't left guessing why their
      // defaults didn't copy over.
      console.warn(`[Pandora] Could not construct temp instance of <${source.tag}> for default extraction:`, error);
    }

    // Move the source class's metadata onto the registered class so that
    // runtime lookups (getWatchersForProperty, @Computed invalidation, and
    // friends) going through instance.constructor[Symbol.metadata] find
    // the new class's definitions instead of the stale originals.
    if (typeof Symbol.metadata !== 'undefined') {
      const sourceMeta = (source as any)[Symbol.metadata];
      if (sourceMeta) {
        const registeredClass = instance.constructor;
        (registeredClass as any)[Symbol.metadata] = sourceMeta;
      }
    }

    // Replay the source class's decorator effects. We tear down any
    // effects left from a previous implementation first so subscriptions
    // and watchers don't accumulate across successive evolve() calls.
    if (typeof Symbol.metadata !== 'undefined') {
      const meta = (source as any)[Symbol.metadata];
      const effects = meta?.[DECORATOR_EFFECTS] as ((inst: Component) => void)[] | undefined;
      if (effects?.length) {
        const teardowns = inst[DECORATOR_TEARDOWNS as unknown as string] as (() => void)[] | undefined;

        if (teardowns) {
          for (const teardown of teardowns) {
            teardown();
          }
        }

        inst[DECORATOR_TEARDOWNS as unknown as string] = [];

        for (const effect of effects) {
          effect(instance as any);
        }
      }
    }
  }

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
  static evolve(tag: string, component: ComponentClass, rerender: boolean = false): void {
    if (typeof this.components[tag] === 'undefined') {
      throw new Error('No component with this tag has been registered. Cannot Evolve.');
    }

    this.implementations[tag] = component;
    component._registered = true;

    // Propagate the new implementation to every alias of this tag. We do
    // this unconditionally — not only on the rerender path — because
    // _applyCurrentImplementation consults the implementation map on every
    // natural connect, and we want future alias instances to pick up the
    // swap too.
    const aliasTags: string[] = [];
    for (const [aliasTag, originalTag] of Object.entries(this.aliases)) {
      if (originalTag === tag) {
        aliasTags.push(aliasTag);
        this.implementations[aliasTag] = component;
      }
    }

    this.log(`Evolved: <${tag}>`);

    if (rerender) {
      // Walk aliases alongside the primary tag so live alias instances
      // get the swap too. We gate on isReady because forceRender() against
      // a half-constructed instance would double up its initial render.
      const tagsToUpdate = [tag, ...aliasTags];
      for (const updateTag of tagsToUpdate) {
        document.querySelectorAll(updateTag).forEach((instance) => {
          if (instance instanceof Component && (instance as Component).isReady) {
            this._applyImplementation(instance as Component, component, true);
            (instance as Component).forceRender();
          }
        });
      }
    }
  }

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
  static instances(tag: string, callback?: (instance: Element) => void): NodeListOf<Element> | void {
    if (typeof this.components[tag] === 'undefined') {
      throw new Error('No component with the provided tag has been registered.');
    }

    if (typeof callback === 'function') {
      document.querySelectorAll(tag).forEach(callback);
    } else {
      return document.querySelectorAll(tag);
    }
  }

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
  static instantiate(tag: string, props: Record<string, any>): Component {
    if (!this.has(tag)) {
      throw new Error(`No component with tag "${tag}" has been registered.`);
    }

    if (!this.components[tag]._registered) {
      this.register(tag, this.components[tag]);
    }

    const element = document.createElement(this.components[tag].tag) as Component;

    // We always assign as a property. @Attribute and @Property({ attribute })
    // fields mirror through their setters to the correct (possibly renamed)
    // attribute on their own, so we only need to manually set an attribute
    // for plain fields that don't have a reactive setter to do it for us.
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null) continue;

      (element as any)[key] = value;

      const hasReactiveSetter = Object.getOwnPropertyDescriptor(element, key)?.set !== undefined;
      if (hasReactiveSetter) continue;

      if (typeof value === 'boolean') {
        if (value) {
          element.setAttribute(key, '');
        }
      } else if (typeof value === 'string' || typeof value === 'number') {
        element.setAttribute(key, String(value));
      }
    }

    return element;
  }

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
  static has(tag: string): boolean {
    return typeof this.components[tag] !== 'undefined';
  }

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
  static get(tag: string): ComponentClass | undefined {
    return this.components[tag];
  }

  /*
   * =========================
   * Global State Management
   * =========================
   */

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
  static setState<T>(key: string, value: T): void {
    const oldValue = this.state[key] as T | undefined;
    this.state[key] = value;

    if (this.subscribers[key]) {
      this.subscribers[key].forEach((callback) => {
        callback(value, oldValue);
      });
    }
  }

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
  static getState<T>(key: string): T | undefined {
    return this.state[key] as T | undefined;
  }

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
  static hasState(key: string): boolean {
    return key in this.state;
  }

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
  static deleteState(key: string): boolean {
    if (key in this.state) {
      const oldValue = this.state[key];
      delete this.state[key];

      // Subscribers see undefined as the new value — this mirrors what
      // getState() will return from now on, so observers can treat delete
      // and "set to undefined" uniformly.
      if (this.subscribers[key]) {
        this.subscribers[key].forEach((callback) => {
          callback(undefined, oldValue);
        });
      }

      return true;
    }

    return false;
  }

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
  static subscribe<T>(key: string, callback: StateSubscriber<T>): () => void {
    if (!this.subscribers[key]) {
      this.subscribers[key] = new Set();
    }

    this.subscribers[key].add(callback as StateSubscriber);

    return () => {
      this.unsubscribe(key, callback);
    };
  }

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
  static unsubscribe<T>(key: string, callback: StateSubscriber<T>): void {
    if (this.subscribers[key]) {
      this.subscribers[key].delete(callback as StateSubscriber);
    }
  }

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
  static getAllState(): Record<string, unknown> {
    return { ...this.state };
  }

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
  static clearState(): void {
    const keys = Object.keys(this.state);

    for (const key of keys) {
      this.deleteState(key);
    }
  }

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
  static clearSubscriptions(): void {
    for (const key of Object.keys(this.subscribers)) {
      this.subscribers[key] = new Set();
    }
  }

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
  static clearMiddleware(): void {
    for (const key of Object.keys(this.middleware) as MiddlewareType[]) {
      this.middleware[key] = new Set();
    }
  }

  /*
   * =========================
   * Debugging Tools
   * =========================
   */

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
  static get debug(): boolean {
    return this._debug;
  }

  static set debug(value: boolean) {
    this._debug = value;
  }

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
  static log(message: string, data?: unknown): void {
    if (this._debug) {
      if (data !== undefined) {
        console.log(`[Pandora] ${message}`, data);
      } else {
        console.log(`[Pandora] ${message}`);
      }
    }
  }

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
  static list(): string[] {
    return Object.keys(this.components);
  }

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
  static stats(tag?: string): ComponentStats | ComponentStats[] {
    if (tag) {
      if (!this.has(tag)) {
        throw new Error(`No component with tag "${tag}" has been registered.`);
      }

      return {
        tag,
        instanceCount: document.querySelectorAll(tag).length,
        isRegistered: this.components[tag]?._registered ?? false,
        isLazy: tag in this.lazyLoaders
      };
    }

    return this.list().map((tag) => ({
      tag: tag,
      instanceCount: document.querySelectorAll(tag).length,
      isRegistered: this.components[tag]?._registered ?? false,
      isLazy: tag in this.lazyLoaders
    }));
  }

  /*
   * =========================
   * Global Lifecycle Hooks
   * =========================
   */

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
  static onMount(callback: LifecycleCallback): () => void {
    this._init();
    this.mountCallbacks.add(callback);

    return () => this.mountCallbacks.delete(callback);
  }

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
  static onUnmount(callback: LifecycleCallback): () => void {
    this._init();
    this.unmountCallbacks.add(callback);

    return () => this.unmountCallbacks.delete(callback);
  }

  /**
   * Fans a mount event out to every onMount observer. Each callback is
   * wrapped in try/catch so one misbehaving handler can't take down the
   * rest of the chain or the mounting component itself.
   *
   * @internal
   */
  static _notifyMount(component: Component, tag: string): void {
    this.log(`Mounted: <${tag}>`);
    this.mountCallbacks.forEach((callback) => {
      try {
        callback(component, tag);
      } catch (error) {
        console.error('[Pandora] Error in onMount callback:', error);
      }
    });
  }

  /**
   * Fans an unmount event out to every onUnmount observer. Same
   * per-callback error isolation as _notifyMount so teardown keeps moving
   * even when a single observer throws.
   *
   * @internal
   */
  static _notifyUnmount(component: Component, tag: string): void {
    this.log(`Unmounted: <${tag}>`);
    this.unmountCallbacks.forEach((callback) => {
      try {
        callback(component, tag);
      } catch (error) {
        console.error('[Pandora] Error in onUnmount callback:', error);
      }
    });
  }

  /*
   * =========================
   * Error Boundaries
   * =========================
   */

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
  static onError(callback: ErrorCallback): () => void {
    this._init();
    this.errorCallbacks.add(callback);

    return () => this.errorCallbacks.delete(callback);
  }

  /**
   * Dispatches a component lifecycle error. When no onError observers are
   * registered we re-throw so failures stay visible during development;
   * once any observer is installed, errors flow through the callback
   * chain (each wrapped in try/catch to isolate misbehaving handlers).
   *
   * @internal
   */
  static _notifyError(error: Error, component: Component, tag: string, lifecycle: string): void {
    this.log(`Error in <${tag}> during ${lifecycle}:`, error);

    if (this.errorCallbacks.size === 0) {
      throw error;
    }

    this.errorCallbacks.forEach((callback) => {
      try {
        callback(error, component, tag, lifecycle);
      } catch (callbackError) {
        console.error('[Pandora] Error in onError callback:', callbackError);
      }
    });
  }

  /*
   * =========================
   * Component Aliases
   * =========================
   */

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
  static alias(aliasTag: string, originalTag: string): void {
    if (!this.has(originalTag)) {
      throw new Error(`Cannot create alias: no component with tag "${originalTag}" has been registered.`);
    }

    if (this.has(aliasTag)) {
      throw new Error(`Cannot create alias: a component with tag "${aliasTag}" already exists.`);
    }

    this.aliases[aliasTag] = originalTag;

    // We create a subclass with its own _tag so customElements.define accepts
    // it, but it otherwise inherits everything from the original. Later
    // evolve() calls on the original can be fanned out to the alias through
    // the implementations map.
    const OriginalClass = this.getImplementation(originalTag) ?? this.components[originalTag];

    const AliasClass = class extends (OriginalClass as typeof Component) {
      static _tag = aliasTag;
    };

    this.components[aliasTag] = AliasClass as unknown as ComponentClass;
    this.implementations[aliasTag] = AliasClass as unknown as ComponentClass;
    window.customElements.define(aliasTag, AliasClass);
    (AliasClass as unknown as ComponentClass)._registered = true;

    this.log(`Created alias: <${aliasTag}> -> <${originalTag}>`);
  }

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
  static getOriginalTag(aliasTag: string): string | undefined {
    return this.aliases[aliasTag];
  }

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
  static isAlias(tag: string): boolean {
    return tag in this.aliases;
  }

  /*
   * =========================
   * Lazy Loading
   * =========================
   */

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
  static lazy(tag: string, loader: ComponentLoader): void {
    this._init();

    if (this.has(tag)) {
      throw new Error(`Cannot register lazy component: a component with tag "${tag}" already exists.`);
    }

    this.lazyLoaders[tag] = loader;

    // Capture the static registry as a local so the placeholder's
    // connectedCallback body reads cleanly.
    const registry = Registry;

    // A placeholder custom element we can define right away. When its first
    // instance connects we kick off the loader, swap the resolved class's
    // behavior onto this instance via _applyImplementation, then hand off
    // to Component's own connectedCallback so mount proceeds as normal.
    class LazyComponent extends Component {
      static _tag = tag;
      private _lazyLoaded = false;

      async connectedCallback(): Promise<void> {
        await registry._loadLazyComponent(tag);

        const RealComponent = registry.getImplementation(tag);
        if (RealComponent && RealComponent !== LazyComponent) {
          Registry._applyImplementation(this, RealComponent, false);
          this._lazyLoaded = true;
        }

        await super.connectedCallback();
      }
    }

    this.components[tag] = LazyComponent as unknown as ComponentClass;
    window.customElements.define(tag, LazyComponent);
    this.log(`Registered lazy component: <${tag}>`);
  }

  /**
   * Runs a registered lazy loader once, resolves its module-or-class
   * result, and installs the class as the live implementation for the
   * tag. We delete the loader afterwards so later instances short-circuit
   * and reuse the cached implementation instead of re-invoking import().
   *
   * @internal
   */
  static async _loadLazyComponent(tag: string): Promise<void> {
    if (this.lazyLoadPromises[tag]) {
      return this.lazyLoadPromises[tag];
    }

    if (!(tag in this.lazyLoaders)) {
      return;
    }

    const loader = this.lazyLoaders[tag];
    this.log(`Loading lazy component: <${tag}>`);

    this.lazyLoadPromises[tag] = (async () => {
      try {
        const result = await loader();
        const componentClass = 'default' in result ? result.default : result;

        // One-shot: drop the loader so subsequent connects skip the fetch
        // and go straight to the implementation swap.
        delete this.lazyLoaders[tag];

        this.implementations[tag] = componentClass;
        componentClass._registered = true;

        this.log(`Loaded lazy component: <${tag}>`);
      } catch (error) {
        console.error(`[Pandora] Failed to load lazy component <${tag}>:`, error);
        throw error;
      } finally {
        delete this.lazyLoadPromises[tag];
      }
    })();

    return this.lazyLoadPromises[tag];
  }

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
  static isLazy(tag: string): boolean {
    return tag in this.lazyLoaders;
  }

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
  static async preload(tag: string): Promise<void> {
    if (this.isLazy(tag)) {
      await this._loadLazyComponent(tag);
    }
  }

  /*
   * =========================
   * Middleware
   * =========================
   */

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
  static use(type: MiddlewareType, middleware: Middleware): () => void {
    this._init();
    this.middleware[type].add(middleware);

    return () => this.middleware[type].delete(middleware);
  }

  /**
   * Threads a value through every registered middleware in insertion
   * order, each one seeing the previous one's return value. Throws are
   * caught and logged — the faulty middleware contributes nothing and the
   * previous result passes through unchanged so one bad hook can't break
   * the render pipeline.
   *
   * @internal
   */
  static _applyMiddleware(type: MiddlewareType, component: Component, value: unknown, renderType?: RenderType): unknown {
    let result = value;

    this.middleware[type].forEach((middleware) => {
      try {
        result = middleware(component, result, renderType);
      } catch (error) {
        console.error(`[Pandora] Error in ${type} middleware:`, error);
      }
    });

    return result;
  }

  /**
   * Quick probe used by Component on hot render paths to skip building a
   * middleware context when nothing is registered for this type.
   *
   * @internal
   */
  static _hasMiddleware(type: MiddlewareType): boolean {
    return this.middleware[type].size > 0;
  }
}

// We wire Component.register() to delegate to Registry.register() at
// import time rather than inside _init(). That way MyComp.register()
// works even if it's the very first Registry-adjacent call the user
// makes, without needing to prime _init() some other way.
Component._registryRegister = (tag, component) => Registry.register(tag, component as ComponentClass);

export default Registry;

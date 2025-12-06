import Component from './Component';

type ComponentClass = typeof Component & {
  tag: string;
  _registered?: boolean;
};

type StateSubscriber<T = unknown> = (newValue: T, oldValue: T | undefined) => void;
type LifecycleCallback = (component: Component, tag: string) => void;
type ErrorCallback = (error: Error, component: Component, tag: string, lifecycle: string) => void;
type MiddlewareType = 'props' | 'state' | 'render';
type Middleware = (component: Component, value: any) => any;
type ComponentLoader = () => Promise<ComponentClass | { default: ComponentClass }>;

interface ComponentStats {
  tag: string;
  instanceCount: number;
  isRegistered: boolean;
  isLazy: boolean;
}

/**
 * Registry for managing web components and global state
 */
class Registry {
  // We won't show logs by default
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

  private static middleware: Record<MiddlewareType, Set<Middleware>> = {
    props: new Set(),
    state: new Set(),
    render: new Set()
  };

  private static _initialized = false;

  /**
   * Initialize Registry hooks on the Component class. Called automatically on first use
   */
  private static _init(): void {
    if (this._initialized) return;
    this._initialized = true;

    // Set up Component hooks
    Component._onMount = (component, tag) => this._notifyMount(component, tag);
    Component._onUnmount = (component, tag) => this._notifyUnmount(component, tag);
    Component._onError = (error, component, tag, lifecycle) => this._notifyError(error, component, tag, lifecycle);
    Component._applyMiddleware = (type, component, value) => this._applyMiddleware(type as MiddlewareType, component, value);
    Component._hasMiddleware = (type) => this._hasMiddleware(type as MiddlewareType);
  }

  /**
   * Register a new component with a specific tag name
   *
   * @param tag - The tag name for the component
   * @param component - The component constructor
   */
  static register(tag: string, component: ComponentClass): void {
    this._init();

    if (typeof this.components[tag] === 'undefined') {
      this.components[tag] = component;
      this.implementations[tag] = component;
      component._tag = tag;

      window.customElements.define(tag, component);

      this.components[tag]._registered = true;
      this.log(`Registered: <${tag}>`);
    } else {
      throw new Error('A component with this tag has already been registered. Use the evolve() function to modify the component.');
    }
  }

  /**
   * Get the current implementation for a tag
   *
   * @internal
   */
  static getImplementation(tag: string): ComponentClass | undefined {
    return this.implementations[tag] || this.components[tag];
  }

  /**
   * Update an existing component with a new implementation
   *
   * @param tag - The tag name of the component to update
   * @param component - The new component constructor
   * @param rerender - Whether to re-render all existing instances (default: false)
   */
  static evolve(tag: string, component: ComponentClass, rerender: boolean = false): void {
    if (typeof this.components[tag] === 'undefined') {
      throw new Error('No component with this tag has been registered. Cannot Evolve.');
    }

    // Store the new implementation
    this.implementations[tag] = component;
    component._registered = true;

    this.log(`Evolved: <${tag}>`);

    // Update all existing instances with the new implementation
    if (rerender) {
      const proto = component.prototype as unknown as Record<string, unknown>;
      const protoMethods = Object.getOwnPropertyNames(proto);

      // Create a temporary instance to get default state/props. This avoids calling
      // the constructor's side effects
      const tempInstance = Object.create(proto);

      try {
        component.call(tempInstance);
      } catch {
        // Just skip state/props merging if the constructor fails
      }

      document.querySelectorAll(tag).forEach((instance) => {
        if (instance instanceof Component && (instance as Component).isReady) {
          const inst = instance as unknown as Record<string, unknown>;

          // Copy all prototype methods from the new component to the instance
          for (const method of protoMethods) {
            if (method !== 'constructor' && typeof proto[method] === 'function') {
              const fn = proto[method] as (...args: unknown[]) => unknown;
              inst[method] = fn.bind(instance);
            }
          }

          // Merge new default state properties
          if (tempInstance._state) {
            const existingState = inst._state as Record<string, unknown> || {};
            const newDefaults = tempInstance._state as Record<string, unknown>;
            for (const key of Object.keys(newDefaults)) {
              if (!(key in existingState)) {
                existingState[key] = newDefaults[key];
              }
            }
            inst._state = existingState;
          }

          // Merge new default props properties
          if (tempInstance._props) {
            const existingProps = inst._props as Record<string, unknown> || {};
            const newDefaults = tempInstance._props as Record<string, unknown>;
            for (const key of Object.keys(newDefaults)) {
              if (!(key in existingProps)) {
                existingProps[key] = newDefaults[key];
              }
            }
            inst._props = existingProps;
          }

          // _connected, _isReady, _ready are preserved as we do want to keep
          // the state of the component on those.

          (instance as Component).forceRender();
        }
      });
    }
  }

  /**
   * Get all instances of a component or execute a callback on them
   *
   * @param tag - The tag name of the component
   * @param callback - Optional callback to execute on each instance
   */
  static instances(tag: string, callback?: (instance: Element) => void): NodeListOf<Element> | void {
    if (typeof this.components[tag] !== 'undefined') {
      if (typeof callback === 'function') {
        document.querySelectorAll(tag).forEach(callback);
      } else {
        return document.querySelectorAll(tag);
      }
    } else {
      throw new Error('No component with the provided tag has been registered.');
    }
  }

  /**
   * Create a new instance of a component
   *
   * @param tag - The tag name of the component
   * @param props - Properties to set on the component
   * @returns The created component instance
   */
  static instantiate(tag: string, props: Record<string, any>): Component {
    if (!this.has(tag)) {
      throw new Error(`No component with tag "${tag}" has been registered.`);
    }

    if (!this.components[tag]._registered) {
      this.register(tag, this.components[tag]);
    }

    const element = document.createElement(this.components[tag].tag) as Component;

    element.setProps(props);

    return element;
  }

  /**
   * Check if a component is registered with the given tag
   *
   * @param tag - The tag name to check
   * @returns True if a component is registered with the tag
   */
  static has(tag: string): boolean {
    return typeof this.components[tag] !== 'undefined';
  }

  /**
   * Get the component class registered with the given tag
   *
   * @param tag - The tag name of the component
   * @returns The component class or undefined if not registered
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
   * Set a global state value
   *
   * @param key - The state key
   * @param value - The value to set
   */
  static setState<T>(key: string, value: T): void {
    const oldValue = this.state[key] as T | undefined;
    this.state[key] = value;

    // Notify subscribers
    if (this.subscribers[key]) {
      this.subscribers[key].forEach((callback) => {
        callback(value, oldValue);
      });
    }
  }

  /**
   * Get a global state value
   *
   * @param key - The state key
   * @returns The state value or undefined if not set
   */
  static getState<T>(key: string): T | undefined {
    return this.state[key] as T | undefined;
  }

  /**
   * Check if a global state key exists
   *
   * @param key - The state key to check
   * @returns True if the state key exists
   */
  static hasState(key: string): boolean {
    return key in this.state;
  }

  /**
   * Delete a global state value
   *
   * @param key - The state key to delete
   * @returns True if the key existed and was deleted
   */
  static deleteState(key: string): boolean {
    if (key in this.state) {
      const oldValue = this.state[key];
      delete this.state[key];

      // Notify subscribers with undefined as new value
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
   * Subscribe to changes on a global state key
   *
   * @param key - The state key to subscribe to
   * @param callback - Function called when the state changes
   * @returns An unsubscribe function
   */
  static subscribe<T>(key: string, callback: StateSubscriber<T>): () => void {
    if (!this.subscribers[key]) {
      this.subscribers[key] = new Set();
    }

    this.subscribers[key].add(callback as StateSubscriber);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(key, callback);
    };
  }

  /**
   * Unsubscribe from changes on a global state key
   *
   * @param key - The state key to unsubscribe from
   * @param callback - The callback function to remove
   */
  static unsubscribe<T>(key: string, callback: StateSubscriber<T>): void {
    if (this.subscribers[key]) {
      this.subscribers[key].delete(callback as StateSubscriber);
    }
  }

  /**
   * Get all global state as an object
   *
   * @returns A copy of the global state object
   */
  static getAllState(): Record<string, unknown> {
    return { ...this.state };
  }

  /**
   * Clear all global state and notify subscribers
   */
  static clearState(): void {
    const keys = Object.keys(this.state);

    for (const key of keys) {
      this.deleteState(key);
    }
  }

  /*
   * =========================
   * Debugging Tools
   * =========================
   */

  /**
   * Enable or disable debug mode.
   * When enabled, lifecycle events are logged to the console.
   */
  static get debug(): boolean {
    return this._debug;
  }

  static set debug(value: boolean) {
    this._debug = value;
  }

  /**
   * Log a debug message if debug mode is enabled
   *
   * @param message - The message to log
   * @param data - Optional data to include
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
   * List all registered component tags
   *
   * @returns Array of registered component tag names
   */
  static list(): string[] {
    return Object.keys(this.components);
  }

  /**
   * Get statistics for a specific component or all components
   *
   * @param tag - Optional tag to get stats for a specific component
   * @returns Component stats or array of all component stats
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
   * Register a callback to be called when any component mounts
   *
   * @param callback - Function called with (component, tag) when a component mounts
   * @returns Unsubscribe function
   */
  static onMount(callback: LifecycleCallback): () => void {
    this._init();
    this.mountCallbacks.add(callback);

    return () => this.mountCallbacks.delete(callback);
  }

  /**
   * Register a callback to be called when any component unmounts
   *
   * @param callback - Function called with (component, tag) when a component unmounts
   * @returns Unsubscribe function
   */
  static onUnmount(callback: LifecycleCallback): () => void {
    this._init();
    this.unmountCallbacks.add(callback);

    return () => this.unmountCallbacks.delete(callback);
  }

  /**
   * Notify Registry that a component has mounted
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
   * Notify Registry that a component has unmounted
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
   * Register a global error handler for component errors
   *
   * @param callback - Function called with (error, component, tag, lifecycle) when an error occurs
   * @returns Unsubscribe function
   */
  static onError(callback: ErrorCallback): () => void {
    this._init();
    this.errorCallbacks.add(callback);

    return () => this.errorCallbacks.delete(callback);
  }

  /**
   * Notify Registry that an error occurred in a component
   *
   * @internal
   */
  static _notifyError(error: Error, component: Component, tag: string, lifecycle: string): void {
    this.log(`Error in <${tag}> during ${lifecycle}:`, error);

    if (this.errorCallbacks.size === 0) {
      // No error handlers registered, re-throw
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
   * Create an alias for an existing component tag
   *
   * @param aliasTag - The new tag name to use as an alias
   * @param originalTag - The original component tag name
   */
  static alias(aliasTag: string, originalTag: string): void {
    if (!this.has(originalTag)) {
      throw new Error(`Cannot create alias: no component with tag "${originalTag}" has been registered.`);
    }

    if (this.has(aliasTag)) {
      throw new Error(`Cannot create alias: a component with tag "${aliasTag}" already exists.`);
    }

    this.aliases[aliasTag] = originalTag;

    // Create a subclass that inherits from the original component
    const OriginalClass = this.components[originalTag];

    // Create a subclass with a different tag
    const AliasClass = class extends (OriginalClass as typeof Component) {
      static _tag = aliasTag;
    };

    this.components[aliasTag] = AliasClass as unknown as ComponentClass;
    window.customElements.define(aliasTag, AliasClass);

    this.log(`Created alias: <${aliasTag}> -> <${originalTag}>`);
  }

  /**
   * Get the original tag for an alias
   *
   * @param aliasTag - The alias tag name
   * @returns The original tag name or undefined if not an alias
   */
  static getOriginalTag(aliasTag: string): string | undefined {
    return this.aliases[aliasTag];
  }

  /**
   * Check if a tag is an alias
   *
   * @param tag - The tag name to check
   * @returns True if the tag is an alias
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
   * Register a component to be lazily loaded on first use
   *
   * @param tag - The tag name for the component
   * @param loader - Async function that returns the component class
   */
  static lazy(tag: string, loader: ComponentLoader): void {
    this._init();

    if (this.has(tag)) {
      throw new Error(`Cannot register lazy component: a component with tag "${tag}" already exists.`);
    }

    this.lazyLoaders[tag] = loader;

    // Store reference to Registry for use in the class
    const registry = Registry;

    // Create a placeholder class that will load and delegate to the real component
    class LazyComponent extends Component {
      static _tag = tag;
      private _lazyLoaded = false;

      async connectedCallback(): Promise<void> {
        // Load the real component on first mount
        await registry._loadLazyComponent(tag);

        // Get the loaded implementation
        const RealComponent = registry.getImplementation(tag);
        if (RealComponent && RealComponent !== LazyComponent) {
          const proto = RealComponent.prototype as unknown as Record<string, unknown>;
          const protoMethods = Object.getOwnPropertyNames(proto);
          const inst = this as unknown as Record<string, unknown>;

          // Copy prototype methods from the real component to this instance
          for (const method of protoMethods) {
            if (method !== 'constructor' && typeof proto[method] === 'function') {
              const fn = proto[method] as (...args: unknown[]) => unknown;
              inst[method] = fn.bind(this);
            }
          }

          // Get default state/props from the real component
          const tempInstance = Object.create(proto);

          try {
            RealComponent.call(tempInstance);
          } catch {
            // If constructor fails, skip state/props initialization
          }

          // Apply default state from real component
          if (tempInstance._state) {
            inst._state = { ...(tempInstance._state as object) };
          }

          // Apply default props from real component
          if (tempInstance._props) {
            inst._props = { ...(tempInstance._props as object) };
          }

          this._lazyLoaded = true;
        }

        // Now run the normal connected callback
        await super.connectedCallback();
      }
    }

    this.components[tag] = LazyComponent as unknown as ComponentClass;
    window.customElements.define(tag, LazyComponent);
    this.log(`Registered lazy component: <${tag}>`);
  }

  /**
   * Load a lazy component
   *
   * @internal
   */
  static async _loadLazyComponent(tag: string): Promise<void> {
    if (!(tag in this.lazyLoaders)) {
      return;
    }

    const loader = this.lazyLoaders[tag];
    this.log(`Loading lazy component: <${tag}>`);

    try {
      const result = await loader();
      const componentClass = 'default' in result ? result.default : result;

      // Remove from lazy loaders
      delete this.lazyLoaders[tag];

      // Store as the implementation
      this.implementations[tag] = componentClass;
      componentClass._registered = true;

      this.log(`Loaded lazy component: <${tag}>`);
    } catch (error) {
      console.error(`[Pandora] Failed to load lazy component <${tag}>:`, error);
      throw error;
    }
  }

  /**
   * Check if a component is lazy (not yet loaded)
   *
   * @param tag - The tag name to check
   * @returns True if the component is registered as lazy and not yet loaded
   */
  static isLazy(tag: string): boolean {
    return tag in this.lazyLoaders;
  }

  /**
   * Preload a lazy component without mounting it
   *
   * @param tag - The tag name of the lazy component to preload
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
   * Register middleware to intercept props, state, or render operations
   *
   * @param type - The type of middleware: 'props', 'state', or 'render'
   * @param middleware - Function that receives (component, value) and returns the modified value
   * @returns Unsubscribe function
   */
  static use(type: MiddlewareType, middleware: Middleware): () => void {
    this._init();
    this.middleware[type].add(middleware);

    return () => this.middleware[type].delete(middleware);
  }

  /**
   * Apply middleware to a value
   *
   * @internal
   */
  static _applyMiddleware(type: MiddlewareType, component: Component, value: any): any {
    let result = value;

    this.middleware[type].forEach((middleware) => {
      try {
        result = middleware(component, result);
      } catch (error) {
        console.error(`[Pandora] Error in ${type} middleware:`, error);
      }
    });

    return result;
  }

  /**
   * Check if there are any middleware registered for a type
   *
   * @internal
   */
  static _hasMiddleware(type: MiddlewareType): boolean {
    return this.middleware[type].size > 0;
  }
}

export default Registry;
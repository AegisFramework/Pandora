import Component from './Component';
type ComponentClass = typeof Component & {
    tag: string;
    _registered?: boolean;
};
type StateSubscriber<T = unknown> = (newValue: T, oldValue: T | undefined) => void;
type LifecycleCallback = (component: Component, tag: string) => void;
type ErrorCallback = (error: Error, component: Component, tag: string, lifecycle: string) => void;
type MiddlewareType = 'props' | 'state' | 'render';
type RenderType = 'string' | 'lit';
type Middleware = (component: Component, value: any, renderType?: RenderType) => any;
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
 * Registry for managing web components and global state
 */
declare class Registry {
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
    private static middleware;
    private static _initialized;
    /**
     * Initialize Registry hooks on the Component class. Called automatically on first use
     */
    private static _init;
    /**
     * Register a new component with a specific tag name
     *
     * @param tag - The tag name for the component
     * @param component - The component constructor
     */
    static register(tag: string, component: ComponentClass): void;
    /**
     * Get the current implementation for a tag
     *
     * @internal
     */
    static getImplementation(tag: string): ComponentClass | undefined;
    /**
     * Update an existing component with a new implementation
     *
     * @param tag - The tag name of the component to update
     * @param component - The new component constructor
     * @param rerender - Whether to re-render all existing instances (default: false)
     */
    static evolve(tag: string, component: ComponentClass, rerender?: boolean): void;
    /**
     * Get all instances of a component or execute a callback on them
     *
     * @param tag - The tag name of the component
     * @param callback - Optional callback to execute on each instance
     */
    static instances(tag: string, callback?: (instance: Element) => void): NodeListOf<Element> | void;
    /**
     * Create a new instance of a component
     *
     * @param tag - The tag name of the component
     * @param props - Properties to set on the component
     * @returns The created component instance
     */
    static instantiate(tag: string, props: Record<string, any>): Component;
    /**
     * Check if a component is registered with the given tag
     *
     * @param tag - The tag name to check
     * @returns True if a component is registered with the tag
     */
    static has(tag: string): boolean;
    /**
     * Get the component class registered with the given tag
     *
     * @param tag - The tag name of the component
     * @returns The component class or undefined if not registered
     */
    static get(tag: string): ComponentClass | undefined;
    /**
     * Set a global state value
     *
     * @param key - The state key
     * @param value - The value to set
     */
    static setState<T>(key: string, value: T): void;
    /**
     * Get a global state value
     *
     * @param key - The state key
     * @returns The state value or undefined if not set
     */
    static getState<T>(key: string): T | undefined;
    /**
     * Check if a global state key exists
     *
     * @param key - The state key to check
     * @returns True if the state key exists
     */
    static hasState(key: string): boolean;
    /**
     * Delete a global state value
     *
     * @param key - The state key to delete
     * @returns True if the key existed and was deleted
     */
    static deleteState(key: string): boolean;
    /**
     * Subscribe to changes on a global state key
     *
     * @param key - The state key to subscribe to
     * @param callback - Function called when the state changes
     * @returns An unsubscribe function
     */
    static subscribe<T>(key: string, callback: StateSubscriber<T>): () => void;
    /**
     * Unsubscribe from changes on a global state key
     *
     * @param key - The state key to unsubscribe from
     * @param callback - The callback function to remove
     */
    static unsubscribe<T>(key: string, callback: StateSubscriber<T>): void;
    /**
     * Get all global state as an object
     *
     * @returns A copy of the global state object
     */
    static getAllState(): Record<string, unknown>;
    /**
     * Clear all global state and notify subscribers
     */
    static clearState(): void;
    /**
     * Enable or disable debug mode.
     * When enabled, lifecycle events are logged to the console.
     */
    static get debug(): boolean;
    static set debug(value: boolean);
    /**
     * Log a debug message if debug mode is enabled
     *
     * @param message - The message to log
     * @param data - Optional data to include
     */
    static log(message: string, data?: unknown): void;
    /**
     * List all registered component tags
     *
     * @returns Array of registered component tag names
     */
    static list(): string[];
    /**
     * Get statistics for a specific component or all components
     *
     * @param tag - Optional tag to get stats for a specific component
     * @returns Component stats or array of all component stats
     */
    static stats(tag?: string): ComponentStats | ComponentStats[];
    /**
     * Register a callback to be called when any component mounts
     *
     * @param callback - Function called with (component, tag) when a component mounts
     * @returns Unsubscribe function
     */
    static onMount(callback: LifecycleCallback): () => void;
    /**
     * Register a callback to be called when any component unmounts
     *
     * @param callback - Function called with (component, tag) when a component unmounts
     * @returns Unsubscribe function
     */
    static onUnmount(callback: LifecycleCallback): () => void;
    /**
     * Notify Registry that a component has mounted
     * @internal
     */
    static _notifyMount(component: Component, tag: string): void;
    /**
     * Notify Registry that a component has unmounted
     *
     * @internal
     */
    static _notifyUnmount(component: Component, tag: string): void;
    /**
     * Register a global error handler for component errors
     *
     * @param callback - Function called with (error, component, tag, lifecycle) when an error occurs
     * @returns Unsubscribe function
     */
    static onError(callback: ErrorCallback): () => void;
    /**
     * Notify Registry that an error occurred in a component
     *
     * @internal
     */
    static _notifyError(error: Error, component: Component, tag: string, lifecycle: string): void;
    /**
     * Create an alias for an existing component tag
     *
     * @param aliasTag - The new tag name to use as an alias
     * @param originalTag - The original component tag name
     */
    static alias(aliasTag: string, originalTag: string): void;
    /**
     * Get the original tag for an alias
     *
     * @param aliasTag - The alias tag name
     * @returns The original tag name or undefined if not an alias
     */
    static getOriginalTag(aliasTag: string): string | undefined;
    /**
     * Check if a tag is an alias
     *
     * @param tag - The tag name to check
     * @returns True if the tag is an alias
     */
    static isAlias(tag: string): boolean;
    /**
     * Register a component to be lazily loaded on first use
     *
     * @param tag - The tag name for the component
     * @param loader - Async function that returns the component class
     */
    static lazy(tag: string, loader: ComponentLoader): void;
    /**
     * Load a lazy component
     *
     * @internal
     */
    static _loadLazyComponent(tag: string): Promise<void>;
    /**
     * Check if a component is lazy (not yet loaded)
     *
     * @param tag - The tag name to check
     * @returns True if the component is registered as lazy and not yet loaded
     */
    static isLazy(tag: string): boolean;
    /**
     * Preload a lazy component without mounting it
     *
     * @param tag - The tag name of the lazy component to preload
     */
    static preload(tag: string): Promise<void>;
    /**
     * Register middleware to intercept props, state, or render operations
     *
     * @param type - The type of middleware: 'props', 'state', or 'render'
     * @param middleware - Function that receives (component, value, renderType?) and returns the modified value.
     *
     * @returns Unsubscribe function
     *
     * @example
     * // Type-aware render middleware
     * Registry.use('render', (component, value, renderType) => {
     *   if (renderType === 'string') {
     *     return value.toUpperCase();
     *   }
     *   // For lit-html, return as-is or wrap
     *   return value;
     * });
     */
    static use(type: MiddlewareType, middleware: Middleware): () => void;
    /**
     * Apply middleware to a value
     *
     * @param type - The middleware type
     * @param component - The component instance
     * @param value - The value to process
     * @param renderType - For 'render' middleware, indicates if template is 'string' or 'lit'
     * @internal
     */
    static _applyMiddleware(type: MiddlewareType, component: Component, value: any, renderType?: RenderType): any;
    /**
     * Check if there are any middleware registered for a type
     *
     * @internal
     */
    static _hasMiddleware(type: MiddlewareType): boolean;
}
export default Registry;
//# sourceMappingURL=Registry.d.ts.map
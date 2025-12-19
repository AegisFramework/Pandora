import { TemplateResult, nothing } from 'lit-html';
import { Properties, Style, ReadyCallback } from './Types';
/**
 * A component represents a custom HTML element, and has all of its functionality
 * as well as its general structure and representation self contained on it.
 *
 * @template P - The type of the component's props (defaults to Properties)
 * @template S - The type of the component's state (defaults to Properties)
 */
declare class Component<P extends Properties = Properties, S extends Properties = Properties> extends HTMLElement {
    _children: string;
    _state: S;
    _props: P;
    _ready: ReadyCallback[];
    _connected: boolean;
    _isReady: boolean;
    _style: Style;
    static _tag?: string;
    static _template?: string | ((context: any) => string | TemplateResult | typeof nothing | Promise<string | TemplateResult | typeof nothing>);
    static _observedAttributes: string[];
    static _onMount?: (component: Component, tag: string) => void;
    static _onUnmount?: (component: Component, tag: string) => void;
    static _onError?: (error: Error, component: Component, tag: string, lifecycle: string) => void;
    static _applyMiddleware?: (type: string, component: Component, value: any, renderType?: 'string' | 'lit') => any;
    static _hasMiddleware?: (type: string) => boolean;
    /**
     * Returns the list of attributes to observe for changes.
     * Override this in subclasses to specify which attributes should trigger attributeChangedCallback.
     *
     * @returns {string[]} - Array of attribute names to observe
     */
    static get observedAttributes(): string[];
    /**
     * Sets the list of attributes to observe for changes.
     *
     * @param value - The new list of attributes to observe
     */
    static set observedAttributes(value: string[]);
    static get tag(): string;
    static set tag(value: string);
    /**
     * Set or get the static template for this component class.
     *
     * Templates can be:
     * - A string: `'<div>Hello</div>'`
     * - A function returning string: `(ctx) => \`<div>\${ctx.props.name}</div>\``
     * - A function returning lit-html: `(ctx) => html\`<div>\${ctx.props.name}</div>\``
     * - An async function: `async (ctx) => { const data = await fetch(); return html\`...\`; }`
     *
     * @param html - The template to set, or null to get the current template result
     * @param context - The context to use when calling template functions (usually the component instance)
     * @returns The rendered template when getting, void when setting
     */
    static template(html?: string | ((context: any) => string | TemplateResult | typeof nothing | Promise<string | TemplateResult | typeof nothing>) | null, context?: any): string | TemplateResult | typeof nothing | Promise<string | TemplateResult | typeof nothing> | undefined | void;
    constructor();
    get width(): number;
    set width(value: number | string);
    get height(): number;
    set height(value: number | string);
    get static(): typeof Component;
    set static(value: typeof Component);
    get props(): P;
    set props(value: P);
    get state(): S;
    set state(value: S);
    get dom(): HTMLElement;
    set dom(value: HTMLElement);
    /**
     * Returns the original innerHTML content that was present before the component rendered.
     *
     * This is an alias for `_children`
     *
     * @example
     * // String template
     * render() {
     *   return `<div class="wrapper">${this.slotContent}</div>`;
     * }
     *
     * @example
     * // lit-html template
     * render() {
     *   return html`<div class="wrapper">${this.slotContent}</div>`;
     * }
     */
    get slotContent(): string;
    /**
     * Returns whether the component is currently connected to the DOM.
     */
    get isConnected(): boolean;
    /**
     * Returns whether the component has completed its initial mount cycle.
     */
    get isReady(): boolean;
    /**
       * register - Register the component as a custom HTML element
       * using the component's tag as the actual element tag.
       *
       * This action cannot be reverted nor the controller class for
       * the element can be changed.
       */
    static register(): void;
    /**
     * Instance method to set or get the template.
     * Delegates to the static template() method with this instance as context.
     *
     * @param html - The template to set, or null to get the current template result
     * @returns The rendered template when getting, void when setting
     */
    template(html?: string | ((context: any) => string | TemplateResult | typeof nothing | Promise<string | TemplateResult | typeof nothing>) | null): string | TemplateResult | typeof nothing | Promise<string | TemplateResult | typeof nothing> | undefined | void;
    static _styleSheet: CSSStyleSheet | null;
    /**
     * Sets the component style. For normal components, styles are scoped to the
     * component's tag name as a selector prefix and shared across all instances
     * of the same component class.
     *
     * @param style - CSS object or string to apply
     * @param reset - If true, replaces all styles; if false, merges with existing
     * @returns The current style object
     */
    setStyle(style: Style | string, reset?: boolean): Style;
    setState(state: Partial<S>): void;
    setProps(props: Partial<P>): void;
    _setPropAttributes(update?: boolean): void;
    /**
     * Adds an event listener to the component.
     *
     * @param event - The event type to listen for
     * @param callback - The callback function to execute when the event occurs
     * @param options - Optional event listener options
     * @returns The component instance for chaining
     */
    on<K extends keyof HTMLElementEventMap>(event: K, callback: (this: this, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): this;
    on(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): this;
    /**
     * Removes an event listener from the component.
     *
     * @param event - The event type to remove the listener for
     * @param callback - The callback function to remove
     * @param options - Optional event listener options
     * @returns The component instance for chaining
     */
    off<K extends keyof HTMLElementEventMap>(event: K, callback: (this: this, ev: HTMLElementEventMap[K]) => any, options?: boolean | EventListenerOptions): this;
    off(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): this;
    /**
     * Adds a one-time event listener that removes itself after the first trigger.
     *
     * @param event - The event type to listen for
     * @param callback - The callback function to execute when the event occurs
     * @param options - Optional event listener options
     * @returns The component instance for chaining
     */
    once<K extends keyof HTMLElementEventMap>(event: K, callback: (this: this, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): this;
    once(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): this;
    /**
     * Emits a custom event from the component.
     *
     * @param event - The event name to emit
     * @param detail - Optional data to include with the event
     * @param options - Optional CustomEvent init options (bubbles, cancelable, composed)
     * @returns Whether the event was not cancelled
     */
    emit<T = unknown>(event: string, detail?: T, options?: Omit<CustomEventInit<T>, 'detail'>): boolean;
    /**
     * Queries for a single element within the component's DOM.
     *
     * @param selector - CSS selector to query for
     * @returns The first matching element or null
     */
    query<E extends Element = Element>(selector: string): E | null;
    /**
     * Queries for all matching elements within the component's DOM.
     *
     * @param selector - CSS selector to query for
     * @returns A NodeList of all matching elements
     */
    queryAll<E extends Element = Element>(selector: string): NodeListOf<E>;
    /**
     * Called before the component updates due to state or props changes.
     * Override this method to perform actions before an update occurs.
     *
     * @param origin - Whether the update was triggered by 'state' or 'props'
     * @param property - The name of the property that changed
     * @param oldValue - The previous value of the property
     * @param newValue - The new value of the property
     * @param oldObject - The previous state/props object
     * @param newObject - The new state/props object
     * @returns A promise that resolves when the pre-update logic completes
     */
    willUpdate(_origin: string, _property: string, _oldValue: unknown, _newValue: unknown, _oldObject: unknown, _newObject: unknown): Promise<void>;
    /**
     * Called when the component updates due to state or props changes.
     * Override this method to perform actions during an update.
     *
     * @param origin - Whether the update was triggered by 'state' or 'props'
     * @param property - The name of the property that changed
     * @param oldValue - The previous value of the property
     * @param newValue - The new value of the property
     * @param oldObject - The previous state/props object
     * @param newObject - The new state/props object
     * @returns A promise that resolves when the update logic completes
     */
    update(_origin: string, _property: string, _oldValue: unknown, _newValue: unknown, _oldObject: unknown, _newObject: unknown): Promise<void>;
    /**
     * Called after the component updates due to state or props changes.
     * Override this method to perform actions after an update completes.
     *
     * @param origin - Whether the update was triggered by 'state' or 'props'
     * @param property - The name of the property that changed
     * @param oldValue - The previous value of the property
     * @param newValue - The new value of the property
     * @param oldObject - The previous state/props object
     * @param newObject - The new state/props object
     * @returns A promise that resolves when the post-update logic completes
     */
    didUpdate(_origin: string, _property: string, _oldValue: unknown, _newValue: unknown, _oldObject: unknown, _newObject: unknown): Promise<void>;
    /**
     * Called when the component's state updates.
     * Override this method to react specifically to state changes.
     *
     * @param property - The name of the state property that changed
     * @param oldValue - The previous value of the property
     * @param newValue - The new value of the property
     * @param oldObject - The previous state object
     * @param newObject - The new state object
     * @returns A promise that resolves when the state update logic completes
     */
    onStateUpdate(_property: string, _oldValue: unknown, _newValue: unknown, _oldObject: unknown, _newObject: unknown): Promise<void>;
    /**
     * Called when the component's props update.
     * Override this method to react specifically to props changes.
     *
     * @param property - The name of the prop that changed
     * @param oldValue - The previous value of the property
     * @param newValue - The new value of the property
     * @param oldObject - The previous props object
     * @param newObject - The new props object
     * @returns A promise that resolves when the props update logic completes
     */
    onPropsUpdate(_property: string, _oldValue: unknown, _newValue: unknown, _oldObject: unknown, _newObject: unknown): Promise<void>;
    /**
     * Called before the component is mounted to the DOM.
     * Override this method to perform setup before rendering.
     *
     * @returns A promise that resolves when the pre-mount logic completes
     */
    willMount(): Promise<void>;
    /**
     * Called after the component is mounted to the DOM.
     * Override this method to perform actions after the component is rendered.
     *
     * @returns A promise that resolves when the post-mount logic completes
     */
    didMount(): Promise<void>;
    /**
     * Called before the component is removed from the DOM.
     * Override this method to perform cleanup before unmounting.
     *
     * @returns A promise that resolves when the pre-unmount logic completes
     */
    willUnmount(): Promise<void>;
    /**
     * Called when the component is being removed from the DOM.
     * Override this method to perform cleanup during unmounting.
     *
     * @returns A promise that resolves when the unmount logic completes
     */
    unmount(): Promise<void>;
    /**
     * Called after the component is removed from the DOM.
     * Override this method to perform final cleanup after unmounting.
     *
     * @returns A promise that resolves when the post-unmount logic completes
     */
    didUnmount(): Promise<void>;
    /**
     * Forces the component to be rendered again.
     *
     * @returns A promise that resolves when rendering is complete
     */
    forceRender(): Promise<void>;
    /**
     * Returns the content for the component.
     * Override this method to define the component's template.
     *
     * You can return either:
     * - A string (traditional HTML string)
     * - A lit-html TemplateResult (for efficient DOM diffing)
     * - `nothing` from lit-html (to render nothing)
     * - A Promise resolving to any of the above (for async data fetching)
     *
     * @example
     * // String-based rendering
     * render() {
     *   return `<div>Hello ${this.state.name}</div>`;
     * }
     *
     * @example
     * // lit-html rendering
     * render() {
     *   return html`<div>Hello ${this.state.name}</div>`;
     * }
     *
     * @example
     * // Async rendering
     * async render() {
     *   const data = await fetchData();
     *   return html`<div>${data.name}</div>`;
     * }
     *
     * @returns The HTML string, lit-html TemplateResult, or Promise resolving to either
     */
    render(): string | TemplateResult | typeof nothing | Promise<string | TemplateResult | typeof nothing>;
    _render(): Promise<void>;
    connectedCallback(): Promise<void>;
    ready(callback: ReadyCallback): void;
    disconnectedCallback(): Promise<void>;
    updateCallback(property: string, oldValue: unknown, newValue: unknown, origin?: 'props' | 'state' | 'attribute', oldObject?: P | S, newObject?: P | S): Promise<void>;
    /**
     * Called when an observed attribute changes.
     * This is a Web Components lifecycle callback.
     *
     * @param property - The name of the attribute that changed
     * @param oldValue - The previous value of the attribute
     * @param newValue - The new value of the attribute
     */
    attributeChangedCallback(property: string, oldValue: string | null, newValue: string | null): void;
}
export default Component;
//# sourceMappingURL=Component.d.ts.map
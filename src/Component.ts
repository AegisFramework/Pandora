import { render as litRender, TemplateResult, nothing } from 'lit-html';
import { callAsync, deserializeCSS, isTemplateResult } from './Util';
import { Properties, Style, ReadyCallback } from './Types';

/**
 * A component represents a custom HTML element, and has all of its functionality
 * as well as its general structure and representation self contained on it.
 *
 * @template P - The type of the component's props (defaults to Properties)
 * @template S - The type of the component's state (defaults to Properties)
 */
class Component<P extends Properties = Properties, S extends Properties = Properties> extends HTMLElement {
  public _children: string;
  public _state: S;
  public _props: P;
  public _ready: ReadyCallback[];
  public _connected: boolean;
  public _isReady: boolean;
  public _style: Style;

  // This is the tag name for the component
  static _tag?: string;

  // Template can be a string, a function returning string, or a function returning lit-html TemplateResult
  // Functions can be async (return a Promise)
  static _template?: string | ((context: any) => string | TemplateResult | typeof nothing | Promise<string | TemplateResult | typeof nothing>);

  // List of attributes to observe for changes
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#responding_to_attribute_changes
  static _observedAttributes: string[] = [];

  // Registry integration hooks. These are set by the Registry.
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
  static get observedAttributes(): string[] {
    return this._observedAttributes;
  }

  /**
   * Sets the list of attributes to observe for changes.
   *
   * @param value - The new list of attributes to observe
   */
  static set observedAttributes(value: string[]) {
    this._observedAttributes = value;
  }

  static get tag(): string {
    if (typeof this._tag === 'undefined') {
      let tag = this.name;

      const matches = tag.match(/([A-Z])/g);

      if (matches !== null) {
        for (const match of matches) {
          tag = tag.replace(match, `-${match}`.toLowerCase());
        }
      }

      this._tag = tag.slice(1);
    }

    return this._tag;
  }

  static set tag(value: string) {
    this._tag = value;
  }

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
  static template(
    html: string | ((context: any) => string | TemplateResult | typeof nothing | Promise<string | TemplateResult | typeof nothing>) | null = null,
    context: any = null
  ): string | TemplateResult | typeof nothing | Promise<string | TemplateResult | typeof nothing> | undefined | void {
    if (html !== null) {
      this._template = html;

      document.querySelectorAll(this.tag).forEach((instance) => {
        if (instance instanceof Component && instance._isReady) {
          instance.forceRender();
        }
      });
    } else {
      // Check if no parameters were set but the HTML is still a function to be called
      if (typeof this._template === 'function') {
        return this._template.call(context, context);
      }

      // If this is reached, the HTML was just a string
      return this._template;
    }
  }

  constructor() {
    super();

    this._children = this.innerHTML.trim();

    // State Object for the component
    this._state = {} as S;

    // Props Object for the component
    this._props = {} as P;

    // List of callbacks to run once the component has been mounted successfully
    this._ready = [];

    // Whether the component is connected to the DOM
    this._connected = false;
    this._isReady = false;

    // Style Object for the component
    this._style = {};
  }

  // Determines the real (computed) width of the element
  get width(): number {
    return parseInt(getComputedStyle(this).width.replace('px', ''));
  }

  set width(value: number | string) {
    this.style.width = typeof value === 'number' ? `${value}px` : value;
  }

  // Determines the real (computed) height of the element
  get height(): number {
    return parseInt(getComputedStyle(this).height.replace('px', ''));
  }

  set height(value: number | string) {
    this.style.height = typeof value === 'number' ? `${value}px` : value;
  }

  get static(): typeof Component {
    return this.constructor as typeof Component;
  }

  set static(value: typeof Component) {
    throw new Error('Component static properties cannot be reassigned.');
  }

  get props(): P {
    return new Proxy(this._props, {
      get: (target, key: string) => {
        // Check internal props first
        if (key in target) {
          return target[key as keyof P];
        }

        // Fallback to DOM attributes
        if (this.hasAttribute(key)) {
          let value: any = this.getAttribute(key);

          if (typeof value === 'string') {
            if (value === 'false') {
              value = false;
            } else if (value === 'true' || value === '') {
              value = true;
            } else if (!isNaN(Number(value))) {
              value = value.includes('.') ? parseFloat(value) : parseInt(value);
            }
          }

          return value;
        }

        // Return undefined for missing props
        return undefined;
      },
      set: () => {
        throw new Error('Component props should be set using the `setProps` function.');
      }
    }) as P;
  }

  set props(value: P) {
    if (!this._connected) {
      this._props = { ...this._props, ...value };
    } else {
      throw new Error('Component props cannot be directly assigned. Use the `setProps` function instead.');
    }
  }

  get state(): S {
    return new Proxy(this._state, {
      get: (target, key: string) => target[key as keyof S],
      set: (target, key: string, value) => {
        if (!this._connected) {
          (target as any)[key] = value;
          return true;
        } else {
          throw new Error('Component state should be set using the `setState` function instead.');
        }
      }
    }) as S;
  }

  set state(value: S) {
    if (!this._connected) {
      this._state = { ...this._state, ...value };
    } else {
      throw new Error('Component state should be set using the `setState` function instead.');
    }
  }

  get dom(): HTMLElement {
    return this;
  }

  set dom(value: HTMLElement) {
    throw new Error('Component DOM can not be overwritten.');
  }

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
  get slotContent(): string {
    return this._children;
  }

  /**
   * Returns whether the component is currently connected to the DOM.
   */
  get isConnected(): boolean {
    return this._connected;
  }

  /**
   * Returns whether the component has completed its initial mount cycle.
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
	 * register - Register the component as a custom HTML element
	 * using the component's tag as the actual element tag.
	 *
	 * This action cannot be reverted nor the controller class for
	 * the element can be changed.
	 */
  static register(): void {
    window.customElements.define(this.tag, this);
  }

  /**
   * Instance method to set or get the template.
   * Delegates to the static template() method with this instance as context.
   *
   * @param html - The template to set, or null to get the current template result
   * @returns The rendered template when getting, void when setting
   */
  template(
    html: string | ((context: any) => string | TemplateResult | typeof nothing | Promise<string | TemplateResult | typeof nothing>) | null = null
  ): string | TemplateResult | typeof nothing | Promise<string | TemplateResult | typeof nothing> | undefined | void {
    return (this.constructor as typeof Component).template(html, this);
  }

  // Cache for the stylesheet to avoid recreating it per instance.
  // Each subclass gets its own stylesheet via the constructor reference.
  static _styleSheet: CSSStyleSheet | null = null;

  /**
   * Sets the component style. For normal components, styles are scoped to the
   * component's tag name as a selector prefix and shared across all instances
   * of the same component class.
   *
   * @param style - CSS object or string to apply
   * @param reset - If true, replaces all styles; if false, merges with existing
   * @returns The current style object
   */
  setStyle(style: Style | string, reset: boolean = false): Style {
    // Get the constructor to access the static stylesheet for this specific class
    const staticComponent = this.constructor as typeof Component;

    // Initialize the stylesheet if it doesn't exist for this class
    if (!staticComponent._styleSheet) {
      staticComponent._styleSheet = new CSSStyleSheet();
    }

    // Build the CSS text
    let cssText = '';

    if (typeof style === 'object') {
      if (!reset) {
        this._style = { ...this._style, ...style };
      } else {
        this._style = { ...style };
      }

      cssText = deserializeCSS(this._style, staticComponent.tag);
    } else if (typeof style === 'string') {
      if (!reset) {
        // Append to existing rules
        const existingRules = Array.from(staticComponent._styleSheet.cssRules || [])
          .map(rule => rule.cssText)
          .join('\n');
        cssText = existingRules + '\n' + style;
      } else {
        cssText = style;
      }
    }

    // Update the stylesheet
    staticComponent._styleSheet.replaceSync(cssText);

    // Adopt the stylesheet into the document
    if (!document.adoptedStyleSheets.includes(staticComponent._styleSheet)) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, staticComponent._styleSheet];
    }

    return this._style;
  }

  setState(state: Partial<S>): void {
    // Apply middleware if available
    let processedState = state;

    if (Component._hasMiddleware?.('state') && Component._applyMiddleware) {
      processedState = Component._applyMiddleware('state', this, state);
    }

    const oldState = { ...this._state };
    this._state = { ...this._state, ...processedState };

    for (const key of Object.keys(processedState)) {
      this.updateCallback(key, oldState[key as keyof S], this._state[key as keyof S], 'state', oldState, this._state);
    }
  }

  setProps(props: Partial<P>): void {
    // Apply middleware if available
    let processedProps = props;

    if (Component._hasMiddleware?.('props') && Component._applyMiddleware) {
      processedProps = Component._applyMiddleware('props', this, props);
    }

    const oldProps = { ...this._props };
    this._props = { ...this._props, ...processedProps };

    for (const key of Object.keys(processedProps)) {
      this.updateCallback(key, oldProps[key as keyof P], this._props[key as keyof P], 'props', oldProps, this._props);
    }

    this._setPropAttributes(true);
  }

  public _setPropAttributes(update: boolean = false): void {
    for (const [key, value] of Object.entries(this._props)) {
      const valueType = typeof value;

      if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
        if (update) {
          this.setAttribute(key, String(value));
        } else {
          (this._props as Record<string, unknown>)[key] = this.props[key as keyof P];
          this.setAttribute(key, String(this.props[key as keyof P]));
        }
      }
    }
  }

  /*
   * =========================
   * Event Helpers
   * =========================
   */

  /**
   * Adds an event listener to the component.
   *
   * @param event - The event type to listen for
   * @param callback - The callback function to execute when the event occurs
   * @param options - Optional event listener options
   * @returns The component instance for chaining
   */
  on<K extends keyof HTMLElementEventMap>(
    event: K,
    callback: (this: this, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): this;
  on(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): this;
  on(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): this {
    this.addEventListener(event, callback, options);
    return this;
  }

  /**
   * Removes an event listener from the component.
   *
   * @param event - The event type to remove the listener for
   * @param callback - The callback function to remove
   * @param options - Optional event listener options
   * @returns The component instance for chaining
   */
  off<K extends keyof HTMLElementEventMap>(
    event: K,
    callback: (this: this, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): this;
  off(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): this;
  off(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): this {
    this.removeEventListener(event, callback, options);
    return this;
  }

  /**
   * Adds a one-time event listener that removes itself after the first trigger.
   *
   * @param event - The event type to listen for
   * @param callback - The callback function to execute when the event occurs
   * @param options - Optional event listener options
   * @returns The component instance for chaining
   */
  once<K extends keyof HTMLElementEventMap>(
    event: K,
    callback: (this: this, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): this;
  once(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): this;
  once(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): this {
    const opts = typeof options === 'boolean' ? { capture: options, once: true } : { ...options, once: true };
    this.addEventListener(event, callback, opts);
    return this;
  }

  /**
   * Emits a custom event from the component.
   *
   * @param event - The event name to emit
   * @param detail - Optional data to include with the event
   * @param options - Optional CustomEvent init options (bubbles, cancelable, composed)
   * @returns Whether the event was not cancelled
   */
  emit<T = unknown>(event: string, detail?: T, options?: Omit<CustomEventInit<T>, 'detail'>): boolean {
    const customEvent = new CustomEvent(event, {
      detail,
      bubbles: true,
      cancelable: true,
      composed: true,
      ...options
    });
    return this.dispatchEvent(customEvent);
  }

  /*
   * =========================
   * Query Helpers
   * =========================
   */

  /**
   * Queries for a single element within the component's DOM.
   *
   * @param selector - CSS selector to query for
   * @returns The first matching element or null
   */
  query<E extends Element = Element>(selector: string): E | null {
    return this.dom.querySelector<E>(selector);
  }

  /**
   * Queries for all matching elements within the component's DOM.
   *
   * @param selector - CSS selector to query for
   * @returns A NodeList of all matching elements
   */
  queryAll<E extends Element = Element>(selector: string): NodeListOf<E> {
    return this.dom.querySelectorAll<E>(selector);
  }

  /*
   * =========================
   * Update Cycle
   * =========================
   */

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
  public async willUpdate(_origin: string, _property: string, _oldValue: unknown, _newValue: unknown, _oldObject: unknown, _newObject: unknown): Promise<void> {
    // Base implementation does nothing
  }

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
  public async update(_origin: string, _property: string, _oldValue: unknown, _newValue: unknown, _oldObject: unknown, _newObject: unknown): Promise<void> {
    // Base implementation does nothing
  }

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
  public async didUpdate(_origin: string, _property: string, _oldValue: unknown, _newValue: unknown, _oldObject: unknown, _newObject: unknown): Promise<void> {
    // Base implementation does nothing
  }

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
  public async onStateUpdate(_property: string, _oldValue: unknown, _newValue: unknown, _oldObject: unknown, _newObject: unknown): Promise<void> {
    // Base implementation does nothing
  }

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
  public async onPropsUpdate(_property: string, _oldValue: unknown, _newValue: unknown, _oldObject: unknown, _newObject: unknown): Promise<void> {
    // Base implementation does nothing
  }

  /*
   * =========================
   * Mount Cycle
   * =========================
   */

  /**
   * Called before the component is mounted to the DOM.
   * Override this method to perform setup before rendering.
   *
   * @returns A promise that resolves when the pre-mount logic completes
   */
  public async willMount(): Promise<void> {
    // Base implementation does nothing
  }

  /**
   * Called after the component is mounted to the DOM.
   * Override this method to perform actions after the component is rendered.
   *
   * @returns A promise that resolves when the post-mount logic completes
   */
  public async didMount(): Promise<void> {
    // Base implementation does nothing
  }

  /*
   * =========================
   * Unmount Cycle
   * =========================
   */

  /**
   * Called before the component is removed from the DOM.
   * Override this method to perform cleanup before unmounting.
   *
   * @returns A promise that resolves when the pre-unmount logic completes
   */
  public async willUnmount(): Promise<void> {
    // Base implementation does nothing
  }

  /**
   * Called when the component is being removed from the DOM.
   * Override this method to perform cleanup during unmounting.
   *
   * @returns A promise that resolves when the unmount logic completes
   */
  public async unmount(): Promise<void> {
    // Base implementation does nothing
  }

  /**
   * Called after the component is removed from the DOM.
   * Override this method to perform final cleanup after unmounting.
   *
   * @returns A promise that resolves when the post-unmount logic completes
   */
  public async didUnmount(): Promise<void> {
    // Base implementation does nothing
  }

  /*
   * =========================
   * Render Cycle
   * =========================
   */

  /**
   * Forces the component to be rendered again.
   *
   * @returns A promise that resolves when rendering is complete
   */
  forceRender(): Promise<void> {
    return this._render();
  }

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
  render(): string | TemplateResult | typeof nothing | Promise<string | TemplateResult | typeof nothing> {
    return '';
  }

  public async _render(): Promise<void> {
    type RenderResult = string | TemplateResult | typeof nothing;

    // Default to render(), but use template() if a static template was defined
    let renderFn: () => RenderResult | Promise<RenderResult> = this.render;

    if ((this.constructor as typeof Component)._template !== undefined) {
      renderFn = () => this.template() as RenderResult | Promise<RenderResult>;
    }

    let result = await callAsync(renderFn, this);

    // Determine render type for middleware
    const renderType: 'string' | 'lit' = isTemplateResult(result) || result === nothing ? 'lit' : 'string';

    // Apply render middleware if available
    if (Component._hasMiddleware?.('render') && Component._applyMiddleware) {
      result = Component._applyMiddleware('render', this, result, renderType);
    }

    // Handle lit-html TemplateResult
    if (isTemplateResult(result) || result === nothing) {
      // Clear any non-lit-html content on first render
      if (!this.hasAttribute('data-lit-rendered')) {
        this.innerHTML = '';
        this.setAttribute('data-lit-rendered', '');
      }
      litRender(result as TemplateResult | typeof nothing, this, { host: this });
      return;
    }

    // Handle string-based rendering
    const html = (result as string).trim();

    if (html === '') {
      return;
    }

    const slot = this.dom.querySelector('slot');

    if (slot !== null) {
      slot.replaceWith(html);
    } else {
      this.innerHTML = html;

      if (this._children !== '' && html.indexOf(this._children) === -1) {
        this.innerHTML += this._children;
      }
    }
  }

  async connectedCallback(): Promise<void> {
    const tag = this.static.tag;

    try {
      // Set the state as connected
      this._connected = true;

      // Add a data property with the tag of the component
      this.dataset.component = tag;

      // Check if a template for this component was set. The contents on this
      // if block will only be run once.
      if (typeof this.static._template === 'undefined') {

        // Check if there is an HTML template for this component
        const template = document.querySelector(`template#${tag}`);

        if (template !== null) {
          // If there is, set is as the template for the component
          this.template(template.innerHTML);
        } else {
          // If not, set is as null
          this.static._template = undefined;
        }
      }

      // Set the initial prop attributes for the component using the given props
      this._setPropAttributes(false);

      // Run the Mount Cycle
      await this.willMount();
      await this._render();
      await this.didMount();

      // Set the component as ready
      this._isReady = true;

      // Execute and clear ready callbacks
      const callbacks = [...this._ready];
      this._ready = [];

      for (const callback of callbacks) {
        callback.call(this);
      }

      // Notify Registry of mount
      if (Component._onMount) {
        Component._onMount(this, tag);
      }

    } catch (error) {
      if (Component._onError) {
        Component._onError(error as Error, this, tag, 'connectedCallback');
      } else {
        throw error;
      }
    }
  }

  ready(callback: ReadyCallback): void {
    this._ready.push(callback);

    if (this._isReady) {
      callback.call(this);
    }
  }

  async disconnectedCallback(): Promise<void> {
    const tag = this.static.tag;

    try {
      // Run the Unmount Cycle
      await this.willUnmount();
      await this.unmount();
      await this.didUnmount();

      // Set the state as disconnected
      this._connected = false;

      // Notify Registry of unmount
      if (Component._onUnmount) {
        Component._onUnmount(this, tag);
      }

    } catch (error) {
      if (Component._onError) {
        Component._onError(error as Error, this, tag, 'disconnectedCallback');
      } else {
        throw error;
      }
    }
  }

  public async updateCallback(
    property: string,
    oldValue: unknown,
    newValue: unknown,
    origin: 'props' | 'state' | 'attribute' = 'props',
    oldObject: P | S = {} as P | S,
    newObject: P | S = {} as P | S
  ): Promise<void> {
    await this.willUpdate(origin, property, oldValue, newValue, oldObject, newObject);
    await this.update(origin, property, oldValue, newValue, oldObject, newObject);

    if (origin === 'state') {
      await this.onStateUpdate(property, oldValue, newValue, oldObject, newObject);
    } else if (origin === 'props' || origin === 'attribute') {
      await this.onPropsUpdate(property, oldValue, newValue, oldObject, newObject);
    }

    await this.didUpdate(origin, property, oldValue, newValue, oldObject, newObject);
  }

  /**
   * Called when an observed attribute changes.
   * This is a Web Components lifecycle callback.
   *
   * @param property - The name of the attribute that changed
   * @param oldValue - The previous value of the attribute
   * @param newValue - The new value of the attribute
   */
  attributeChangedCallback(property: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue !== newValue) {
      this.updateCallback(property, oldValue, newValue, 'attribute');
    }
  }
}

export default Component;

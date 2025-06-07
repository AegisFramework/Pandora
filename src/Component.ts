import { callAsync, deserializeCSS } from './Util';

import { Properties, Style, ReadyCallback } from './Types';

/**
 * A component represents a custom HTML element, and has all of its functionality
 * as well as its general structure and representation self contained on it.
 */
class Component extends HTMLElement {
  protected _children: string;
  protected _state: Properties;
  protected _props: Properties;
  protected _ready: ReadyCallback[];
  protected _connected: boolean;
  protected _isReady: boolean;
  protected _style: Style;
  protected _styleElement: HTMLStyleElement | null;

  // This is the tag name for the component
  static _tag?: string;

  static _template?: string | ((context: any) => string);

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

  static template(html: string | ((context: any) => string) | null = null, context: any = null): string | undefined | void {
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
    this._state = {};

    // Props Object for the component
    this._props = {};

    // List of callbacks to run once the component has been mounted successfully
    this._ready = [];

    // Whether the component is connected to the DOM
    this._connected = false;
    this._isReady = false;

    // Style Object for the component
    this._style = {};
    this._styleElement = null;
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
    return new Proxy(this.constructor as typeof Component, {});
  }

  set static(value: typeof Component) {
    throw new Error('Component static properties cannot be reassigned.');
  }

  get props(): Properties {
    return new Proxy(this._props, {
      get: (target, key: string) => {
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
        } else if (key in this._props) {
          return this._props[key];
        }

        return null;
      },
      set: () => {
        throw new Error('Component props should be set using the `setProps` function.');
      }
    });
  }

  set props(value: Properties) {
    if (!this._connected) {
      this._props = { ...this._props, ...value };
    } else {
      throw new Error('Component props cannot be directly assigned. Use the `setProps` function instead.');
    }
  }

  get state(): Properties {
    return new Proxy(this._state, {
      get: (target, key: string) => target[key],
      set: (target, key: string, value) => {
        if (!this._connected) {
          return (target[key] = value);
        } else {
          throw new Error('Component state should be set using the `setState` function instead.');
        }
      }
    });
  }

  set state(value: Properties) {
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
	 * register - Register the component as a custom HTML element
	 * using the component's tag as the actual element tag.
	 *
	 * This action cannot be reverted nor the controller class for
	 * the element can be changed.
	 */
  static register(): void {
    if (this._tag) {
      window.customElements.define(this._tag, this);
    }
  }

  /**
	 * template - A simple function providing access to the basic HTML
	 * structure of the component.
	 *
	 * @param {function|string} html - A string or function that renders the
	 * component into a valid HTML structure.
	 *
	 * @returns {void|string} - Void or the HTML structure in a string
	 */
  template(html: string | ((context: any) => string) | null = null): string | undefined | void {
    return (this.constructor as typeof Component).template(html, this);
  }

  protected _createStyleElement(): void {
    // Check if there is a shared style element for the component
    const sharedStyle = document.body.querySelector(`style#${(this.constructor as typeof Component).tag}`);

    // If there is, use it
    if (sharedStyle instanceof HTMLStyleElement) {
      this._styleElement = sharedStyle;
    }

    if (this._styleElement instanceof HTMLStyleElement) {
      return;
    }

    // If there is no shared style element, create a new one
    this._styleElement = document.createElement('style');
    this._styleElement.id = (this.constructor as typeof Component).tag;

    // For normal components, the style element is added to the body
    document.body.prepend(this._styleElement);
  }

  setStyle(style: Style | string, reset: boolean = false): Style {
    this._createStyleElement();

    if (typeof style === 'object') {
      if (!reset) {
        this._style = { ...this._style, ...style };
      } else {
        this._style = { ...style };
      }

      this._styleElement!.innerHTML = deserializeCSS(this._style, (this.constructor as typeof Component).tag);
    } else if (typeof style === 'string') {
      if (!reset) {
        this._styleElement!.innerHTML += style;
      } else {
        this._styleElement!.innerHTML = style;
      }
    }

    return this._style;
  }

  setState(state: Properties): void {
    const oldState = { ...this._state };
    this._state = { ...this._state, ...state };

    for (const key of Object.keys (state)) {
      this.updateCallback(key, oldState[key], this._state[key], 'state', oldState, this._state);
    }
  }

  setProps(props: Properties): void {
    const oldProps = { ...this._props };
    this._props = { ...this._props, ...props };

    for (const key of Object.keys (props)) {
      this.updateCallback (key, oldProps[key], this._props[key], 'props', oldProps, this._props);
    }

    this._setPropAttributes(true);
  }

  protected _setPropAttributes(update: boolean = false): void {
    for (const [key, value] of Object.entries(this._props)) {
      const valueType = typeof value;

      if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
        if (update) {
          this.setAttribute(key, String(value));
        } else {
          this._props[key] = this.props[key];
          this.setAttribute(key, String(this.props[key]));
        }
      }
    }
  }

  /*
	 * =========================
	 * Update Cycle
	 * =========================
   */
  protected willUpdate(origin: string, property: string, oldValue: unknown, newValue: unknown, oldObject: unknown, newObject: unknown): Promise<void> {
    return Promise.resolve();
  }

  protected update(origin: string, property: string, oldValue: unknown, newValue: unknown, oldObject: unknown, newObject: unknown): Promise<void> {
    return Promise.resolve();
  }

  protected didUpdate(origin: string, property: string, oldValue: unknown, newValue: unknown, oldObject: unknown, newObject: unknown): Promise<void> {
    return Promise.resolve();
  }

  protected onStateUpdate(property: string, oldValue: unknown, newValue: unknown, oldObject: unknown, newObject: unknown): Promise<void> {
    return Promise.resolve();
  }

  protected onPropsUpdate(property: string, oldValue: unknown, newValue: unknown, oldObject: unknown, newObject: unknown): Promise<void> {
    return Promise.resolve();
  }

  /*
	 * =========================
	 * Mount Cycle
	 * =========================
   */

  protected willMount(): Promise<void> {
    return Promise.resolve();
  }

  protected didMount(): Promise<void> {
    return Promise.resolve();
  }

  /*
	 * =========================
	 * Unmount Cycle
	 * =========================
   */
  protected willUnmount(): Promise<void> {
    return Promise.resolve();
  }

  protected unmount(): Promise<void> {
    return Promise.resolve();
  }

  protected didUnmount(): Promise<void> {
    return Promise.resolve();
  }

	/*
	* =========================
	* Render Cycle
	* =========================
	*/

  /**
   * Forces the component to be rendered again.
   *
   * @returns {string|Promise<string>} - The HTML to render on the component
   */
  forceRender(): string | Promise<string> {
    return this._render();
  }

  render(): string {
    return '';
  }

  protected async _render(): Promise<string> {
    let render = this.render;

    if ((this.constructor as typeof Component)._template !== undefined) {
      render = this.template as () => string;
    }

    let html = await callAsync<string>(render, this);

    html = html.trim ();

    if (html === '') {
      return '';
    }

    const slot = this.dom.querySelector ('slot');

    if (slot !== null) {
      slot.replaceWith (html);
    } else {
      this.innerHTML = html;

      if (this._children !== '' && html.indexOf(this._children) === -1) {
        this.innerHTML += this._children;
      }
    }

    return html;
  }

  async connectedCallback(): Promise<void> {
    // Set the state as connected
    this._connected = true;

    // Add a data property with the tag of the component
    this.dataset.component = this.static.tag;

    // Check if a template for this component was set. The contents on this
		// if block will only be run once.
    if (typeof this.static._template === 'undefined') {

      // Check if there is an HTML template for this component
      const template = document.querySelector (`template#${this.static.tag}`);

      if (template !== null) {
        // If there is, set is as the template for the component
        this.template (template.innerHTML);
      } else {
        // If not, set is as null
        this.static._template = undefined;
      }
    }

    // Set the initial prop attributes for the component using the given
		// props
    this._setPropAttributes(false);

    // Run the Mount Cycle
	  await this.willMount();
    await this._render();
    await this.didMount();

    // Set the component as ready
    this._isReady = true;

    for (const callback of this._ready) {
      callback.call(this);
    }
  }

  ready(callback: ReadyCallback): void {
    this._ready.push(callback);

    if (this._isReady) {
      callback.call(this);
    }
  }

  async disconnectedCallback(): Promise<void> {
    // Run the Unmount Cycle
    await this.willUnmount();
    await this.unmount();
    await this.didUnmount();

    // Set the state as disconnected
    this._connected = false;
  }

  protected async updateCallback(
    property: string,
    oldValue: unknown,
    newValue: unknown,
    origin: 'props' | 'state' = 'props',
    oldObject: Properties = {},
    newObject: Properties = {}
  ): Promise<void> {
    await this.willUpdate(origin, property, oldValue, newValue, oldObject, newObject);
    await this.update(origin, property, oldValue, newValue, oldObject, newObject);

    if (origin === 'state') {
      await this.onStateUpdate(property, oldValue, newValue, oldObject, newObject);
    } else {
      await this.onPropsUpdate(property, oldValue, newValue, oldObject, newObject);
    }

    await this.didUpdate(origin, property, oldValue, newValue, oldObject, newObject);
  }

  attributeChangedCallback(property: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue !== newValue) {
      this.updateCallback(property, oldValue, newValue);
    }
  }
}

export default Component;
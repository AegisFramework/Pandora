import Component from './Component';
import { callAsync, deserializeCSS } from './Util';
import { Properties, Style } from './Types';

/**
 * A component that uses Shadow DOM for encapsulation
 *
 * @template P - The type of the component's props (defaults to Properties)
 * @template S - The type of the component's state (defaults to Properties)
 */
class ShadowComponent<P extends Properties = Properties, S extends Properties = Properties> extends Component<P, S> {
  public _shadowDOM: ShadowRoot;

  constructor() {
    super();

    // Create the shadow DOM for the component
    this._shadowDOM = this.attachShadow({ mode: 'open' });
  }

  setStyle(style: Style | string, reset: boolean = false): Style {
    this._createStyleElement();

    if (typeof style === 'object') {
      if (!reset) {
        this._style = { ...this._style, ...style };
      } else {
        this._style = { ...style };
      }

      this._styleElement!.innerHTML = deserializeCSS(this._style);
    } else if (typeof style === 'string') {
      if (!reset) {
        this._styleElement!.innerHTML += style;
      } else {
        this._styleElement!.innerHTML = style;
      }
    }

    return this._style;
  }

  public override _createStyleElement(): void {
    if (this._styleElement instanceof HTMLStyleElement) {
      return;
    }

    this._styleElement = document.createElement('style');
    this._shadowDOM.prepend(this._styleElement);
  }

  public override async _render(): Promise<string> {
    let render = this.render;

    // Check if a template has been set to this component, and if that's the
    // case, use that instead of the render function to render the component's
    // HTML code.
    if ((this.constructor as typeof Component)._template !== undefined) {
      render = this.template as () => string;
    }

    // Call the render function asynchronously and set the HTML from it to the
    // component.
    const html = await callAsync(render, this);

    // Remove all children except the style element
    const children = Array.from(this._shadowDOM.childNodes);
    for (const child of children) {
      if (child !== this._styleElement) {
        child.remove();
      }
    }

    // Create a template to parse the HTML and append the content
    const template = document.createElement('template');
    template.innerHTML = html;

    this._shadowDOM.appendChild(template.content);

    return html;
  }

  get dom(): HTMLElement {
    throw new Error('ShadowComponent DOM can not be accessed. Use the `shadowRoot` property instead.');
  }

  set dom(value: HTMLElement) {
    throw new Error('ShadowComponent DOM can not be overwritten.');
  }

  get shadowRoot(): ShadowRoot {
    return this._shadowDOM;
  }

  set shadowRoot(value: ShadowRoot) {
    throw new Error('ShadowComponent shadowRoot can not be overwritten.');
  }

  /**
   * Queries for a single element within the shadow DOM.
   *
   * @param selector - CSS selector to query for
   * @returns The first matching element or null
   */
  override query<E extends Element = Element>(selector: string): E | null {
    return this._shadowDOM.querySelector<E>(selector);
  }

  /**
   * Queries for all matching elements within the shadow DOM.
   *
   * @param selector - CSS selector to query for
   * @returns A NodeList of all matching elements
   */
  override queryAll<E extends Element = Element>(selector: string): NodeListOf<E> {
    return this._shadowDOM.querySelectorAll<E>(selector);
  }
}

export default ShadowComponent;
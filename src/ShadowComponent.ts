import { render as litRender, TemplateResult, nothing } from 'lit-html';
import Component from './Component';
import { callAsync, deserializeCSS, isTemplateResult } from './Util';
import { Properties, Style } from './Types';

/**
 * A component that uses Shadow DOM for encapsulation.
 * Uses Constructable Stylesheets for high-performance styling.
 *
 * @template P - The type of the component's props (defaults to Properties)
 * @template S - The type of the component's state (defaults to Properties)
 */
class ShadowComponent<P extends Properties = Properties, S extends Properties = Properties> extends Component<P, S> {
  public _shadowDOM: ShadowRoot;

  // Cache for the stylesheet to avoid recreating it per instance.
  // Each subclass gets its own stylesheet via the constructor reference.
  static _styleSheet: CSSStyleSheet | null = null;

  constructor() {
    super();

    // Create the shadow DOM for the component
    this._shadowDOM = this.attachShadow({ mode: 'open' });
  }

  /**
   * Sets the component style, these are scoped to the component's shadow root
   * and shared across all instances of the same component class.
   *
   * @param style - CSS object or string to apply
   * @param reset - If true, replaces all styles; if false, merges with existing
   * @returns The current style object
   */
  override setStyle(style: Style | string, reset: boolean = false): Style {
    // Get the constructor to access the static stylesheet for this specific class
    const staticComponent = this.constructor as typeof ShadowComponent;

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

      cssText = deserializeCSS(this._style);
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

    // Adopt the stylesheet into this instance's shadow root
    this._shadowDOM.adoptedStyleSheets = [staticComponent._styleSheet];

    return this._style;
  }


  public override async _render(): Promise<void> {
    let renderFn: () => string | TemplateResult | typeof nothing = this.render;

    // Use static template if defined
    if ((this.constructor as typeof Component)._template !== undefined) {
      renderFn = this.template as () => string | TemplateResult | typeof nothing;
    }

    // Call the render function asynchronously
    let result = await callAsync(renderFn, this);

    // Determine render type for middleware
    const renderType: 'string' | 'lit' = isTemplateResult(result) || result === nothing ? 'lit' : 'string';

    // Apply render middleware if available
    if (Component._hasMiddleware?.('render') && Component._applyMiddleware) {
      result = Component._applyMiddleware('render', this, result, renderType);
    }

    // Handle lit-html TemplateResult
    if (isTemplateResult(result) || result === nothing) {
      litRender(result as TemplateResult | typeof nothing, this._shadowDOM, { host: this });
      return;
    }

    // Handle string-based rendering
    const html = (result as string).trim();

    // Remove all children
    const children = Array.from(this._shadowDOM.childNodes);

    for (const child of children) {
      child.remove();
    }

    if (html === '') {
      return;
    }

    // Create a template to parse the HTML and append the content
    const template = document.createElement('template');
    template.innerHTML = html;

    this._shadowDOM.appendChild(template.content);
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
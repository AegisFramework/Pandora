import Component from './Component';
import { callAsync, deserializeCSS } from './Util';
import { Style } from './Types';

/**
 * A component that uses Shadow DOM for encapsulation
 */
class ShadowComponent extends Component {
  protected _shadowDOM: ShadowRoot;

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

  protected _createStyleElement(): void {
    if (this._styleElement instanceof HTMLStyleElement) {
      return;
    }

    this._styleElement = document.createElement('style');
    this._shadowDOM.prepend(this._styleElement);
  }

  protected async _render(): Promise<string> {
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

    this._shadowDOM.innerHTML = '';

    if (this._styleElement instanceof HTMLStyleElement) {
      this._shadowDOM.appendChild(this._styleElement);
    }

    this._shadowDOM.innerHTML += html;

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
}

export default ShadowComponent;
import { render as litRender, TemplateResult, nothing } from 'lit-html';

import Component from './Component';
import { deserializeCSS } from './Util';
import { Style } from './Types';

/**
 * Component subclass that renders into an open shadow root instead of the host
 * element. Pick it when you need style isolation or slot composition;
 * otherwise extend `Component` directly.
 *
 * The shadow root is attached in the constructor with mode `'open'`, so you
 * can still inspect it from outside via `element.shadowRoot`. Queries,
 * listener targets, and adopted stylesheets all scope to the shadow root
 * rather than the host, which means CSS you apply via `setStyle()` stays
 * encapsulated and doesn't leak to the surrounding page.
 *
 * @example
 * @Register('user-card')
 * class UserCard extends ShadowComponent {
 *   @Property() user: { name: string; avatar: string } | null = null;
 *
 *   render() {
 *     if (!this.user) return nothing;
 *     return html`
 *       <article>
 *         <img src=${this.user.avatar} alt="">
 *         <h1>${this.user.name}</h1>
 *         <slot></slot>
 *       </article>
 *     `;
 *   }
 *
 *   async didMount() {
 *     this.setStyle({
 *       ':host': { display: 'block' },
 *       'article': { padding: '1rem', borderRadius: '8px' }
 *     });
 *   }
 * }
 */
class ShadowComponent extends Component {
  /**
   * @internal
   * The open shadow root attached to the host element. All queries, renders,
   * and style adoption go through this root rather than the host's light DOM.
   */
  protected _shadowDOM: ShadowRoot;

  /**
   * @internal
   * Shared `CSSStyleSheet` adopted into the shadow root by `setStyle`. Lazily
   * created per subclass so every instance of a component reuses the same
   * constructed stylesheet.
   */
  protected static override _styleSheet: CSSStyleSheet | null = null;

  /**
   * @internal
   * Class-wide object-form style declarations backing the shared stylesheet.
   */
  protected static override _sharedStyle: Style = {};

  /**
   * Attaches an open shadow root to the host element and stores it for use
   * by the query, style, and render helpers. You generally don't call this
   * directly — the browser constructs your component when the tag appears
   * in the DOM. Override it only if you need to run extra setup, and always
   * call `super()` first.
   */
  constructor() {
    super();
    this._shadowDOM = this.attachShadow({ mode: 'open' });
  }

  /**
   * Applies styles to the component's shadow root via an adopted stylesheet.
   *
   * Behaves like `Component.setStyle`, but the stylesheet is adopted into
   * the shadow root instead of the document — so the rules stay encapsulated
   * and don't affect anything outside the component. Use `:host` selectors
   * to style the host element itself.
   *
   * @param style - A `Style` object or a CSS string.
   * @param reset - When `true`, replace the existing styles instead of
   * merging on top.
   * @returns The current object-form style after the update.
   *
   * @example
   * async didMount() {
   *   this.setStyle({
   *     ':host': { display: 'block', padding: '1rem' },
   *     'button': { cursor: 'pointer' }
   *   });
   * }
   */
  override setStyle(style: Style | string, reset: boolean = false): Style {
    const staticComponent = this.constructor as typeof ShadowComponent;

    if (!staticComponent._styleSheet) {
      staticComponent._styleSheet = new CSSStyleSheet();
    }

    let cssText = '';

    if (typeof style === 'object') {
      if (!Object.hasOwn(staticComponent, '_sharedStyle')) {
        staticComponent._sharedStyle = {};
      }

      if (!reset) {
        staticComponent._sharedStyle = { ...staticComponent._sharedStyle, ...style };
      } else {
        staticComponent._sharedStyle = { ...style };
      }

      this._style = staticComponent._sharedStyle;
      cssText = deserializeCSS(staticComponent._sharedStyle);
    } else if (typeof style === 'string') {
      if (!reset) {
        const existingRules = Array.from(staticComponent._styleSheet.cssRules || [])
          .map(rule => rule.cssText)
          .join('\n');

        cssText = existingRules + '\n' + style;
      } else {
        cssText = style;
        staticComponent._sharedStyle = {};
        this._style = {};
      }
    }

    staticComponent._styleSheet.replaceSync(cssText);

    this._shadowDOM.adoptedStyleSheets = [staticComponent._styleSheet];

    return staticComponent._sharedStyle;
  }

  /**
   * @internal
   * Shadow-root variant of the lit-html render hook. Scopes the render target
   * to the shadow root and passes `host: this` so event listeners resolve
   * against the component.
   */
  protected override _applyLitRender(result: TemplateResult | typeof nothing): void {
    litRender(result, this._shadowDOM, { host: this });
  }

  /**
   * @internal
   * Shadow-root variant of the string render hook. Wipes the existing shadow
   * content and appends the parsed template so raw HTML strings render inside
   * the encapsulated tree.
   */
  protected override _applyStringRender(html: string): void {
    while (this._shadowDOM.firstChild) {
      this._shadowDOM.firstChild.remove();
    }

    if (html === '') {
      return;
    }

    const template = document.createElement('template');
    template.innerHTML = html;

    this._shadowDOM.appendChild(template.content);
  }

  /**
   * The open shadow root attached to this component.
   *
   * Convenience accessor around the built-in `element.shadowRoot` that
   * returns a non-null `ShadowRoot` — because `ShadowComponent` always
   * attaches one in its constructor, you can use it without a null check.
   * The property is read-only; assigning to it throws.
   *
   * @returns The shadow root owned by this component.
   *
   * @example
   * const card = document.querySelector('my-card') as ShadowComponent;
   * const title = card.shadowRoot.querySelector('h1');
   */
  get shadowRoot(): ShadowRoot {
    return this._shadowDOM;
  }

  set shadowRoot(_value: ShadowRoot) {
    throw new Error('ShadowComponent shadowRoot can not be overwritten.');
  }

  /**
   * Finds the first descendant of the shadow root matching the given CSS
   * selector.
   *
   * Same shape as `Component.query`, but scoped to this component's shadow
   * root instead of its light-DOM subtree. Elements rendered by `render()`
   * live inside the shadow root, so this is the method you want for
   * reaching into your own template.
   *
   * @param selector - Any valid CSS selector.
   * @returns The first matching element, or `null` if nothing matched.
   *
   * @example
   * async didMount() {
   *   this.query<HTMLInputElement>('input[name="email"]')?.focus();
   * }
   */
  override query<E extends Element = Element>(selector: string): E | null {
    return this._shadowDOM.querySelector<E>(selector);
  }

  /**
   * Finds every descendant of the shadow root matching the given CSS
   * selector.
   *
   * Same shape as `Component.queryAll`, but scoped to this component's
   * shadow root instead of its light-DOM subtree.
   *
   * @param selector - Any valid CSS selector.
   * @returns A `NodeList` of matching elements (possibly empty).
   *
   * @example
   * for (const item of this.queryAll('li.item')) {
   *   item.classList.add('ready');
   * }
   */
  override queryAll<E extends Element = Element>(selector: string): NodeListOf<E> {
    return this._shadowDOM.querySelectorAll<E>(selector);
  }
}

export default ShadowComponent;

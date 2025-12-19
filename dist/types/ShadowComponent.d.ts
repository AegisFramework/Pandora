import Component from './Component';
import { Properties, Style } from './Types';
/**
 * A component that uses Shadow DOM for encapsulation.
 * Uses Constructable Stylesheets for high-performance styling.
 *
 * @template P - The type of the component's props (defaults to Properties)
 * @template S - The type of the component's state (defaults to Properties)
 */
declare class ShadowComponent<P extends Properties = Properties, S extends Properties = Properties> extends Component<P, S> {
    _shadowDOM: ShadowRoot;
    static _styleSheet: CSSStyleSheet | null;
    constructor();
    /**
     * Sets the component style, these are scoped to the component's shadow root
     * and shared across all instances of the same component class.
     *
     * @param style - CSS object or string to apply
     * @param reset - If true, replaces all styles; if false, merges with existing
     * @returns The current style object
     */
    setStyle(style: Style | string, reset?: boolean): Style;
    _render(): Promise<void>;
    get dom(): HTMLElement;
    set dom(value: HTMLElement);
    get shadowRoot(): ShadowRoot;
    set shadowRoot(value: ShadowRoot);
    /**
     * Queries for a single element within the shadow DOM.
     *
     * @param selector - CSS selector to query for
     * @returns The first matching element or null
     */
    query<E extends Element = Element>(selector: string): E | null;
    /**
     * Queries for all matching elements within the shadow DOM.
     *
     * @param selector - CSS selector to query for
     * @returns A NodeList of all matching elements
     */
    queryAll<E extends Element = Element>(selector: string): NodeListOf<E>;
}
export default ShadowComponent;
//# sourceMappingURL=ShadowComponent.d.ts.map
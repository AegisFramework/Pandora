import { TemplateResult, nothing } from 'lit-html';
/**
 * A single CSS declaration value. Numbers are serialized as-is, so
 * unitless properties (`zIndex: 2`) and explicit units (`width: '2rem'`)
 * are both valid.
 */
export type CSSValue = string | number;
/**
 * A flat map of CSS property names to values, used for the declaration
 * block of a single selector.
 *
 * @example
 * const declarations: CSSProperties = { color: 'white', padding: '1rem' };
 */
export type CSSProperties = Record<string, CSSValue>;
/**
 * A nested CSS object. Keys are selectors, at-rules, or nested property
 * names; values are either individual declarations or further nested
 * CSS objects (used for `@media`, nested rules, and so on).
 */
export interface CSSObject {
    [key: string]: CSSValue | CSSProperties | CSSObject;
}
/**
 * The top-level shape accepted by the `@Style` decorator. Selectors at the
 * root map to declaration blocks; `&` in a nested key refers back to the
 * host selector when encapsulation is enabled.
 *
 * @example
 * const styles: Style = {
 *   'button': { color: 'white', background: 'blue' },
 *   'button:hover': { background: 'darkblue' },
 * };
 */
export type Style = CSSObject;
/**
 * Anything a component's `render()` is allowed to return. Strings are
 * rendered as text, `TemplateResult` values come from `html` and `svg`
 * tagged templates, and `nothing` or `void` render nothing.
 */
export type TemplateValue = string | TemplateResult | typeof nothing | void;
/**
 * A function that produces a template from some context object. Async
 * functions are supported so you can `await` data before returning markup.
 */
export type TemplateFunction = (context: any) => TemplateValue | Promise<TemplateValue>;
/**
 * Options accepted by the imperative `reactive()` helper when turning a
 * plain field into a tracked one.
 *
 * - `initialValue`: seed the field if it has no value yet.
 * - `render`: set to `false` to opt out of auto-rerender on change.
 * - `onChange`: callback fired after each write, with new and old values.
 * - `equals`: custom equality check; defaults to `===` (strict identity).
 */
export interface ReactiveOptions {
    initialValue?: unknown;
    render?: boolean;
    onChange?: (newValue: unknown, oldValue: unknown) => void;
    equals?: (a: unknown, b: unknown) => boolean;
}
/**
 * The runtime shape a decorator sees when operating on a component
 * instance: a DOM element with arbitrary string or symbol-keyed slots.
 * Custom-decorator authors use this as the parameter type for their
 * effects.
 */
export type DecoratorInstance = HTMLElement & Record<string | symbol, unknown>;
/**
 * A function registered on class metadata that runs once per instance when
 * the component connects. Use `addDecoratorEffect` to register one from a
 * custom decorator.
 */
export type DecoratorEffect = (instance: DecoratorInstance) => void;
/**
 * Metadata entry describing a field wired up by `@Attribute` or by
 * `@Property({ attribute })`. Used internally to sync attribute changes
 * back to the underlying property.
 */
export interface AttrHandler {
    attrName: string;
    propertyKey: string;
    valueKey: symbol;
    settingKey: symbol;
    shouldRender: boolean;
    equals: (a: unknown, b: unknown) => boolean;
}
/**
 * Metadata entry describing a field wired up by `@Subscribe`. Records the
 * Registry state key the field listens to and the slots used to stash the
 * value and its unsubscribe function.
 */
export interface SubscribeHandler {
    stateKey: string;
    propertyKey: string;
    unsubKey: symbol;
    valueKey: symbol;
}
//# sourceMappingURL=Types.d.ts.map
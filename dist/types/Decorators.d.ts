import Component from './Component';
import { Style } from './Types';
type ComponentConstructor = typeof Component & {
    tag: string;
    _registered?: boolean;
};
interface RegisterOptions {
    defer?: boolean;
}
/**
 * Registers a class as a custom element with the browser under the given tag.
 *
 * By default the element is defined on `customElements` immediately. Pass
 * `{ defer: true }` when you want to delay registration — useful if you need
 * to wire up dependencies or control mount ordering yourself before the tag
 * becomes usable in the DOM.
 *
 * @param tagName - The custom element tag name (must contain a hyphen).
 * @param options - Pass `{ defer: true }` to skip automatic registration.
 *
 * @example
 * @Register('my-greeting')
 * class MyGreeting extends Component {
 *   render() {
 *     return html`<p>Hello, world.</p>`;
 *   }
 * }
 *
 * // <my-greeting></my-greeting>
 */
export declare function Register(tagName: string, options?: RegisterOptions): <T extends ComponentConstructor>(constructor: T, context: ClassDecoratorContext) => T;
/**
 * Attaches scoped CSS to the component. Accepts either a raw CSS string or
 * a structured `Style` object (selectors and declarations).
 *
 * Styles are applied once per class and live alongside the component's
 * shadow or light DOM output, so they don't leak to the rest of the page.
 *
 * @param css - A CSS string or a `Style` object describing the rules.
 *
 * @example
 * @Register('my-button')
 * @Style({
 *   button: {
 *     padding: '0.5rem 1rem',
 *     borderRadius: '6px',
 *     background: 'hotpink',
 *     color: 'white',
 *   },
 * })
 * class MyButton extends Component {
 *   render() {
 *     return html`<button>Click me</button>`;
 *   }
 * }
 */
export declare function Style(css: Style | string): <T extends ComponentConstructor>(constructor: T, context: ClassDecoratorContext) => T;
/**
 * Runs the decorated method whenever the given reactive property changes,
 * receiving the new and previous values.
 *
 * The watched property must be declared with `@State`, `@Attribute`, or
 * `@Property` — otherwise you'll see a one-time dev warning explaining that
 * the watcher will never fire. Watchers run synchronously on assignment,
 * before the next render is queued.
 *
 * @param property - The name of the reactive field to observe.
 *
 * @example
 * @Register('my-counter')
 * class MyCounter extends Component {
 *   @State() count = 0;
 *
 *   @Watch('count')
 *   onCountChange(next: number, previous: number) {
 *     console.log(`count went from ${previous} to ${next}`);
 *   }
 *
 *   render() {
 *     return html`<button @click=${() => this.count++}>${this.count}</button>`;
 *   }
 * }
 */
export declare function Watch(property: string): <T extends (...args: any[]) => any>(_target: T, context: ClassMethodDecoratorContext) => void;
interface StateOptions {
    render?: boolean;
}
/**
 * Declares a reactive instance field. Assigning to the field queues a render
 * on the next microtask, and multiple assignments in the same tick coalesce
 * into a single render pass.
 *
 * Pass `{ render: false }` to keep the field reactive — `@Watch` handlers
 * still fire and the value still flows through `didChange` — without
 * triggering a re-render on every assignment.
 *
 * @param options - Optional `{ render: false }` to opt out of re-rendering.
 *
 * @example
 * @Register('my-counter')
 * class MyCounter extends Component {
 *   @State() count = 0;
 *   @State({ render: false }) private lastPing = Date.now();
 *
 *   render() {
 *     return html`<button @click=${() => this.count++}>${this.count}</button>`;
 *   }
 * }
 */
export declare function State(options?: StateOptions): (_target: undefined, context: ClassFieldDecoratorContext) => void;
interface PropertyOptions {
    attribute?: string | false;
    equals?: (a: unknown, b: unknown) => boolean;
}
/**
 * Exposes a reactive JavaScript property on the component — ideal for values
 * that aren't string-serializable, like objects, arrays, or class instances.
 *
 * Properties are reactive (they fire `@Watch` handlers and run through
 * `didChange`) but do not trigger re-renders on their own, so a parent can
 * hand a child rich data without causing render thrash. Pass
 * `{ attribute: 'some-name' }` to mirror the value to an attribute for
 * primitives, or provide a custom `equals` comparator to skip updates when
 * a deep-equal object is assigned.
 *
 * @param options - `{ attribute, equals }` to control attribute sync and
 *   change detection.
 *
 * @example
 * interface User { id: string; name: string; }
 *
 * @Register('user-avatar')
 * class UserAvatar extends Component {
 *   @Property() user!: User;
 *
 *   render() {
 *     return html`<img alt=${this.user.name} data-id=${this.user.id}>`;
 *   }
 * }
 *
 * // In a parent:
 * // const el = document.querySelector('user-avatar');
 * // el.user = { id: 'u_42', name: 'Ada Lovelace' };
 */
export declare function Property(options?: PropertyOptions): (_target: undefined, context: ClassFieldDecoratorContext) => void;
interface AttributeOptions {
    render?: boolean;
}
/**
 * Binds a reactive field to an HTML attribute. The field reads through to
 * the attribute, and assignments are written back, keeping DOM and JS state
 * in sync.
 *
 * By default the attribute name matches the field name — pass a string to
 * map to a different attribute (e.g. `@Attribute('user-name')`), or pass
 * `{ render: false }` to keep the field reactive without triggering a
 * re-render when the attribute changes. String, number, and boolean values
 * are serialized automatically.
 *
 * @param attributeNameOrOptions - Either the attribute name to bind to, or
 *   an options object like `{ render: false }`.
 *
 * @example
 * @Register('my-greeting')
 * class MyGreeting extends Component {
 *   @Attribute() name = 'world';
 *
 *   render() {
 *     return html`<p>Hello, ${this.name}.</p>`;
 *   }
 * }
 *
 * // <my-greeting name="Ada"></my-greeting>
 */
export declare function Attribute(attributeNameOrOptions?: string | AttributeOptions): (_target: undefined, context: ClassFieldDecoratorContext) => void;
/**
 * Subscribes a field to a shared state key on the global `Registry`. Reading
 * the field returns the current registry value; assigning writes it back
 * and notifies every other subscriber.
 *
 * Subscriptions activate on connect and tear down on disconnect, so
 * components automatically stay in sync with the store for as long as
 * they're in the DOM — no manual wiring required.
 *
 * @param stateKey - The key in the `Registry` store this field mirrors.
 *
 * @example
 * // Somewhere at startup:
 * Registry.setState('theme', 'light');
 *
 * @Register('theme-toggle')
 * class ThemeToggle extends Component {
 *   @Subscribe('theme') theme!: 'light' | 'dark';
 *
 *   render() {
 *     return html`
 *       <button @click=${() => this.theme = this.theme === 'light' ? 'dark' : 'light'}>
 *         Theme: ${this.theme}
 *       </button>
 *     `;
 *   }
 * }
 */
export declare function Subscribe(stateKey: string): (_target: undefined, context: ClassFieldDecoratorContext) => void;
/**
 * Turns a field into a live selector query against the component's rendered
 * DOM. Each access re-runs the lookup, so the reference stays correct even
 * as the template re-renders.
 *
 * @param selector - A CSS selector scoped to the component's root.
 *
 * @example
 * @Register('my-form')
 * class MyForm extends Component {
 *   @Query('input[name="email"]') emailInput!: HTMLInputElement | null;
 *
 *   submit() {
 *     console.log('email:', this.emailInput?.value);
 *   }
 *
 *   render() {
 *     return html`
 *       <form @submit=${(e: Event) => { e.preventDefault(); this.submit(); }}>
 *         <input name="email" type="email" />
 *         <button type="submit">Send</button>
 *       </form>
 *     `;
 *   }
 * }
 */
export declare function Query(selector: string): (_target: undefined, context: ClassFieldDecoratorContext) => void;
/**
 * Like `@Query`, but returns every matching element. Each access re-runs
 * the lookup, so the list reflects the current DOM on every read.
 *
 * @param selector - A CSS selector scoped to the component's root.
 *
 * @example
 * @Register('my-tabs')
 * class MyTabs extends Component {
 *   @QueryAll('li') items!: NodeListOf<HTMLLIElement>;
 *
 *   logItems() {
 *     for (const item of this.items) console.log(item.textContent);
 *   }
 *
 *   render() {
 *     return html`
 *       <ul>
 *         <li>Overview</li>
 *         <li>Activity</li>
 *         <li>Settings</li>
 *       </ul>
 *     `;
 *   }
 * }
 */
export declare function QueryAll(selector: string): (_target: undefined, context: ClassFieldDecoratorContext) => void;
/**
 * Exposes a `<slot>` element from the shadow root as a field, so you can
 * inspect projected children or call slot APIs like `assignedElements()`.
 *
 * Call with no argument to grab the default slot, or pass a name for a
 * named slot.
 *
 * @param name - Optional named slot to target; omit for the default slot.
 *
 * @example
 * @Register('my-card')
 * class MyCard extends ShadowComponent {
 *   @Slot('header') headerSlot!: HTMLSlotElement | null;
 *
 *   connectedCallback() {
 *     super.connectedCallback();
 *     console.log('header children:', this.headerSlot?.assignedElements());
 *   }
 *
 *   render() {
 *     return html`
 *       <section>
 *         <header><slot name="header"></slot></header>
 *         <slot></slot>
 *       </section>
 *     `;
 *   }
 * }
 */
export declare function Slot(name?: string): (_target: undefined, context: ClassFieldDecoratorContext) => void;
interface ListenOptions {
    target?: 'self' | 'window' | 'document' | string;
    delegate?: string;
    capture?: boolean;
    passive?: boolean;
    once?: boolean;
}
/**
 * Binds a method as an event listener. By default the listener attaches to
 * the component itself, and is added on connect and removed on disconnect.
 *
 * Pass `target` to listen on `'window'`, `'document'`, or any CSS selector
 * scoped to the component's own subtree; pass `delegate` to catch events that
 * bubble up from a child matching a selector; `capture`, `passive`, and `once`
 * forward to the underlying `addEventListener` call.
 *
 * @param event - The event name to listen for (e.g. `'click'`, `'keydown'`).
 * @param options - Optional `{ target, delegate, capture, passive, once }`.
 *
 * @example
 * @Register('my-button')
 * class MyButton extends Component {
 *   @State() pressed = 0;
 *
 *   @Listen('click')
 *   handleClick(event: MouseEvent) {
 *     this.pressed++;
 *   }
 *
 *   render() {
 *     return html`<button>Pressed ${this.pressed} times</button>`;
 *   }
 * }
 */
export declare function Listen(event: string, options?: ListenOptions): <T extends (...args: any[]) => any>(_target: T, context: ClassMethodDecoratorContext) => void;
/**
 * Turns a getter into a cached derived value. The result is computed once,
 * reused on every read, and invalidated automatically whenever any of the
 * listed reactive dependencies change.
 *
 * List every `@State`, `@Attribute`, or `@Property` the getter reads — those
 * names drive cache invalidation, so anything missing will leave you with a
 * stale result.
 *
 * @param dependencies - Names of reactive fields the getter depends on.
 *
 * @example
 * @Register('cart-summary')
 * class CartSummary extends Component {
 *   @State() price = 10;
 *   @State() quantity = 3;
 *
 *   @Computed('price', 'quantity')
 *   get total() {
 *     return this.price * this.quantity;
 *   }
 *
 *   render() {
 *     return html`<p>Total: $${this.total}</p>`;
 *   }
 * }
 */
export declare function Computed(...dependencies: string[]): <T>(_target: T, context: ClassGetterDecoratorContext) => T;
type ClassListMap = Record<string, string | ((instance: any) => boolean)>;
/**
 * Declaratively toggles classes on the host element based on reactive state.
 * Map a class name to a reactive field name (truthy → class on, falsy →
 * class off) or to a predicate function that receives the instance and
 * returns a boolean.
 *
 * Classes are applied on connect and updated whenever the underlying
 * reactive fields change, so you never have to reach into `classList`
 * by hand.
 *
 * @param map - Object mapping class names to reactive fields or predicates.
 *
 * @example
 * @Register('my-toggle')
 * @ClassList({
 *   'is-active': 'active',
 *   'is-empty': (self: MyToggle) => self.label.length === 0,
 * })
 * class MyToggle extends Component {
 *   @State() active = false;
 *   @Attribute() label = '';
 *
 *   render() {
 *     return html`
 *       <button @click=${() => this.active = !this.active}>${this.label}</button>
 *     `;
 *   }
 * }
 */
export declare function ClassList(map: ClassListMap): <T extends ComponentConstructor>(constructor: T, _context: ClassDecoratorContext) => T;
/**
 * Installs a function on the component that dispatches a bubbling custom
 * event with the given name. Call the field like a method, passing any
 * payload you want to hand up to parents through `event.detail`.
 *
 * The event bubbles and is composed, so parent components and listeners
 * outside a shadow root can subscribe with a plain `addEventListener`.
 *
 * @param eventName - The custom event name to dispatch.
 *
 * @example
 * @Register('my-button')
 * class MyButton extends Component {
 *   @Emitter('button-pressed') pressed!: (detail?: { at: number }) => void;
 *
 *   @Listen('click')
 *   onClick() {
 *     this.pressed({ at: Date.now() });
 *   }
 *
 *   render() {
 *     return html`<button>Press me</button>`;
 *   }
 * }
 *
 * // In a parent:
 * // el.addEventListener('button-pressed', (e) => console.log(e.detail.at));
 */
export declare function Emitter(eventName: string): (_target: undefined, context: ClassFieldDecoratorContext) => void;
export {};
//# sourceMappingURL=Decorators.d.ts.map
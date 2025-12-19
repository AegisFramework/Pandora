import Component from './Component';
type ComponentConstructor = typeof Component & {
    tag: string;
    _registered?: boolean;
};
/**
 * Class Decorator: Automatically registers the component with the CustomElementsRegistry.
 *
 * @example
 * ```typescript
 * @Register('my-component')
 * class MyComponent extends Component {
 *   render() {
 *     return '<div>Hello World</div>';
 *   }
 * }
 * ```
 *
 * @param tagName - The custom element tag name (must contain a hyphen)
 */
export declare function Register(tagName: string): <T extends ComponentConstructor>(constructor: T) => T;
/**
 * Property Decorator: Binds a class property to a Global Registry state key.
 *
 * This decorator:
 * 1. On component connect, sets the property to the current global value
 * 2. Subscribes to global state changes and updates the property automatically
 * 3. When the property is set internally, updates the global state
 * 4. Automatically unsubscribes when the component disconnects
 *
 * @example
 * ```typescript
 * class UserProfile extends Component {
 *   @Consumer('user.theme')
 *   theme!: string;
 *
 *   @Consumer('app.language')
 *   language!: string;
 *
 *   render() {
 *     return `<div>Theme: ${this.theme}, Language: ${this.language}</div>`;
 *   }
 * }
 * ```
 *
 * @param stateKey - The global state key in the Registry to bind to
 */
export declare function Consumer(stateKey: string): (target: any, propertyKey: string) => void;
/**
 * Property Decorator: Declares a property that syncs with a DOM attribute.
 *
 * When the attribute changes, the property updates automatically.
 * When the property is set, the attribute is updated.
 *
 * @example
 * ```typescript
 * class MyButton extends Component {
 *   @Prop()
 *   disabled: boolean = false;
 *
 *   @Prop('button-type')
 *   type: string = 'primary';
 * }
 * ```
 *
 * @param attributeName - Optional custom attribute name (defaults to property name)
 */
export declare function Prop(attributeName?: string): (target: any, propertyKey: string) => void;
export {};
//# sourceMappingURL=Decorators.d.ts.map
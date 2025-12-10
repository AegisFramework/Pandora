# Pandora

Pandora is a lightweight Web Components library that allows you to create simple and reusable custom HTML elements with reactive state management, lifecycle hooks, and Shadow DOM support. It includes built-in [lit-html](https://lit.dev/docs/libraries/standalone-templates/) integration for efficient DOM updates.

## Installation

```bash
# Using npm
npm install @aegis-framework/pandora

# Using yarn
yarn add @aegis-framework/pandora

# Using bun
bun add @aegis-framework/pandora
```

## Quick Start

### Basic Component (String Templates)

```javascript
import { Component } from '@aegis-framework/pandora';

class CustomElement extends Component {
  constructor() {
    super();
    this.props = {
      text: ''
    };
  }

  render() {
    return `<h2>${this.props.text}</h2>`;
  }
}

console.log(CustomElement.tag); // 'custom-element'

// Register the custom element
window.customElements.define(CustomElement.tag, CustomElement);
```

### Basic Component (lit-html Templates)

For better performance with frequent updates, use lit-html's tagged templates:

```javascript
import { Component, html } from '@aegis-framework/pandora';

class CustomElement extends Component {
  constructor() {
    super();
    this.props = { text: '' };
  }

  render() {
    return html`<h2>${this.props.text}</h2>`;
  }
}
```

Using it in the HTML:

```html
<custom-element text="Hello World!"></custom-element>
```

### TypeScript Support

Pandora supports generic types for props and state:

```typescript
import { Component, html } from '@aegis-framework/pandora';

interface MyProps {
  name: string;
  count: number;
}

interface MyState {
  active: boolean;
}

class TypedComponent extends Component<MyProps, MyState> {
  constructor() {
    super();
    this.props = {
      name: '',
      count: 0
    };
    this.state = {
      active: false
    };
  }

  render() {
    return html`
      <div class="${this.state.active ? 'active' : ''}">
        <h2>${this.props.name}</h2>
        <span>Count: ${this.props.count}</span>
      </div>
    `;
  }
}
```

### Using Decorators

Pandora provides decorators for cleaner component registration and state binding:

```typescript
import { Component, Register, Consumer, Prop, html } from '@aegis-framework/pandora';

@Register('my-counter')
class MyCounter extends Component {
  @Prop()
  initialCount: number = 0;

  @Consumer('app.theme')
  theme!: string;

  state = { count: 0 };

  render() {
    return html`
      <div class="theme-${this.theme}">
        Count: ${this.state.count}
      </div>
    `;
  }
}
```

## Components

### Component

The base class for creating custom elements.

```javascript
class MyComponent extends Component {
  constructor() {
    super();

    // Define props with default values
    this.props = {
      title: '',
      visible: true
    };

    // Define internal state
    this.state = {
      count: 0
    };
  }

  render() {
    return `<div>${this.props.title}: ${this.state.count}</div>`;
  }
}
```

### ShadowComponent

A component that uses Shadow DOM for style encapsulation. ShadowComponent uses [Constructable Stylesheets](https://web.dev/constructable-stylesheets/) for high-performance styling - styles are shared across all instances of the same component class and updates use `replaceSync()` for fast synchronous changes.

```javascript
import { ShadowComponent, html } from '@aegis-framework/pandora';

class MyShadowComponent extends ShadowComponent {
  constructor() {
    super();
    this.props = { text: '' };
  }

  willMount() {
    // Set scoped styles
    this.setStyle({
      ':host': { display: 'block' },
      h2: { color: 'blue' }
    });

    return Promise.resolve();
  }

  render() {
    // Can use string templates or lit-html
    return html`<h2>${this.props.text}</h2>`;
  }
}
```

## API Reference

### Static Properties

| Property | Type | Description |
|----------|------|-------------|
| `tag` | `string` | The custom element tag name (auto-generated from class name or manually set) |
| `observedAttributes` | `string[]` | Attributes to observe for changes |

### Instance Properties

| Property | Type | Description |
|----------|------|-------------|
| `props` | `object` | Component properties (read via proxy) |
| `state` | `object` | Internal component state |
| `dom` | `HTMLElement` | Reference to the component's DOM |
| `slotContent` | `string` | Original innerHTML content before rendering (for content projection) |
| `width` | `number` | Computed width in pixels |
| `height` | `number` | Computed height in pixels |
| `isConnected` | `boolean` | Whether the component is connected to the DOM |
| `isReady` | `boolean` | Whether the component has completed its initial mount |

### Methods

#### State & Props

```javascript
// Update props (triggers update cycle)
element.setProps({ title: 'New Title' });

// Update state (triggers update cycle)
element.setState({ count: 5 });

// Set component styles
element.setStyle({
  h2: { color: 'red', fontSize: '24px' }
});
```

#### Event Helpers

```javascript
// Add event listener (chainable)
element.on('click', (e) => console.log('Clicked!'));

// Add one-time event listener (auto-removes after first trigger)
element.once('click', (e) => console.log('Only fires once!'));

// Remove event listener (chainable)
element.off('click', handler);

// Emit custom event
element.emit('custom-event', { data: 'value' });
```

#### Query Helpers

```javascript
// Query single element within component
const button = element.query('button');

// Query all matching elements
const items = element.queryAll('.item');
```

#### Rendering

```javascript
// Force re-render
element.forceRender();

// Register ready callback
element.ready(() => {
  console.log('Component is ready!');
});
```

### Lifecycle Hooks

Override these methods to hook into the component lifecycle:

#### Mount Cycle

- `willMount()` - Called before the component is rendered
- `didMount()` - Called after the component is rendered

#### Update Cycle

- `willUpdate(origin, property, oldValue, newValue, oldObject, newObject)` - Called before an update
- `update(origin, property, oldValue, newValue, oldObject, newObject)` - Called during an update
- `didUpdate(origin, property, oldValue, newValue, oldObject, newObject)` - Called after an update
- `onStateUpdate(property, oldValue, newValue, oldObject, newObject)` - Called when state changes
- `onPropsUpdate(property, oldValue, newValue, oldObject, newObject)` - Called when props change

The `origin` parameter can be `'props'`, `'state'`, or `'attribute'` depending on what triggered the update.

#### Unmount Cycle

- `willUnmount()` - Called before the component is removed
- `unmount()` - Called when the component is being removed
- `didUnmount()` - Called after the component is removed

```javascript
class MyComponent extends Component {
  willMount() {
    console.log('About to mount');
    return Promise.resolve();
  }

  didMount() {
    console.log('Mounted!');
    return Promise.resolve();
  }

  onPropsUpdate(property, oldValue, newValue) {
    console.log(`Prop ${property} changed from ${oldValue} to ${newValue}`);
    return Promise.resolve();
  }
}
```

### Observed Attributes

To react to HTML attribute changes, define which attributes to observe:

```javascript
class MyComponent extends Component {
  static observedAttributes = ['title', 'count', 'disabled'];

  attributeChangedCallback(name, oldValue, newValue) {
    // This is called automatically, which triggers the update cycle
    // You can also override onPropsUpdate to handle attribute changes
  }
}
```

## Templates

You can use HTML templates instead of the render method:

```html
<template id="my-component">
  <div class="wrapper">
    <!-- For light DOM components, use slotContent in render() instead -->
    <!-- For ShadowComponent, use native <slot> -->
  </div>
</template>
```

Or set templates programmatically:

```javascript
// String template
MyComponent.template(`
  <div class="wrapper">
    <h2>{{title}}</h2>
  </div>
`);

// Function returning string
MyComponent.template((context) => `
  <div class="wrapper">
    <h2>${context.props.title}</h2>
  </div>
`);

// Function returning lit-html (recommended for dynamic content)
import { html } from '@aegis-framework/pandora';

MyComponent.template((context) => html`
  <div class="wrapper">
    <h2>${context.props.title}</h2>
    <button @click=${() => context.handleClick()}>Click me</button>
  </div>
`);
```

## lit-html Integration

Pandora includes [lit-html](https://lit.dev/docs/libraries/standalone-templates/) and re-exports its utilities for convenience. You don't need to install lit-html separately.

### Exports

```javascript
import {
  // Tagged template functions
  html,      // For HTML templates
  svg,       // For SVG templates

  // Special values
  nothing,   // Render nothing
  noChange,  // Skip updating a value

  // Manual rendering (rarely needed)
  render,

  // Types (TypeScript)
  TemplateResult,
  SVGTemplateResult,
  RenderOptions
} from '@aegis-framework/pandora';
```

### String vs lit-html Templates

Both rendering modes work seamlessly. Use strings for simple components, lit-html for complex UIs:

```javascript
// String template (simple, familiar)
render() {
  return `<div>${this.props.name}</div>`;
}

// lit-html template (efficient updates, event binding)
render() {
  return html`
    <div>
      ${this.props.name}
      <button @click=${() => this.handleClick()}>Click</button>
    </div>
  `;
}
```

### lit-html Features

When using `html` templates, you get access to lit-html features:

```javascript
import { html, nothing } from '@aegis-framework/pandora';

class MyComponent extends Component {
  render() {
    return html`
      <!-- Conditional rendering -->
      ${this.state.show ? html`<div>Visible</div>` : nothing}

      <!-- List rendering -->
      <ul>
        ${this.state.items.map(item => html`<li>${item}</li>`)}
      </ul>

      <!-- Event binding -->
      <button @click=${(e) => this.handleClick(e)}>Click</button>

      <!-- Property binding -->
      <input .value=${this.state.name}>

      <!-- Boolean attributes -->
      <button ?disabled=${this.state.loading}>Submit</button>
    `;
  }
}
```

### Content Projection with slotContent

Use the `slotContent` property to include the original innerHTML in your templates:

```html
<!-- Usage -->
<my-card>
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</my-card>
```

```javascript
class MyCard extends Component {
  render() {
    // String template
    return `
      <div class="card">
        <div class="card-body">
          ${this.slotContent}
        </div>
      </div>
    `;
  }
}

// Or with lit-html
class MyCard extends Component {
  render() {
    return html`
      <div class="card">
        <div class="card-body">
          ${this.slotContent}
        </div>
      </div>
    `;
  }
}
```

> **Note:** For ShadowComponent, use the native `<slot>` element instead of `slotContent` for proper Shadow DOM content projection.

## Decorators

Pandora provides TypeScript/JavaScript decorators for cleaner component definitions.

> **Note:** Decorators require TypeScript or a build tool (Babel, esbuild, etc.) that supports the decorator syntax. For plain browser JavaScript, use the functional form: `Register('my-tag')(MyClass)` instead of `@Register('my-tag')`.

### @Register(tagName)

Automatically registers the component with the CustomElementsRegistry:

```typescript
import { Component, Register } from '@aegis-framework/pandora';

@Register('my-button')
class MyButton extends Component {
  render() {
    return `<button>${this.slotContent}</button>`;
  }
}

// No need for: Registry.register('my-button', MyButton);
```

### @Consumer(stateKey)

Binds a class property to global Registry state. Automatically subscribes on connect and unsubscribes on disconnect:

```typescript
import { Component, Register, Consumer, html } from '@aegis-framework/pandora';
import { Registry } from '@aegis-framework/pandora';

// Set initial state
Registry.setState('user.theme', 'light');
Registry.setState('user.name', 'Guest');

@Register('user-greeting')
class UserGreeting extends Component {
  @Consumer('user.theme')
  theme!: string;

  @Consumer('user.name')
  name!: string;

  render() {
    return html`
      <div class="theme-${this.theme}">
        Hello, ${this.name}!
      </div>
    `;
  }
}

// Later, updating state automatically updates all @Consumer properties
Registry.setState('user.name', 'Alice'); // All UserGreeting instances re-render
```

### @Prop(attributeName?)

Declares a property that syncs with a DOM attribute:

```typescript
import { Component, Register, Prop, html } from '@aegis-framework/pandora';

@Register('my-input')
class MyInput extends Component {
  @Prop()
  placeholder: string = '';

  @Prop('max-length')  // Custom attribute name
  maxLength: number = 100;

  @Prop()
  disabled: boolean = false;

  render() {
    return html`
      <input
        placeholder=${this.placeholder}
        maxlength=${this.maxLength}
        ?disabled=${this.disabled}
      >
    `;
  }
}
```

```html
<!-- Attributes sync with properties -->
<my-input placeholder="Enter text" max-length="50" disabled></my-input>
```

## Registry

The Registry provides centralized component management:

```javascript
import { Registry, Component } from '@aegis-framework/pandora';

// Register a component
Registry.register('my-tag', MyComponent);

// Check if a component is registered
if (Registry.has('my-tag')) {
  console.log('Component is registered');
}

// Get the component class
const MyComponentClass = Registry.get('my-tag');

// Evolve an existing component (hot reload)
Registry.evolve('my-tag', UpdatedComponent);

// Evolve and re-render all existing instances
Registry.evolve('my-tag', UpdatedComponent, true);

// Get all instances of a component
const instances = Registry.instances('my-tag');

// Execute callback on all instances
Registry.instances('my-tag', (instance) => {
  instance.setProps({ updated: true });
});

// Create new instance with props
const element = Registry.instantiate('my-tag', { title: 'Hello' });
```

### Registry Methods

#### Component Management

| Method | Description |
|--------|-------------|
| `register(tag, component)` | Register a new component with the custom elements registry |
| `has(tag)` | Check if a component is registered |
| `get(tag)` | Get the component class by tag name |
| `evolve(tag, component, rerender?)` | Update an existing component's implementation (optionally re-render instances) |
| `instances(tag, callback?)` | Get all instances or execute callback on each |
| `instantiate(tag, props)` | Create a new instance with the given props |

#### Debugging

| Method/Property | Description |
|-----------------|-------------|
| `debug` | Boolean property - enable/disable debug logging |
| `log(message, data?)` | Log a debug message (only when debug is enabled) |
| `list()` | Get array of all registered component tags |
| `stats(tag?)` | Get stats for one or all components (instanceCount, isRegistered, isLazy) |

#### Global Lifecycle Hooks

| Method | Description |
|--------|-------------|
| `onMount(callback)` | Register callback for when any component mounts (returns unsubscribe) |
| `onUnmount(callback)` | Register callback for when any component unmounts (returns unsubscribe) |

#### Error Handling

| Method | Description |
|--------|-------------|
| `onError(callback)` | Register global error handler for component errors (returns unsubscribe) |

#### Component Aliases

| Method | Description |
|--------|-------------|
| `alias(aliasTag, originalTag)` | Create an alias tag name for an existing component |
| `isAlias(tag)` | Check if a tag is an alias |
| `getOriginalTag(aliasTag)` | Get the original tag name for an alias |

#### Lazy Loading

| Method | Description |
|--------|-------------|
| `lazy(tag, loader)` | Register a component to be loaded on first use |
| `isLazy(tag)` | Check if a component is registered as lazy |
| `preload(tag)` | Preload a lazy component without mounting |

#### Middleware

| Method | Description |
|--------|-------------|
| `use(type, middleware)` | Register middleware for 'props', 'state', or 'render' (returns unsubscribe) |

#### Global State

| Method | Description |
|--------|-------------|
| `setState(key, value)` | Set a global state value |
| `getState(key)` | Get a global state value |
| `hasState(key)` | Check if a state key exists |
| `deleteState(key)` | Delete a state value |
| `subscribe(key, callback)` | Subscribe to state changes (returns unsubscribe function) |
| `unsubscribe(key, callback)` | Unsubscribe from state changes |
| `getAllState()` | Get a copy of all global state |
| `clearState()` | Clear all global state |

## Global State

The Registry provides a simple global state system for sharing data between components:

```javascript
import { Registry } from '@aegis-framework/pandora';

// Set global state
Registry.setState('theme', 'dark');
Registry.setState('user', { name: 'John', id: 123 });

// Get global state
const theme = Registry.getState('theme'); // 'dark'
const user = Registry.getState('user');   // { name: 'John', id: 123 }

// Check if state exists
if (Registry.hasState('theme')) {
  console.log('Theme is set');
}

// Subscribe to state changes
const unsubscribe = Registry.subscribe('theme', (newValue, oldValue) => {
  console.log(`Theme changed from ${oldValue} to ${newValue}`);
});

// Update state (triggers subscribers)
Registry.setState('theme', 'light'); // Logs: "Theme changed from dark to light"

// Unsubscribe when done
unsubscribe();

// Delete state
Registry.deleteState('theme');

// Get all state
const allState = Registry.getAllState();

// Clear all state
Registry.clearState();
```

## Debugging

Enable debug mode to log component lifecycle events:

```javascript
import { Registry } from '@aegis-framework/pandora';

// Enable debug logging
Registry.debug = true;

// Manually log messages (only when debug is enabled)
Registry.log('Custom debug message', { data: 'value' });

// List all registered components
console.log(Registry.list()); // ['my-component', 'other-component']

// Get stats for a specific component
const stats = Registry.stats('my-component');
// { tag: 'my-component', instanceCount: 3, isRegistered: true, isLazy: false }

// Get stats for all components
const allStats = Registry.stats();
```

## Global Lifecycle Hooks

Listen to mount/unmount events across all components:

```javascript
import { Registry } from '@aegis-framework/pandora';

// Subscribe to all component mounts
const unsubscribeMount = Registry.onMount((component, tag) => {
  console.log(`Component <${tag}> mounted`, component);
});

// Subscribe to all component unmounts
const unsubscribeUnmount = Registry.onUnmount((component, tag) => {
  console.log(`Component <${tag}> unmounted`, component);
});

// Clean up when done
unsubscribeMount();
unsubscribeUnmount();
```

## Error Handling

Register global error handlers to catch component errors:

```javascript
import { Registry } from '@aegis-framework/pandora';

// Register a global error handler
const unsubscribe = Registry.onError((error, component, tag, lifecycle) => {
  console.error(`Error in <${tag}> during ${lifecycle}:`, error);
  // Send to error tracking service, etc.
});

// If no error handlers are registered, errors will be thrown normally
// If handlers are registered, they receive the error instead of it being thrown
```

## Component Aliases

Create alternative tag names for existing components:

```javascript
import { Registry } from '@aegis-framework/pandora';

// Register the original component
Registry.register('my-button', MyButton);

// Create aliases (must contain a hyphen, per custom elements spec)
Registry.alias('app-button', 'my-button');
Registry.alias('custom-button', 'my-button');

// Check if a tag is an alias
Registry.isAlias('app-button'); // true
Registry.isAlias('my-button'); // false

// Get the original tag
Registry.getOriginalTag('app-button'); // 'my-button'
```

```html
<!-- All of these create the same component -->
<my-button>Click me</my-button>
<app-button>Click me</app-button>
<custom-button>Click me</custom-button>
```

## Lazy Loading

Load components on demand when they're first used:

```javascript
import { Registry } from '@aegis-framework/pandora';

// Register a lazy component
Registry.lazy('heavy-chart', () => import('./components/HeavyChart.js'));

// The component will be loaded when first used in the DOM
// <heavy-chart></heavy-chart>

// Check if a component is lazy
Registry.isLazy('heavy-chart'); // true (before loaded), false (after loaded)

// Preload a lazy component (useful for anticipated navigation)
await Registry.preload('heavy-chart');
```

### Lazy Loading with Dynamic Imports

```javascript
// Components are loaded only when first mounted
Registry.lazy('data-table', async () => {
  const module = await import('./components/DataTable.js');
  return module.default;
});

Registry.lazy('chart-widget', () => import('./components/ChartWidget.js'));
```

## Middleware

Intercept and modify props, state, or render output across all components:

```javascript
import { Registry } from '@aegis-framework/pandora';

// Props middleware - runs on every setProps call
const unsubscribeProps = Registry.use('props', (component, props) => {
  // Validate or transform props
  return {
    ...props,
    timestamp: Date.now() // Add timestamp to all props
  };
});

// State middleware - runs on every setState call
const unsubscribeState = Registry.use('state', (component, state) => {
  // Log state changes
  console.log(`State update in <${component.static.tag}>:`, state);
  return state;
});

// Render middleware - can modify rendered output
// The third parameter `renderType` indicates if the template is 'string' or 'lit'
const unsubscribeRender = Registry.use('render', (component, value, renderType) => {
  if (renderType === 'string') {
    // String templates can be modified directly
    return value.replace('{{timestamp}}', Date.now());
  }
  // lit-html TemplateResults should be returned as-is or wrapped
  return value;
});

// Clean up middleware
unsubscribeProps();
unsubscribeState();
unsubscribeRender();
```

### Example: Development Tools Middleware

```javascript
if (process.env.NODE_ENV === 'development') {
  // Log all state changes
  Registry.use('state', (component, state) => {
    console.log(`[${component.static.tag}] setState:`, state);
    return state;
  });

  // Track render performance (type-aware)
  Registry.use('render', (component, value, renderType) => {
    if (renderType === 'string') {
      console.log(`[${component.static.tag}] rendered ${value.length} chars (string)`);
    } else {
      console.log(`[${component.static.tag}] rendered (lit-html)`);
    }
    return value;
  });
}
```

### Using Global State in Components

```javascript
class ThemeToggle extends Component {
  constructor() {
    super();
    this.state = {
      theme: Registry.getState('theme') || 'light'
    };
  }

  didMount() {
    // Subscribe to theme changes
    this._unsubscribe = Registry.subscribe('theme', (newTheme) => {
      this.setState({ theme: newTheme });
      this.forceRender();
    });

    // Bind click event using event helpers
    this.on('click', () => this.toggleTheme());

    return Promise.resolve();
  }

  willUnmount() {
    // Clean up subscription
    if (this._unsubscribe) {
      this._unsubscribe();
    }
    return Promise.resolve();
  }

  toggleTheme() {
    const newTheme = this.state.theme === 'light' ? 'dark' : 'light';
    Registry.setState('theme', newTheme);
  }

  render() {
    return `<button>Current: ${this.state.theme}</button>`;
  }
}
```

## Styling

Both `Component` and `ShadowComponent` use [Constructable Stylesheets](https://web.dev/constructable-stylesheets/) for optimal performance:

- **Shared across instances** - One stylesheet per component class, not per instance
- **Fast updates** - Uses `replaceSync()` for synchronous style changes
- **No DOM overhead** - No `<style>` element parsing

### Regular Components

Styles are adopted into `document.adoptedStyleSheets` and automatically scoped using the component's tag name as a selector prefix:

```javascript
element.setStyle({
  h2: {
    color: 'blue',
    fontSize: '24px'
  },
  '&:hover h2': {
    color: 'red'
  }
});
// Generates: my-element h2 { color: blue; ... }
```

### Shadow Components

Styles are adopted into the shadow root's `adoptedStyleSheets` and naturally scoped by Shadow DOM encapsulation:

```javascript
shadowElement.setStyle({
  ':host': {
    display: 'block'
  },
  h2: {
    color: 'blue'
  },
  '@media (min-width: 768px)': {
    h2: {
      fontSize: '32px'
    }
  }
});
```

### CSS String

You can also pass raw CSS strings:

```javascript
element.setStyle(`
  h2 {
    color: blue;
    font-size: 24px;
  }
`);
```

## Browser Usage

For direct browser usage without a bundler:

```html
<script src="path/to/pandora.browser.js"></script>
<script>
  const { Component, ShadowComponent, Registry, html } = Pandora;

  class CounterElement extends Component {
    constructor() {
      super();
      this.state = { count: 0 };
    }

    didMount() {
      this.on('click', () => {
        this.setState({ count: this.state.count + 1 });
      });
      return Promise.resolve();
    }

    render() {
      return html`<button>Count: ${this.state.count}</button>`;
    }
  }

  Registry.register('counter-element', CounterElement);
</script>

<counter-element></counter-element>
```

## License

This library is released under a [MIT License](./LICENSE).

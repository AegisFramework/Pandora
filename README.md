# Pandora

Pandora is a lightweight web components library with a decorator-first API, automatic rendering via microtask batching, and built-in [lit-html](https://lit.dev/docs/libraries/standalone-templates/) integration for efficient DOM updates.

**This is a breaking API redesign from pre-0.6 versions.** The state/props bags, `setState()`, `setProps()`, and most lifecycle hooks have been removed in favor of decorator-driven reactivity. See the [Migration Guide](#migration-guide) for a complete mapping of old APIs to new ones.

```typescript
import { Component, Register, State, Listen, html } from '@aegis-framework/pandora';

@Register('my-counter')
class MyCounter extends Component {
  @State() count = 0;

  @Listen('click')
  increment() {
    this.count++; // auto-renders
  }

  render() {
    return html`<button>Count: ${this.count}</button>`;
  }
}
```

## Installation

```bash
# npm
npm install @aegis-framework/pandora

# yarn
yarn add @aegis-framework/pandora

# bun
bun add @aegis-framework/pandora
```

## Quick Start

The simplest component you can build: a prop that auto-renders on change.

```typescript
import { Component, Register, Attribute, html } from '@aegis-framework/pandora';

@Register('my-greeting')
class MyGreeting extends Component {
  @Attribute() name = 'World';

  render() {
    return html`<h1>Hello, ${this.name}!</h1>`;
  }
}
```

```html
<my-greeting name="Alice"></my-greeting>
```

That's all you need. No constructor, no `forceRender()`, no lifecycle boilerplate. When `name` changes -- whether from an attribute update or a direct property assignment -- the component re-renders automatically.

## Decorators Reference

Pandora uses [TC39 Stage 3 decorators](https://github.com/tc39/proposal-decorators), supported in TypeScript 5.0+ and modern build tools (Vite, esbuild, Bun). For environments without decorator support, see [Non-Decorator Usage](#non-decorator-usage).

### @Register(tagName)

Class decorator. Registers the component with the custom elements registry under the given tag name. Same thing as calling `Registry.register(tagName, MyClass)` by hand.

```typescript
@Register('my-button')
class MyButton extends Component {
  render() {
    return html`<button>${this.slotContent}</button>`;
  }
}
```

### @State(options?)

Field decorator. Declares a reactive instance field. Any assignment queues a re-render on the next microtask, and multiple changes within the same synchronous block coalesce into a single render.

```typescript
@Register('my-toggle')
class MyToggle extends Component {
  @State() open = false;

  render() {
    return html`
      <button @click=${() => { this.open = !this.open; }}>Toggle</button>
      ${this.open ? html`<div class="panel">Content</div>` : nothing}
    `;
  }
}
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `render` | `boolean` | `true` | Whether changes queue a re-render |

**`@State({ render: false })`** keeps the field reactive (`@Watch` callbacks and `didChange` still fire) but skips the render queue. Reach for it when a field updates at high frequency, or when you'd rather handle DOM updates imperatively via `@Watch`:

```typescript
@Register('media-player')
class MediaPlayer extends Component {
  @State() track = 'Song A';
  @State({ render: false }) currentTime = 0; // updates 60x/sec

  @Query('.time-display') timeDisplay!: HTMLSpanElement;

  @Watch('currentTime')
  onTimeUpdate(newVal: number) {
    if (this.isReady) {
      this.timeDisplay.textContent = `${newVal.toFixed(1)}s`;
    }
  }

  render() {
    return html`
      <div>Now playing: ${this.track}</div>
      <span class="time-display">0.0s</span>
    `;
  }
}
```

When to use `render: false`:

- The field updates at animation-frame frequency (media time, scroll position, WebGL uniforms)
- The render function is expensive and you want surgical DOM updates instead
- You need to call imperative third-party APIs (canvas, WebGL, widget libraries)

Most of the time the default auto-render is what you want -- lit-html's DOM diffing means only changed bindings update, not the whole tree. Reach for `render: false` when profiling shows a real bottleneck, not before.

### @Property(options?)

Field decorator. Declares a reactive field that **never triggers a render**. Designed for **container components** -- ones whose children are defined in HTML or managed from outside. `@Watch` callbacks and `didChange()` still fire; `_queueRender()` never does.

```typescript
@Register('game-screen')
class GameScreen extends Component {
  @Property() open = false;

  @Watch('open')
  onOpenChange() {
    this.classList.toggle('active', this.open);
  }

  render(): void {
    // void = preserve HTML children
  }
}
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `attribute` | `string \| false` | `false` | Attribute name to sync, or `false` for property-only |
| `equals` | `(a, b) => boolean` | `===` | Custom equality check |

**When to use @Property vs @State:**

| Scenario | Decorator | Why |
|----------|-----------|-----|
| Leaf component with rendered content | `@State()` | Needs auto-render |
| Container with HTML children | `@Property()` | Re-render would destroy children |
| High-frequency value (animation, scroll) | `@State({ render: false })` | Same behavior, but field lives on a rendering component |
| Property set from outside that shouldn't re-render | `@Property()` | Intent is clear |

`@Property()` is functionally equivalent to `@State({ render: false })`, but the intent is clearer at a glance: this component doesn't re-render, its children are its content.

### @Attribute(attributeNameOrOptions?)

Field decorator. Declares a property that syncs with a DOM attribute. `@Attribute` registers the attribute as observed for you -- no need to set `static observedAttributes` by hand. Assignments sync back to the DOM attribute, and external attribute changes sync back to the property. Either direction queues a re-render.

**String shorthand** -- custom attribute name:

```typescript
@Register('my-input')
class MyInput extends Component {
  @Attribute() placeholder = '';
  @Attribute('max-length') maxLength = 100; // maps to attribute "max-length"
  @Attribute() disabled = false;

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
<my-input placeholder="Enter text" max-length="50" disabled></my-input>
```

Attribute values are coerced for you: `''` and `'true'` become `true`, `'false'` becomes `false`, numeric strings become numbers, and everything else stays a string.

**Property-only mode** -- use `@Property()`:

For inputs that hold complex values (objects, arrays, functions), use `@Property()` instead of `@Attribute()`. The field stays reactive but skips attribute sync entirely. See [Attribute Value Types](#attribute-value-types) for when to reach for each.

```typescript
@Register('data-table')
class DataTable extends Component {
  @Attribute() title = '';
  @Property() columns: string[] = [];
  @Property() rows: Record<string, unknown>[] = [];
  @Property() onRowClick?: (row: Record<string, unknown>) => void;

  render() {
    return html`
      <h2>${this.title}</h2>
      <table>
        <thead><tr>${this.columns.map(c => html`<th>${c}</th>`)}</tr></thead>
        <tbody>
          ${this.rows.map(row => html`
            <tr @click=${() => this.onRowClick?.(row)}>
              ${this.columns.map(c => html`<td>${row[c]}</td>`)}
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }
}
```

```javascript
const table = document.querySelector('data-table');
table.columns = ['name', 'email'];
table.rows = [{ name: 'Alice', email: 'alice@example.com' }];
table.onRowClick = (row) => console.log('Clicked:', row);
```

### @Watch(property)

Method decorator. Runs the decorated method synchronously when a `@State` or `@Attribute` field changes, before the queued render. The method receives `(newValue, oldValue)`.

```typescript
@Register('search-box')
class SearchBox extends Component {
  @Attribute() query = '';

  @Watch('query')
  onQueryChange(newVal: string, oldVal: string) {
    console.log(`Query changed: "${oldVal}" -> "${newVal}"`);
    this.fetchResults(newVal);
  }

  render() {
    return html`<input .value=${this.query}>`;
  }
}
```

Watch callbacks fire synchronously inside the setter, before the microtask render. Any state you modify from a watcher gets batched into the same render.

Multiple methods can watch the same property, and one method can watch multiple properties by stacking decorators:

```typescript
@Watch('width')
@Watch('height')
onDimensionChange(newVal: number) {
  this.recalculateLayout();
}
```

### @Computed(...dependencies)

Getter decorator. Caches the return value and only recalculates when one of its dependencies (`@State`, `@Attribute`, `@Property`) changes. List dependencies by property name.

```typescript
@Register('task-list')
class TaskList extends Component {
  @State() tasks: Array<{ text: string; done: boolean }> = [];
  @State() filter: 'all' | 'active' | 'done' = 'all';

  @Computed('tasks', 'filter')
  get filteredTasks() {
    if (this.filter === 'all') return this.tasks;
    return this.tasks.filter(t => this.filter === 'done' ? t.done : !t.done);
  }

  @Computed('tasks')
  get completedCount() {
    return this.tasks.filter(t => t.done).length;
  }

  render() {
    return html`
      <p>${this.completedCount}/${this.tasks.length} done</p>
      ${this.filteredTasks.map(t => html`<div>${t.text}</div>`)}
    `;
  }
}
```

Without `@Computed`, the getters would re-evaluate on every access -- every render, every template binding. With `@Computed`, the value is cached after the first calculation and only recomputed when `tasks` or `filter` actually changes.

### @Subscribe(stateKey)

Field decorator. Binds a property to a global Registry state key. The component subscribes on connect and unsubscribes on disconnect, all for you. When the global value changes, the property updates and a render is queued.

```typescript
Registry.setState('app.theme', 'light');

@Register('themed-card')
class ThemedCard extends Component {
  @Subscribe('app.theme') theme!: string;

  render() {
    return html`<div class="card theme-${this.theme}">...</div>`;
  }
}

// All ThemedCard instances re-render automatically
Registry.setState('app.theme', 'dark');
```

Setting the property from inside the component also updates the global state, so every other consumer sees the change too.

### @Query(selector) / @QueryAll(selector)

Field decorators. Give you lazy DOM references. Each access calls `query()` or `queryAll()` on the component (or the shadow root for `ShadowComponent`), so references are always current after a render.

```typescript
@Register('my-form')
class MyForm extends Component {
  @Query('.submit-btn') submitButton!: HTMLButtonElement;
  @QueryAll('.field') fields!: NodeListOf<HTMLInputElement>;

  async didMount() {
    this.submitButton.focus();
  }

  render() {
    return html`
      <input class="field" name="email">
      <input class="field" name="name">
      <button class="submit-btn">Submit</button>
    `;
  }
}
```

### @Slot(name?)

Field decorator for `ShadowComponent`. Gives you a lazy reference to a `<slot>` element inside the shadow root. Re-queried on every access, so the reference is always current.

```typescript
@Register('card-layout')
class CardLayout extends ShadowComponent {
  @Slot() defaultSlot!: HTMLSlotElement;
  @Slot('header') headerSlot!: HTMLSlotElement;

  async didMount() {
    this.headerSlot?.addEventListener('slotchange', () => {
      console.log('Header slot changed');
    });
  }

  render() {
    return html`
      <div class="header"><slot name="header"></slot></div>
      <div class="body"><slot></slot></div>
    `;
  }
}
```

`@Slot()` with no argument targets the default slot (`slot:not([name])`). `@Slot('name')` targets a named slot (`slot[name="name"]`). Returns `null` when no matching slot exists in the shadow root.

### @Listen(event, options?)

Method decorator. Attaches an event listener on mount and removes it on unmount, automatically. The method is auto-bound to the instance. Saves you from wiring up `this.on(...)` in `didMount` and `this.off(...)` in `willUnmount` by hand.

```typescript
@Register('modal-dialog')
class ModalDialog extends Component {
  @Listen('click')
  handleClick(e: MouseEvent) {
    if ((e.target as Element).matches('.close-btn')) {
      this.close();
    }
  }

  @Listen('resize', { target: 'window' })
  handleResize() {
    this.recalculatePosition();
  }

  @Listen('keydown', { target: 'document', capture: true })
  handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') this.close();
  }

  // Delegated: fires only when a descendant matching the selector is clicked
  @Listen('click', { delegate: '[data-action="save"]' })
  onSaveClick(e: Event) {
    this.save();
  }
}
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `target` | `'self' \| 'window' \| 'document' \| string` | `'self'` | Where to attach the listener. A CSS selector string queries within the component. |
| `delegate` | `string` | -- | CSS selector for event delegation. The handler only fires when `event.target.closest(delegate)` matches. |
| `capture` | `boolean` | `false` | Use capture phase |
| `passive` | `boolean` | `false` | Mark as passive |
| `once` | `boolean` | `false` | Remove after first fire |

**Event delegation:** With `delegate` set, the listener attaches to the component (or `target`), but the handler only fires when the event originates from a descendant matching the selector. This is the same delegation pattern you'd recognize from jQuery, Backbone, and most UI frameworks -- handy for dynamic children without re-attaching listeners every render.

### @Emitter(eventName)

Field decorator. Creates a typed function that dispatches a `CustomEvent` with `bubbles: true`, `cancelable: true`, and `composed: true`. Returns the result of `dispatchEvent` -- `false` if a listener cancelled the event.

```typescript
@Register('file-input')
class FileInput extends Component {
  @Emitter('file-select') emitFileSelect!: (detail: { file: File }) => boolean;
  @Emitter('file-error') emitFileError!: (detail: { message: string }) => boolean;

  handleChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      this.emitFileSelect({ file });
    } else {
      this.emitFileError({ message: 'No file selected' });
    }
  }

  render() {
    return html`<input type="file" @change=${this.handleChange.bind(this)}>`;
  }
}
```

```javascript
// Parent listens with standard DOM events
document.querySelector('file-input').addEventListener('file-select', (e) => {
  console.log(e.detail.file.name);
});
```

### @Style(css)

Class decorator. Declaratively applies styles at component definition time. Accepts a CSS object or a raw CSS string. Styles go through Constructable Stylesheets, shared across every instance of the class, and are applied once on first mount.

**Object form:**

```typescript
@Register('my-card')
@Style({
  ':host': { display: 'block', padding: '16px' },
  h3: { color: '#333', fontSize: '18px' },
  '.body': { marginTop: '8px' }
})
class MyCard extends Component {
  @Attribute() title = '';

  render() {
    return html`
      <h3>${this.title}</h3>
      <div class="body">${this.slotContent}</div>
    `;
  }
}
```

**String form:**

```typescript
@Register('my-card')
@Style(`
  :host { display: block; }
  h3 { color: #333; }
`)
class MyCard extends Component { /* ... */ }
```

For `ShadowComponent`, `:host` and normal selectors are naturally scoped by Shadow DOM. For regular `Component`, selectors are prefixed with the component tag name for you.

### @ClassList(map)

Class decorator. Toggles CSS classes on the host element based on reactive field values. Takes a map of class names to conditions, in one of two forms:

- **Property name string** -- the class tracks the truthiness of that field. Uses `@Watch` internally, so it only re-evaluates when that specific field changes.
- **Function condition** -- `(self) => boolean`, re-evaluated on every `didChange` (whenever any reactive field changes).

```typescript
@Register('game-screen')
@ClassList({
  active: 'open',                              // 'active' when this.open is truthy
  'mode-nvl': (self) => self.mode === 'nvl'   // function condition
})
class GameScreen extends Component {
  @Property() open = false;
  @Property() mode = 'adv';

  render(): void {}
}
```

Initial classes are applied on `connectedCallback`, and subsequent updates react to field changes automatically. You can mix both forms in the same map.

## Component API

### Status Getters

| Property | Type | Description |
|----------|------|-------------|
| `isConnected` | `boolean` | True when in the DOM |
| `isReady` | `boolean` | True after first render + `didMount` complete |
| `isFirstMount` | `boolean` | True until first mount completes |
| `slotContent` | `string` | Original `innerHTML` captured before first render |

### Rendering

| Method / Property | Signature | Description |
|-------------------|-----------|-------------|
| `render()` | `() => string \| TemplateResult \| void \| Promise<...>` | Override to provide template. `void` = preserve children. `''` = clear. |
| `forceRender()` | `() => Promise<void>` | Immediate render (escape hatch -- prefer reactive fields) |
| `batch(fn)` | `(() => void) => void` | Group state changes; `@Watch`/`didChange` deferred until batch completes, one render queued |
| `ready(callback)` | `(() => void) => void` | Call after component is mounted. Fires immediately (via microtask) if already mounted. |
| `static template` | `string \| ((self) => TemplateValue)` | External template; setting it auto-re-renders mounted instances |

### Styles

| Method | Signature | Description |
|--------|-----------|-------------|
| `setStyle(style, reset?)` | `(Style \| string, boolean?) => Style` | Apply styles; `reset=true` replaces instead of merging |

### Events

| Method | Signature | Description |
|--------|-----------|-------------|
| `on(event, callback, options?)` | Returns `this` | Add event listener (chainable) |
| `off(event, callback, options?)` | Returns `this` | Remove event listener (chainable) |
| `once(event, callback, options?)` | Returns `this` | One-time listener (chainable) |
| `emit(event, detail?, options?)` | Returns `boolean` | Dispatch `CustomEvent` (bubbles, composed, cancelable) |

### DOM Helpers

| Method | Signature | Description |
|--------|-----------|-------------|
| `query<E>(selector)` | `(string) => E \| null` | `querySelector` within the component |
| `queryAll<E>(selector)` | `(string) => NodeListOf<E>` | `querySelectorAll` within the component |

For `ShadowComponent`, `query` and `queryAll` search within the shadow root.

### Registration

| Method / Property | Description |
|-------------------|-------------|
| `static register()` | Manual registration (equivalent to `@Register`) |
| `static tag` | Tag name (auto-derived from class name, or set by `@Register`) |

## Lifecycle

```
Mount:   willMount -> render -> didMount (first time) / didReconnect (subsequent)
Unmount: willUnmount -> didUnmount
Changes: @Watch callbacks -> didChange -> queued microtask render
```

All lifecycle hooks are async. Override only the hooks you need.

| Hook | When it runs | Common use |
|------|-------------|------------|
| `willMount()` | Before every render on connect | Setup that must run before the DOM is ready |
| `didMount()` | After the first render only | One-time subscriptions, timers, third-party init |
| `didReconnect()` | After re-insertion (not first mount) | Refresh data, re-sync state |
| `willUnmount()` | Before removal | Save state, cancel pending requests |
| `didUnmount()` | After removal | Final cleanup |

### Lifecycle Events

Components dispatch DOM events after mount completes and before teardown, which bubble up through the tree and cross shadow DOM boundaries (`bubbles: true, composed: true`). That lets outside code react to component lifecycle without subclassing.

| Event | When | `event.detail` |
|-------|------|----------------|
| `pandora:ready` | After `didMount` completes (first mount) | `{ firstMount: boolean, tag: string }` |
| `pandora:unmount` | Before `willUnmount` runs | `{ tag: string }` |

```javascript
// Listen on an ancestor or the document
document.addEventListener('pandora:ready', (e) => {
  console.log(`<${e.detail.tag}> is ready`);
});

document.addEventListener('pandora:unmount', (e) => {
  console.log(`<${e.detail.tag}> is unmounting`);
});
```

In lit-html templates or HTML event binding:

```html
<game-screen @pandora:ready="onScreenReady"></game-screen>
```

These events complement `Registry.onMount` / `Registry.onUnmount`. Reach for the DOM events when you want to listen to a specific subtree or respond from a parent component's template; reach for `Registry.onMount` when you need a global observer across every tag.

### didChange(property, oldValue, newValue, source?)

A generic change observer that fires whenever any `@State`, `@Attribute`, `@Property`, or `@Subscribe` field changes value. Override it when you want a single interception point across every reactive field, instead of writing individual `@Watch` methods.

**Timing:** fires synchronously in the setter, after `@Watch` callbacks, before the queued render.

**Source values:**

| Source | Meaning |
|--------|---------|
| `'state'` | `@State` field setter |
| `'prop'` | `@Attribute` field setter (property assignment) |
| `'prop-attribute'` | `@Attribute` attribute change (external HTML attribute modification) |
| `'property'` | `@Property` field setter |
| `'consumer'` | `@Subscribe` global state update |
| `'reactive'` | `reactive()` primitive |

```typescript
@Register('audit-form')
class AuditForm extends Component {
  @State() name = '';
  @State() email = '';
  @Attribute() role = 'user';

  didChange(property: string, oldValue: unknown, newValue: unknown, source?: string) {
    console.log(`[${source}:${property}] ${oldValue} -> ${newValue}`);
    analytics.track('field_change', { property, newValue, source });
  }

  render() {
    return html`
      <input .value=${this.name} @input=${(e: Event) => { this.name = (e.target as HTMLInputElement).value; }}>
      <input .value=${this.email} @input=${(e: Event) => { this.email = (e.target as HTMLInputElement).value; }}>
    `;
  }
}
```

Reach for `didChange` when you want to observe every field change uniformly (logging, analytics, dirty tracking). Reach for `@Watch` when you need targeted reactions to specific fields.

### Lifecycle Example

```typescript
@Register('data-list')
class DataList extends Component {
  @State() items: string[] = [];
  private _pollInterval: number | undefined;

  async willMount() {
    // Runs on every connect -- safe for synchronous setup
  }

  async didMount() {
    // Runs once -- safe for subscriptions and timers
    this._pollInterval = setInterval(() => this.refresh(), 5000);
    await this.refresh();
  }

  async didReconnect() {
    // Component was re-inserted (e.g., moved in the DOM)
    await this.refresh();
  }

  async willUnmount() {
    clearInterval(this._pollInterval);
  }

  async refresh() {
    this.items = await fetchItems();
  }

  render() {
    return html`<ul>${this.items.map(i => html`<li>${i}</li>`)}</ul>`;
  }
}
```

## Decorator Inheritance

When you subclass a decorated component, it helps to know how decorators interact with inheritance:

### @Watch and Method Overrides

`@Watch` metadata inherits from parent classes via `Symbol.metadata`. When a child overrides a watched method, what happens next depends on whether the child re-declares `@Watch`:

```typescript
class ScreenComponent extends Component {
  @Property() open = false;

  @Watch('open')
  onOpenChange() {
    this.classList.toggle('active', this.open);
  }
}

// Case 1: Override method WITH @Watch — child's version runs (normal JS override)
class MainScreen extends ScreenComponent {
  @Watch('open')
  override onOpenChange() {
    super.onOpenChange(); // call parent's logic
    if (this.open) this.playAmbient();
  }
}

// Case 2: Override method WITHOUT @Watch — parent's @Watch entry still
// points to 'onOpenChange', but the instance resolves to the child's
// override. Same result: child's version runs.
class GameScreen extends ScreenComponent {
  override onOpenChange() {
    super.onOpenChange();
    if (this.open) this.startGame();
  }
}

// Case 3: Add a NEW watcher with a DIFFERENT name — BOTH fire
class DialogScreen extends ScreenComponent {
  @Watch('open')
  onOpenAnimation() {
    this.animate(); // fires in addition to parent's onOpenChange
  }
}
```

**Rules:**

1. `@Watch` entries are stored in class metadata, which inherits via the prototype chain.
2. `getWatchersForProperty` looks up methods by name on the **instance**. If the child overrides the method, the child's version runs (standard JavaScript).
3. Adding a new `@Watch` with a **different method name** on the same property creates an additional watcher -- both the parent's and child's fire.
4. `super.method()` works normally inside overridden watchers.

### @State and @Attribute Inheritance

Decorated fields on parent classes are inherited. A child can add new decorated fields without touching the parent's:

```typescript
class BaseComponent extends Component {
  @State() loading = false;
}

class UserCard extends BaseComponent {
  @State() name = ''; // adds a new field; loading is inherited
}
```

To override a parent's field default, re-declare the field in the child:

```typescript
class DarkCard extends BaseComponent {
  @State() loading = true; // overrides default
}
```

## Render Timing and Batching

Knowing when renders actually happen saves surprises later. Here's the exact sequence when a reactive field changes:

```
this.count = 5
  |
  +--> setter fires
  |      |
  |      +--> @Watch callbacks fire (synchronous)
  |      |
  |      +--> didChange() fires (synchronous)
  |      |
  |      +--> _queueRender() called -- sets a flag, schedules a microtask
  |
this.name = 'Alice'     <-- same synchronous block
  |
  +--> setter fires
  |      |
  |      +--> @Watch / didChange fire (synchronous)
  |      |
  |      +--> _queueRender() called -- flag already set, no-op
  |
  ... synchronous code finishes ...
  |
  +--> microtask fires: ONE render with count=5, name='Alice'
```

Key points:

- **`@Watch` and `didChange` fire synchronously** in the setter, so you can read the new value right away and modify other state in response. Those follow-up modifications are batched into the same render.
- **Multiple synchronous changes produce exactly one render.** The first change schedules a microtask; later changes in the same synchronous block see the flag is already set and skip scheduling.
- **`forceRender()` bypasses batching.** It triggers an immediate render. Reach for it when you need the DOM updated before the next line of code runs (rare), or when you're updating plain non-decorated fields.
- **Renders are skipped while disconnected.** If the component isn't in the DOM (`isConnected` is `false`), `_queueRender()` is a no-op.
- **Renders are skipped during initialization.** Field defaults set during construction don't trigger a re-render -- only changes after the first mount cycle do.

### render() Return Value Semantics

| Return value | Behavior |
|---|---|
| `void` / `undefined` | **No-op** -- preserve existing DOM. For container components whose HTML-defined children ARE the content. |
| `''` (empty string) | **Clear** -- explicitly empties the component's innerHTML. |
| `nothing` (lit-html) | **Clear** -- explicitly renders nothing via lit-html. |
| `'<div>...'` | **Render** -- string template applied to DOM. |
| `` html`...` `` | **Render** -- lit-html template diffed against DOM. |

The default `render()` returns `void`, so components that don't override it (container / structural components) keep their HTML-defined children intact. That matters for components like `<visual-novel>` or `<main-screen>`, where the children are set in HTML and managed from outside.

### batch()

When you want to update multiple fields and only fire `@Watch` / `didChange` once per field, after every change lands:

```typescript
this.batch(() => {
  this.x = 1;
  this.y = 2;
  this.z = 3;
});
// @Watch fires once per changed field, in order
// One render is queued for the entire batch
```

Without `batch()`, each assignment fires `@Watch` / `didChange` synchronously -- the render is already batched by microtask, but the watchers fire three times. With `batch()`, watchers are deferred and run after every assignment is done.

### Deferred Registration

For engines and frameworks that need to control exactly when `customElements.define()` runs:

```typescript
@Register('game-screen', { defer: true })
class GameScreen extends Component {
  // Class is set up but NOT registered with the browser
}

// Later, when ready:
Registry.define('game-screen', GameScreen);
```

`{ defer: true }` sets the static `tag` property but skips both `customElements.define()` and Registry registration. Call `Registry.define(tag, ComponentClass)` once your setup is ready.

## Plain Fields vs @State

Not every piece of instance data needs to be a `@State` field. Here's how to decide:

| Scenario | Use | Why |
|----------|-----|-----|
| Value is shown in the template | `@State() count = 0` | Changes must trigger a re-render |
| Value is internal bookkeeping (timer IDs, references) | `private _timer = 0` | No render needed -- plain field is simpler |
| Value updates at high frequency but drives targeted DOM updates | `@State({ render: false }) time = 0` | Reactive (fires `@Watch`) but skips the render queue |
| Value is passed in from a parent element | `@Attribute() label = ''` | Syncs with DOM attributes automatically |
| Value is passed in but is a complex object | `@Property() data = []` | Reactive but no attribute sync |

```typescript
@Register('stopwatch-element')
class StopwatchElement extends Component {
  @State() elapsed = 0;                     // shown in template
  @State({ render: false }) isRunning = false; // drives @Watch, not template
  private _intervalId: number | undefined;  // internal bookkeeping

  @Watch('isRunning')
  onRunningChange(running: boolean) {
    if (running) {
      this._intervalId = setInterval(() => { this.elapsed++; }, 1000);
    } else {
      clearInterval(this._intervalId);
    }
  }

  @Listen('click')
  toggle() {
    this.isRunning = !this.isRunning;
  }

  render() {
    return html`<button>${this.elapsed}s -- ${this.isRunning ? 'Stop' : 'Start'}</button>`;
  }
}
```

## Attribute Value Types

`@Attribute()` syncs values with DOM attributes by default. That works well for strings, numbers, and booleans, which all serialize cleanly to attribute strings. Complex values -- arrays, objects, functions -- can't round-trip through attributes.

| Value type | Decorator | Behavior |
|------------|-----------|----------|
| `string` | `@Attribute()` | Syncs to/from attribute as a string |
| `number` | `@Attribute()` | Syncs to/from attribute; numeric strings auto-coerced |
| `boolean` | `@Attribute()` | Present attribute = `true`, absent = `false` |
| `object` / `array` | `@Property()` | Property-only -- no attribute sync, no render |
| `function` | `@Property()` | Property-only -- no attribute sync, no render |

**Setting attribute-friendly props from HTML:**

```html
<my-input placeholder="Type here" max-length="50" disabled></my-input>
```

**Setting complex props from JavaScript:**

```javascript
const table = document.createElement('data-table');
table.title = 'Users';                   // attribute-backed @Attribute
table.columns = ['name', 'email'];       // property-only via @Property()
table.rows = [{ name: 'Alice' }];        // property-only
table.onRowClick = (row) => alert(row);  // property-only
document.body.appendChild(table);
```

If you use `@Attribute()` (the default, attribute-backed one) with an object or array value, the property still works reactively, but the value won't reflect to a DOM attribute. Reach for `@Property()` instead -- the intent is clearer and there's nothing to be surprised by later.

## ShadowComponent

`ShadowComponent` extends `Component` with an open shadow root. The API is identical -- every decorator works the same way. The differences:

- `query()` and `queryAll()` search within the shadow root
- `setStyle()` adopts the stylesheet into the shadow root (scoped by Shadow DOM, not by tag prefix)
- Use native `<slot>` elements for content projection instead of `slotContent`
- `@Style` styles are naturally encapsulated

```typescript
import { ShadowComponent, Register, Attribute, Style, html } from '@aegis-framework/pandora';

@Register('fancy-button')
@Style({
  ':host': { display: 'inline-block' },
  'button': { padding: '8px 16px', borderRadius: '4px' }
})
class FancyButton extends ShadowComponent {
  @Attribute() variant = 'primary';

  render() {
    return html`
      <button class="btn-${this.variant}">
        <slot></slot>
      </button>
    `;
  }
}
```

```html
<fancy-button variant="secondary">Click me</fancy-button>
```

Access the shadow root via `element.shadowRoot`.

## Registry

The Registry is Pandora's central hub for component management, global state, and cross-cutting concerns.

### Component Management

```typescript
import { Registry } from '@aegis-framework/pandora';

// Register (usually handled by @Register decorator)
Registry.register('my-tag', MyComponent);

// Check / retrieve
Registry.has('my-tag')      // boolean
Registry.get('my-tag')      // ComponentClass | undefined
Registry.list()             // string[] -- all registered tags

// Evolve: swap the implementation for a registered tag
// Useful for hot module replacement and plugin patterns
Registry.evolve('my-tag', UpdatedComponent)         // swap, no re-render
Registry.evolve('my-tag', UpdatedComponent, true)   // swap + re-render all instances
// Note: `observedAttributes` is captured by the browser at register() time and
// cannot be changed afterward. If the evolved class adds NEW @Attribute fields
// whose names weren't observed originally, DOM-driven changes to those new
// attributes won't fire attributeChangedCallback. Property access still works.

// Instances
Registry.instances('my-tag')                // NodeListOf<Element>
Registry.instances('my-tag', (el) => { })  // iterate

// Programmatic instantiation
const el = Registry.instantiate('my-tag', { title: 'Hello' });
document.body.appendChild(el);

// Stats
Registry.stats('my-tag')  // { tag, instanceCount, isRegistered, isLazy }
Registry.stats()           // ComponentStats[] for all tags
```

### Lazy Loading

Register a component to be code-split and only loaded when it first appears in the DOM:

```typescript
Registry.lazy('heavy-chart', () => import('./components/HeavyChart.js'));

// Check status
Registry.isLazy('heavy-chart')  // true before loaded

// Preload eagerly (e.g., on route anticipation)
await Registry.preload('heavy-chart');
```

### Aliases

Create alternative tag names for an existing component:

```typescript
Registry.register('my-button', MyButton);
Registry.alias('app-button', 'my-button');
Registry.alias('ui-button', 'my-button');

Registry.isAlias('app-button')          // true
Registry.getOriginalTag('app-button')   // 'my-button'
```

```html
<!-- All render the same component -->
<my-button>Save</my-button>
<app-button>Save</app-button>
<ui-button>Save</ui-button>
```

### Lifecycle Hooks

Listen to mount and unmount events across all registered components:

```typescript
const off = Registry.onMount((component, tag) => {
  console.log(`<${tag}> mounted`);
});

const off2 = Registry.onUnmount((component, tag) => {
  console.log(`<${tag}> unmounted`);
});

// Clean up
off();
off2();
```

### Error Handling

Register a global error handler. Once it's in place, errors thrown from component lifecycle hooks flow through here instead of going uncaught:

```typescript
const off = Registry.onError((error, component, tag, lifecycle) => {
  console.error(`Error in <${tag}> during ${lifecycle}:`, error);
  reportToErrorTracker(error, { tag, lifecycle });
});
```

### Middleware

Intercept and transform render output across all components:

```typescript
// Render middleware -- receives (component, value, renderType)
// renderType is 'string' for string templates, 'lit' for lit-html TemplateResults
const off = Registry.use('render', (component, value, renderType) => {
  if (renderType === 'string') {
    return value.replace(/{{version}}/g, '1.0.0');
  }
  return value; // pass lit-html results through unchanged
});

// Remove middleware
off();
```

### Debug Mode

```typescript
Registry.debug = true;  // enables [Pandora] console logs for all lifecycle events

Registry.log('custom message', { extra: 'data' }); // only logs when debug is true
```

## Global State

The Registry ships a simple key-value state system for sharing data across components. Inside a component, the main way to consume global state is `@Subscribe`. The methods below are for setting and observing state from outside components.

```typescript
// Set / get
Registry.setState('app.user', { name: 'Alice', id: 1 });
Registry.getState('app.user')   // { name: 'Alice', id: 1 }
Registry.hasState('app.user')   // true

// Subscribe
const unsubscribe = Registry.subscribe('app.user', (newVal, oldVal) => {
  console.log('User changed:', newVal);
});

Registry.setState('app.user', { name: 'Bob', id: 2 }); // fires subscriber

unsubscribe();

// Delete and clear
Registry.deleteState('app.user')  // notifies subscribers with undefined
Registry.getAllState()             // { 'app.user': ..., ... }
Registry.clearState()             // deletes all keys, notifies each subscriber
```

### Using @Subscribe

```typescript
Registry.setState('app.locale', 'en');

@Register('date-display')
class DateDisplay extends Component {
  @Subscribe('app.locale') locale!: string;

  render() {
    return html`<time>${new Date().toLocaleDateString(this.locale)}</time>`;
  }
}

// All DateDisplay instances re-render automatically
Registry.setState('app.locale', 'fr');
```

### Typed State

`createState` wraps a Registry key with full TypeScript type safety. Reach for it when you want compile-time checking on `get`, `set`, and `subscribe` instead of untyped `Registry.setState` / `Registry.getState` calls.

```typescript
import { createState } from '@aegis-framework/pandora';

const theme = createState<'light' | 'dark'>('app.theme', 'light');

theme.get();              // returns 'light' | 'dark'
theme.set('dark');        // type-checked -- 'midnight' would be a TS error
theme.subscribe((val) => {
  document.documentElement.setAttribute('data-theme', val);
});
theme.has();              // boolean
theme.delete();           // removes the key and notifies subscribers
```

The optional second argument to `createState` sets a default value when the key doesn't already exist in the Registry. The returned object is a plain value, not a decorator -- stash it in a module-level variable and import it wherever you need it.

`@Subscribe(key)` binds a component field to the same key:

```typescript
import { theme } from './state';

@Register('theme-toggle')
class ThemeToggle extends Component {
  @Subscribe(theme.key) currentTheme!: 'light' | 'dark';

  render() {
    return html`
      <button @click=${() => theme.set(this.currentTheme === 'light' ? 'dark' : 'light')}>
        ${this.currentTheme}
      </button>
    `;
  }
}
```

## Extending Pandora

Pandora exposes its reactive primitives as a public API, so you can build your own decorators that plug into the render cycle, lifecycle, and hot-reload system alongside the built-ins. This is a stable, intentional extension surface -- not internal hacks you have to guard against.

### Public Extension API

```typescript
import { reactive, addDecoratorEffect, addTeardown } from '@aegis-framework/pandora';
```

| Export | Purpose |
|--------|---------|
| `reactive(instance, propertyKey, options?)` | Make a field reactive: installs getter/setter, auto-renders on change, fires `onChange` callback |
| `addDecoratorEffect(metadata, effectFn)` | Register a function to replay when `Registry.evolve()` or `Registry.lazy()` upgrades a live instance |
| `addTeardown(instance, cleanupFn)` | Register a cleanup function that runs before decorator effects are replayed (unsubscribe, remove listeners, etc.) |

Additionally, the `Util` namespace export gives access to metadata symbols if you need to read or extend decorator metadata directly:

```typescript
import { Util } from '@aegis-framework/pandora';

// Available symbols:
Util.PROP_ATTRIBUTES    // string[] of observed attribute names
Util.WATCH_HANDLERS     // @Watch registrations: { property, methodName }[]
Util.LISTEN_HANDLERS    // @Listen registrations: { event, methodName, options }[]
Util.STYLE_METADATA     // @Style CSS data (object or string)
Util.DECORATOR_EFFECTS  // effect functions for evolve/lazy replay
Util.DECORATOR_TEARDOWNS // cleanup functions on instances
```

### reactive(instance, propertyKey, options?)

The core reactive primitive. Installs a getter/setter on `instance` backed by a Symbol-keyed storage slot. The setter skips no-op assignments, fires `onChange`, and calls `_queueRender()` on the instance for you.

```typescript
reactive(instance, propertyKey, options?);
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `initialValue` | `unknown` | `undefined` | Initial value for the field |
| `render` | `boolean` | `true` | Whether changes call `_queueRender()` automatically |
| `onChange` | `(newValue, oldValue) => void` | -- | Callback fired on every change, before render is queued |
| `equals` | `(a, b) => boolean` | `===` | Custom equality check to skip no-op assignments |

The `render: false` option is the escape hatch for custom decorators that want their own render strategy -- debouncing, throttling, conditional rendering.

### addDecoratorEffect / addTeardown

These two functions handle **hot-reload compatibility**. When `Registry.evolve()` upgrades a live component, or `Registry.lazy()` loads a real implementation for a placeholder, Pandora needs to replay decorator behavior on instances that are already in the DOM. Without these, custom decorators would silently stop working after an evolve.

**`addDecoratorEffect(metadata, effectFn)`** -- Call this inside your decorator function (not inside `addInitializer`). The effect receives the instance and should install whatever behavior your decorator provides.

**`addTeardown(instance, cleanupFn)`** -- Call this inside `addInitializer`, or inside an effect. The cleanup runs before effects are replayed during evolve, so you don't end up with duplicate subscriptions or leaked listeners.

**Pattern:**

```typescript
function MyDecorator(config: string) {
  return function (_target: undefined, context: ClassFieldDecoratorContext) {
    const propertyKey = String(context.name);

    const meta = context.metadata as Record<symbol, unknown>;

    // 1. Register the effect for evolve/lazy replay
    addDecoratorEffect(meta, (instance) => {
      applyMyEffect(instance as Component, propertyKey, config);
    });

    // 2. Apply the effect on first construction
    context.addInitializer(function (this: unknown) {
      applyMyEffect(this as Component, propertyKey, config);
    });
  };
}

function applyMyEffect(instance: Component, propertyKey: string, config: string) {
  // Set up the behavior (subscriptions, property descriptors, etc.)
  const subscription = someService.subscribe(config, (value) => {
    (instance as any)[propertyKey] = value;
  });

  // Register cleanup for evolve teardown
  addTeardown(instance as any, () => {
    subscription.unsubscribe();
  });
}
```

### didChange Hook

Components can override `didChange(property, oldValue, newValue, source?)` as a single interception point for every `@State`, `@Attribute`, `@Property`, and `@Subscribe` change. The `source` parameter tells you where the change came from (`'state'`, `'prop'`, `'prop-attribute'`, `'property'`, `'consumer'`, `'reactive'`):

```typescript
class TrackedComponent extends Component {
  @State() count = 0;
  @State() name = '';
  @Attribute() title = '';
  @Property() open = false;

  didChange(property: string, oldValue: unknown, newValue: unknown, source?: string) {
    analytics.track('field_change', { property, oldValue, newValue, source });
  }
}
```

`didChange` fires synchronously after `@Watch` callbacks and before the render is queued.

### Example: @LocalStorage

Persists a reactive field to `localStorage` and restores it on page load:

```typescript
import { reactive, addDecoratorEffect, addTeardown, Component } from '@aegis-framework/pandora';

function LocalStorage(storageKey: string) {
  return function (_target: undefined, context: ClassFieldDecoratorContext) {
    const propertyKey = String(context.name);
    const meta = context.metadata as Record<symbol, unknown>;

    addDecoratorEffect(meta, (instance) => {
      applyLocalStorage(instance as Component, propertyKey, storageKey);
    });

    context.addInitializer(function (this: unknown) {
      applyLocalStorage(this as Component, propertyKey, storageKey);
    });
  };
}

function applyLocalStorage(instance: Component, propertyKey: string, storageKey: string) {
  const stored = localStorage.getItem(storageKey);
  const initial = stored !== null ? JSON.parse(stored) : undefined;

  reactive(instance as any, propertyKey, {
    initialValue: initial,
    onChange(newVal) {
      localStorage.setItem(storageKey, JSON.stringify(newVal));
    }
  });

  // Listen for changes from other tabs
  const handler = (e: StorageEvent) => {
    if (e.key === storageKey && e.newValue !== null) {
      (instance as any)[propertyKey] = JSON.parse(e.newValue);
    }
  };
  window.addEventListener('storage', handler);
  addTeardown(instance as any, () => window.removeEventListener('storage', handler));
}
```

```typescript
@Register('settings-panel')
class SettingsPanel extends Component {
  @LocalStorage('app.theme') theme = 'light';

  render() {
    return html`
      <button @click=${() => { this.theme = this.theme === 'light' ? 'dark' : 'light'; }}>
        Current theme: ${this.theme}
      </button>
    `;
  }
}
```

The decorator is reactive (auto-renders), persists across page loads, syncs across tabs, and survives `Registry.evolve()` -- all from a few dozen lines.

### Example: @DebouncedState

A reactive field that debounces its render trigger, useful for search inputs:

```typescript
import { reactive, Component } from '@aegis-framework/pandora';

function DebouncedState(ms: number = 300) {
  return function (_target: undefined, context: ClassFieldDecoratorContext) {
    const propertyKey = String(context.name);
    context.addInitializer(function (this: unknown) {
      const instance = this as Component;
      let timer: ReturnType<typeof setTimeout>;
      reactive(instance as any, propertyKey, {
        render: false,
        onChange() {
          clearTimeout(timer);
          timer = setTimeout(() => {
            (instance as any)._queueRender();
          }, ms);
        }
      });
    });
  };
}
```

```typescript
@Register('search-bar')
class SearchBar extends Component {
  @DebouncedState(250) query = '';

  @Listen('input', { target: '.search-input' })
  onInput(e: Event) {
    this.query = (e.target as HTMLInputElement).value;
  }

  render() {
    return html`
      <input class="search-input" placeholder="Search...">
      <div class="results">Searching for: ${this.query}</div>
    `;
  }
}
```

The field itself updates immediately (so `@Watch` and `didChange` fire synchronously), but the template only re-renders after 250ms of inactivity.

### Example: @MediaQuery

A reactive boolean that tracks a CSS media query:

```typescript
import { reactive, addDecoratorEffect, addTeardown, Component } from '@aegis-framework/pandora';

function MediaQuery(query: string) {
  return function (_target: undefined, context: ClassFieldDecoratorContext) {
    const propertyKey = String(context.name);
    const meta = context.metadata as Record<symbol, unknown>;

    addDecoratorEffect(meta, (instance) => {
      applyMediaQuery(instance as Component, propertyKey, query);
    });

    context.addInitializer(function (this: unknown) {
      applyMediaQuery(this as Component, propertyKey, query);
    });
  };
}

function applyMediaQuery(instance: Component, propertyKey: string, query: string) {
  const mql = window.matchMedia(query);
  reactive(instance as any, propertyKey, { initialValue: mql.matches });

  const handler = (e: MediaQueryListEvent) => {
    (instance as any)[propertyKey] = e.matches;
  };
  mql.addEventListener('change', handler);
  addTeardown(instance as any, () => mql.removeEventListener('change', handler));
}
```

```typescript
@Register('responsive-layout')
class ResponsiveLayout extends Component {
  @MediaQuery('(min-width: 768px)') isDesktop = false;
  @MediaQuery('(prefers-color-scheme: dark)') prefersDark = false;

  render() {
    return html`
      <div class=${this.prefersDark ? 'dark' : 'light'}>
        ${this.isDesktop
          ? html`<div class="sidebar">...</div><div class="main">...</div>`
          : html`<div class="mobile-stack">...</div>`
        }
      </div>
    `;
  }
}
```

### Example: @FetchData

A reactive field that fetches data from a URL and auto-renders when the response arrives:

```typescript
import { reactive, addDecoratorEffect, addTeardown, Component } from '@aegis-framework/pandora';

function FetchData(url: string) {
  return function (_target: undefined, context: ClassFieldDecoratorContext) {
    const propertyKey = String(context.name);
    const meta = context.metadata as Record<symbol, unknown>;

    addDecoratorEffect(meta, (instance) => {
      applyFetchData(instance as Component, propertyKey, url);
    });

    context.addInitializer(function (this: unknown) {
      applyFetchData(this as Component, propertyKey, url);
    });
  };
}

function applyFetchData(instance: Component, propertyKey: string, url: string) {
  reactive(instance as any, propertyKey, { initialValue: null });

  const controller = new AbortController();
  fetch(url, { signal: controller.signal })
    .then(r => r.json())
    .then(data => { (instance as any)[propertyKey] = data; })
    .catch(() => {});

  addTeardown(instance as any, () => controller.abort());
}
```

```typescript
@Register('user-profile')
class UserProfile extends Component {
  @FetchData('/api/user') userData: any = null;

  render() {
    if (!this.userData) return html`<p>Loading...</p>`;
    return html`<h2>${this.userData.name}</h2><p>${this.userData.email}</p>`;
  }
}
```

### What You Can Build

The extension API is meant to let you create decorators for any external data source or side effect:

| Pattern | Built with |
|---------|-----------|
| Persistent state (localStorage, IndexedDB) | `reactive()` + `onChange` |
| Debounced/throttled fields | `reactive({ render: false })` + custom timer |
| Media queries, resize observers | `reactive()` + `addTeardown()` for cleanup |
| Data fetching | `reactive()` + `addTeardown()` for abort |
| WebSocket bindings | `reactive()` + `addTeardown()` for disconnect |
| Intersection observers | `reactive()` + `addTeardown()` for unobserve |
| Animation state | `reactive({ render: false })` + requestAnimationFrame |
| Form validation | `reactive()` + `onChange` for validation logic |
| Feature flags | `reactive()` + external service subscription |
| Analytics/telemetry | `didChange()` hook or `onChange` callback |
| Type-safe shared state | `createState<T>()` + `@Subscribe` |
| Class-based visual state | `@ClassList` decorator |

All of these plug straight into Pandora's render cycle, `@Watch`, `didChange()`, and `Registry.evolve()` -- no extra wiring needed.

## Styling

### setStyle()

`setStyle()` uses [Constructable Stylesheets](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/CSSStyleSheet) -- one stylesheet per component class, shared across every instance. Updates go through `replaceSync()`, so nothing adds `<style>` elements to the DOM.

```typescript
// CSS object (keys are selectors, values are property objects)
this.setStyle({
  h2: { color: 'blue', fontSize: '24px' },
  '.active': { fontWeight: 'bold' },
  '&:hover': { opacity: '0.9' }   // & is replaced with the tag name
});

// CSS string
this.setStyle('h2 { color: blue; }');

// Second argument true = replace instead of merge
this.setStyle({ h2: { color: 'red' } }, true);
```

For `Component` (light DOM), selectors are prefixed with the component's tag name for you. For `ShadowComponent`, Shadow DOM provides natural encapsulation on its own.

### @Style Decorator

`@Style` is the declarative equivalent -- styles are applied once on first mount:

```typescript
@Register('stat-card')
@Style({
  ':host': { display: 'block', borderRadius: '8px', padding: '16px' },
  'h4': { margin: '0 0 8px', fontSize: '14px', color: '#666' },
  '.value': { fontSize: '32px', fontWeight: 'bold' }
})
class StatCard extends Component { /* ... */ }
```

## lit-html Integration

Pandora bundles and re-exports lit-html, so you don't need to install it separately.

```typescript
import {
  html,            // HTML template tag
  svg,             // SVG template tag
  nothing,         // renders nothing (replaces previous content)
  noChange,        // skip updating a binding
  render,          // manual render (rarely needed)
  type TemplateResult,
  type SVGTemplateResult,
  type RenderOptions
} from '@aegis-framework/pandora';
```

### String vs lit-html Templates

Both rendering modes work inside the same component. Reach for whichever fits the situation:

```typescript
// String template -- simple, no build-time processing needed
render() {
  return `<p>Hello, ${this.name}</p>`;
}

// lit-html -- efficient updates, event binding, property binding
render() {
  return html`
    <p>Hello, ${this.name}</p>
    <button @click=${() => this.handleClick()}>Go</button>
    <input .value=${this.query} ?disabled=${this.loading}>
    ${this.items.map(item => html`<li>${item}</li>`)}
    ${this.error ? html`<p class="error">${this.error}</p>` : nothing}
  `;
}

// Async render -- component awaits the promise before updating the DOM
async render() {
  const data = await fetchUserProfile(this.userId);
  return html`<div>${data.name}</div>`;
}
```

### Static Template

Set a template on the class directly -- handy for external templates or programmatic overrides. Every mounted instance re-renders automatically when the template changes:

```typescript
// Function template (self is the component instance)
MyComponent.template = (self) => html`<div>${self.title}</div>`;

// Defined in the class body
class MyComponent extends Component {
  static template = (self: MyComponent) => html`<h1>${self.title}</h1>`;
}
```

An HTML `<template>` element with a matching `id` is also picked up on first mount:

```html
<template id="my-component">
  <div class="wrapper">Static HTML content</div>
</template>
```

## Non-Decorator Usage

**Best experience: modern TypeScript with decorators.** The decorator path gives you auto-rendering, attribute sync, event binding, and lifecycle management with no boilerplate.

**Fallback: plain JavaScript with manual `forceRender()`.** For environments without build tools or decorator support, you can write components as plain classes. It works, but expect a bit more manual wiring.

```javascript
import { Component, Registry, html } from '@aegis-framework/pandora';

class CounterElement extends Component {
  count = 0;

  didMount() {
    this.on('click', () => {
      this.count++;
      this.forceRender(); // plain fields are not reactive -- call forceRender() manually
    });
  }

  render() {
    return html`<button>Count: ${this.count}</button>`;
  }
}

Registry.register('counter-element', CounterElement);
```

Plain class fields are not reactive. Without `@State` or `@Attribute`, changes don't trigger renders on their own -- you have to call `forceRender()` after every mutation. Lifecycle hooks (`willMount`, `didMount`, `willUnmount`, `didUnmount`, `didReconnect`) work the same way in both paths.

## Test Utilities

Pandora ships a `testing` namespace with helpers for unit and component tests. Import it straight from the main package:

```typescript
import { testing } from '@aegis-framework/pandora';
```

| Function | Signature | Description |
|----------|-----------|-------------|
| `testing.flush()` | `() => Promise<void>` | Resolve all pending microtask renders. Call after state changes before asserting DOM state. |
| `testing.whenReady(element, timeout?)` | `(Element, number?) => Promise<void>` | Wait until `element.isReady` is true. Resolves immediately if already ready. Rejects after `timeout` ms (default 5000). |
| `testing.resetRegistry()` | `() => void` | Clear all global state, subscriptions, and middleware. Call in `beforeEach` / `afterEach` to isolate tests. |
| `testing.mount(tagName, container?, innerHTML?)` | `(string, Element?, string?) => Promise<Component>` | Create the element, append it to `container` (default `document.body`), wait until ready, and return it. |

```typescript
import { testing } from '@aegis-framework/pandora';
import { MyCounter } from './MyCounter';

beforeEach(() => {
  testing.resetRegistry();
});

it('increments on click', async () => {
  const el = await testing.mount('my-counter') as MyCounter;

  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await testing.flush();

  expect(el.shadowRoot?.textContent).toContain('1');
});

it('accepts initial innerHTML', async () => {
  const el = await testing.mount('my-counter', document.body, '<span slot="label">Clicks</span>');
  expect(el.isReady).toBe(true);
});
```

`testing.flush()` performs two microtask yields: the first drains any `_queueRender` microtasks, and the second drains any microtasks queued during the render itself. That's enough for all standard reactive updates.

## Browser Usage

Pandora ships a pre-bundled browser file you can drop in without a bundler:

```html
<script src="node_modules/@aegis-framework/pandora/dist/pandora.browser.js"></script>
<script>
  const { Component, Registry, html } = Pandora;

  class CounterElement extends Component {
    count = 0;

    didMount() {
      this.on('click', () => {
        this.count++;
        this.forceRender();
      });
    }

    render() {
      return html`<button>Count: ${this.count}</button>`;
    }
  }

  Registry.register('counter-element', CounterElement);
</script>

<counter-element></counter-element>
```

Decorators aren't available in no-build browser usage. Use `Registry.register()` and `forceRender()` as shown above.

## Migration Guide

Migrating from pre-0.6 Pandora to the new decorator-first API:

| Before (pre-0.6) | After (0.6) |
|-------------------|-------------|
| `this.state = { count: 0 }` | `@State() count = 0` |
| `this.setState({ count: 1 })` | `this.count = 1` |
| `this.props = { title: '' }` | `@Attribute() title = ''` |
| `this.setProps({ title: 'Hi' })` | `this.title = 'Hi'` |
| `onStateUpdate() { this.forceRender(); }` | Automatic -- `@State` fields queue renders on change |
| `onPropsUpdate() { this.forceRender(); }` | Automatic -- `@Attribute` fields queue renders on change |
| `willUpdate()` / `didUpdate()` | `@Watch('field')` or `didChange()` |
| `update()` | `@Watch('field')` |
| `unmount()` | `willUnmount()` / `didUnmount()` |
| `MyComponent.template(fn)` | `MyComponent.template = fn` |
| `this.dom` | `this` (Component is itself an `HTMLElement`) |
| `this.static.tag` | Removed -- use `(this.constructor as typeof Component).tag` |
| `this.width` / `this.height` | Use `getComputedStyle(this)` directly |
| `this.ready(callback)` | Use `didMount()` |
| `Component<Props, State>` generics | Typed class fields with decorators |
| Untyped `Registry.setState` / `Registry.getState` for shared values | `createState<T>(key, default)` for type-safe global state |

**Key behavioral changes:**

- **Auto-rendering is the default.** You no longer need `onStateUpdate() { this.forceRender(); }`. Any assignment to a `@State` or `@Attribute` field queues a render for you.
- **No more state / props bags.** Each piece of state is its own decorated class field, which gives you TypeScript types for free and makes the intent of each field explicit.
- **`forceRender()` is the escape hatch now, not the norm.** You only need it when you're working with plain (non-decorated) fields, or when you need an immediate synchronous render.
- **Lifecycle hooks are simpler.** The old update lifecycle (`willUpdate`, `update`, `didUpdate`, `onStateUpdate`, `onPropsUpdate`, `updateCallback`) is entirely replaced by `@Watch` and `didChange`.

## License

Released under the [MIT License](./LICENSE).

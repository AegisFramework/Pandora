import { render as litRender, TemplateResult, nothing } from 'lit-html';
import {
  callAsync,
  deserializeCSS,
  isTemplateResult,
  parseAttributeValue,
  resolveListenerTarget,
  PROP_ATTRIBUTES,
  WATCH_HANDLERS,
  LISTEN_HANDLERS,
  STYLE_METADATA,
  ATTR_HANDLERS,
  SUBSCRIBE_HANDLERS,
} from './Util';
import type { AttrHandler, SubscribeHandler } from './Types';
import { Style, TemplateValue, TemplateFunction } from './Types';

/**
 * The base class every Pandora component extends.
 *
 * `Component` is a thin layer over the native `HTMLElement` that wires up
 * Pandora's reactive lifecycle: subclasses declare state with decorators like
 * `@State`, `@Attribute`, and `@Property`, and the base class takes care of
 * registering the tag, batching state changes into microtask-scheduled
 * renders, managing attributes, and running mount and unmount hooks. Most of
 * the time you only implement `render()` and let the decorators do the rest.
 *
 * Rendering is batched on the microtask queue. Multiple synchronous property
 * updates in the same tick coalesce into a single `render()` call. If you
 * need a synchronous render, call `forceRender()`; if you need to group
 * changes explicitly, wrap them in `batch()`.
 *
 * @example
 * import { Component, Register, State, html } from '@aegis-framework/pandora';
 *
 * @Register('my-greeting')
 * class MyGreeting extends Component {
 *   @State() name = 'world';
 *
 *   render() {
 *     return html`<p>Hello, ${this.name}.</p>`;
 *   }
 * }
 *
 * // <my-greeting></my-greeting>
 */
class Component extends HTMLElement {
  /**
   * The inner HTML the component was mounted with, captured before the first
   * render runs. Exposed publicly as `slotContent`.
   *
   * @internal
   */
  protected _children: string;

  /**
   * Tracks whether the element is currently in the DOM. Flipped in
   * `connectedCallback` / `disconnectedCallback` and surfaced publicly as
   * `isConnected`.
   *
   * @internal
   */
  protected _connected: boolean;

  /**
   * Flips to `true` once the first mount (including `didMount` and the initial
   * render) has finished. Surfaced publicly as `isReady`.
   *
   * @internal
   */
  protected _isReady: boolean;

  /**
   * Remembers whether this instance has ever been mounted. We flip it on
   * after `didMount` so `isFirstMount` stays `true` for the duration of that
   * hook and only becomes `false` on later reconnects.
   *
   * @internal
   */
  protected _hasBeenMounted: boolean;

  /**
   * Gates decorator-driven re-renders so that field initializer assignments
   * during construction don't queue a render. Set to `true` after the first
   * render completes, so subsequent `@State` / `@Attribute` writes during
   * `didMount` and later hooks can schedule renders.
   *
   * @internal
   */
  protected _initRenderDone: boolean;

  /**
   * Bumps on every render, letting queued microtask renders detect that they
   * have been superseded and bail out before writing to the DOM.
   *
   * @internal
   */
  protected _renderId: number;

  /**
   * Tracks whether a microtask render is already queued, so repeated
   * `_queueRender` calls in the same tick coalesce into a single render.
   *
   * @internal
   */
  protected _renderQueued: boolean;

  /**
   * The object-form style currently applied through `setStyle`. Persisted so
   * that merge-mode updates can layer new rules on top of previous ones.
   *
   * @internal
   */
  protected _style: Style;

  /**
   * `true` while a `batch()` callback is executing. Used by the reactive
   * setters to defer watcher and render scheduling until the batch flushes.
   *
   * @internal
   */
  protected _batching: boolean;

  /**
   * Records reactive changes while a `batch()` is open so watchers and
   * `didChange` don't observe intermediate state. Flushed once at the end of
   * the batch with first and last values per property.
   *
   * @internal
   */
  protected _batchedChanges: Array<{ property: string; oldValue: unknown; newValue: unknown; shouldRender: boolean; source: string }>;

  /**
   * Backing storage for the custom element tag this class registers under.
   * Populated lazily by the `tag` getter (kebab-casing the class name) or
   * eagerly by `@Register` and the `tag` setter.
   *
   * @internal
   */
  protected static _tag?: string;

  /**
   * Backing storage for a class-level template (string or function). Takes
   * precedence over instance `render()` when set. Read and written through
   * the public `template` accessors.
   *
   * @internal
   */
  protected static _template?: string | TemplateFunction;

  /**
   * Backing storage for attributes registered manually through the
   * `observedAttributes` setter. Merged with `@Attribute` / `@Property`
   * metadata in the getter.
   *
   * @internal
   */
  protected static _observedAttributes: string[] = [];

  /**
   * The adopted `CSSStyleSheet` shared across every instance of this tag.
   * We keep one per class so `setStyle` on one instance styles them all.
   *
   * @internal
   */
  protected static _styleSheet: CSSStyleSheet | null = null;

  // Registry integration hooks

  /**
   * Set by `Registry._init` to notify the registry whenever an instance
   * finishes `connectedCallback`. Left unset when the registry isn't loaded.
   *
   * @internal
   */
  static _onMount?: (component: Component, tag: string) => void;

  /**
   * Set by `Registry._init` to notify the registry after
   * `disconnectedCallback` finishes tearing an instance down.
   *
   * @internal
   */
  static _onUnmount?: (component: Component, tag: string) => void;

  /**
   * Set by `Registry._init` to route lifecycle errors through the registry's
   * error handler. When unset, errors rethrow from the lifecycle method.
   *
   * @internal
   */
  static _onError?: (error: Error, component: Component, tag: string, lifecycle: string) => void;

  /**
   * Set by `Registry._init` so the registry can transform values flowing
   * through reactive setters and render output (currently `render` middleware).
   *
   * @internal
   */
  static _applyMiddleware?: (type: string, component: Component, value: unknown, renderType?: 'string' | 'lit') => unknown;

  /**
   * Set by `Registry._init`. Lets `Component` cheaply skip the middleware
   * bridge when no middleware of a given type is registered.
   *
   * @internal
   */
  static _hasMiddleware?: (type: string) => boolean;

  // Registry integration hooks for @Subscribe

  /**
   * Set by `Registry._init`. Subscribes an instance to a global state key
   * and returns an unsubscribe function. Used to wire up `@Subscribe`
   * handlers on mount.
   *
   * @internal
   */
  static _subscribe?: (stateKey: string, callback: (newVal: unknown, oldVal: unknown) => void) => () => void;

  /**
   * Set by `Registry._init`. Reads the current value for a global state key
   * so `@Subscribe` fields can seed themselves on activation.
   *
   * @internal
   */
  static _getGlobalState?: (stateKey: string) => unknown;

  /**
   * Set by `Registry._init`. Applies the current implementation registered
   * with `Registry.evolve()` so that instances created after `evolve` pick up
   * the latest behavior.
   *
   * @internal
   */
  static _applyCurrentImplementation?: (instance: Component, tag: string) => void;

  /**
   * Activates a single `@Subscribe` handler on an instance, hooking it into
   * the registry's global state so the field tracks the chosen state key.
   * Safe to call more than once — any prior subscription in the handler's
   * slot is torn down first.
   *
   * @internal
   */
  static _activateSubscription(instance: Component, handler: SubscribeHandler): void {
    if (!Component._subscribe) {
      return;
    }

    const inst = instance as unknown as Record<symbol, unknown>;
    // Tear down any prior subscription occupying this handler's slot so
    // repeated activations don't double-fire on state changes.
    if (inst[handler.unsubKey]) {
      (inst[handler.unsubKey] as () => void)();
      inst[handler.unsubKey] = undefined;
    }
    inst[handler.unsubKey] = Component._subscribe(handler.stateKey, (newVal: unknown) => {
      const oldVal = inst[handler.valueKey];
      if (oldVal === newVal) return;
      inst[handler.valueKey] = newVal;
      instance.didChange(handler.propertyKey, oldVal, newVal, 'consumer');
      if (instance.isReady) {
        (instance as unknown as { _queueRender: () => void })._queueRender();
      }
    });
    const current = Component._getGlobalState?.(handler.stateKey);
    if (current !== undefined) {
      inst[handler.valueKey] = current;
    }
  }

  /**
   * The list of attributes the browser will notify Pandora about.
   *
   * This is the standard custom-elements introspection hook. It merges any
   * attributes you registered manually with the ones declared through
   * `@Attribute` and `@Property({ attribute })` decorators, so you rarely need
   * to set it by hand.
   *
   * @returns The tag names of observed attributes, with duplicates removed.
   *
   * @example
   * class MyButton extends Component {
   *   @Attribute() disabled = false;
   * }
   *
   * MyButton.observedAttributes; // ['disabled']
   */
  static get observedAttributes(): string[] {
    if (typeof Symbol.metadata !== 'undefined') {
      const meta = (this as any)[Symbol.metadata];
      const metaAttrs = meta?.[PROP_ATTRIBUTES] as string[] | undefined;
      if (metaAttrs?.length) {
        return [...new Set([...this._observedAttributes, ...metaAttrs])];
      }
    }
    return this._observedAttributes;
  }

  /**
   * Overrides the list of observed attributes for this class.
   *
   * Prefer `@Attribute` / `@Property({ attribute })` instead — they keep the
   * attribute list and the reactive field in sync automatically. Setting
   * this by hand is an escape hatch for integrations that need to declare
   * attributes without decorators.
   *
   * @param value - The attribute names the component should react to.
   */
  static set observedAttributes(value: string[]) {
    this._observedAttributes = value;
  }

  /**
   * The custom element tag this component registers under.
   *
   * If you used `@Register('my-tag')` the tag is whatever you passed in. If
   * you didn't, Pandora derives one from the class name by converting it to
   * kebab-case (`MyGreeting` becomes `my-greeting`).
   *
   * @returns The tag name the component is known by in the DOM.
   *
   * @example
   * @Register('user-avatar')
   * class UserAvatar extends Component {}
   * UserAvatar.tag; // 'user-avatar'
   *
   * class ThemeToggle extends Component {}
   * ThemeToggle.tag; // 'theme-toggle' — derived from the class name
   */
  static get tag(): string {
    if (typeof this._tag === 'undefined') {
      let tag = this.name;
      const matches = tag.match(/([A-Z])/g);
      if (matches !== null) {
        for (const match of matches) {
          tag = tag.replace(match, `-${match}`.toLowerCase());
        }
      }
      this._tag = tag.slice(1);
    }

    return this._tag;
  }

  /**
   * Overrides the tag name this component registers under.
   *
   * `@Register('my-tag')` is the preferred way to set this. Use the setter
   * when you need to assign a tag programmatically before calling
   * `register()` yourself.
   *
   * @param value - The custom element tag (must contain a hyphen).
   */
  static set tag(value: string) {
    this._tag = value;
  }

  /**
   * The class-level template used in place of `render()` when defined.
   *
   * Pandora picks this up automatically from an HTML `<template id="my-tag">`
   * on first mount, or you can assign a string or a function that returns
   * one. When set, it takes precedence over the instance `render()` method.
   *
   * @returns The template, or `undefined` if the component renders through
   * `render()`.
   *
   * @example
   * MyGreeting.template = (self) => `<p>Hello, ${self.name}.</p>`;
   */
  static get template(): string | TemplateFunction | undefined {
    return this._template;
  }

  /**
   * Replaces the class-level template and refreshes every mounted instance.
   *
   * Assigning a new template triggers `forceRender()` on every live element
   * of this tag, so the UI picks up the new markup immediately. Pass a
   * string for static markup, or a function `(self) => string` when you need
   * access to the instance.
   *
   * @param value - The new template, or `undefined` to clear it.
   *
   * @example
   * // Swap the greeting template at runtime.
   * MyGreeting.template = '<p>Welcome back.</p>';
   */
  static set template(value: string | TemplateFunction | undefined) {
    this._template = value;

    if (value !== undefined) {
      document.querySelectorAll(this.tag).forEach((instance) => {
        if (instance instanceof Component && instance._isReady) {
          instance.forceRender();
        }
      });
    }
  }

  /**
   * Initializes a component instance.
   *
   * The browser calls this for you when the element is created — either
   * through `document.createElement('my-tag')`, `new MyTag()`, or when the
   * parser encounters the tag in HTML. Subclasses rarely need to override
   * it; reach for `willMount()` or `didMount()` for setup work. If you do
   * override, remember to call `super()` first.
   *
   * @example
   * class MyCounter extends Component {
   *   constructor() {
   *     super();
   *     // your own setup here
   *   }
   * }
   */
  constructor() {
    super();
    this._children = '';
    this._connected = false;
    this._isReady = false;
    this._hasBeenMounted = false;
    this._initRenderDone = false;
    this._renderId = 0;
    this._renderQueued = false;
    this._style = {};
    this._batching = false;
    this._batchedChanges = [];
  }

  /**
   * The original inner HTML the component was mounted with.
   *
   * Pandora captures whatever markup lived between the opening and closing
   * tags on first mount, before any render runs. Use this when you want to
   * project user-provided content into your template — it is the string-
   * render equivalent of a light-DOM `<slot>`.
   *
   * @returns The trimmed inner HTML at mount time.
   *
   * @example
   * class MyCard extends Component {
   *   render() {
   *     return `<div class="card">${this.slotContent}</div>`;
   *   }
   * }
   *
   * // <my-card>Hello</my-card> → <div class="card">Hello</div>
   */
  get slotContent(): string {
    return this._children;
  }

  /**
   * Whether the component is currently attached to the DOM.
   *
   * Flips to `true` inside `connectedCallback()` and back to `false` during
   * `disconnectedCallback()`. Useful if you're running async work that
   * should stop once the element is removed.
   *
   * @returns `true` while the element is in the document.
   *
   * @example
   * async loadData() {
   *   const data = await fetch('/api/posts').then(r => r.json());
   *   if (!this.isConnected) return; // bail out if the user navigated away
   *   this.items = data;
   * }
   */
  get isConnected(): boolean {
    return this._connected;
  }

  /**
   * Whether the first mount lifecycle (including the initial render) has
   * finished.
   *
   * Prefer `ready()` when you want to run code once the component is ready;
   * this getter is handy when you need a synchronous check — for example
   * inside a parent component that wants to talk to a freshly inserted
   * child.
   *
   * @returns `true` after `didMount()` and the initial render have run.
   *
   * @example
   * if (avatar.isReady) {
   *   avatar.focus();
   * } else {
   *   avatar.ready(() => avatar.focus());
   * }
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * Whether this is the component's first time being mounted.
   *
   * `true` during the initial `connectedCallback()` / `didMount()`, `false`
   * on subsequent reconnects (for example if the element is detached and
   * re-attached, or moved in the DOM). Use it to separate first-time setup
   * from re-connect behavior inside lifecycle hooks.
   *
   * @returns `true` until the first mount completes.
   *
   * @example
   * async didMount() {
   *   if (this.isFirstMount) {
   *     await this.loadInitialData();
   *   }
   * }
   */
  get isFirstMount(): boolean {
    return !this._hasBeenMounted;
  }

  /**
   * Set eagerly at `Registry` module load (not by `_init` like the other
   * hooks) so that `Component.register()` delegates to the registry as soon
   * as the registry module is imported, regardless of init ordering.
   *
   * @internal
   */
  static _registryRegister?: (tag: string, component: typeof Component) => void;

  /**
   * Registers this class as a custom element so the browser will recognise
   * its tag in the DOM.
   *
   * `@Register('my-tag')` is the preferred path — it sets the tag and calls
   * this for you. Call `register()` directly when you're wiring things up
   * without decorators, or when you configured the tag manually through the
   * `tag` setter.
   *
   * @example
   * class MyCounter extends Component {
   *   static tag = 'my-counter';
   *   render() { return `<p>count</p>`; }
   * }
   * MyCounter.register();
   */
  static register(): void {
    if (Component._registryRegister) {
      Component._registryRegister(this.tag, this);
    } else {
      window.customElements.define(this.tag, this);
    }
  }

  /**
   * Whether the component is currently inside a `batch()` call.
   *
   * Mostly useful for code paths that branch on whether an update is part
   * of a larger batched change — for example deciding whether to defer side
   * effects until the batch completes.
   *
   * @returns `true` while a `batch()` callback is running.
   *
   * @example
   * if (!this.isBatching) {
   *   this.logAudit(change);
   * }
   */
  get isBatching(): boolean {
    return this._batching;
  }

  /**
   * Groups several state changes into a single render.
   *
   * Every reactive property assignment you do inside `fn` is collected and
   * replayed after it returns. `@Watch` callbacks and `didChange()` run
   * once each, with the first and last values seen during the batch, and
   * Pandora queues just one render at the end. Net no-ops (setting `A`
   * back to its original value within the same batch) are skipped entirely.
   *
   * @param fn - A synchronous function that performs the property changes.
   *
   * @example
   * class MyCounter extends Component {
   *   @State() count = 0;
   *   @State() label = 'clicks';
   *
   *   reset() {
   *     this.batch(() => {
   *       this.count = 0;
   *       this.label = 'reset';
   *     });
   *     // Only one render runs for both changes.
   *   }
   * }
   */
  batch(fn: () => void): void {
    this._batching = true;
    this._batchedChanges = [];

    try {
      fn();
    } finally {
      this._batching = false;
      const changes = this._batchedChanges;
      this._batchedChanges = [];

      if (changes.length > 0) {
        let hasRenderableChange = false;
        for (const { property, oldValue, newValue, shouldRender, source } of changes) {
          // Drop net no-ops (A → B → A within the same batch) so watchers
          // and didChange never observe a change that ultimately didn't happen.
          if (oldValue === newValue) continue;

          if (shouldRender) hasRenderableChange = true;

          if (typeof Symbol.metadata !== 'undefined') {
            const meta = ((this.constructor as any)[Symbol.metadata]) as Record<symbol, unknown> | undefined;
            const entries = meta?.[WATCH_HANDLERS] as Array<{ property: string; methodName: string }> | undefined;
            if (entries) {
              for (const entry of entries) {
                if (entry.property === property) {
                  const method = (this as any)[entry.methodName];
                  if (typeof method === 'function') {
                    method.call(this, newValue, oldValue);
                  }
                }
              }
            }
          }

          this.didChange(property, oldValue, newValue, source);
        }

        // Only queue a render if at least one flushed change was actually
        // render-eligible — `@State({ render: false })` fields skip it.
        if (hasRenderableChange && this._connected) {
          this._queueRender();
        }
      }
    }
  }

  /*
   * =========================
   * Rendering
   * =========================
   */

  /**
   * Schedules a render on the microtask queue. Multiple calls in the same
   * tick coalesce into one render, and errors inside the render surface
   * through the registry error handler (or console as a fallback).
   *
   * @internal
   */
  protected _queueRender(): void {
    if (this._renderQueued || !this._connected) return;
    this._renderQueued = true;
    queueMicrotask(() => {
      this._renderQueued = false;
      if (this._connected) {
        this._render().catch((error: Error) => {
          const tag = (this.constructor as typeof Component).tag;
          if (Component._onError) {
            Component._onError(error, this, tag, 'render');
          } else {
            const locator = this.id ? `#${this.id}` : this.className ? `.${this.className.split(/\s+/).join('.')}` : '';
            console.error(`[Pandora] Unhandled render error in <${tag}${locator}>:`, error, this);
          }
        });
      }
    });
  }

  /**
   * Renders the component immediately, skipping microtask batching.
   *
   * Normally you don't need this — property changes schedule a render on
   * the microtask queue automatically. Reach for `forceRender()` when you
   * need the DOM to reflect the latest state right now, for example before
   * measuring an element or taking a screenshot in a test.
   *
   * @returns A promise that resolves once the render (including async
   * `render()` returns and `didRender()`) has completed.
   *
   * @example
   * this.count = 42;
   * await this.forceRender();
   * // the counter has the new value painted at this point
   */
  forceRender(): Promise<void> {
    return this._render();
  }

  /**
   * Produces the markup for this component.
   *
   * Override this in your subclass. You can return a lit-html `TemplateResult`
   * (from the `html` tagged template), a plain HTML string, `lit-html`'s
   * `nothing` sentinel to render no content, or an empty string `''` to clear
   * the host. Returning nothing (the default) leaves any HTML-defined
   * children untouched, which is what container components rely on.
   *
   * Pandora calls this for you on mount and whenever a reactive property
   * changes — you rarely invoke it yourself. The return may be synchronous
   * or a promise.
   *
   * @returns The markup to render, or `void` to preserve existing content.
   *
   * @example
   * import { html } from '@aegis-framework/pandora';
   *
   * class MyGreeting extends Component {
   *   @State() name = 'friend';
   *
   *   render() {
   *     return html`<p>Hello, ${this.name}.</p>`;
   *   }
   * }
   */
  render(): TemplateValue | Promise<TemplateValue> {
    // Default behavior is a no-op: container components that don't override
    // render() keep their HTML-defined children intact. Returning '' is the
    // explicit way to clear the host.
  }

  /**
   * Applies a lit-html template result to the host. We clear and stamp the
   * `data-lit-rendered` marker on first use so pre-existing children don't
   * interfere with lit's reconciliation, then delegate to `litRender`.
   *
   * @internal
   */
  protected _applyLitRender(result: TemplateResult | typeof nothing): void {
    if (!this.hasAttribute('data-lit-rendered')) {
      this.innerHTML = '';
      this.setAttribute('data-lit-rendered', '');
    }
    litRender(result, this, { host: this });
  }

  /**
   * Applies a string render result. Honours `<slot>` as the injection point
   * when one is present, otherwise sets `innerHTML` directly and re-appends
   * the captured `slotContent` if the new markup didn't already include it.
   *
   * @internal
   */
  protected _applyStringRender(html: string): void {
    // An empty string is an explicit "clear content" request.
    if (html === '') {
      this.innerHTML = '';
      return;
    }

    const slot = this.querySelector('slot');
    if (slot !== null) {
      const template = document.createElement('template');
      template.innerHTML = html;
      slot.replaceWith(template.content);
    } else {
      this.innerHTML = html;
      if (this._children !== '' && html.indexOf(this._children) === -1) {
        this.innerHTML += this._children;
      }
    }
  }

  /**
   * Runs a single render cycle: resolves the template, applies middleware,
   * writes to the DOM, and re-attaches `@Listen` handlers. Bumps `_renderId`
   * up front so any concurrent render that awaited through ours detects it
   * has been superseded and bails before touching the DOM.
   *
   * @internal
   */
  protected async _render(): Promise<void> {
    type RenderResult = TemplateValue;

    const renderId = ++this._renderId;
    const ctor = this.constructor as typeof Component;

    let renderFn: () => RenderResult | Promise<RenderResult> = this.render;

    if (ctor._template !== undefined) {
      renderFn = () => {
        if (typeof ctor._template === 'function') {
          return ctor._template.call(this, this);
        }
        return ctor._template as string;
      };
    }

    let result = await callAsync(renderFn, this);

    // A newer render started while we were awaiting; let it win.
    if (renderId !== this._renderId) return;

    // void / null means "don't touch the DOM" (container components rely on
    // this to preserve their HTML-defined children), but we still re-bind
    // @Listen handlers and run didRender so consumers see consistent hooks.
    if (result === undefined || result === null) {
      this._detachListeners();
      this._attachListeners();
      await callAsync(this.didRender, this);
      return;
    }

    const renderType: 'string' | 'lit' = isTemplateResult(result) || result === nothing ? 'lit' : 'string';

    if (Component._hasMiddleware?.('render') && Component._applyMiddleware) {
      result = Component._applyMiddleware('render', this, result, renderType) as RenderResult;
    }

    if (isTemplateResult(result) || result === nothing) {
      this._applyLitRender(result as TemplateResult | typeof nothing);
    } else {
      this._applyStringRender((result as string).trim());
    }

    // Rebind @Listen handlers on every render: selector-targeted listeners
    // may have pointed at nodes that this render replaced, so stale bindings
    // need to be swapped out for fresh ones.
    this._detachListeners();
    this._attachListeners();

    await callAsync(this.didRender, this);
  }

  /*
   * =========================
   * Styles
   * =========================
   */

  /**
   * Applies styles to the component via an adopted stylesheet.
   *
   * Pass a `Style` object to describe your rules declaratively, or a raw
   * CSS string if you already have text. By default the styles are merged
   * with anything previously applied to the component; pass `reset: true`
   * to replace the stylesheet instead. The stylesheet is shared across
   * every instance of the tag, so setting it once styles them all.
   *
   * @param style - A `Style` object or a CSS string.
   * @param reset - When `true`, replace the existing styles instead of
   * merging on top.
   * @returns The current object-form style after the update (useful when
   * you want to read back the merged state).
   *
   * @example
   * class ThemeToggle extends Component {
   *   async didMount() {
   *     this.setStyle({
   *       ':host': { display: 'inline-block', cursor: 'pointer' },
   *       'button': { padding: '0.5rem 1rem' }
   *     });
   *   }
   * }
   *
   * // Or with a raw CSS string:
   * this.setStyle(':host { color: rebeccapurple; }');
   */
  setStyle(style: Style | string, reset: boolean = false): Style {
    const staticComponent = this.constructor as typeof Component;

    if (!staticComponent._styleSheet) {
      staticComponent._styleSheet = new CSSStyleSheet();
    }

    let cssText = '';

    if (typeof style === 'object') {
      if (!reset) {
        this._style = { ...this._style, ...style };
      } else {
        this._style = { ...style };
      }
      cssText = deserializeCSS(this._style, staticComponent.tag);
    } else if (typeof style === 'string') {
      if (!reset) {
        const existingRules = Array.from(staticComponent._styleSheet.cssRules || [])
          .map(rule => rule.cssText)
          .join('\n');
        cssText = existingRules + '\n' + style;
      } else {
        cssText = style;
      }
    }

    staticComponent._styleSheet.replaceSync(cssText);

    if (!document.adoptedStyleSheets.includes(staticComponent._styleSheet)) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, staticComponent._styleSheet];
    }

    return this._style;
  }

  /*
   * =========================
   * Event Helpers
   * =========================
   */

  /**
   * Attaches an event listener to the component.
   *
   * A thin, chainable wrapper around `addEventListener` scoped to the host
   * element. Prefer the `@Listen` decorator for anything that should live
   * for the lifetime of the component — `on()` is handy for one-offs and
   * for ad-hoc wiring from outside the class.
   *
   * @param event - The event name to listen for.
   * @param callback - The handler to run when the event fires.
   * @param options - Standard `addEventListener` options.
   * @returns The component, for chaining.
   *
   * @example
   * const button = document.querySelector('my-button');
   * button.on('click', () => console.log('clicked'));
   */
  on<K extends keyof HTMLElementEventMap>(
    event: K,
    callback: (this: this, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): this;
  on(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): this;
  on(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): this {
    this.addEventListener(event, callback, options);
    return this;
  }

  /**
   * Removes a previously attached event listener from the component.
   *
   * Pass the same event name, callback reference, and options you used in
   * `on()` / `once()` — the underlying `removeEventListener` only matches
   * exact triples.
   *
   * @param event - The event name.
   * @param callback - The handler reference to remove.
   * @param options - The options the listener was registered with.
   * @returns The component, for chaining.
   *
   * @example
   * const onClick = () => console.log('clicked');
   * button.on('click', onClick);
   * // later...
   * button.off('click', onClick);
   */
  off<K extends keyof HTMLElementEventMap>(
    event: K,
    callback: (this: this, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): this;
  off(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): this;
  off(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): this {
    this.removeEventListener(event, callback, options);
    return this;
  }

  /**
   * Attaches a one-shot event listener to the component.
   *
   * Like `on()`, but the listener is automatically removed after it fires
   * once. Useful for reacting to things like the first click or the next
   * transition end.
   *
   * @param event - The event name to listen for.
   * @param callback - The handler to run the first time the event fires.
   * @param options - Standard `addEventListener` options; `once` is forced
   * to `true`.
   * @returns The component, for chaining.
   *
   * @example
   * modal.once('animationend', () => modal.remove());
   */
  once<K extends keyof HTMLElementEventMap>(
    event: K,
    callback: (this: this, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): this;
  once(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): this;
  once(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): this {
    const opts = typeof options === 'boolean' ? { capture: options, once: true } : { ...options, once: true };
    this.addEventListener(event, callback, opts);
    return this;
  }

  /**
   * Dispatches a `CustomEvent` from the component.
   *
   * By default the event bubbles up through the DOM, is composed (so it
   * crosses shadow-root boundaries), and is cancellable. Pass any of those
   * as `options` to override them. Anything you put in `detail` is
   * delivered to listeners as `event.detail`.
   *
   * @param event - The event name.
   * @param detail - The payload to attach to `event.detail`.
   * @param options - Overrides for `bubbles`, `cancelable`, `composed`, etc.
   * @returns `false` if a listener called `preventDefault()`, otherwise
   * `true`.
   *
   * @example
   * class MyButton extends Component {
   *   @Listen('click')
   *   onClick() {
   *     this.emit('button-pressed', { id: this.id, at: Date.now() });
   *   }
   * }
   *
   * // parent listens:
   * myButton.on('button-pressed', (e) => console.log(e.detail.id));
   */
  emit<T = unknown>(event: string, detail?: T, options?: Omit<CustomEventInit<T>, 'detail'>): boolean {
    const customEvent = new CustomEvent(event, {
      detail,
      bubbles: true,
      cancelable: true,
      composed: true,
      ...options
    });
    return this.dispatchEvent(customEvent);
  }

  /*
   * =========================
   * Query Helpers
   * =========================
   */

  /**
   * Finds the first descendant matching the given CSS selector.
   *
   * A shortcut for `querySelector` scoped to the component's own subtree.
   * Handy inside `didMount()` or `didRender()` when you need to grab a
   * rendered element. Subclasses like `ShadowComponent` scope the search
   * to the shadow root instead.
   *
   * @param selector - Any valid CSS selector.
   * @returns The first matching element, or `null` if nothing matched.
   *
   * @example
   * async didMount() {
   *   this.query('input')?.focus();
   * }
   */
  query<E extends Element = Element>(selector: string): E | null {
    return this.querySelector<E>(selector);
  }

  /**
   * Finds every descendant matching the given CSS selector.
   *
   * A shortcut for `querySelectorAll` scoped to the component's own
   * subtree. Subclasses like `ShadowComponent` scope the search to the
   * shadow root instead.
   *
   * @param selector - Any valid CSS selector.
   * @returns A `NodeList` of matching elements (possibly empty).
   *
   * @example
   * for (const item of this.queryAll('li.item')) {
   *   item.classList.add('ready');
   * }
   */
  queryAll<E extends Element = Element>(selector: string): NodeListOf<E> {
    return this.querySelectorAll<E>(selector);
  }

  /*
   * =========================
   * Ready Callback
   * =========================
   */

  /**
   * Queue of callbacks registered through `ready()` before the component
   * finished its first mount. Drained in order once `_isReady` flips to
   * `true`, then discarded.
   *
   * @internal
   */
  private _readyCallbacks?: Array<() => void>;

  /**
   * Queues a callback to run once the component has finished its first
   * mount and initial render.
   *
   * If the component is already ready, the callback runs on the next
   * microtask. If not, it's queued and fired in order after `didMount()`
   * and the first render. Typical use is deferring DOM work that depends on
   * the rendered markup — focusing an input, measuring size, wiring up a
   * library.
   *
   * @param callback - The function to run when the component is ready.
   *
   * @example
   * class UserAvatar extends Component {
   *   render() {
   *     return html`<input name="handle" />`;
   *   }
   *
   *   constructor() {
   *     super();
   *     this.ready(() => this.query('input')?.focus());
   *   }
   * }
   */
  ready(callback: () => void): void {
    if (this._isReady) {
      queueMicrotask(callback);
    } else {
      this._readyCallbacks ??= [];
      this._readyCallbacks.push(callback);
    }
  }

  /*
   * =========================
   * Lifecycle
   * =========================
   */

  /**
   * Runs just before the component's first render.
   *
   * Override this to do async setup that should finish before users see
   * anything — fetch data, load a dependency, subscribe to a store. The
   * render is awaited on your returned promise, so returning a pending
   * fetch will delay the first paint.
   *
   * @example
   * async willMount() {
   *   this.data = await fetch('/api/profile').then(r => r.json());
   * }
   */
  public async willMount(): Promise<void> {}

  /**
   * Runs after the component's first mount completes.
   *
   * By this point the initial render has happened, `isReady` is `true`,
   * and the component is in the DOM. Use it for post-render setup that
   * needs to inspect the rendered markup, or for things you only want to
   * do on the very first connection (use `isFirstMount` if you override
   * `didReconnect` too).
   *
   * @example
   * async didMount() {
   *   this.query('input')?.focus();
   * }
   */
  public async didMount(): Promise<void> {}

  /**
   * Runs after every render cycle.
   *
   * Fires on the initial mount render, on re-renders triggered by
   * reactive state changes, and on every `forceRender()` call. Use it
   * to grab references to freshly rendered elements or to re-apply
   * imperative setup — `didMount()` only runs once, while this runs
   * each time the DOM content is replaced.
   *
   * @example
   * async didRender() {
   *   this._chart?.destroy();
   *   this._chart = createChart(this.query('canvas'));
   * }
   */
  public async didRender(): Promise<void> {}

  /**
   * Runs when the component is re-attached to the DOM after being
   * disconnected.
   *
   * This is the counterpart to `didMount()` for the second and later
   * connection. Use it to re-subscribe to streams or re-start timers
   * that you shut down in `willUnmount()` / `didUnmount()`.
   *
   * @example
   * async didReconnect() {
   *   this._timer = setInterval(() => this.tick(), 1000);
   * }
   */
  public async didReconnect(): Promise<void> {}

  /**
   * Runs just before the component is removed from the DOM.
   *
   * Override to tear down anything that can't wait: cancel pending
   * fetches, clear timers, close sockets. The returned promise is
   * awaited before `didUnmount()` runs.
   *
   * @example
   * async willUnmount() {
   *   this._abort.abort();
   * }
   */
  public async willUnmount(): Promise<void> {}

  /**
   * Runs after the component has been removed from the DOM.
   *
   * By this point the element is no longer in the document. Use it for
   * final cleanup — releasing references, logging, telemetry.
   *
   * @example
   * async didUnmount() {
   *   analytics.track('card-removed', { id: this.id });
   * }
   */
  public async didUnmount(): Promise<void> {}

  /**
   * Runs every time one of the component's reactive fields changes.
   *
   * Override this for a single place to observe state changes across all
   * `@State`, `@Attribute`, `@Property`, and `@Subscribe` fields. It fires
   * synchronously in the setter, after any matching `@Watch` callbacks and
   * before the queued render. Great for logging, audit trails, analytics,
   * or cross-cutting validation.
   *
   * @param property - The name of the field that changed.
   * @param oldValue - The previous value.
   * @param newValue - The new value.
   * @param source - A short label describing where the change came from,
   * such as `'state'`, `'prop'`, `'prop-attribute'`, `'property'`,
   * `'consumer'`, or `'reactive'`.
   *
   * @example
   * class MyCounter extends Component {
   *   @State() count = 0;
   *
   *   didChange(property, oldValue, newValue, source) {
   *     console.log(`[${source}] ${property}: ${oldValue} -> ${newValue}`);
   *   }
   * }
   */
  public didChange(_property: string, _oldValue: unknown, _newValue: unknown, _source?: string): void {}

  /**
   * The standard custom-elements hook Pandora uses to drive mounting.
   *
   * Pandora runs `@Subscribe` activation, picks up `@Style` metadata, calls
   * `willMount()`, performs the first render, then calls either
   * `didMount()` (on the first connection) or `didReconnect()` (on a later
   * one), and finally fires any pending `ready()` callbacks. Subclasses
   * normally reach for `willMount()`, `didMount()`, or `ready()` instead of
   * overriding this. If you do override it, call `super.connectedCallback()`
   * so the lifecycle keeps working.
   *
   * @example
   * async connectedCallback() {
   *   await super.connectedCallback();
   *   // extra work that needs to run after the standard mount
   * }
   */
  async connectedCallback(): Promise<void> {
    const ctor = this.constructor as typeof Component;
    const tag = ctor.tag;

    try {
      this._connected = true;
      this.dataset.component = tag;

      // If `Registry.evolve()` swapped the implementation for this tag after
      // `customElements.define()` ran, reapply it to this instance before any
      // lifecycle code runs — that way evolved behavior lands on fresh
      // instances without requiring re-creation.
      Component._applyCurrentImplementation?.(this, tag);

      // Activate `@Subscribe` handlers from class metadata. This has to live
      // on the prototype method (here), not a shadow on the instance, because
      // the browser only calls prototype-defined custom element lifecycle
      // callbacks.
      if (typeof Symbol.metadata !== 'undefined') {
        const meta = (this.constructor as unknown as Record<symbol, unknown>)[Symbol.metadata] as Record<symbol, unknown> | undefined;
        const handlers = meta?.[SUBSCRIBE_HANDLERS] as SubscribeHandler[] | undefined;
        if (handlers) {
          for (const handler of handlers) {
            Component._activateSubscription(this, handler);
          }
        }
      }

      const firstMount = !this._hasBeenMounted;

      if (firstMount) {
        this._children = this.innerHTML.trim();
      }

      // Pick up an HTML `<template id="...">` matching our tag on first mount
      // so consumers can author templates declaratively without touching JS.
      if (firstMount && ctor._template === undefined) {
        const tpl = document.querySelector(`template#${tag}`);
        if (tpl) {
          ctor._template = tpl.innerHTML;
        }
      }

      // Apply `@Style` metadata once, on the first mount of any instance of
      // this tag — the stylesheet is shared across instances so later mounts
      // don't need to reapply it.
      if (firstMount && typeof Symbol.metadata !== 'undefined') {
        const meta = (ctor as any)[Symbol.metadata];
        const styleData = meta?.[STYLE_METADATA];
        if (styleData) {
          this.setStyle(styleData as Style | string, true);
        }
      }

      await this.willMount();
      await this._render();

      // Flip the init-render gate now that the first render has landed. From
      // here on, reactive writes in `didMount` / `didReconnect` and beyond
      // are allowed to queue renders; field-initializer writes that ran
      // during construction already happened before this point and so don't.
      this._initRenderDone = true;

      if (firstMount) {
        await this.didMount();
      } else {
        // On reconnect we deliberately call `didReconnect` instead of
        // `didMount` so consumers can separate first-time setup from
        // re-attachment behavior.
        await this.didReconnect();
      }

      // We set `_hasBeenMounted` after `didMount` finishes so that
      // `isFirstMount` remains `true` for the entire duration of that hook.
      this._hasBeenMounted = true;

      this._isReady = true;

      if (this._readyCallbacks) {
        for (const callback of this._readyCallbacks) {
          callback();
        }
        this._readyCallbacks = undefined;
      }

      Component._onMount?.(this, tag);

      this.emit('pandora:ready', { firstMount, tag }, { bubbles: true, composed: true });
    } catch (error) {
      if (Component._onError) {
        Component._onError(error as Error, this, tag, 'connectedCallback');
      } else {
        throw error;
      }
    }
  }

  /**
   * The standard custom-elements hook Pandora uses to drive unmounting.
   *
   * Pandora tears down `@Subscribe` subscriptions and `@Listen` handlers,
   * then calls `willUnmount()` and `didUnmount()` before flipping the
   * component's ready and connected flags back to `false`. Override the
   * lifecycle methods in preference to this hook; if you do override,
   * remember to call `super.disconnectedCallback()`.
   *
   * @example
   * async disconnectedCallback() {
   *   await super.disconnectedCallback();
   *   this.releaseExternalResource();
   * }
   */
  async disconnectedCallback(): Promise<void> {
    const ctor = this.constructor as typeof Component;
    const tag = ctor.tag;

    try {
      // Fire the lifecycle event before tearing anything down so listeners
      // can still read component state from the handler.
      this.emit('pandora:unmount', { tag }, { bubbles: true, composed: true });

      // Release `@Subscribe` subscriptions so the removed instance stops
      // receiving global-state updates and can be garbage-collected.
      if (typeof Symbol.metadata !== 'undefined') {
        const meta = (ctor as unknown as Record<symbol, unknown>)[Symbol.metadata] as Record<symbol, unknown> | undefined;
        const handlers = meta?.[SUBSCRIBE_HANDLERS] as SubscribeHandler[] | undefined;
        if (handlers) {
          const inst = this as unknown as Record<symbol, unknown>;
          for (const handler of handlers) {
            if (inst[handler.unsubKey]) {
              (inst[handler.unsubKey] as () => void)();
              inst[handler.unsubKey] = undefined;
            }
          }
        }
      }

      this._detachListeners();

      await this.willUnmount();
      await this.didUnmount();

      this._connected = false;
      this._isReady = false;

      Component._onUnmount?.(this, tag);
    } catch (error) {
      if (Component._onError) {
        Component._onError(error as Error, this, tag, 'disconnectedCallback');
      } else {
        throw error;
      }
    }
  }

  /**
   * The standard custom-elements hook that tracks attribute changes.
   *
   * Pandora routes attribute updates into the fields you declared with
   * `@Attribute` / `@Property({ attribute })`, parses values for you (so
   * `"42"` arrives as a number, `"true"` as a boolean), fires `@Watch`
   * callbacks and `didChange()`, and schedules a render. Prefer those
   * decorators over overriding this hook — but if you must, call
   * `super.attributeChangedCallback(...)` first so the reactive plumbing
   * still runs.
   *
   * The browser only calls this hook for attributes named in
   * `observedAttributes`. Fields declared with `@Attribute` or
   * `@Property({ attribute: true })` register themselves in that list
   * automatically.
   *
   * @param property - The attribute name that changed.
   * @param oldValue - The previous attribute value, or `null` if unset.
   * @param newValue - The new attribute value, or `null` if removed.
   *
   * @example
   * class MyButton extends Component {
   *   @Attribute() disabled = false;
   *   // Pandora keeps `disabled` in sync with the DOM attribute for you.
   * }
   */
  attributeChangedCallback(property: string, _oldValue: string | null, newValue: string | null): void {
    // Dispatch to `@Attribute` / `@Property({ attribute })` handlers from
    // class metadata. Like `connectedCallback`, this has to sit on the
    // prototype because the browser only consults prototype methods at
    // `define()` time — instance-level shadows would be silently ignored on
    // real `setAttribute()` calls.
    if (typeof Symbol.metadata === 'undefined') return;
    const ctor = this.constructor as typeof Component;
    const meta = (ctor as unknown as Record<symbol, unknown>)[Symbol.metadata] as Record<symbol, unknown> | undefined;
    const handlers = meta?.[ATTR_HANDLERS] as AttrHandler[] | undefined;
    if (!handlers) return;

    const inst = this as unknown as Record<symbol, unknown>;
    for (const handler of handlers) {
      if (handler.attrName !== property) continue;
      // Break the feedback loop: when our own setter reflects a value back
      // to the DOM attribute, the browser calls us here — the `settingKey`
      // flag lets us tell those re-entrant writes apart from user-driven
      // attribute changes and skip them.
      if (inst[handler.settingKey]) continue;

      const parsedNew = newValue !== null ? parseAttributeValue(newValue) : undefined;
      const oldVal = inst[handler.valueKey];
      if (handler.equals(oldVal, parsedNew)) continue;

      inst[handler.valueKey] = parsedNew;

      const watchMeta = meta?.[WATCH_HANDLERS] as Array<{ property: string; methodName: string }> | undefined;
      if (watchMeta) {
        for (const entry of watchMeta) {
          if (entry.property === handler.propertyKey) {
            const method = (this as unknown as Record<string, unknown>)[entry.methodName];
            if (typeof method === 'function') {
              (method as (n: unknown, o: unknown) => void).call(this, parsedNew, oldVal);
            }
          }
        }
      }

      this.didChange(handler.propertyKey, oldVal, parsedNew, 'prop-attribute');

      if (handler.shouldRender && this._initRenderDone && this._connected) {
        this._queueRender();
      }
    }
  }

  /*
   * =========================
   * @Listen Support
   * =========================
   */

  /**
   * The set of `@Listen` bindings currently wired up on this instance.
   * We track them explicitly so `_detachListeners` can remove the exact
   * `(target, event, handler, options)` triples we registered — this matters
   * on disconnect and between renders, when listener targets may have been
   * replaced.
   *
   * @internal
   */
  private _activeListeners: Array<{ target: EventTarget; event: string; handler: EventListener; options?: boolean | AddEventListenerOptions }> = [];

  /**
   * Walks `@Listen` metadata and wires up the described listeners against
   * their resolved targets. We resolve selectors at attach time (not at
   * decoration time) because the target nodes may only exist after a render
   * has populated the component's subtree.
   *
   * @internal
   */
  protected _attachListeners(): void {
    if (typeof Symbol.metadata === 'undefined') return;

    const meta = ((this.constructor as any)[Symbol.metadata]) as Record<symbol, unknown> | undefined;
    const listeners = meta?.[LISTEN_HANDLERS] as Array<{
      event: string;
      methodName: string;
      options?: {
        target?: string;
        delegate?: string;
        capture?: boolean;
        passive?: boolean;
        once?: boolean;
      };
    }> | undefined;

    if (!listeners) return;

    for (const listener of listeners) {
      const method = (this as any)[listener.methodName];
      if (typeof method !== 'function') continue;

      const boundHandler = method.bind(this) as EventListener;
      const opts = listener.options;
      const resolvedTarget = resolveListenerTarget(this, opts?.target, (s) => this.query(s));
      if (!resolvedTarget) continue;

      const eventOpts: AddEventListenerOptions = {};
      if (opts?.capture) eventOpts.capture = true;
      if (opts?.passive) eventOpts.passive = true;

      // For delegated listeners we implement `once` ourselves: the native
      // `once` option would fire on the first event to bubble through,
      // regardless of whether it matched the delegate selector. We want
      // "once it actually matches," so we remove the listener by hand after
      // the first matching dispatch.
      let handler: EventListener;
      if (opts?.delegate) {
        const delegateSelector = opts.delegate;
        const shouldOnce = opts?.once;
        handler = ((event: Event) => {
          const match = (event.target as Element)?.closest(delegateSelector);
          if (match) {
            boundHandler(event);
            if (shouldOnce) {
              resolvedTarget.removeEventListener(listener.event, handler, eventOpts);
              this._activeListeners = this._activeListeners.filter(l => l.handler !== handler);
            }
          }
        }) as EventListener;
      } else {
        handler = boundHandler;
        if (opts?.once) eventOpts.once = true;
      }

      resolvedTarget.addEventListener(listener.event, handler, eventOpts);
      this._activeListeners.push({ target: resolvedTarget, event: listener.event, handler, options: eventOpts });
    }
  }

  /**
   * Removes every listener currently recorded in `_activeListeners` and
   * clears the tracking array. Called on disconnect and between renders so
   * stale bindings never outlive the nodes they pointed at.
   *
   * @internal
   */
  protected _detachListeners(): void {
    for (const { target, event, handler, options } of this._activeListeners) {
      target.removeEventListener(event, handler, options);
    }
    this._activeListeners = [];
  }
}

export default Component;

// Core components
export { default as Component } from './Component';
export { default as ShadowComponent } from './ShadowComponent';
export { default as Registry } from './Registry';

// Decorators
export { Register, Subscribe, Attribute, Property, State, Computed, Watch, Query, QueryAll, Slot, Listen, Emitter, Style, ClassList } from './Decorators';

// Reactive primitives (for custom decorator authors)
export { reactive, addDecoratorEffect, addTeardown } from './Util';

// Typed global state
export { createState, type TypedState } from './TypedState';

// Testing utilities
export * as testing from './Testing';

// Re-exports from lit-html
export {
  html,
  svg,
  nothing,
  noChange,
  render,
  type TemplateResult,
  type SVGTemplateResult,
  type RenderOptions
} from 'lit-html';

// Types
export * as Util from './Util';
export * as Types from './Types';

export type {
  Style as StyleObject, CSSValue, CSSProperties, CSSObject,
  TemplateValue, TemplateFunction,
  ReactiveOptions,
  DecoratorInstance, DecoratorEffect,
} from './Types';

// Core Components
export { default as Component } from './Component';
export { default as ShadowComponent } from './ShadowComponent';
export { default as Registry } from './Registry';

// Decorators
export { Register, Consumer, Prop } from './Decorators';

// Re-export lit-html
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

// Utilities & Types
export * as Util from './Util';
export * as Types from './Types';

export type { Properties, Style, ReadyCallback, CSSValue, CSSProperties, CSSObject } from './Types';

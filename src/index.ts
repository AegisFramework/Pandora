import Component from './Component';
import ShadowComponent from './ShadowComponent';
import Registry from './Registry';
import {
  Register,
  Subscribe,
  Attribute,
  Property,
  State,
  Computed,
  Watch,
  Query,
  QueryAll,
  Slot,
  Listen,
  Emitter,
  Style,
  ClassList,
} from './Decorators';
import { reactive, addDecoratorEffect, addTeardown } from './Util';
import { createState } from './TypedState';
import * as testing from './Testing';
import * as Util from './Util';
import * as Types from './Types';
import { html, svg, nothing, noChange, render } from 'lit-html';

// Core components
export { Component, ShadowComponent, Registry };

// Decorators
export { Register, Subscribe, Attribute, Property, State, Computed, Watch, Query, QueryAll, Slot, Listen, Emitter, Style, ClassList };

// Reactive primitives (for custom decorator authors)
export { reactive, addDecoratorEffect, addTeardown };

// Typed global state
export { createState };
export type { TypedState } from './TypedState';

// Testing utilities
export { testing };

// Re-exports from lit-html
export { html, svg, nothing, noChange, render };
export type { TemplateResult, SVGTemplateResult, RenderOptions } from 'lit-html';

// Types
export { Util, Types };

export type {
  Style as StyleObject, CSSValue, CSSProperties, CSSObject,
  TemplateValue, TemplateFunction,
  ReactiveOptions,
  DecoratorInstance, DecoratorEffect,
} from './Types';

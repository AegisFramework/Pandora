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
import { directive, Directive, PartType } from 'lit-html/directive.js';
import { AsyncDirective } from 'lit-html/async-directive.js';
import {
  isPrimitive, isTemplateResult, isCompiledTemplateResult, isDirectiveResult,
  getDirectiveClass, isSingleExpression, insertPart, setChildPartValue,
  setCommittedValue, getCommittedValue, removePart, clearPart,
  TemplateResultType,
} from 'lit-html/directive-helpers.js';
import { asyncAppend } from 'lit-html/directives/async-append.js';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { cache } from 'lit-html/directives/cache.js';
import { choose } from 'lit-html/directives/choose.js';
import { classMap } from 'lit-html/directives/class-map.js';
import { guard } from 'lit-html/directives/guard.js';
import { ifDefined } from 'lit-html/directives/if-defined.js';
import { join } from 'lit-html/directives/join.js';
import { keyed } from 'lit-html/directives/keyed.js';
import { live } from 'lit-html/directives/live.js';
import { map } from 'lit-html/directives/map.js';
import { range } from 'lit-html/directives/range.js';
import { ref, createRef } from 'lit-html/directives/ref.js';
import { repeat } from 'lit-html/directives/repeat.js';
import { styleMap } from 'lit-html/directives/style-map.js';
import { templateContent } from 'lit-html/directives/template-content.js';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { unsafeSVG } from 'lit-html/directives/unsafe-svg.js';
import { unsafeMathML } from 'lit-html/directives/unsafe-mathml.js';
import { until } from 'lit-html/directives/until.js';
import { when } from 'lit-html/directives/when.js';

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

// Re-exports from lit-html.
// Every runtime value that interacts with the bundled renderer MUST be
// re-exported here. Importing any of these directly from `lit-html/...` in
// consumer code yields a value built against the consumer's own copy of
// lit-html — a different class identity than Pandora's bundled renderer —
// and fails at runtime with errors like `_$initialize is not a function`.
export { html, svg, nothing, noChange, render };
export {
  asyncAppend, asyncReplace, cache, choose, classMap, guard, ifDefined, join,
  keyed, live, map, range, ref, createRef, repeat, styleMap, templateContent,
  unsafeHTML, unsafeSVG, unsafeMathML, until, when,
};
export { directive, Directive, AsyncDirective, PartType };
export {
  isPrimitive, isTemplateResult, isCompiledTemplateResult, isDirectiveResult,
  getDirectiveClass, isSingleExpression, insertPart, setChildPartValue,
  setCommittedValue, getCommittedValue, removePart, clearPart,
  TemplateResultType,
};
export type { TemplateResult, SVGTemplateResult, RenderOptions } from 'lit-html';
export type {
  DirectiveClass, DirectiveResult, DirectiveParameters,
  PartInfo, ChildPartInfo, AttributePartInfo, ElementPartInfo,
  Part, ChildPart, AttributePart, BooleanAttributePart,
  ElementPart, EventPart, PropertyPart,
} from 'lit-html/directive.js';

// Types
export { Util, Types };

export type {
  Style as StyleObject, CSSValue, CSSProperties, CSSObject,
  TemplateValue, TemplateFunction,
  ReactiveOptions,
  DecoratorInstance, DecoratorEffect,
} from './Types';

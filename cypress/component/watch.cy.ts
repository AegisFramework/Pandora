/**
 * Tests for @Watch — the decorator that invokes a method whenever a
 * reactive field changes, receiving the new and previous values. Covers
 * @State-driven changes, multiple handlers on the same field, stacking
 * @Watch on one method to observe several fields, and reacting to DOM
 * attribute changes that flow through @Attribute.
 */
import { Component, Register, State, Attribute, Watch, html } from '../../src/index';
import { uniqueTag } from '../support/component';

describe('@Watch decorator', () => {
  it('passes the new and old values to the handler on assignment', () => {
    const tag = uniqueTag('watch');
    const log: Array<{ newVal: unknown; oldVal: unknown }> = [];

    @Register(tag)
    class TestComp extends Component {
      @State() count = 0;

      @Watch('count')
      onCountChange(newVal: unknown, oldVal: unknown) {
        log.push({ newVal, oldVal });
      }

      render() {
        return html`<span class="count">${this.count}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      ($el[0] as any).count = 10;
    });
    cy.wait(10).then(() => {
      expect(log).to.deep.equal([{ newVal: 10, oldVal: 0 }]);
    });
  });

  it('invokes every handler declared against the same field', () => {
    const tag = uniqueTag('watch');
    const logA: unknown[] = [];
    const logB: unknown[] = [];

    @Register(tag)
    class TestComp extends Component {
      @State() count = 0;

      @Watch('count')
      onCountA(newVal: unknown) {
        logA.push(newVal);
      }

      @Watch('count')
      onCountB(newVal: unknown) {
        logB.push(newVal);
      }

      render() {
        return html`<span>${this.count}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      ($el[0] as any).count = 7;
    });
    cy.wait(10).then(() => {
      expect(logA).to.deep.equal([7]);
      expect(logB).to.deep.equal([7]);
    });
  });

  it('stacks multiple @Watch decorators on one method to observe several fields', () => {
    const tag = uniqueTag('watch');
    const log: Array<{ newVal: unknown; oldVal: unknown }> = [];

    @Register(tag)
    class TestComp extends Component {
      @State() a = 0;
      @State() b = 0;

      @Watch('a')
      @Watch('b')
      onAnyChange(newVal: unknown, oldVal: unknown) {
        log.push({ newVal, oldVal });
      }

      render() {
        return html`<span>${this.a}-${this.b}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      ($el[0] as any).a = 1;
      ($el[0] as any).b = 2;
    });
    cy.wait(10).then(() => {
      expect(log).to.have.length(2);
      expect(log[0]).to.deep.equal({ newVal: 1, oldVal: 0 });
      expect(log[1]).to.deep.equal({ newVal: 2, oldVal: 0 });
    });
  });

  it('fires when an @Attribute changes via setAttribute from the DOM', () => {
    const tag = uniqueTag('watch');
    const log: Array<{ newVal: unknown; oldVal: unknown }> = [];

    @Register(tag)
    class TestComp extends Component {
      @Attribute() label = 'init';

      @Watch('label')
      onLabelChange(newVal: unknown, oldVal: unknown) {
        log.push({ newVal, oldVal });
      }

      render() {
        return html`<span class="label">${this.label}</span>`;
      }
    }

    cy.mount(tag);
    // setAttribute triggers attributeChangedCallback on the prototype, which
    // routes through the @Watch handler with the real before/after values.
    cy.get(tag).then(($el) => {
      $el[0].setAttribute('label', 'changed');
    });
    cy.wait(10).then(() => {
      expect(log).to.deep.equal([{ newVal: 'changed', oldVal: 'init' }]);
    });
  });
});

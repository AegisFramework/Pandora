/**
 * Tests for @State — the decorator that declares a reactive field on a
 * Component. Covers default rendering, auto-render on assignment, microtask
 * batching, the `{ render: false }` escape hatch, and @Watch interactions.
 * Each test uses `uniqueTag` to register a fresh custom element and avoid
 * collisions across specs.
 */
import { Component, Register, State, Watch, html } from '../../src/index';
import { uniqueTag } from '../support/component';

describe('@State decorator', () => {
  it('renders the field initializer as the initial value', () => {
    const tag = uniqueTag('state');

    @Register(tag)
    class TestComp extends Component {
      @State() count = 0;
      render() {
        return html`<span class="count">${this.count}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(`${tag} .count`).should('have.text', '0');
  });

  it('re-renders automatically when a reactive field is reassigned', () => {
    const tag = uniqueTag('state');

    @Register(tag)
    class TestComp extends Component {
      @State() count = 0;
      render() {
        return html`<span class="count">${this.count}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      ($el[0] as any).count = 5;
    });
    cy.wait(50);
    cy.get(`${tag} .count`).should('have.text', '5');
  });

  it('coalesces multiple synchronous assignments into a single render', () => {
    const tag = uniqueTag('state');

    @Register(tag)
    class TestComp extends Component {
      @State() a = 0;
      @State() b = 0;
      renderCount = 0;
      render() {
        this.renderCount++;
        return html`<span class="a">${this.a}</span><span class="b">${this.b}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      const comp = $el[0] as any;
      comp.renderCount = 0;
      comp.a = 1;
      comp.b = 2;
    });
    cy.wait(50);
    cy.get(tag).then(($el) => {
      const comp = $el[0] as any;
      expect(comp.renderCount).to.equal(1);
    });
  });

  it('respects { render: false } by updating the field without scheduling a render', () => {
    const tag = uniqueTag('state');

    @Register(tag)
    class TestComp extends Component {
      @State({ render: false }) silent = 0;
      renderCount = 0;
      render() {
        this.renderCount++;
        return html`<span class="silent">${this.silent}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      const comp = $el[0] as any;
      comp.renderCount = 0;
      comp.silent = 42;
    });
    cy.wait(50);
    cy.get(tag).then(($el) => {
      const comp = $el[0] as any;
      expect(comp.renderCount).to.equal(0);
      expect(comp.silent).to.equal(42);
    });
  });

  it('still invokes @Watch handlers even when { render: false } is set', () => {
    const tag = uniqueTag('state');
    const watched: unknown[] = [];

    @Register(tag)
    class TestComp extends Component {
      @State({ render: false }) silent = 0;

      @Watch('silent')
      onSilentChange(newVal: unknown, _oldVal: unknown) {
        watched.push(newVal);
      }

      render() {
        return html`<span>ok</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      ($el[0] as any).silent = 99;
    });
    cy.wait(10).then(() => {
      expect(watched).to.deep.equal([99]);
    });
  });

  it('skips re-rendering when a field is reassigned to its existing value', () => {
    const tag = uniqueTag('state');

    @Register(tag)
    class TestComp extends Component {
      @State() count = 5;
      renderCount = 0;
      render() {
        this.renderCount++;
        return html`<span class="count">${this.count}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      const comp = $el[0] as any;
      comp.renderCount = 0;
      comp.count = 5;
    });
    cy.wait(50);
    cy.get(tag).then(($el) => {
      const comp = $el[0] as any;
      expect(comp.renderCount).to.equal(0);
    });
  });
});

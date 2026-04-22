/**
 * Tests for the `reactive()` primitive — the low-level building block that
 * turns a plain instance field into a tracked property with optional render
 * scheduling, @Watch dispatch, didChange callback, onChange hook, and custom
 * equality for no-op detection.
 */
import { Component, Register, Watch, html, reactive } from '../../src/index';
import { uniqueTag } from '../support/component';

describe('reactive() primitive', () => {
  it('schedules a render when a tracked field changes', () => {
    const tag = uniqueTag('reactive');

    @Register(tag)
    class TestComp extends Component {
      value = '';

      willMount() {
        reactive(this as any, 'value', { initialValue: 'hello' });
      }

      render() {
        return html`<span class="val">${this.value}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(`${tag} .val`).should('have.text', 'hello');

    cy.get(tag).then(($el) => {
      ($el[0] as any).value = 'world';
    });
    cy.wait(50);
    cy.get(`${tag} .val`).should('have.text', 'world');
  });

  it('skips rendering when { render: false } is set, but still updates the value', () => {
    const tag = uniqueTag('reactive');

    @Register(tag)
    class TestComp extends Component {
      value = '';
      renderCount = 0;

      didMount() {
        reactive(this as any, 'value', { initialValue: 'init', render: false });
        this.renderCount = 0; // Zero the counter after the initial mount render.
      }

      render() {
        this.renderCount++;
        return html`<span class="val">${this.value}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      const comp = $el[0] as any;
      comp.renderCount = 0;
      comp.value = 'changed';
    });
    cy.wait(50);
    cy.get(tag).then(($el) => {
      const comp = $el[0] as any;
      expect(comp.renderCount).to.equal(0);
      expect(comp.value).to.equal('changed');
    });
  });

  it('dispatches @Watch callbacks on mutation', () => {
    const tag = uniqueTag('reactive');
    const watched: unknown[] = [];

    @Register(tag)
    class TestComp extends Component {
      value = '';

      @Watch('value')
      onValueChange(newVal: unknown) {
        watched.push(newVal);
      }

      didMount() {
        reactive(this as any, 'value', { initialValue: 'start' });
      }

      render() {
        return html`<span>ok</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      ($el[0] as any).value = 'updated';
    });
    cy.wait(50).then(() => {
      expect(watched).to.deep.equal(['updated']);
    });
  });

  it('invokes didChange on the instance with property, old, and new values', () => {
    const tag = uniqueTag('reactive');
    const changes: Array<{ prop: string; oldVal: unknown; newVal: unknown }> = [];

    @Register(tag)
    class TestComp extends Component {
      value = '';

      didMount() {
        reactive(this as any, 'value', { initialValue: 'a' });
      }

      didChange(property: string, oldValue: unknown, newValue: unknown) {
        changes.push({ prop: property, oldVal: oldValue, newVal: newValue });
      }

      render() {
        return html`<span>ok</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      ($el[0] as any).value = 'b';
    });
    cy.wait(50).then(() => {
      expect(changes).to.have.length(1);
      expect(changes[0]).to.deep.equal({ prop: 'value', oldVal: 'a', newVal: 'b' });
    });
  });

  it('calls the per-field onChange callback with new and old values', () => {
    const tag = uniqueTag('reactive');
    const calls: Array<{ newVal: unknown; oldVal: unknown }> = [];

    @Register(tag)
    class TestComp extends Component {
      value = '';

      didMount() {
        reactive(this as any, 'value', {
          initialValue: 'x',
          onChange: (newVal, oldVal) => {
            calls.push({ newVal, oldVal });
          }
        });
      }

      render() {
        return html`<span>ok</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      ($el[0] as any).value = 'y';
    });
    cy.wait(50).then(() => {
      expect(calls).to.have.length(1);
      expect(calls[0]).to.deep.equal({ newVal: 'y', oldVal: 'x' });
    });
  });

  it('uses a custom equals function to decide whether a write is a no-op', () => {
    const tag = uniqueTag('reactive');

    @Register(tag)
    class TestComp extends Component {
      data: { x: number } = { x: 1 };
      renderCount = 0;

      didMount() {
        reactive(this as any, 'data', {
          initialValue: { x: 1 },
          equals: (a: unknown, b: unknown) => {
            return JSON.stringify(a) === JSON.stringify(b);
          }
        });
        this.renderCount = 0;
      }

      render() {
        this.renderCount++;
        return html`<span>ok</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      const comp = $el[0] as any;
      comp.renderCount = 0;
      // Assigning a fresh object with identical shape — the custom equals
      // treats this as no change, so no render should be scheduled.
      comp.data = { x: 1 };
    });
    cy.wait(50);
    cy.get(tag).then(($el) => {
      expect(($el[0] as any).renderCount).to.equal(0);
    });
  });
});

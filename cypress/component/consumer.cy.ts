/**
 * Covers the @Subscribe decorator, which binds a property to a Registry state
 * key. Reads mirror the current Registry value, writes push back through
 * Registry.setState, and repeated connects should coalesce into one
 * subscription rather than leaking duplicates.
 */
import { Component, Register, Subscribe, Registry, html } from '../../src/index';
import { uniqueTag } from '../support/component';

// The browser dispatches connectedCallback on the prototype, which runs before the
// @Subscribe wrapper is installed on the instance. Calling it manually here goes
// through the instance property and exercises the subscription path explicitly.
function activateConsumer($el: JQuery<HTMLElement>) {
  ($el[0] as any).connectedCallback();
}

describe('@Subscribe decorator (consumer pattern)', () => {
  it('subscribes automatically on a natural mount, without a manual connectedCallback call', () => {
    const tag = uniqueTag('consumer');
    const key = `test.${tag}`;

    Registry.setState(key, 'hello');

    @Register(tag)
    class TestComp extends Component {
      @Subscribe(key) value: unknown;
      render() {
        return html`<span class="value">${this.value}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(`${tag} .value`, { timeout: 2000 }).should('have.text', 'hello');
    cy.then(() => Registry.setState(key, 'world'));
    cy.get(`${tag} .value`, { timeout: 2000 }).should('have.text', 'world');
  });

  it('reflects the current Registry value into the decorated property at subscribe time', () => {
    const tag = uniqueTag('consumer');
    const key = `test.${tag}`;

    Registry.setState(key, 'hello');

    @Register(tag)
    class TestComp extends Component {
      @Subscribe(key) value: unknown;
      render() {
        return html`<span class="value">${this.value}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(activateConsumer);
    cy.wait(50);
    cy.get(`${tag} .value`).should('have.text', 'hello');
  });

  it('re-renders when Registry.setState pushes a new value for the subscribed key', () => {
    const tag = uniqueTag('consumer');
    const key = `test.${tag}`;

    Registry.setState(key, 'initial');

    @Register(tag)
    class TestComp extends Component {
      @Subscribe(key) value: unknown;
      render() {
        return html`<span class="value">${this.value}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(activateConsumer);
    cy.wait(50);
    cy.get(`${tag} .value`).should('have.text', 'initial');

    cy.then(() => {
      Registry.setState(key, 'updated');
    });
    cy.wait(50);
    cy.get(`${tag} .value`).should('have.text', 'updated');
  });

  it('fires didChange on the component when an external setState updates the subscribed key', () => {
    const tag = uniqueTag('consumer');
    const key = `test.${tag}`;
    const changes: Array<{ prop: string; oldVal: unknown; newVal: unknown }> = [];

    Registry.setState(key, 'a');

    @Register(tag)
    class TestComp extends Component {
      @Subscribe(key) value: unknown;

      didChange(property: string, oldValue: unknown, newValue: unknown) {
        changes.push({ prop: property, oldVal: oldValue, newVal: newValue });
      }

      render() {
        return html`<span class="value">${this.value}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(activateConsumer);
    cy.wait(50);
    // The initial subscription hand-off may push a didChange; drop those so the assertion
    // only sees the change produced by the explicit setState below.
    cy.then(() => {
      changes.length = 0;
    });
    cy.then(() => {
      Registry.setState(key, 'b');
    });
    cy.wait(10).then(() => {
      expect(changes).to.have.length(1);
      expect(changes[0]).to.deep.equal({ prop: 'value', oldVal: 'a', newVal: 'b' });
    });
  });

  it('coalesces repeated connectedCallback calls into a single Registry subscription', () => {
    const tag = uniqueTag('consumer');
    const key = `test.${tag}`;

    Registry.setState(key, 'init');

    @Register(tag)
    class TestComp extends Component {
      @Subscribe(key) value: unknown;
      render() {
        return html`<span class="value">${this.value}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(activateConsumer);
    cy.wait(50);
    cy.get(tag).then(activateConsumer);
    cy.wait(50);
    cy.get(tag).then(activateConsumer);
    cy.wait(50).then(() => {
      const subs = (Registry as any).subscribers?.[key];
      expect(subs?.size ?? 0, 'expected a single subscription after repeated connects').to.equal(1);
    });
  });

  it('writing to the decorated property pushes the value back into Registry state', () => {
    const tag = uniqueTag('consumer');
    const key = `test.${tag}`;

    @Register(tag)
    class TestComp extends Component {
      @Subscribe(key) value: unknown;
      render() {
        return html`<span class="value">${this.value ?? 'empty'}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      ($el[0] as any).value = 'from-prop';
    });
    cy.wait(50);
    cy.get(`${tag} .value`).should('have.text', 'from-prop');
    cy.then(() => {
      expect(Registry.getState(key)).to.equal('from-prop');
    });
  });
});

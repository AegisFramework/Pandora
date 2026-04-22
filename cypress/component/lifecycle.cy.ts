/**
 * Pins down the connection lifecycle hooks: willMount/didMount/willUnmount/
 * didUnmount, the "re-connect" path via didReconnect, and didChange's firing
 * on @State mutations. The remove-then-append dance simulates a real DOM move
 * so the framework can tell first-connect from later ones.
 */
import { Component, Register, State, html } from '../../src/index';
import { uniqueTag } from '../support/component';

describe('Component lifecycle', () => {
  it('didMount fires exactly once, on the first connect', () => {
    const tag = uniqueTag('lifecycle');

    @Register(tag)
    class TestComp extends Component {
      mountCount = 0;

      async didMount() {
        this.mountCount++;
      }

      render() {
        return html`<span>ok</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      expect(($el[0] as any).mountCount).to.equal(1);
    });

    // Detach and reattach; didMount must not fire again.
    cy.get(tag).then(($el) => {
      const el = $el[0];
      const parent = el.parentElement!;
      el.remove();
      parent.appendChild(el);
    });
    cy.wait(50);
    cy.get(tag).then(($el) => {
      expect(($el[0] as any).mountCount).to.equal(1);
    });
  });

  it('didReconnect fires on every connect after the first one', () => {
    const tag = uniqueTag('lifecycle');

    @Register(tag)
    class TestComp extends Component {
      reconnectCount = 0;

      async didReconnect() {
        this.reconnectCount++;
      }

      render() {
        return html`<span>ok</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      expect(($el[0] as any).reconnectCount).to.equal(0);
    });

    cy.get(tag).then(($el) => {
      const el = $el[0];
      const parent = el.parentElement!;
      el.remove();
      parent.appendChild(el);
    });
    cy.wait(50);
    cy.get(tag).then(($el) => {
      expect(($el[0] as any).reconnectCount).to.equal(1);
    });
  });

  it('didChange receives property, old value, and new value on @State writes', () => {
    const tag = uniqueTag('lifecycle');
    const changes: Array<[string, unknown, unknown]> = [];

    @Register(tag)
    class TestComp extends Component {
      @State() count = 0;

      didChange(property: string, oldValue: unknown, newValue: unknown) {
        changes.push([property, oldValue, newValue]);
      }

      render() {
        return html`<span class="count">${this.count}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      ($el[0] as any).count = 42;
    });
    cy.wait(10).then(() => {
      expect(changes).to.deep.include.members([['count', 0, 42]]);
    });
  });

  it('willMount fires on every connect, including reconnects', () => {
    const tag = uniqueTag('lifecycle');

    @Register(tag)
    class TestComp extends Component {
      willMountCount = 0;

      async willMount() {
        this.willMountCount++;
      }

      render() {
        return html`<span>ok</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      expect(($el[0] as any).willMountCount).to.equal(1);
    });

    cy.get(tag).then(($el) => {
      const el = $el[0];
      const parent = el.parentElement!;
      el.remove();
      parent.appendChild(el);
    });
    cy.wait(50);
    cy.get(tag).then(($el) => {
      expect(($el[0] as any).willMountCount).to.equal(2);
    });
  });

  it('willUnmount runs before the element disconnects', () => {
    const tag = uniqueTag('lifecycle');
    let willUnmountFired = false;

    @Register(tag)
    class TestComp extends Component {
      async willUnmount() {
        willUnmountFired = true;
      }

      render() {
        return html`<span>ok</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      $el[0].remove();
    });
    cy.wait(50).then(() => {
      expect(willUnmountFired).to.be.true;
    });
  });

  it('didUnmount runs after the element disconnects', () => {
    const tag = uniqueTag('lifecycle');
    let didUnmountFired = false;

    @Register(tag)
    class TestComp extends Component {
      async didUnmount() {
        didUnmountFired = true;
      }

      render() {
        return html`<span>ok</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      $el[0].remove();
    });
    cy.wait(50).then(() => {
      expect(didUnmountFired).to.be.true;
    });
  });
});

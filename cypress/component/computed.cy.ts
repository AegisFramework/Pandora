/**
 * Tests for @Computed — the decorator that memoizes a getter against a
 * declared list of reactive dependencies. Covers cache hits on repeated
 * access, cache invalidation when a dependency changes, and tracking
 * across multiple dependencies.
 */
import { Component, Register, State, Computed, html } from '../../src/index';
import { uniqueTag } from '../support/component';

describe('@Computed decorator', () => {
  it('returns cached results on repeat access without re-running the getter', () => {
    const tag = uniqueTag('computed');
    let computeCount = 0;

    @Register(tag)
    class TestComp extends Component {
      @State() items: string[] = ['a', 'b', 'c'];

      @Computed('items')
      get count() {
        computeCount++;
        return this.items.length;
      }

      render() {
        return html`<span class="count">${this.count}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(`${tag} .count`).should('have.text', '3');
    cy.get(tag).then(($el) => {
      computeCount = 0;
      const comp = $el[0] as any;
      const _v1 = comp.count;
      const _v2 = comp.count;
      expect(computeCount).to.equal(0);
    });
  });

  it('recomputes the value after a declared dependency changes', () => {
    const tag = uniqueTag('computed');

    @Register(tag)
    class TestComp extends Component {
      @State() items: string[] = ['a', 'b'];

      @Computed('items')
      get count() {
        return this.items.length;
      }

      render() {
        return html`<span class="count">${this.count}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(`${tag} .count`).should('have.text', '2');
    cy.get(tag).then(($el) => {
      ($el[0] as any).items = ['a', 'b', 'c', 'd'];
    });
    cy.wait(50);
    cy.get(`${tag} .count`).should('have.text', '4');
  });

  it('invalidates the cache when any of several tracked dependencies changes', () => {
    const tag = uniqueTag('computed');

    @Register(tag)
    class TestComp extends Component {
      @State() firstName = 'John';
      @State() lastName = 'Doe';

      @Computed('firstName', 'lastName')
      get fullName() {
        return `${this.firstName} ${this.lastName}`;
      }

      render() {
        return html`<span class="name">${this.fullName}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(`${tag} .name`).should('have.text', 'John Doe');

    cy.get(tag).then(($el) => {
      ($el[0] as any).firstName = 'Jane';
    });
    cy.wait(50);
    cy.get(`${tag} .name`).should('have.text', 'Jane Doe');

    cy.get(tag).then(($el) => {
      ($el[0] as any).lastName = 'Smith';
    });
    cy.wait(50);
    cy.get(`${tag} .name`).should('have.text', 'Jane Smith');
  });
});

/**
 * Fills coverage gaps for two @Property option paths the rest of the suite
 * doesn't exercise directly:
 *   - @Property({ attribute }) — reactive and mirrored to an attribute, but
 *     never triggers an auto re-render.
 *   - @Property({ equals }) — a custom comparator suppresses no-op writes so
 *     @Watch and didChange don't fire on a deep-equal assignment.
 */
import { Component, Register, Property, Watch, html } from '../../src/index';
import { uniqueTag } from '../support/component';

describe('@Property({ attribute }) — reactive + mirrored, no auto-render', () => {
  it('mirrors assignments to the chosen attribute without re-rendering, and reflects setAttribute back', () => {
    const tag = uniqueTag('propopt');
    const watched: unknown[] = [];

    @Register(tag)
    class C extends Component {
      @Property({ attribute: 'data-x' }) x: unknown;
      renderCount = 0;
      @Watch('x') onX(n: unknown) { watched.push(n); }
      render() { this.renderCount++; return html`<span class="v">${String(this.x)}</span>`; }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      const c = $el[0] as any;
      c.renderCount = 0;
      c.x = 5;
    });
    cy.wait(30);
    cy.get(tag).should('have.attr', 'data-x', '5');
    cy.get(tag).then(($el) => {
      const c = $el[0] as any;
      expect(c.renderCount, '@Property must not schedule a re-render').to.equal(0);
      expect(c.x).to.equal(5);
    });

    // setAttribute reflects back into the property and fires @Watch.
    cy.get(tag).then(($el) => { $el[0].setAttribute('data-x', '9'); });
    cy.wait(30);
    cy.get(tag).then(($el) => {
      expect(($el[0] as any).x).to.equal(9);
      expect(watched).to.deep.equal([5, 9]);
    });
  });
});

describe('@Property({ equals }) — custom equality suppresses no-op writes', () => {
  it('skips @Watch/didChange when equals() treats the new value as unchanged', () => {
    const tag = uniqueTag('propeq');
    const watched: unknown[] = [];
    const changes: string[] = [];

    @Register(tag)
    class C extends Component {
      @Property({ equals: (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b) })
      data: { x: number } = { x: 1 };
      @Watch('data') onData(n: unknown) { watched.push(n); }
      didChange(prop: string) { changes.push(prop); }
      render() { return html`<span>ok</span>`; }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      const c = $el[0] as any;
      watched.length = 0; changes.length = 0;
      c.data = { x: 1 }; // deep-equal: treated as no change
    });
    cy.wait(30).then(() => {
      expect(watched, 'watch should not fire on a deep-equal write').to.deep.equal([]);
      expect(changes, 'didChange should not fire on a deep-equal write').to.deep.equal([]);
    });

    cy.get(tag).then(($el) => { ($el[0] as any).data = { x: 2 }; }); // different: fires
    cy.wait(30).then(() => {
      expect(watched).to.have.length(1);
      expect(changes).to.deep.equal(['data']);
    });
  });
});

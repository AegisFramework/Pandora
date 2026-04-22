/**
 * Exercises the @Query and @QueryAll property decorators, which resolve to
 * elements inside the component's rendered tree. You want to confirm they
 * work in both light-DOM Components and ShadowComponents, and that misses
 * surface cleanly as null rather than throwing.
 */
import { Component, ShadowComponent, Register, Query, QueryAll, html } from '../../src/index';
import { uniqueTag } from '../support/component';

describe('@Query / @QueryAll decorators', () => {
  it('resolves a single element from the rendered tree', () => {
    const tag = uniqueTag('query');

    @Register(tag)
    class TestComp extends Component {
      @Query('.item') item!: HTMLElement | null;

      render() {
        return html`<span class="item">hello</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      const comp = $el[0] as any;
      expect(comp.item).to.not.be.null;
      expect(comp.item.textContent).to.equal('hello');
    });
  });

  it('resolves every matching element as a NodeList', () => {
    const tag = uniqueTag('query');

    @Register(tag)
    class TestComp extends Component {
      @QueryAll('.item') items!: NodeListOf<HTMLElement>;

      render() {
        return html`<span class="item">a</span><span class="item">b</span><span class="item">c</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      const comp = $el[0] as any;
      expect(comp.items.length).to.equal(3);
    });
  });

  it('searches within the shadow root for ShadowComponent subclasses', () => {
    const tag = uniqueTag('query');

    @Register(tag)
    class TestComp extends ShadowComponent {
      @Query('.item') item!: HTMLElement | null;

      render() {
        return html`<span class="item">shadow item</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      const comp = $el[0] as any;
      expect(comp.item).to.not.be.null;
      expect(comp.item.textContent).to.equal('shadow item');
    });
  });

  it('returns null when the selector matches nothing', () => {
    const tag = uniqueTag('query');

    @Register(tag)
    class TestComp extends Component {
      @Query('.missing') item!: HTMLElement | null;

      render() {
        return html`<span class="exists">here</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      const comp = $el[0] as any;
      expect(comp.item).to.be.null;
    });
  });
});

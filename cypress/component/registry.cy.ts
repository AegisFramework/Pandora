/**
 * Exercises the Registry: register/define/alias, evolve() for hot-swapping
 * a class in place, instantiate() for property-aware construction, and the
 * use() middleware hook that intercepts render output. Several specs hand-
 * append elements to the DOM to isolate timing from cy.mount().
 */
import { Component, Registry, Register, State, Emitter, Attribute, html } from '../../src/index';
import { uniqueTag } from '../support/component';

describe('Registry — register, evolve, alias, instantiate', () => {
  it('evolve() replays decorator effects without stacking them on repeated calls', () => {
    const tag = uniqueTag('registry');

    @Register(tag)
    class V1 extends Component {
      @State() count = 0;

      render() {
        return html`<span class="version">v1</span><span class="count">${this.count}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(`${tag} .version`).should('have.text', 'v1');
    cy.get(`${tag} .count`).should('have.text', '0');

    cy.then(() => {
      class V2 extends Component {
        @State() count = 0;

        render() {
          return html`<span class="version">v2</span><span class="count">${this.count}</span>`;
        }
      }

      Registry.evolve(tag, V2 as any, true);
    });
    cy.wait(100);
    cy.get(`${tag} .version`).should('have.text', 'v2');

    cy.then(() => {
      class V3 extends Component {
        @State() count = 0;

        render() {
          return html`<span class="version">v3</span><span class="count">${this.count}</span>`;
        }
      }

      Registry.evolve(tag, V3 as any, true);
    });
    cy.wait(100);
    cy.get(`${tag} .version`).should('have.text', 'v3');

    // After two evolves, @State must still react to exactly one setter, not a stack of them.
    cy.get(tag).then(($el) => {
      ($el[0] as any).count = 42;
    });
    cy.wait(50);
    cy.get(`${tag} .count`).should('have.text', '42');
  });

  it('instantiate() reflects primitive initial values to both attribute and property', () => {
    const tag = uniqueTag('registry');

    @Register(tag)
    class TestComp extends Component {
      title = '';

      render() {
        return html`<span class="title">${this.title}</span>`;
      }
    }

    cy.then(() => {
      const el = Registry.instantiate(tag, { title: 'Hello' });
      document.querySelector('[data-cy-root]')!.appendChild(el);
    });

    cy.get(tag, { timeout: 10000 }).should(($el) => {
      expect(($el[0] as any).isReady).to.be.true;
    });
    cy.get(tag).then(($el) => {
      const el = $el[0];
      expect(el.getAttribute('title')).to.equal('Hello');
      expect((el as any).title).to.equal('Hello');
    });
  });

  it('evolve() preserves pre-mount property assignments targeting fields that only exist on the new class', () => {
    const tag = uniqueTag('registry');

    class V1 extends Component {
      render() { return html`<span class="v">v1</span>`; }
    }
    Registry.register(tag, V1 as any);

    @Register(uniqueTag('dummy-v2'), { defer: true })
    class V2 extends Component {
      @State() foo: string | undefined;
      render() { return html`<span class="v">${this.foo ?? 'empty'}</span>`; }
    }

    cy.then(() => {
      Registry.evolve(tag, V2 as any, false);
    });

    cy.then(() => {
      const el = document.createElement(tag) as any;
      // Assign a V2-only field before insertion; evolve() must route it through when the element upgrades.
      el.foo = 'hello';
      document.querySelector('[data-cy-root]')!.appendChild(el);
    });

    cy.get(`${tag} .v`, { timeout: 2000 }).should('have.text', 'hello');
  });

  it('evolve() without rerender still reaches future alias instances', () => {
    const originalTag = uniqueTag('registry-aliased');
    const aliasTag = uniqueTag('registry-alias');

    class V1 extends Component {
      render() { return html`<span class="v">v1</span>`; }
    }
    Registry.register(originalTag, V1 as any);
    Registry.alias(aliasTag, originalTag);

    @Register(uniqueTag('dummy-alias-v2'), { defer: true })
    class V2 extends Component {
      render() { return html`<span class="v">v2</span>`; }
    }

    cy.then(() => {
      Registry.evolve(originalTag, V2 as any, false);
    });

    cy.then(() => {
      const el = document.createElement(aliasTag);
      el.className = 'fresh-alias';
      document.querySelector('[data-cy-root]')!.appendChild(el);
    });

    cy.get(`${aliasTag}.fresh-alias .v`, { timeout: 2000 }).should('have.text', 'v2');
  });

  it('alias() created after evolve() uses the active implementation', () => {
    const tag = uniqueTag('registry');
    const aliasTag = `${tag}-alias`;

    class V1 extends Component {
      render() { return html`<span class="v">v1</span>`; }
    }
    Registry.register(tag, V1 as any);

    class V2 extends Component {
      render() { return html`<span class="v">v2</span>`; }
    }

    cy.then(() => {
      Registry.evolve(tag, V2 as any, false);
      Registry.alias(aliasTag, tag);
    });

    cy.mount(aliasTag);
    cy.get(`${aliasTag} .v`).should('have.text', 'v2');
  });

  it('evolve() upgrades instances created after the swap even when rerender is skipped', () => {
    const tag = uniqueTag('registry');

    class V1 extends Component {
      render() { return html`<span class="v">v1</span>`; }
    }
    Registry.register(tag, V1 as any);

    class V2 extends Component {
      render() { return html`<span class="v">v2</span>`; }
    }

    cy.mount(tag);
    cy.get(`${tag} .v`).should('have.text', 'v1');

    cy.then(() => {
      Registry.evolve(tag, V2 as any, false);
    });

    cy.then(() => {
      const root = document.querySelector('[data-cy-root]')!;
      const fresh = document.createElement(tag);
      fresh.className = 'fresh';
      root.appendChild(fresh);
    });
    cy.get(`${tag}.fresh .v`, { timeout: 2000 }).should('have.text', 'v2');
  });

  it('instantiate() routes @Attribute(customName) through the chosen attribute name only', () => {
    const tag = uniqueTag('registry');

    @Register(tag)
    class TestComp extends Component {
      // Leaving the default out avoids a syncToAttribute call during construction.
      @Attribute('my-label') label: string | undefined;
      render() {
        return html`<span>${this.label ?? ''}</span>`;
      }
    }

    cy.then(() => {
      const el = Registry.instantiate(tag, { label: 'Hello' });
      document.querySelector('[data-cy-root]')!.appendChild(el);
    });
    cy.get(tag, { timeout: 10000 }).should(($el) => {
      expect(($el[0] as any).isReady).to.be.true;
    });
    cy.get(tag).then(($el) => {
      const el = $el[0];
      expect(el.getAttribute('my-label'), 'custom attribute name set').to.equal('Hello');
      expect(el.hasAttribute('label'), 'property name should NOT leak as an attribute').to.be.false;
      expect((el as any).label).to.equal('Hello');
    });
  });

  it('instantiate() keeps complex values as properties and never serializes them to attributes', () => {
    const tag = uniqueTag('registry');

    @Register(tag)
    class TestComp extends Component {
      items: string[] = [];

      render() {
        return html`<span class="count">${this.items.length}</span>`;
      }
    }

    cy.then(() => {
      const el = Registry.instantiate(tag, { items: ['a', 'b'] });
      document.querySelector('[data-cy-root]')!.appendChild(el);
    });

    cy.get(tag, { timeout: 10000 }).should(($el) => {
      expect(($el[0] as any).isReady).to.be.true;
    });
    cy.get(tag).then(($el) => {
      const el = $el[0];
      expect(el.hasAttribute('items')).to.be.false;
      expect((el as any).items).to.deep.equal(['a', 'b']);
    });
  });

  it('Registry.use(\'render\') middleware can rewrite render output before it reaches the DOM', () => {
    const tag = uniqueTag('registry');

    @Register(tag)
    class TestComp extends Component {
      render() {
        return '<div class="content">original</div>';
      }
    }

    let unsubMiddleware: (() => void) | undefined;

    cy.then(() => {
      unsubMiddleware = Registry.use('render', (_component, value, renderType) => {
        if (renderType === 'string' && typeof value === 'string') {
          return value.replace('original', 'modified');
        }
        return value;
      });
    });

    cy.mount(tag);
    cy.get(`${tag} .content`).should('have.text', 'modified');

    // Unsubscribe so the middleware does not pollute later specs in the same batch.
    cy.then(() => {
      if (unsubMiddleware) unsubMiddleware();
    });
  });

  it('alias instances pick up evolve() applied to the original tag', () => {
    const tag = uniqueTag('registry');
    const aliasTag = `${tag}-alias`;

    @Register(tag)
    class Original extends Component {
      render() { return html`<span class="ver">v1</span>`; }
    }

    Registry.alias(aliasTag, tag);

    cy.then(() => {
      const root = document.querySelector('[data-cy-root]')!;
      root.innerHTML = `<${tag}></${tag}><${aliasTag}></${aliasTag}>`;
    });
    cy.get(tag, { timeout: 10000 }).should(($el) => {
      expect(($el[0] as any).isReady).to.be.true;
    });
    cy.get(aliasTag, { timeout: 10000 }).should(($el) => {
      expect(($el[0] as any).isReady).to.be.true;
    });

    cy.get(`${tag} .ver`).should('have.text', 'v1');
    cy.get(`${aliasTag} .ver`).should('have.text', 'v1');

    cy.then(() => {
      class Updated extends Component {
        render() { return html`<span class="ver">v2</span>`; }
      }
      Registry.evolve(tag, Updated as any, true);
    });
    cy.wait(100);

    // Both the original tag and its alias should now render v2.
    cy.get(`${tag} .ver`).should('have.text', 'v2');
    cy.get(`${aliasTag} .ver`).should('have.text', 'v2');
  });

  it('lazy() shares one in-flight loader across concurrent first mounts', () => {
    const tag = uniqueTag('registry-lazy');
    let loadCount = 0;

    class RealComp extends Component {
      render() { return html`<span class="lazy">loaded</span>`; }
    }

    Registry.lazy(tag, async () => {
      loadCount++;
      await new Promise(resolve => setTimeout(resolve, 50));
      return RealComp as any;
    });

    cy.then(() => {
      const root = document.querySelector('[data-cy-root]')!;
      root.innerHTML = `<${tag}></${tag}><${tag}></${tag}>`;
    });

    cy.get(`${tag} .lazy`, { timeout: 10000 }).should('have.length', 2);
    cy.then(() => {
      expect(loadCount).to.equal(1);
    });
  });

  it('deferred @Register records the tag but waits for Registry.define() to install the element', () => {
    const tag = uniqueTag('registry');

    @Register(tag, { defer: true })
    class DeferredComp extends Component {
      render() { return html`<span class="deferred">loaded</span>`; }
    }

    // The class knows its tag, but neither Registry nor customElements have it yet.
    cy.then(() => {
      expect((DeferredComp as any).tag).to.equal(tag);
      expect(Registry.has(tag)).to.be.false;
      expect(customElements.get(tag)).to.be.undefined;
    });

    cy.then(() => {
      Registry.define(tag, DeferredComp as any);
    });

    cy.then(() => {
      expect(Registry.has(tag)).to.be.true;
    });

    cy.mount(tag);
    cy.get(`${tag} .deferred`).should('have.text', 'loaded');
  });

  it('Component.register() goes through Registry and behaves like a decorator registration', () => {
    const tag = uniqueTag('registry');

    class ManualComp extends Component {
      render() { return html`<span class="manual">registered</span>`; }
    }
    ManualComp.tag = tag;
    ManualComp.register();

    cy.then(() => {
      expect(Registry.has(tag)).to.be.true;
      expect(Registry.list()).to.include(tag);
    });

    cy.mount(tag);
    cy.get(`${tag} .manual`).should('have.text', 'registered');
  });
});

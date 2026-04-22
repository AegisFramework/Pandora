/**
 * Grab-bag of smaller surfaces: the `testing` helper module (flush, whenReady,
 * mount), the typed `createState()` store, the @ClassList decorator that syncs
 * host classes to property values, pandora:ready / pandora:unmount lifecycle
 * CustomEvents, and the @Slot decorator that exposes slot elements on
 * ShadowComponent subclasses.
 */
import {
  Component, ShadowComponent, Registry, Register,
  State, Property, Subscribe, Attribute, Watch,
  ClassList, Slot, createState,
  testing, html
} from '../../src/index';
import { uniqueTag } from '../support/component';

describe('testing helpers', () => {
  it('flush() resolves after pending renders have committed', () => {
    const tag = uniqueTag('testing');

    @Register(tag)
    class TestComp extends Component {
      @State() count = 0;
      render() { return html`<span class="count">${this.count}</span>`; }
    }

    cy.mount(tag);
    cy.get(tag).then(async ($el) => {
      const comp = $el[0] as any;
      comp.count = 42;
      await testing.flush();
      expect(comp.querySelector('.count')!.textContent).to.equal('42');
    });
  });

  it('whenReady() resolves once the component has finished its first mount', () => {
    const tag = uniqueTag('testing');

    @Register(tag)
    class TestComp extends Component {
      render() { return html`<span>ready</span>`; }
    }

    cy.then(async () => {
      const root = document.querySelector('[data-cy-root]')!;
      root.innerHTML = `<${tag}></${tag}>`;
      const el = root.querySelector(tag)!;
      await testing.whenReady(el);
      expect((el as any).isReady).to.be.true;
    });
  });

  it('mount() inserts a component and awaits readiness in one step', () => {
    const tag = uniqueTag('testing');

    @Register(tag)
    class TestComp extends Component {
      render() { return html`<span class="msg">mounted</span>`; }
    }

    cy.then(async () => {
      const root = document.querySelector('[data-cy-root]')!;
      const el = await testing.mount(tag, root);
      expect(el.isReady).to.be.true;
      expect(el.querySelector('.msg')!.textContent).to.equal('mounted');
    });
  });
});

describe('createState() typed store', () => {
  it('exposes typed get, set, has, subscribe, and delete', () => {
    const theme = createState<'light' | 'dark'>('test.typed.theme', 'light');

    expect(theme.get()).to.equal('light');
    theme.set('dark');
    expect(theme.get()).to.equal('dark');
    expect(theme.has()).to.be.true;

    const values: string[] = [];
    const unsub = theme.subscribe((newVal) => { values.push(newVal); });
    theme.set('light');
    expect(values).to.deep.equal(['light']);

    unsub();
    theme.delete();
    expect(theme.has()).to.be.false;
  });

  it('interoperates with @Subscribe on a component', () => {
    const tag = uniqueTag('typed');
    const key = `test.typed.${tag}`;
    const counter = createState<number>(key, 10);

    @Register(tag)
    class TestComp extends Component {
      @Subscribe(key) count!: number;
      render() { return html`<span class="count">${this.count}</span>`; }
    }

    cy.mount(tag);
    // @Subscribe wraps connectedCallback on the instance, but the browser
    // invokes the prototype method — so we manually activate the subscription.
    cy.get(tag).then(async ($el) => {
      await ($el[0] as any).connectedCallback();
      ($el[0] as any).forceRender();
    });
    cy.wait(50);
    cy.get(`${tag} .count`).should('contain.text', '10');
    cy.then(() => counter.set(99));
    cy.wait(50);
    cy.get(`${tag} .count`).should('contain.text', '99');
  });
});

describe('@ClassList decorator', () => {
  it('toggles the mapped class in sync with a boolean property', () => {
    const tag = uniqueTag('classlist');

    @Register(tag)
    @ClassList({ active: 'open' })
    class TestComp extends Component {
      @Property() open = false;
      render(): void {}
    }

    cy.mount(tag);
    cy.get(tag).should('not.have.class', 'active');
    cy.get(tag).then(($el) => {
      ($el[0] as any).open = true;
    });
    cy.wait(10);
    cy.get(tag).should('have.class', 'active');
    cy.get(tag).then(($el) => {
      ($el[0] as any).open = false;
    });
    cy.wait(10);
    cy.get(tag).should('not.have.class', 'active');
  });

  it('accepts a predicate function as the condition for a class', () => {
    const tag = uniqueTag('classlist');

    @Register(tag)
    @ClassList({ 'mode-nvl': (self: any) => self.mode === 'nvl' })
    class TestComp extends Component {
      @Property() mode = 'adv';
      render(): void {}
    }

    cy.mount(tag);
    cy.get(tag).should('not.have.class', 'mode-nvl');
    cy.get(tag).then(($el) => {
      ($el[0] as any).mode = 'nvl';
    });
    cy.wait(10);
    cy.get(tag).should('have.class', 'mode-nvl');
  });

  it('applies the initial class state during mount', () => {
    const tag = uniqueTag('classlist');

    @Register(tag)
    @ClassList({ visible: 'show' })
    class TestComp extends Component {
      @Property() show = true;
      render(): void {}
    }

    cy.mount(tag);
    cy.get(tag).should('have.class', 'visible');
  });

  it('handles multiple class-to-property mappings independently', () => {
    const tag = uniqueTag('classlist');

    @Register(tag)
    @ClassList({ active: 'open', selected: 'chosen' })
    class TestComp extends Component {
      @Property() open = false;
      @Property() chosen = false;
      render(): void {}
    }

    cy.mount(tag);
    cy.get(tag).should('not.have.class', 'active');
    cy.get(tag).should('not.have.class', 'selected');
    cy.get(tag).then(($el) => {
      ($el[0] as any).open = true;
      ($el[0] as any).chosen = true;
    });
    cy.wait(10);
    cy.get(tag).should('have.class', 'active');
    cy.get(tag).should('have.class', 'selected');
  });
});

describe('lifecycle CustomEvents', () => {
  it('emits pandora:ready with tag and firstMount detail on initial mount', () => {
    const tag = uniqueTag('lifecycle-event');
    let detail: any = null;

    @Register(tag)
    class TestComp extends Component {
      render() { return html`<span>LC</span>`; }
    }

    cy.then(() => {
      const root = document.querySelector('[data-cy-root]')!;
      root.addEventListener('pandora:ready', (e: Event) => {
        detail = (e as CustomEvent).detail;
      }, { once: true });
      root.innerHTML = `<${tag}></${tag}>`;
    });
    cy.wait(100).then(() => {
      expect(detail).to.not.be.null;
      expect(detail.tag).to.equal(tag);
      expect(detail.firstMount).to.be.true;
    });
  });

  it('emits pandora:unmount when the element is disconnected', () => {
    const tag = uniqueTag('lifecycle-event');
    let unmountFired = false;

    @Register(tag)
    class TestComp extends Component {
      render() { return html`<span>LC</span>`; }
    }

    cy.mount(tag);
    // The listener has to sit on the element itself — by the time the event
    // would bubble, the node is already detached from the tree.
    cy.get(tag).then(($el) => {
      $el[0].addEventListener('pandora:unmount', () => { unmountFired = true; }, { once: true });
      $el[0].remove();
    });
    cy.wait(50).then(() => {
      expect(unmountFired).to.be.true;
    });
  });
});

describe('@Slot decorator', () => {
  it('exposes the default slot element on a ShadowComponent', () => {
    const tag = uniqueTag('slot');

    @Register(tag)
    class TestComp extends ShadowComponent {
      @Slot() defaultSlot!: HTMLSlotElement | null;

      render() {
        return html`<div><slot></slot></div>`;
      }
    }

    cy.mount(tag, 'Hello');
    cy.get(tag).then(($el) => {
      const comp = $el[0] as any;
      expect(comp.defaultSlot).to.not.be.null;
      expect(comp.defaultSlot.tagName.toLowerCase()).to.equal('slot');
    });
  });

  it('resolves to null when the requested slot is absent from the template', () => {
    const tag = uniqueTag('slot');

    @Register(tag)
    class TestComp extends ShadowComponent {
      @Slot('missing') missingSlot!: HTMLSlotElement | null;

      render() {
        return html`<div><slot></slot></div>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      expect(($el[0] as any).missingSlot).to.be.null;
    });
  });

  it('exposes a named slot by its name attribute', () => {
    const tag = uniqueTag('slot');

    @Register(tag)
    class TestComp extends ShadowComponent {
      @Slot('header') headerSlot!: HTMLSlotElement | null;

      render() {
        return html`<div><slot name="header"></slot><slot></slot></div>`;
      }
    }

    cy.mount(tag, '<span slot="header">Title</span>');
    cy.get(tag).then(($el) => {
      const comp = $el[0] as any;
      expect(comp.headerSlot).to.not.be.null;
      expect(comp.headerSlot.getAttribute('name')).to.equal('header');
    });
  });
});

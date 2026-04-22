describe('Demo Page', () => {
  it('loads without errors', () => {
    cy.visit('test/index.html');
    cy.get('[data-component]').should('have.length.greaterThan', 0);
  });

  it('counter increments on click', () => {
    cy.visit('test/index.html');
    cy.get('counter-component .count').first().then(($count) => {
      const initial = parseInt($count.text());
      cy.get('counter-component .increment').first().click();
      cy.get('counter-component .count').first().should(($el) => {
        expect(parseInt($el.text())).to.be.greaterThan(initial);
      });
    });
  });

  it('theme toggle switches theme', () => {
    cy.visit('test/index.html');
    cy.get('theme-toggle .theme-btn').first().should('contain.text', 'light');
    cy.get('theme-toggle .theme-btn').first().click();
    cy.get('theme-toggle .theme-btn').first().should('contain.text', 'dark');
  });

  it('lazy component loads when triggered', () => {
    cy.visit('test/index.html');
    cy.get('lazy-component').should('not.exist');
    cy.contains('button', 'Load Lazy Component').click();
    cy.get('lazy-component', { timeout: 10000 }).should('exist');
  });
});

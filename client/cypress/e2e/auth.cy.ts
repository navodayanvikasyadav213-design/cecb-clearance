describe('Authentication Flow', () => {
  it('Should load the login page and show the login form', () => {
    cy.visit('/login');
    cy.get('h1').should('contain', 'CECB');
    cy.get('input[type="email"]').should('exist');
    cy.get('input[type="password"]').should('exist');
    cy.get('button').contains('Log in').should('exist');
  });

  it('Should show an error for invalid credentials', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('invalid@example.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button').contains('Log in').click();
    
    // We expect a toast or some error message to appear
    cy.contains('Invalid email or password').should('exist'); // Adjust based on actual toast message
  });
});

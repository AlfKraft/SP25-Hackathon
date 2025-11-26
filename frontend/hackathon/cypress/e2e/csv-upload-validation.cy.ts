/// <reference types="cypress" />

describe('UC-1: Validate Upload File (Pre-Processing)', () => {
  beforeEach(() => {
    // Visit the home page before each test
    cy.visit('/')
  })

  it('should validate sad.csv and show 8 valid rows with 7 Missing Header errors', () => {
    cy.contains('button', 'upload').click()
    
    cy.contains('Upload Participants CSV').should('be.visible')
    
    cy.get('input[type="file"]').selectFile('cypress/fixtures/sad.csv', { force: true })
    
    cy.contains('sad.csv').should('be.visible')
    
    cy.contains('button', 'Upload').click()
    
    cy.contains('CSV Validation Results', { timeout: 10000 }).should('be.visible')
    
 
    cy.contains('Total Rows').parent().should('contain', '8')
    
    cy.contains('Valid Rows').parent().should('contain', '8')
    
    // Check for "Missing Header" errors - should appear 7 times
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      const missingHeaderCount = (bodyText.match(/Missing Header/gi) || []).length
      expect(missingHeaderCount).to.equal(7)
    })
    
    // Alternative: Count the error badges with "Missing Header"
    cy.contains('Missing Header').should('have.length.at.least', 1)
    
    cy.contains('Errors Found:').should('be.visible')
    
    cy.contains('button', 'Back').should('be.visible')
    cy.contains('button', 'Confirm').should('be.visible')
  })

})

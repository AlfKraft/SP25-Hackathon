/// <reference types="cypress" />

describe('UC-6: Generate Teams Automatically', () => {
    beforeEach(() => {
        cy.visit('/')
    })

    it('should upload 100 participants and generate teams successfully', () => {
        cy.contains('button', 'Click here to upload participants').click()
        
        cy.contains('Upload Participants CSV').should('be.visible')
        
        cy.get('input[type="file"]').selectFile('cypress/fixtures/participants_100.csv', { force: true })
        
        cy.contains('participants_100.csv').should('be.visible')
        
        cy.contains('button', 'Upload').click()
        
        cy.contains('button', 'Confirm').click()
        
        cy.contains('a', 'Participants').click()
        
        cy.contains('h1', 'Participants').should('be.visible')
        
        cy.get('table tbody tr', { timeout: 10000 }).should('have.length.at.least', 1)
        
        cy.contains('a', 'Team builder').click()
                        
        cy.contains('button', 'Generate Teams').click()
        
        cy.get('[data-id^="team-"]', { timeout: 15000 }).should('have.length.at.least', 1)
        
        cy.get('[data-id^="member/"]', { timeout: 10000 }).should('have.length.at.least', 1)
        
    })

    
})

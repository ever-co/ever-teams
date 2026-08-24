/// <reference types="cypress" />

import './commands';

beforeEach(() => {
	cy.intercept('GET', '/api/auth/session*', {
		statusCode: 200,
		headers: { 'cache-control': 'no-store' },
		body: { expires: '2099-01-01T00:00:00.000Z', user: { email: 'manager@example.test', name: 'Fixture Manager' } }
	});
});

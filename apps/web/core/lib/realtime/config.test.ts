import { socketUrlFrom } from './config';

describe('socketUrlFrom', () => {
	it('prefers an explicit URL, as a socket URL', () => {
		expect(socketUrlFrom('wss://rt.example.com/graphql', 'https://api.example.com/api')).toBe(
			'wss://rt.example.com/graphql'
		);
		expect(socketUrlFrom('https://rt.example.com/graphql', null)).toBe('wss://rt.example.com/graphql');
		expect(socketUrlFrom('http://localhost:3000/graphql', null)).toBe('ws://localhost:3000/graphql');
	});

	it('derives the platform GraphQL socket from the API URL, with or without its /api suffix', () => {
		expect(socketUrlFrom('', 'https://api.example.com/api')).toBe('wss://api.example.com/graphql');
		expect(socketUrlFrom(undefined, 'https://api.example.com/')).toBe('wss://api.example.com/graphql');
		expect(socketUrlFrom(null, 'http://localhost:3000/api/')).toBe('ws://localhost:3000/graphql');
	});

	it('answers null when nothing is configured (a proxy-mode deployment without a socket)', () => {
		expect(socketUrlFrom(undefined, undefined)).toBeNull();
		expect(socketUrlFrom(' ', '')).toBeNull();
		expect(socketUrlFrom(null, 'api.example.com')).toBeNull();
	});
});

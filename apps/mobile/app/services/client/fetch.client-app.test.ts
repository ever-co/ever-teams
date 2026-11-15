/**
 * The app names itself on its requests to the API (ever-co/ever-gauzy#11983), which records the name with the session
 * it signs in or renews: the sessions list then tells this phone's session from the person's other apps. A native app
 * sends it freely; a browser would need the API to allow the header first.
 */
import { clientAppHeaders, serverFetch } from './fetch';

jest.mock('react-native-flash-message', () => ({ showMessage: jest.fn() }));

const originalFetch = global.fetch;

afterEach(() => {
	global.fetch = originalFetch;
});

it('names the app on its requests to the API', async () => {
	const sent = jest.fn<Promise<{ status: number; json: () => Promise<object> }>, [string, RequestInit]>(async () => ({
		status: 200,
		json: async () => ({})
	}));
	global.fetch = sent as unknown as typeof fetch;

	await serverFetch({ path: '/auth/signin.email.password', method: 'POST', body: {} });

	expect(sent.mock.calls[0][1].headers).toMatchObject({ 'X-Client-App': 'Ever Teams' });
});

it('sends nothing from the web build, where a browser would refuse a header the API does not allow', () => {
	expect(clientAppHeaders('web', 'Ever Teams')).toEqual({});
});

it('sends the name the build is configured with, when a header can carry it', () => {
	expect(clientAppHeaders('android', 'Acme Time')).toEqual({ 'X-Client-App': 'Acme Time' });
	expect(clientAppHeaders('ios', '团队时间')).toEqual({});
	expect(clientAppHeaders('ios', 'x'.repeat(65))).toEqual({});
});

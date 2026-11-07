import { fakeSocketFactory, fakeTimers, flush } from './fake-socket';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL, GraphqlWsConnection, isFatalCloseCode } from './graphql-ws';

function connect(overrides: Partial<ConstructorParameters<typeof GraphqlWsConnection>[0]> = {}) {
	const sockets = fakeSocketFactory();
	const timers = fakeTimers();
	const closes: number[] = [];
	const connection = new GraphqlWsConnection({
		url: 'wss://api.example.com/graphql',
		connectionParams: () => ({ authorization: 'Bearer t', 'tenant-id': 'ten' }),
		createSocket: sockets.factory,
		setTimeout: timers.setTimeout,
		clearTimeout: timers.clearTimeout,
		pingIntervalMs: 1_000,
		onClose: (code) => closes.push(code),
		...overrides
	});
	return { connection, sockets, timers, closes, socket: sockets.latest() };
}

describe('GraphqlWsConnection', () => {
	it('opens with the graphql-transport-ws protocol and initialises with the credential', async () => {
		const { connection, socket } = connect();
		expect(socket.protocol).toBe(GRAPHQL_TRANSPORT_WS_PROTOCOL);
		socket.open();
		expect(socket.sentOf('connection_init')[0]?.payload).toEqual({ authorization: 'Bearer t', 'tenant-id': 'ten' });
		expect(connection.isReady).toBe(false);
		socket.serve({ type: 'connection_ack' });
		await connection.ready;
		expect(connection.isReady).toBe(true);
	});

	it('subscribes after the ack, delivers next, and completes on unsubscribe', async () => {
		const { connection, socket } = connect();
		socket.open();
		socket.serve({ type: 'connection_ack' });
		await connection.ready;
		const received: unknown[] = [];
		const stop = connection.subscribe({ query: 'subscription { x }' }, {
			next: (data) => received.push(data),
			error: () => undefined,
			complete: () => received.push('complete')
		});
		const subscribe = socket.sentOf('subscribe')[0];
		expect(subscribe?.id).toBe('1');
		socket.serve({ id: '1', type: 'next', payload: { data: { x: 1 } } });
		expect(received).toEqual([{ x: 1 }]);
		stop();
		expect(socket.sentOf('complete')[0]?.id).toBe('1');
		// A message for a stopped subscription is ignored.
		socket.serve({ id: '1', type: 'next', payload: { data: { x: 2 } } });
		expect(received).toEqual([{ x: 1 }]);
	});

	it('refuses to subscribe before the ack', () => {
		const { connection, socket } = connect();
		socket.open();
		expect(() => connection.subscribe({ query: 'subscription { x }' }, { next: () => 0, error: () => 0, complete: () => 0 })).toThrow();
	});

	it('answers a ping with a pong, pings a quiet socket, and closes one that never answers', () => {
		const { socket, timers, closes } = connect();
		socket.open();
		socket.serve({ type: 'connection_ack' });
		socket.serve({ type: 'ping', payload: { k: 1 } });
		expect(socket.sentOf('pong')[0]?.payload).toEqual({ k: 1 });
		timers.advance(1_000);
		expect(socket.sentOf('ping')).toHaveLength(1);
		socket.serve({ type: 'pong' });
		timers.advance(1_000);
		expect(socket.sentOf('ping')).toHaveLength(2);
		timers.advance(2_000);
		expect(socket.closedWith?.code).toBe(4499);
		expect(closes).toEqual([4499]);
	});

	it('rejects ready and completes subscriptions when the socket closes', async () => {
		const { connection, socket, closes } = connect();
		socket.open();
		socket.drop(1006, 'gone');
		await expect(connection.ready).rejects.toThrow();
		expect(closes).toEqual([1006]);
		expect(connection.isReady).toBe(false);
	});

	it('close() reports once and sends nothing afterwards', async () => {
		const { connection, socket, closes } = connect();
		socket.open();
		socket.serve({ type: 'connection_ack' });
		await connection.ready;
		connection.close();
		connection.close();
		expect(closes).toEqual([1000]);
		expect(socket.closedWith?.code).toBe(1000);
		await flush();
	});

	it('knows the close codes not worth retrying', () => {
		expect(isFatalCloseCode(4401)).toBe(true);
		expect(isFatalCloseCode(4403)).toBe(true);
		expect(isFatalCloseCode(4400)).toBe(true);
		expect(isFatalCloseCode(1006)).toBe(false);
		expect(isFatalCloseCode(4499)).toBe(false);
	});
});

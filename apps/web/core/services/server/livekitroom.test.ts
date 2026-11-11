import { tokenLiveKitRoom } from './livekitroom';

describe('tokenLiveKitRoom', () => {
	const fetchMock = jest.fn();
	const originalFetch = global.fetch;

	beforeEach(() => {
		fetchMock.mockReset();
		global.fetch = fetchMock as unknown as typeof fetch;
	});

	afterAll(() => {
		global.fetch = originalFetch;
	});

	it("asks the app's LiveKit route for the room and returns its answer", async () => {
		fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ token: 'livekit-token' }) });

		await expect(tokenLiveKitRoom({ roomName: 'team room' })).resolves.toEqual({ token: 'livekit-token' });
		expect(fetchMock).toHaveBeenCalledWith('/api/livekit?roomName=team+room');
	});

	it('rejects with the status of a refused or failed request', async () => {
		fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: 'Unavailable' }) });

		await expect(tokenLiveKitRoom({ roomName: 'room' })).rejects.toMatchObject({ status: 503 });
	});
});

/**
 * @jest-environment jsdom
 */
/**
 * The meet provider (NEXT_PUBLIC_MEET_TYPE) is read from the RUNTIME env, so a published Docker image can
 * switch between Jitsi and LiveKit with `docker run -e`, not only with a rebuild. The build-time value
 * (simulated by process.env, which the `process.env.NEXT_PUBLIC_X` fallback reads under Jest) is only a
 * fallback, and 'Jitsi' stays the default.
 *
 * The board button opens the board app with the picked people and the origin of this deployment, so the board signs
 * the person in here (demo., stage. or app.ever.team) rather than on a default deployment.
 */
import { act, renderHook } from '@testing-library/react';
import { Buffer } from 'node:buffer';
import { useCollaborative } from './use-collaborative';

const GLOBAL = '__EVER_TEAMS_RUNTIME_ENV__';
const ORIGINAL_ENV = process.env;
const mockPush = jest.fn();
let mockMembers: { id: string }[] = [];
let mockBoardAppDomain = '';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('nanoid', () => ({ nanoid: () => 'room0123456789a' }));
jest.mock('jotai', () => ({
	// The active team's name (activeTeamNameState)
	useAtomValue: () => 'Core Team',
	// The picked people (collaborativeMembersState); the select mode (collaborativeSelectState) is off
	useAtom: (atom: string) => [atom === 'collaborativeMembersState' ? mockMembers : false, jest.fn()]
}));
jest.mock('@/core/stores', () => ({
	activeTeamNameState: 'activeTeamNameState',
	collaborativeMembersState: 'collaborativeMembersState',
	collaborativeSelectState: 'collaborativeSelectState'
}));
jest.mock('@/core/constants/config/constants', () => ({
	BOARD_APP_DOMAIN: {
		get value() {
			return mockBoardAppDomain;
		}
	}
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: undefined }) }));
// The LiveKit room preload (a chunk download in the app) is not what these tests are about
jest.mock('@/core/components/optimized-components/meet', () => ({ preloadLiveKit: jest.fn() }));

/** Clicks "meet" and returns the path the hook navigated to. */
function meetPath(): string {
	const { result } = renderHook(() => useCollaborative());
	act(() => result.current.onMeetClick());
	expect(mockPush).toHaveBeenCalledTimes(1);
	return mockPush.mock.calls[0][0];
}

beforeAll(() => {
	// onMeetClick base64-encodes the room name with Buffer, which jsdom does not provide.
	(globalThis as Record<string, unknown>).Buffer ??= Buffer;
});

beforeEach(() => {
	mockMembers = [];
	mockBoardAppDomain = '';
	process.env = { ...ORIGINAL_ENV };
	delete process.env.NEXT_PUBLIC_MEET_TYPE;
	// The server always injects the runtime env in the browser; tests set its content.
	(globalThis as Record<string, unknown>)[GLOBAL] = {};
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
	delete (globalThis as Record<string, unknown>)[GLOBAL];
});

describe('useCollaborative meet type', () => {
	it('opens LiveKit when the runtime env says so, even over a build-time Jitsi', () => {
		process.env.NEXT_PUBLIC_MEET_TYPE = 'Jitsi';
		(globalThis as Record<string, unknown>)[GLOBAL] = { NEXT_PUBLIC_MEET_TYPE: 'LiveKit' };

		expect(meetPath()).toMatch(/^\/meet\/livekit\?roomName=/);
	});

	it('opens Jitsi when the runtime env says so, even over a build-time LiveKit', () => {
		process.env.NEXT_PUBLIC_MEET_TYPE = 'LiveKit';
		(globalThis as Record<string, unknown>)[GLOBAL] = { NEXT_PUBLIC_MEET_TYPE: 'Jitsi' };

		expect(meetPath()).toMatch(/^\/meet\/jitsi\?room=/);
	});

	it('matches "jitsi" case-insensitively (the docker-compose files used to write it lowercase)', () => {
		(globalThis as Record<string, unknown>)[GLOBAL] = { NEXT_PUBLIC_MEET_TYPE: 'jitsi' };

		expect(meetPath()).toMatch(/^\/meet\/jitsi\?room=/);
	});

	it('opens LiveKit for any other meet type, whatever its case', () => {
		(globalThis as Record<string, unknown>)[GLOBAL] = { NEXT_PUBLIC_MEET_TYPE: 'livekit' };

		expect(meetPath()).toMatch(/^\/meet\/livekit\?roomName=/);
	});

	it('falls back to the build-time meet type when the runtime env does not set it', () => {
		process.env.NEXT_PUBLIC_MEET_TYPE = 'LiveKit';

		expect(meetPath()).toMatch(/^\/meet\/livekit\?roomName=/);
	});

	it('defaults to Jitsi when the meet type is set nowhere', () => {
		const path = meetPath();

		expect(path).toMatch(/^\/meet\/jitsi\?room=/);
		// The room name is the random part only (no team members / authenticated user in this test).
		expect(Buffer.from(decodeURIComponent(path.split('=')[1]), 'base64').toString()).toBe('room0123456789a');
	});
});

describe('useCollaborative board', () => {
	let open: jest.SpyInstance;

	beforeEach(() => {
		open = jest.spyOn(window, 'open').mockImplementation(() => null);
	});

	afterEach(() => {
		open.mockRestore();
	});

	function clickBoard() {
		const { result } = renderHook(() => useCollaborative());
		act(() => result.current.onBoardClick());
	}

	it('opens the board app with the picked people and the origin of this deployment', () => {
		mockMembers = [{ id: 'member-1' }, { id: 'member-2' }];
		mockBoardAppDomain = 'https://board.ever.team';

		clickBoard();

		expect(open).toHaveBeenCalledTimes(1);
		const [href, target, features] = open.mock.calls[0];
		const url = new URL(href);
		expect([target, features]).toEqual(['_blank', 'noreferrer']);
		expect(url.origin).toBe('https://board.ever.team');
		expect(url.searchParams.get('live')).toBe('true');
		expect(atob(url.searchParams.get('members') ?? '')).toBe('member-1,member-2');
		expect(url.searchParams.get('origin')).toBe(window.location.origin);
		expect(mockPush).not.toHaveBeenCalled();
	});

	it('opens the in-app board when nobody is picked', () => {
		mockBoardAppDomain = 'https://board.ever.team';

		clickBoard();

		expect(mockPush).toHaveBeenCalledWith('/board');
		expect(open).not.toHaveBeenCalled();
	});

	it('opens the in-app board, without throwing, when the board app setting is no address', () => {
		mockMembers = [{ id: 'member-1' }];
		mockBoardAppDomain = 'board.ever.team';

		clickBoard();

		expect(mockPush).toHaveBeenCalledWith('/board');
		expect(open).not.toHaveBeenCalled();
	});
});

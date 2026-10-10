/**
 * @jest-environment jsdom
 */
/**
 * The Ever Platform section's render rules: the connection parts only when available; the statistics
 * card with the operator's switch and last payload for the operator, the managed text and the docs
 * link for everyone else, nothing when this web app runs without its statistics module; and no
 * section at all on a demo deployment or for someone who is not a team manager.
 */
import { fireEvent, render, renderHook, screen } from '@testing-library/react';

const mockStatsView = jest.fn();
const mockStatsLast = jest.fn();
const mockSetEnabled = { mutate: jest.fn(), isPending: false, isError: false, variables: undefined as boolean | undefined };
const mockConnectAvailable = jest.fn();
let mockDemo = false;

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/constants/config/constants', () => ({
	get IS_DEMO_MODE() {
		return mockDemo;
	}
}));
jest.mock('@/core/hooks/ever-platform/use-ever-stats', () => ({
	useEverStatsView: (...args: unknown[]) => mockStatsView(...args),
	useEverStatsLast: (...args: unknown[]) => mockStatsLast(...args),
	useSetEverStatsEnabled: () => mockSetEnabled
}));
jest.mock('@/core/hooks/ever-platform/use-ever-connect', () => ({
	useEverConnectAvailable: (...args: unknown[]) => mockConnectAvailable(...args),
	useEverConnectData: () => ({
		scope: { organizationId: 'org-1' },
		status: { data: { link: null }, isError: false },
		integrations: {
			data: [
				{
					key: 'stats_link',
					name: 'Statistics link',
					description: 'Links the anonymous statistics of this installation.',
					instance_wide: true,
					app_ever_co_only: false,
					scope_version: 1,
					scope: [{ field_path: 'stats.instance_id', direction: 'out', form: 'id', frequency: 'once', purpose: 'p', retention: 'r' }],
					state: 'not_linked',
					enabled: false,
					policy: 'allowed'
				}
			],
			isError: false
		},
		entitlement: { data: { instance: null, link: null }, isError: false }
	}),
	useEverConnectActions: () => {
		const idle = { mutate: jest.fn(), isPending: false, isError: false };
		return {
			refreshIntegrations: idle,
			openConsent: idle,
			disableIntegration: idle,
			refreshEntitlement: idle,
			addLink: idle,
			removeLink: idle
		};
	}
}));

import { EverPlatformSection } from './ever-platform-section';
import { useEverPlatformSection } from '@/core/hooks/ever-platform/use-ever-platform-section';

const OPERATOR_STATUS = {
	enabled: true,
	reason: null,
	install_source: 'self-hosted',
	serves: ['gauzy', 'teams'],
	country: 'ZZ',
	next_send_at: '2026-11-03T04:05:06.000Z',
	schema_url: 'https://schema.example.test',
	teams: { reporter: 'running', next_send_at: '2026-11-03T05:00:00.000Z' }
};

beforeEach(() => {
	mockDemo = false;
	mockStatsView.mockReset();
	mockStatsLast.mockReset();
	mockConnectAvailable.mockReset();
	mockSetEnabled.mutate.mockReset();
	mockStatsLast.mockReturnValue({ isLoading: false, data: null });
	mockConnectAvailable.mockReturnValue({ available: false, connected: false, isLoading: false });
});

describe('EverPlatformSection', () => {
	it('shows the connection parts only when they are available', () => {
		mockStatsView.mockReturnValue({ data: { kind: 'off' } });
		const { rerender } = render(<EverPlatformSection connectAvailable={false} connected={false} />);
		expect(screen.queryByTestId('ever-connect-panel')).toBeNull();
		expect(screen.queryByTestId('ever-connect-not-connected')).toBeNull();

		rerender(<EverPlatformSection connectAvailable connected />);
		expect(screen.getByTestId('ever-connect-panel')).toBeTruthy();
		expect(screen.getByText('pages.settingsTeam.everPlatform.MANAGE_IN_APP')).toBeTruthy();
		// No connection tab: connecting the installation belongs to the API's own settings.
		expect(screen.queryByText(/disconnect/i)).toBeNull();

		rerender(<EverPlatformSection connectAvailable connected={false} />);
		expect(screen.getByTestId('ever-connect-not-connected')).toBeTruthy();
	});

	it('gives the operator the switch, the next report and the last payload', () => {
		mockStatsView.mockReturnValue({ data: { kind: 'operator', status: OPERATOR_STATUS } });
		mockStatsLast.mockReturnValue({
			isLoading: false,
			data: {
				api: null,
				teams: {
					last: [{ payload: '{"schema":"ever.stats.v1"}', sent_at: '2026-11-02T10:00:00.000Z', http_status: 202, outcome: 'sent', period: '2026-11' }]
				}
			}
		});
		render(<EverPlatformSection connectAvailable={false} connected={false} />);
		expect(screen.getByTestId('ever-stats-toggle')).toBeTruthy();
		expect(screen.getByTestId('ever-stats-web-reporter').textContent).toContain('running');
		expect(screen.queryByTestId('ever-stats-managed')).toBeNull();

		fireEvent.click(screen.getByText('pages.settingsTeam.everPlatform.STATS_LAST_PAYLOAD'));
		expect(screen.getByTestId('ever-stats-last-payload').querySelector('pre')?.textContent).toContain('ever.stats.v1');

		fireEvent.click(screen.getByTestId('ever-stats-toggle'));
		expect(mockSetEnabled.mutate).toHaveBeenCalledWith(false);
	});

	it.each([
		['operator', 'pages.settingsTeam.everPlatform.STATS_MANAGED_OPERATOR'],
		['ever_cloud', 'pages.settingsTeam.everPlatform.STATS_MANAGED_CLOUD']
	])('shows everyone else who manages the statistics (%s), and no payload', (managedBy, text) => {
		mockStatsView.mockReturnValue({ data: { kind: 'managed', managedBy } });
		const { container } = render(<EverPlatformSection connectAvailable={false} connected={false} />);
		expect(screen.getByText(text)).toBeTruthy();
		expect(screen.queryByTestId('ever-stats-toggle')).toBeNull();
		expect(container.querySelector('pre')).toBeNull();
		// The docs link points at the public documentation, never at an Ever Platform host.
		const link = screen.getByText('pages.settingsTeam.everPlatform.STATS_DOCS_LINK').closest('a');
		expect(link?.getAttribute('href')).toMatch(/^https:\/\/github\.com\/ever-co\/ever-teams\//);
	});

	it('renders no statistics card when this web app runs without its statistics module', () => {
		mockStatsView.mockReturnValue({ data: { kind: 'off' } });
		render(<EverPlatformSection connectAvailable={false} connected={false} />);
		expect(screen.queryByTestId('ever-stats-card')).toBeNull();
	});
});

describe('useEverPlatformSection', () => {
	it('shows for a team manager when the statistics module answers', () => {
		mockStatsView.mockReturnValue({ data: { kind: 'managed', managedBy: 'operator' } });
		const { result } = renderHook(() => useEverPlatformSection(true));
		expect(result.current.visible).toBe(true);
		expect(mockStatsView).toHaveBeenCalledWith(true);
		expect(mockConnectAvailable).toHaveBeenCalledWith(true);
	});

	it('shows for a team manager when only the connection parts are available', () => {
		mockStatsView.mockReturnValue({ data: { kind: 'off' } });
		mockConnectAvailable.mockReturnValue({ available: true, connected: true, isLoading: false });
		expect(renderHook(() => useEverPlatformSection(true)).result.current.visible).toBe(true);
	});

	it('hides, and asks nothing, for someone who is not a team manager', () => {
		mockStatsView.mockReturnValue({ data: undefined });
		const { result } = renderHook(() => useEverPlatformSection(false));
		expect(result.current.visible).toBe(false);
		expect(mockStatsView).toHaveBeenCalledWith(false);
		expect(mockConnectAvailable).toHaveBeenCalledWith(false);
	});

	it('hides, and asks nothing, on a demo deployment', () => {
		mockDemo = true;
		mockStatsView.mockReturnValue({ data: undefined });
		mockConnectAvailable.mockReturnValue({ available: false, connected: false, isLoading: false });
		const { result } = renderHook(() => useEverPlatformSection(true));
		expect(result.current.visible).toBe(false);
		expect(mockStatsView).toHaveBeenCalledWith(false);
		expect(mockConnectAvailable).toHaveBeenCalledWith(false);
	});

	it('hides when neither part answers', () => {
		mockStatsView.mockReturnValue({ data: { kind: 'off' } });
		expect(renderHook(() => useEverPlatformSection(true)).result.current.visible).toBe(false);
	});
});

/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import type { TimeSplitState } from '@/core/hooks/dashboards/use-time-split';
import { splitRowsOf, type TimeSplitItem } from '@/core/lib/utils/dashboards/time-split';

jest.mock('next-intl', () => ({
	useLocale: () => 'en',
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (values && 'count' in values) {
			return `${key}:${values.count}`;
		}
		return key;
	}
}));

import { TimeSplitBody, TimeSplitSwitch, timeSplitMetaOf } from './time-split';

const HOUR = 3600;

function itemOf(key: string, name: string | null, seconds: number, isNone = false): TimeSplitItem {
	return { key, name, imageUrl: null, color: null, isNone, seconds };
}

const PROJECT_ITEMS = [
	itemOf('a', 'Project A', 30 * HOUR),
	itemOf('b', 'Project B', 10 * HOUR),
	itemOf('no-project', null, 2 * HOUR, true)
];

function splitOf(overrides: Partial<TimeSplitState> = {}): TimeSplitState {
	return {
		mode: 'project',
		setMode: jest.fn(),
		canSplitByClient: true,
		rows: splitRowsOf(PROJECT_ITEMS),
		totalSeconds: 42 * HOUR,
		namedCount: 2,
		isClientLookupPending: false,
		isClientLookupError: false,
		retryClientLookup: jest.fn(),
		...overrides
	};
}

const noop = () => undefined;

beforeAll(() => {
	// The error notice reads the reduced-motion preference, which jsdom does not implement
	window.matchMedia = jest.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
});

describe('TimeSplitBody', () => {
	it('shows each project with its share, the time without a project by its name, and the total', () => {
		render(<TimeSplitBody split={splitOf()} isLoading={false} isError={false} onRetry={noop} />);

		expect(screen.getByText('Project A')).toBeTruthy();
		expect(screen.getByText('71%')).toBeTruthy();
		expect(screen.getByText('24%')).toBeTruthy();
		expect(screen.getByText('5%')).toBeTruthy();
		expect(screen.getByText('dashboard.team.projects.NONE')).toBeTruthy();
		expect(screen.getByText('dashboard.team.export.TOTAL')).toBeTruthy();
		expect(screen.getByText('42h 0m')).toBeTruthy();
	});

	it('names the time without a client, and gathers the smallest clients', () => {
		const clients = [
			...[5, 4, 3, 2, 1, 1].map((hours, index) => itemOf(`c${index}`, `Client ${index}`, hours * HOUR)),
			itemOf('none', null, HOUR, true)
		];
		const split = splitOf({ mode: 'client', rows: splitRowsOf(clients) });

		render(<TimeSplitBody split={split} isLoading={false} isError={false} onRetry={noop} />);

		expect(screen.getByText('common.NO_CLIENT')).toBeTruthy();
		expect(screen.getByText('dashboard.team.projects.OTHER_CLIENTS:2')).toBeTruthy();
	});

	it('says so when nothing is tracked, in the words of the split', () => {
		const empty = splitOf({ rows: [], totalSeconds: 0, namedCount: 0 });
		const { rerender } = render(<TimeSplitBody split={empty} isLoading={false} isError={false} onRetry={noop} />);
		expect(screen.getByText('dashboard.team.projects.EMPTY')).toBeTruthy();

		rerender(
			<TimeSplitBody split={{ ...empty, mode: 'client' }} isLoading={false} isError={false} onRetry={noop} />
		);
		expect(screen.getByText('dashboard.team.projects.CLIENTS_EMPTY')).toBeTruthy();
	});

	it('offers to try again when the report or the clients could not be read', () => {
		const onRetry = jest.fn();
		const { rerender } = render(<TimeSplitBody split={splitOf()} isLoading={false} isError onRetry={onRetry} />);
		fireEvent.click(screen.getByText('pages.unauthorized.TRY_AGAIN'));
		expect(onRetry).toHaveBeenCalledTimes(1);

		const split = splitOf({ mode: 'client', isClientLookupError: true });
		rerender(<TimeSplitBody split={split} isLoading={false} isError={false} onRetry={onRetry} />);
		expect(screen.getByText('dashboard.team.projects.CLIENTS_ERROR')).toBeTruthy();
		fireEvent.click(screen.getByText('pages.unauthorized.TRY_AGAIN'));
		expect(split.retryClientLookup).toHaveBeenCalledTimes(1);
	});

	it('shows no rows while the report or the clients load', () => {
		render(
			<TimeSplitBody
				split={splitOf({ isClientLookupPending: true })}
				isLoading={false}
				isError={false}
				onRetry={noop}
			/>
		);

		expect(screen.queryByText('Project A')).toBeNull();
	});
});

describe('TimeSplitSwitch', () => {
	it('switches to the split by client', () => {
		const split = splitOf();
		render(<TimeSplitSwitch split={split} />);

		fireEvent.click(screen.getByText('dashboard.team.projects.BY_CLIENT'));

		expect(split.setMode).toHaveBeenCalledWith('client');
	});

	it('is absent for someone who may not read clients', () => {
		const { container } = render(<TimeSplitSwitch split={splitOf({ canSplitByClient: false })} />);

		expect(container.textContent).toBe('');
	});
});

describe('timeSplitMetaOf', () => {
	it('counts the projects or the clients that hold time', () => {
		const fake = (key: string, values?: Record<string, unknown>) => `${key}:${values?.count}`;
		const t = fake as unknown as Parameters<typeof timeSplitMetaOf>[1];

		expect(timeSplitMetaOf(splitOf(), t)).toBe('dashboard.team.projects.COUNT:2');
		expect(timeSplitMetaOf(splitOf({ mode: 'client', namedCount: 1 }), t)).toBe('clientGrouping.CLIENTS:1');
		expect(timeSplitMetaOf(splitOf({ rows: [] }), t)).toBeNull();
	});
});

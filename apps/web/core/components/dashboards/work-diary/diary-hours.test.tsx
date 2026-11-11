/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import type { DiaryDay, DiarySlot } from '@/core/lib/utils/dashboards/work-diary';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values && Object.keys(values).length > 0 ? `${key}:${JSON.stringify(values)}` : key
}));
jest.mock('next/image', () => ({
	__esModule: true,
	default: ({ alt, src, onError }: { alt: string; src: string; onError?: () => void }) => (
		<img alt={alt} src={src} onError={onError} />
	)
}));
jest.mock('@/core/components/pages/profile/tracking-source-empty-state', () => ({
	TrackingSourceEmptyState: ({ label }: { label: string }) => <p>{label}</p>
}));

import { DiaryBody } from './diary-hours';

const TIME = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' });
const HOUR = new Intl.DateTimeFormat('en', { hour: 'numeric' });

function dayWithShot(thumbUrl: string, date: number): DiaryDay {
	const slot: DiarySlot = {
		id: `slot-${date}`,
		start: new Date(2026, 10, date, 9, 0),
		end: new Date(2026, 10, date, 9, 10),
		seconds: 600,
		activityPercent: 60,
		shots: [{ id: `shot-${date}`, thumbUrl, fullUrl: thumbUrl, recordedAt: null }]
	};
	return {
		hours: [{ hour: 9, seconds: 600, positions: [slot, null, null, null, null, null] }],
		seconds: 600,
		slotCount: 1,
		shotCount: 1,
		activityPercent: 60
	};
}

function renderDay(diary: DiaryDay) {
	return (
		<DiaryBody
			diary={diary}
			activities={[]}
			dayText="Mon, Nov 9"
			timeFormat={TIME}
			hourFormat={HOUR}
			onOpen={jest.fn()}
		/>
	);
}

describe('DiaryBody', () => {
	it("gives another day's screenshot in the same place a fresh try after the last one failed to load", () => {
		const { rerender } = render(renderDay(dayWithShot('https://shots.example/monday.png', 9)));
		fireEvent.error(screen.getByRole('img'));
		expect(screen.queryByRole('img')).toBeNull();

		rerender(renderDay(dayWithShot('https://shots.example/tuesday.png', 10)));

		expect(screen.getByRole('img').getAttribute('src')).toBe('https://shots.example/tuesday.png');
	});
});

/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { shareRowsOf } from '@/core/lib/utils/dashboard-figures';

jest.mock('next-intl', () => ({ useLocale: () => 'en' }));

import { ShareRows } from './share-rows';

const ROWS = shareRowsOf(
	[{ name: 'A project with a long name', seconds: 3 }],
	(item) => item.seconds,
	(item) => item.name,
	4
);

function renderRows(density?: 'regular' | 'narrow' | 'compact') {
	return render(
		<ShareRows
			rows={ROWS}
			renderName={(item) => <span>{item.name}</span>}
			formatValue={String}
			otherLabel={String}
			density={density}
		/>
	);
}

describe('ShareRows', () => {
	it('draws a meter on each row by default', () => {
		const { container } = renderRows();

		expect(screen.getByText('A project with a long name')).toBeTruthy();
		expect(container.querySelectorAll('li > span[aria-hidden="true"]')).toHaveLength(1);
	});

	it('leaves the meter out when compact, so a narrow card gives the name the room', () => {
		const { container } = renderRows('compact');

		expect(screen.getByText('A project with a long name')).toBeTruthy();
		expect(container.querySelectorAll('li > span[aria-hidden="true"]')).toHaveLength(0);
		expect(container.querySelector('li')?.className).toContain('grid-cols-[2.75rem_minmax(0,1fr)_5.5rem]');
	});
});

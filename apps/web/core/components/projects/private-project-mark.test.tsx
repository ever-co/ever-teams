/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { PrivateProjectMark } from './private-project-mark';

const HINT = 'Only its members and managers see this project';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => {
		if (key === 'pages.projects.visibility.PRIVATE_HINT') {
			return HINT;
		}
		return key;
	}
}));

describe('the lock beside a private project name', () => {
	it.each([
		['everyone sees', true],
		['never chose', null]
	])('is not shown for a project %s', (_case, isPublic) => {
		const { container } = render(<PrivateProjectMark project={{ public: isPublic }} />);

		expect(container.innerHTML).toBe('');
	});

	it('tells assistive technology why, and can be focused to show it on the project page', () => {
		render(<PrivateProjectMark project={{ public: false }} />);

		const mark = screen.getByRole('img', { name: HINT });
		expect(mark.getAttribute('tabindex')).toBe('0');
	});

	it('takes no focus of its own inside a link, which carries the sentence in its name', () => {
		render(
			<a href="/projects/project-1">
				Client X redesign
				<PrivateProjectMark project={{ public: false }} isFocusable={false} />
			</a>
		);

		expect(screen.getByRole('img', { name: HINT }).hasAttribute('tabindex')).toBe(false);
		expect(screen.getByRole('link').textContent).toContain('Client X redesign');
	});
});

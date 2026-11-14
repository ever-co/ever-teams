/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'jotai';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/components/common/input', () => ({ controlGroupRecipe: 'control-group' }));
jest.mock('@/core/components/common/command', () => ({ commandKeycapClass: 'keycap' }));
jest.mock('@/core/components/icons', () => ({ Search: () => null, X: () => null }));

import { useAnsweredKeySet } from '@/core/hooks/keyboard/use-answered-keys';
import { TaskSearchField } from './task-search-field';

function AnsweredKeys() {
	const answered = useAnsweredKeySet();
	return <output data-testid="answered">{[...answered].join(' ')}</output>;
}

function renderSearch(focusKey: boolean) {
	render(
		<Provider>
			<TaskSearchField value="" onChange={jest.fn()} placeholder="Search tasks" focusKey={focusKey} />
			<AnsweredKeys />
		</Provider>
	);
}

describe('TaskSearchField', () => {
	it('tells the shortcuts sheet it answers / while its focus key is on', () => {
		renderSearch(true);
		expect(screen.getByTestId('answered').textContent).toBe('taskSearchFocus');
	});

	it('answers nothing without its focus key', () => {
		renderSearch(false);
		expect(screen.getByTestId('answered').textContent).toBe('');
	});
});

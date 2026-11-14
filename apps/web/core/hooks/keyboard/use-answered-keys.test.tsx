/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import { useAnsweredKeys, useAnsweredKeySet } from './use-answered-keys';

function Answering({ ids, isListening }: Readonly<{ ids: readonly string[]; isListening?: boolean }>) {
	useAnsweredKeys(ids, isListening);
	return null;
}

function AnsweredKeys() {
	const answered = useAnsweredKeySet();
	const sorted = [...answered].sort((first, second) => first.localeCompare(second));
	return <output data-testid="answered">{sorted.join(' ')}</output>;
}

function answeredText(): string {
	return screen.getByTestId('answered').textContent ?? '';
}

describe('useAnsweredKeys', () => {
	it('answers its keys while its listener is installed, and none once it stops', () => {
		const { rerender } = render(
			<Provider>
				<Answering ids={['chatNext', 'chatPrevious']} />
				<AnsweredKeys />
			</Provider>
		);
		expect(answeredText()).toBe('chatNext chatPrevious');

		rerender(
			<Provider>
				<Answering ids={['chatNext', 'chatPrevious']} isListening={false} />
				<AnsweredKeys />
			</Provider>
		);
		expect(answeredText()).toBe('');
	});

	it('keeps a key two components answer until both are gone', () => {
		const { rerender } = render(
			<Provider>
				<Answering ids={['listClear']} />
				<Answering ids={['listClear', 'listDown']} />
				<AnsweredKeys />
			</Provider>
		);
		expect(answeredText()).toBe('listClear listDown');

		rerender(
			<Provider>
				<Answering ids={['listClear']} />
				<AnsweredKeys />
			</Provider>
		);
		expect(answeredText()).toBe('listClear');
	});
});

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { AppQueryProvider } from './query-provider';

describe('AppQueryProvider', () => {
	it('keeps the same client, and its cache, when the app renders again', async () => {
		const seen: QueryClient[] = [];
		function Reader() {
			seen.push(useQueryClient());
			return <Text>reader</Text>;
		}

		const screen = await render(
			<AppQueryProvider>
				<Reader />
			</AppQueryProvider>
		);
		await screen.rerender(
			<AppQueryProvider>
				<Reader />
			</AppQueryProvider>
		);

		expect(seen.length).toBeGreaterThan(1);
		expect(new Set(seen).size).toBe(1);
	});
});

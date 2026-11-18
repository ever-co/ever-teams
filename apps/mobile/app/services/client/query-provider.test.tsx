import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { AppQueryProvider, queryClient } from './query-provider';

describe('AppQueryProvider', () => {
	it('keeps the same client, and its cache, when the app renders again', async () => {
		const seen: QueryClient[] = [];
		function Reader() {
			seen.push(useQueryClient());
			return <Text>reader</Text>;
		}

		const screen = await render(
			<AppQueryProvider signedIn>
				<Reader />
			</AppQueryProvider>
		);
		await screen.rerender(
			<AppQueryProvider signedIn>
				<Reader />
			</AppQueryProvider>
		);

		expect(seen.length).toBeGreaterThan(1);
		expect(new Set(seen).size).toBe(1);
	});

	it('forgets the cached answers when the person signs out', async () => {
		const screen = await render(
			<AppQueryProvider signedIn>
				<Text>signed in</Text>
			</AppQueryProvider>
		);
		queryClient.setQueryData(['user'], { email: 'kofi.arden@example.com' });

		await screen.rerender(
			<AppQueryProvider signedIn={false}>
				<Text>signed out</Text>
			</AppQueryProvider>
		);

		expect(queryClient.getQueryData(['user'])).toBeUndefined();
	});
});

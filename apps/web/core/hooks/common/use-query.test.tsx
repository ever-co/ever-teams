/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { useQueryCall } from './use-query';

describe('useQueryCall', () => {
	it('executes the latest scoped callback after a scope change', async () => {
		const calls: string[] = [];
		const { result, rerender } = renderHook(
			({ scope }) =>
				useQueryCall(async (taskId: string) => {
					calls.push(`${scope}:${taskId}`);
					return scope;
				}, true),
			{ initialProps: { scope: 'team-a' } }
		);

		rerender({ scope: 'team-b' });
		await act(async () => {
			await result.current.queryCall('task-1');
		});

		expect(calls).toEqual(['team-b:task-1']);
	});

	it('preserves the initial-callback behavior unless latest scope is requested', async () => {
		const calls: string[] = [];
		const { result, rerender } = renderHook(
			({ scope }) =>
				useQueryCall(async (taskId: string) => {
					calls.push(`${scope}:${taskId}`);
					return scope;
				}),
			{ initialProps: { scope: 'team-a' } }
		);

		rerender({ scope: 'team-b' });
		await act(async () => {
			await result.current.queryCall('task-1');
		});

		expect(calls).toEqual(['team-a:task-1']);
	});
});

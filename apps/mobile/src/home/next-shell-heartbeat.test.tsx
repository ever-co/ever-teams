import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { runningTimeWriter } from '../../app/services/hooks/running-time-writer';
import { queryClient } from '../data/query-client';
import { runAsBuild } from '../../test/app-shell';
import { followRun, forgetRun, writeRunTime } from './heartbeat';
import { heartbeatOfTheCurrentScreens, NextShellHeartbeat } from './next-shell-heartbeat';

jest.mock('../navigation/next-shell-build', () => jest.requireActual('../../test/app-shell').nextShellBuildStandIn);
jest.mock('./run-heartbeat', () => {
	const { createElement } = jest.requireActual('react');
	const { Text } = jest.requireActual('react-native');
	return { RunHeartbeat: () => createElement(Text, null, 'heartbeat') };
});
jest.mock('../data/query-client', () => {
	const { QueryClient } = jest.requireActual('@tanstack/react-query');
	return { queryClient: new QueryClient() };
});

describe("the new app's heartbeat", () => {
	it('runs in builds of the new app', async () => {
		runAsBuild('next');

		await render(<NextShellHeartbeat />);

		expect(screen.getByText('heartbeat')).toBeTruthy();
	});

	it('stays out of the app people install, where the current screens write the running time', async () => {
		runAsBuild(undefined);

		await render(<NextShellHeartbeat />);

		expect(screen.queryByText('heartbeat')).toBeNull();
	});

	it("is told the current screens' start and stop in builds of the new app, and no longer once it is gone", async () => {
		runAsBuild('next');

		const view = await render(<NextShellHeartbeat />);
		expect(runningTimeWriter()).toBe(heartbeatOfTheCurrentScreens);

		await view.unmount();
		expect(runningTimeWriter()).toBeNull();
	});

	it('is told nothing in the app people install', async () => {
		runAsBuild(undefined);

		await render(<NextShellHeartbeat />);

		expect(runningTimeWriter()).toBeNull();
	});
});

describe("what the current screens' start and stop tell the new heartbeat", () => {
	afterEach(() => {
		forgetRun();
		jest.restoreAllMocks();
	});

	it('writes, before their stop, the time of that run since the last heartbeat', async () => {
		followRun('log-1', Date.now() - 20_000);
		const write = jest.fn(() => Promise.resolve());

		await heartbeatOfTheCurrentScreens.beforeStop({ id: 'log-1' }, write);

		expect(write).toHaveBeenCalledTimes(1);
		expect(write).toHaveBeenCalledWith(20);
	});

	it('writes nothing before the stop of a run it does not follow, and a refused write does not fail the stop', async () => {
		followRun('log-1', Date.now() - 20_000);
		const refused = jest.fn(() => Promise.reject(new Error('refused')));

		await heartbeatOfTheCurrentScreens.beforeStop({ id: 'log-2' }, refused);
		expect(refused).not.toHaveBeenCalled();

		await expect(heartbeatOfTheCurrentScreens.beforeStop({ id: 'log-1' }, refused)).resolves.toBeUndefined();
	});

	it('reads the timer again after their start or stop, instead of at its next read', () => {
		const readAgain = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

		heartbeatOfTheCurrentScreens.afterStart({ id: 'log-1' });
		heartbeatOfTheCurrentScreens.afterStop({ id: 'log-1' });

		expect(readAgain).toHaveBeenCalledTimes(2);
		expect(readAgain).toHaveBeenCalledWith({ queryKey: ['home', 'timer-status'] });
	});

	it("follows a run they started from the start's answer: a stop before the next read of the timer writes its time", async () => {
		jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
		const startedAt = Date.now();
		const now = jest.spyOn(Date, 'now').mockReturnValue(startedAt);
		heartbeatOfTheCurrentScreens.afterStart({ id: 'log-3' });
		// the read of the timer the start asked for has not answered yet when the person stops, 15 seconds later
		now.mockReturnValue(startedAt + 15_000);
		const write = jest.fn(() => Promise.resolve());

		await heartbeatOfTheCurrentScreens.beforeStop({ id: 'log-3' }, write);

		expect(write).toHaveBeenCalledWith(15);
	});

	it('lets go of a run they stopped: no heartbeat writes it again before the next read of the timer', async () => {
		jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
		followRun('log-4', Date.now() - 40_000);
		const write = jest.fn(() => Promise.resolve());
		await heartbeatOfTheCurrentScreens.beforeStop({ id: 'log-4' }, write);

		heartbeatOfTheCurrentScreens.afterStop({ id: 'log-4' });
		await writeRunTime(write, Date.now() + 60_000);

		expect(write).toHaveBeenCalledTimes(1);
		expect(write).toHaveBeenCalledWith(40);
	});

	it('keeps following a run whose stop failed, which goes on running', async () => {
		jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
		const startedAt = Date.now();
		followRun('log-5', startedAt);

		heartbeatOfTheCurrentScreens.afterStop(undefined);
		const write = jest.fn(() => Promise.resolve());
		await writeRunTime(write, startedAt + 60_000);

		expect(write).toHaveBeenCalledWith(60);
	});
});

import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { followAppState, followConnection } from './query-client';

jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn(() => jest.fn()) }));

describe('the query client', () => {
	it('pauses queries while the phone has no connection', () => {
		followConnection();
		const listener = jest.mocked(NetInfo.addEventListener).mock.calls[0][0] as (state: {
			isConnected: boolean;
		}) => void;

		listener({ isConnected: false });
		expect(onlineManager.isOnline()).toBe(false);

		listener({ isConnected: true });
		expect(onlineManager.isOnline()).toBe(true);
	});

	it('refetches when the app comes back to the foreground', () => {
		const remove = jest.fn();
		const addEventListener = jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove } as never);
		const stop = followAppState();
		const onChange = addEventListener.mock.calls[0][1] as (status: string) => void;

		onChange('background');
		expect(focusManager.isFocused()).toBe(false);
		onChange('active');
		expect(focusManager.isFocused()).toBe(true);

		stop();
		expect(remove).toHaveBeenCalled();
	});
});

/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('livekit-client', () => ({
	LocalAudioTrack: class {},
	Track: { Source: { Camera: 'camera', Microphone: 'microphone' } }
}));
jest.mock('@livekit/components-react', () => ({
	useMaybeLayoutContext: () => null,
	useLocalParticipant: () => ({ microphoneTrack: undefined }),
	MediaDeviceMenu: () => null,
	TrackToggle: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>
}));

import { NoiseFilterChoiceContext, SettingsMenu } from './settings-livekit';

describe('SettingsMenu', () => {
	it('starts with the background noise filter the person chose in the video and audio settings', () => {
		render(
			<NoiseFilterChoiceContext.Provider value={false}>
				<SettingsMenu />
			</NoiseFilterChoiceContext.Provider>
		);

		fireEvent.click(screen.getByRole('tab', { name: 'meetings.EFFECTS' }));

		expect(screen.getByRole('switch', { name: 'meetings.NOISE_FILTER' }).getAttribute('aria-checked')).toBe(
			'false'
		);
	});

	it('starts with the filter on when nothing was chosen', () => {
		render(<SettingsMenu />);

		fireEvent.click(screen.getByRole('tab', { name: 'meetings.EFFECTS' }));

		expect(screen.getByRole('switch', { name: 'meetings.NOISE_FILTER' }).getAttribute('aria-checked')).toBe('true');
	});
});

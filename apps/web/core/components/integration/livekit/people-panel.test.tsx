/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';

type FakeParticipant = { identity: string; name?: string; isLocal: boolean; muted: boolean; speaking: boolean };

let mockParticipants: FakeParticipant[] = [];

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: { name?: string }) => (values?.name ? `${key}:${values.name}` : key)
}));
jest.mock('livekit-client', () => ({ Track: { Source: { Microphone: 'microphone' } } }));
jest.mock('@livekit/components-react', () => ({
	useParticipants: () => mockParticipants,
	useIsMuted: ({ participant }: { participant: FakeParticipant }) => participant.muted,
	useIsSpeaking: (participant: FakeParticipant) => participant.speaking
}));

import { PeoplePanel } from './people-panel';

describe('PeoplePanel', () => {
	it('lists everyone in the room, oneself marked, with whether their microphone is on', () => {
		mockParticipants = [
			{ identity: 'me', name: 'Ruslan Konviser', isLocal: true, muted: false, speaking: true },
			{ identity: 'ana@acme.com', name: '', isLocal: false, muted: true, speaking: false }
		];
		const onClose = jest.fn();
		render(<PeoplePanel onClose={onClose} />);

		const panel = screen.getByRole('complementary', { name: 'meetings.PEOPLE' });
		const [me, ana] = within(panel).getAllByTestId('meet-person');
		expect(me.textContent).toContain('meetings.YOU:Ruslan Konviser');
		expect(me.textContent).toContain('meetings.MIC_ON');
		// Someone without a name shows by their identity
		expect(ana.textContent).toContain('ana@acme.com');
		expect(ana.textContent).toContain('meetings.MIC_OFF');
		expect(within(panel).getByText('2')).toBeTruthy();

		fireEvent.click(within(panel).getByRole('button', { name: 'common.CLOSE' }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});

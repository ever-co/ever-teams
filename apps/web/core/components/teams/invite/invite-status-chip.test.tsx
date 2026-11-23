/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import arabic from '@/locales/ar.json';
import english from '@/locales/en.json';
import german from '@/locales/de.json';
import { InviteStatusDisplayMap } from '@/core/constants/config/constants';
import { EInviteStatus } from '@/core/types/generics/enums/invite';
import { InviteStatusChip } from './invite-status-chip';

function renderChip(status: EInviteStatus, locale: string, messages: Record<string, unknown>) {
	render(
		<NextIntlClientProvider locale={locale} messages={messages}>
			<InviteStatusChip status={status} />
		</NextIntlClientProvider>
	);
}

describe('InviteStatusChip (#5688)', () => {
	it.each([
		[EInviteStatus.INVITED, 'Ausstehend'],
		[EInviteStatus.ACCEPTED, 'Akzeptiert'],
		[EInviteStatus.EXPIRED, 'Abgelaufen'],
		[EInviteStatus.REJECTED, 'Abgelehnt']
	])('names the %s status in German on a German page', (status, word) => {
		renderChip(status, 'de', german);

		expect(screen.getByText(word)).toBeTruthy();
	});

	it('names a pending invitation in Arabic on an Arabic page', () => {
		renderChip(EInviteStatus.INVITED, 'ar', arabic);

		expect(screen.getByText(arabic.modals.invite.PENDING_STATUS)).toBeTruthy();
		expect(screen.queryByText('Pending')).toBeNull();
	});

	it('keeps the English words and the color of each status', () => {
		renderChip(EInviteStatus.INVITED, 'en', english);

		const chip = screen.getByText('Pending');
		expect(chip.style.getPropertyValue('--chip')).toBe(InviteStatusDisplayMap[EInviteStatus.INVITED].foreground);
	});
});

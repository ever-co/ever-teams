/** @jest-environment jsdom */
import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { TStartMode } from '@/core/hooks/auth/use-authentication-team';
import type { IRegisterDataAPI } from '@/core/types/interfaces/auth/auth';
import { ChooseModeForm } from './page-component';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('@/core/components/auth/social-logins-buttons', () => () => null);
jest.mock('@/core/components/duplicated-components/recaptcha', () => ({ SiteReCAPTCHA: () => null }));
jest.mock('@hcaptcha/react-hcaptcha', () => () => null);
jest.mock('react-turnstile', () => () => null);

function StartChoice() {
	const [startMode, setStartMode] = useState<TStartMode>('solo');
	return (
		<ChooseModeForm
			form={{ team: '' } as IRegisterDataAPI}
			errors={{}}
			handleOnChange={jest.fn()}
			startMode={startMode}
			onStartModeChange={setStartMode}
		/>
	);
}

async function nextFrame() {
	await act(async () => {
		await new Promise((resolve) => requestAnimationFrame(resolve));
	});
}

function teamOption() {
	return screen.getByRole('radio', { name: /auth\.signUp\.TEAM\b/ });
}

describe('ChooseModeForm', () => {
	it('takes a click on the team choice on to the team field', async () => {
		render(<StartChoice />);

		fireEvent.pointerDown(teamOption());
		fireEvent.click(teamOption());
		await nextFrame();

		expect(document.activeElement).toBe(screen.getByLabelText('auth.field.TEAM_LABEL'));
	});

	it('keeps the focus in the choice when the arrow keys pick the team', async () => {
		render(<StartChoice />);
		const soloOption = screen.getByRole('radio', { name: /auth\.signUp\.SOLO\b/ });
		soloOption.focus();

		fireEvent.keyDown(soloOption, { key: 'ArrowDown' });
		fireEvent.click(teamOption());
		await nextFrame();

		expect(document.activeElement).not.toBe(screen.getByLabelText('auth.field.TEAM_LABEL'));
	});
});

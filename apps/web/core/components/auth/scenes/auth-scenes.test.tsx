/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { TeamScene } from './auth-scenes';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

describe('TeamScene', () => {
	it('draws the team tile from the trimmed team name', () => {
		render(
			<TeamScene
				title="Your team"
				description="It is ready"
				teamName="  Acme"
				name="Jane Cooper"
				email="jane@example.test"
			/>
		);

		expect(screen.getAllByText('AC')).toHaveLength(2);
	});
});

/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FinancialSettingsForm from './financial-settings-form';
import { EProjectBilling, EProjectBudgetType } from '@/core/types/generics/enums/project';

jest.mock('@/core/hooks/bootstrap/use-fast-feature-data', () => ({
	useFastCurrenciesOwner: () => ({ currencies: [] })
}));

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

jest.mock('@/core/components', () => ({
	Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />
}));

jest.mock('@/core/components/duplicated-components/_input', () => ({
	InputField: (props: React.InputHTMLAttributes<HTMLInputElement> & { noWrapper?: boolean }) => {
		const { noWrapper: _noWrapper, ...inputProps } = props;
		return <input {...inputProps} />;
	}
}));

jest.mock('./basic-information-form', () => ({
	Select: () => <div />
}));

describe('FinancialSettingsForm deferred currency catalog', () => {
	it('preserves an existing project currency when Next is submitted before currencies load', () => {
		const goToNext = jest.fn();
		render(
			<FinancialSettingsForm
				currentData={{
					currency: 'USD',
					billing: EProjectBilling.FLAT_FEE,
					budgetType: EProjectBudgetType.HOURS,
					budget: 10
				}}
				goToNext={goToNext}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: 'common.NEXT' }));

		expect(goToNext).toHaveBeenCalledWith(
			expect.objectContaining({
				currency: 'USD'
			})
		);
	});

	it('preserves an existing project currency when Back is used before currencies load', () => {
		const goToPrevious = jest.fn();
		render(
			<FinancialSettingsForm
				currentData={{
					currency: 'USD',
					billing: EProjectBilling.FLAT_FEE,
					budgetType: EProjectBudgetType.HOURS,
					budget: 10
				}}
				goToPrevious={goToPrevious}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: 'common.BACK' }));

		expect(goToPrevious).toHaveBeenCalledWith(
			expect.objectContaining({
				currency: 'USD'
			})
		);
	});
});

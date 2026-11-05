/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProfileRatesSection } from './rates-section';

interface ProjectRatesRead {
	data: unknown;
	isLoading: boolean;
	isError: boolean;
	isUnavailable: boolean;
	refetch: jest.Mock;
}

const mockRefetch = jest.fn();
let mockProjectRatesRead: ProjectRatesRead;

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
	useLocale: () => 'en'
}));
jest.mock('@/core/lib/utils/motion', () => ({
	prefersReducedMotion: () => true,
	scrollBehavior: () => 'auto'
}));
jest.mock('@/core/hooks/organizations/rates/use-rates', () => ({
	useMyProjectRates: () => mockProjectRatesRead,
	useRateChangeRequest: () => ({ requestRateChange: jest.fn(), isSending: false })
}));

function failedRead(isUnavailable: boolean): ProjectRatesRead {
	return { data: undefined, isLoading: false, isError: true, isUnavailable, refetch: mockRefetch };
}

function renderSection() {
	render(<ProfileRatesSection employee={{ billRateValue: 40, billRateCurrency: 'EUR', reWeeklyLimit: 35 }} />);
}

beforeEach(() => {
	mockRefetch.mockReset();
});

it('says the project rates could not be loaded and loads them again on retry', () => {
	mockProjectRatesRead = failedRead(false);
	renderSection();

	expect(screen.getByText('rates.PROJECT_RATES_ERROR')).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: 'notifications.RETRY' }));

	expect(mockRefetch).toHaveBeenCalledTimes(1);
});

it('keeps the rates already shown when a later reload fails', () => {
	const loadedRates = [
		{ organizationProjectId: 'project-1', projectName: 'Atlas', billRateValue: 50, currency: 'EUR' }
	];
	mockProjectRatesRead = { ...failedRead(false), data: loadedRates };
	renderSection();

	expect(screen.queryByText('rates.PROJECT_RATES_ERROR')).toBeNull();
	expect(screen.getByText('Atlas')).toBeTruthy();
});

it('stays quiet when Gauzy has no rates routes or refuses the read (404 or 403)', () => {
	mockProjectRatesRead = failedRead(true);
	renderSection();

	expect(screen.queryByText('rates.PROJECT_RATES_ERROR')).toBeNull();
	expect(screen.getByText('rates.HOURLY_RATE')).toBeTruthy();
});

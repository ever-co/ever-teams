/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { PasswordChecks } from './password-checks';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

function ruleText(label: string) {
	const row = screen.getByText(label).closest('li');
	return row?.textContent;
}

describe('PasswordChecks', () => {
	it('writes out for screen readers whether each rule is met', () => {
		render(<PasswordChecks password="short" confirmation="short" />);

		expect(ruleText('auth.password.RULE_MIN_LENGTH')).toContain('auth.password.RULE_NOT_MET');
		expect(ruleText('auth.password.RULE_MATCH')).toContain('auth.password.RULE_MET');
	});

	it('marks the length rule as met once the password is long enough', () => {
		render(<PasswordChecks password="long enough password" confirmation="other" />);

		expect(ruleText('auth.password.RULE_MIN_LENGTH')).toContain('auth.password.RULE_MET');
		expect(ruleText('auth.password.RULE_MATCH')).toContain('auth.password.RULE_NOT_MET');
	});

	it('lists every reset rule and ticks each one once it is met', () => {
		const { rerender } = render(<PasswordChecks password="abc" confirmation="" policy="reset" />);

		expect(ruleText('auth.password.RULE_UPPERCASE')).toContain('auth.password.RULE_NOT_MET');
		expect(ruleText('auth.password.RULE_LOWERCASE')).toContain('auth.password.RULE_MET');
		expect(ruleText('auth.password.RULE_DIGIT')).toContain('auth.password.RULE_NOT_MET');
		expect(ruleText('auth.password.RULE_SYMBOL')).toContain('auth.password.RULE_NOT_MET');
		expect(ruleText('auth.password.RULE_MIN_LENGTH')).toContain('auth.password.RULE_NOT_MET');

		rerender(<PasswordChecks password="Abcdef1!" confirmation="" policy="reset" />);

		expect(ruleText('auth.password.RULE_UPPERCASE')).toContain('auth.password.RULE_MET');
		expect(ruleText('auth.password.RULE_DIGIT')).toContain('auth.password.RULE_MET');
		expect(ruleText('auth.password.RULE_SYMBOL')).toContain('auth.password.RULE_MET');
		expect(ruleText('auth.password.RULE_MIN_LENGTH')).toContain('auth.password.RULE_MET');
	});

	it('keeps an invitation to the length rule', () => {
		render(<PasswordChecks password="abc" confirmation="" />);

		expect(screen.queryByText('auth.password.RULE_SYMBOL')).toBeNull();
		expect(screen.getByText('auth.password.RULE_MIN_LENGTH')).toBeTruthy();
	});
});

'use client';

import { useTranslations } from 'next-intl';
import { Check } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import {
	meetsPasswordMinLength,
	passwordStrengthOf,
	passwordsMatch,
	PASSWORD_MIN_LENGTH,
	type PasswordStrength
} from '@/core/lib/utils/password-strength';

type Translate = ReturnType<typeof useTranslations>;

const SEGMENTS = [1, 2, 3, 4] as const;

const STRENGTH_FILL: Record<PasswordStrength, string> = {
	0: 'bg-foreground/10',
	1: 'bg-destructive',
	2: 'bg-warning',
	3: 'bg-success/75',
	4: 'bg-success'
};

const STRENGTH_INK: Record<PasswordStrength, string> = {
	0: 'text-muted-foreground',
	1: 'text-destructive-ink',
	2: 'text-warning-foreground',
	3: 'text-success-foreground',
	4: 'text-success-foreground'
};

const STRENGTH_WORD_KEY = {
	1: 'auth.password.STRENGTH_WEAK',
	2: 'auth.password.STRENGTH_FAIR',
	3: 'auth.password.STRENGTH_GOOD',
	4: 'auth.password.STRENGTH_STRONG'
} as const;

function segmentFillOf(segment: number, strength: PasswordStrength) {
	if (segment <= strength) {
		return STRENGTH_FILL[strength];
	}
	return 'bg-foreground/[0.08]';
}

/** Four segments filled by level, and the level in words, so the colour never carries the meaning alone. */
function StrengthMeter({ strength }: Readonly<{ strength: PasswordStrength }>) {
	const t = useTranslations();
	const hasStrength = strength > 0;

	return (
		<div className="flex items-center gap-3">
			<div aria-hidden="true" className="flex flex-1 gap-1">
				{SEGMENTS.map((segment) => (
					<span
						key={segment}
						style={{ transitionDelay: `${segment * 30}ms` }}
						className={cn(
							'h-1 flex-1 rounded-full transition-colors duration-200',
							segmentFillOf(segment, strength)
						)}
					/>
				))}
			</div>
			<span aria-live="polite" className={cn('min-w-12 text-right text-xs font-medium', STRENGTH_INK[strength])}>
				{hasStrength && t(STRENGTH_WORD_KEY[strength as Exclude<PasswordStrength, 0>])}
			</span>
		</div>
	);
}

/** The length rule, also the error of a password that is too short. */
export function minLengthRuleOf(t: Translate) {
	return t('auth.password.RULE_MIN_LENGTH', { count: PASSWORD_MIN_LENGTH });
}

function ruleStateKeyOf(isMet: boolean) {
	if (isMet) {
		return 'auth.password.RULE_MET' as const;
	}
	return 'auth.password.RULE_NOT_MET' as const;
}

function RuleRow({ isMet, label }: Readonly<{ isMet: boolean; label: string }>) {
	const t = useTranslations();
	const stateKey = ruleStateKeyOf(isMet);

	return (
		<li
			className={cn('flex items-center gap-2 text-xs transition-colors duration-200', isMet && 'text-foreground')}
		>
			<span className="relative flex size-3.5 shrink-0 items-center justify-center">
				<span
					aria-hidden="true"
					className={cn(
						'absolute inset-0 rounded-full hairline-border border-dashed border-foreground/30 transition-opacity duration-150',
						isMet && 'opacity-0'
					)}
				/>
				<span
					aria-hidden="true"
					className={cn(
						'chip-3d absolute inset-0 flex items-center justify-center rounded-full [--chip:hsl(var(--success))] transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] [&_svg]:size-2.5 [&_svg]:stroke-[3]',
						!isMet && 'scale-50 opacity-0'
					)}
				>
					<Check />
				</span>
			</span>
			<span>{label}</span>
			<span className="sr-only">{t(stateKey)}</span>
		</li>
	);
}

/** Only the minimum length is a rule Gauzy enforces: the strength is a hint. */
export function PasswordChecks({
	password,
	confirmation
}: Readonly<{
	password: string;
	/** Leave it undefined when the form has no confirmation field. */
	confirmation?: string;
}>) {
	const t = useTranslations();
	const strength = passwordStrengthOf(password);
	const isLongEnough = meetsPasswordMinLength(password);
	const hasConfirmationField = confirmation !== undefined;
	const doesMatch = passwordsMatch(password, confirmation ?? '');

	return (
		<div className="flex flex-col gap-2.5">
			<StrengthMeter strength={strength} />
			<ul className="flex flex-col gap-1.5 text-muted-foreground">
				<RuleRow isMet={isLongEnough} label={minLengthRuleOf(t)} />
				{hasConfirmationField && <RuleRow isMet={doesMatch} label={t('auth.password.RULE_MATCH')} />}
			</ul>
		</div>
	);
}

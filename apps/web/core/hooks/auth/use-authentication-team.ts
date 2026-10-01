/* eslint-disable no-mixed-spaces-and-tabs */
'use client';

import { userTimezone } from '@/core/lib/helpers/date-and-time';
import { authFormValidate } from '@/core/lib/helpers/validations';
import { IRegisterDataAPI } from '@/core/types/interfaces/auth/auth';
import { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryCall } from '../common/use-query';
import { RECAPTCHA_SITE_KEY } from '@/core/constants/config/constants';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { useLocale, useTranslations } from 'next-intl';
import { EVER_ID_HANDOFF_PARAM, readEverIdHandoff } from '@/core/lib/auth/ever-id/handoff';
import { everIdService } from '@/core/services/client/api/auth/ever-id.service';
import type { IEverIdSignupPrefill } from '@/core/types/interfaces/auth/ever-id';

// Step 1: User info (name, email, captcha)
// Step 2: Choose mode (solo or team)
const FIRST_STEP = 'STEP1' as const;
const SECOND_STEP = 'STEP2' as const;

// Start mode: solo (default) or team
export type TStartMode = 'solo' | 'team';

export interface IStepProps {
	handleOnChange: any;
	form: IRegisterDataAPI;
}

const initialValues: IRegisterDataAPI = RECAPTCHA_SITE_KEY.value
	? {
			name: '',
			email: '',
			team: '',
			recaptcha: ''
		}
	: {
			name: '',
			email: '',
			team: ''
		};

export function useAuthenticationTeam() {
	const query = useSearchParams();
	const router = useRouter();

	const queryEmail = useMemo(() => {
		let localEmail: null | string = null;

		if (typeof localStorage !== 'undefined') {
			localEmail = localStorage?.getItem('ever-teams-start-email');
		}

		const emailQuery = query?.get('email') || localEmail || '';
		return emailQuery;
	}, [query]);

	initialValues.email = queryEmail;

	const [step, setStep] = useState<typeof FIRST_STEP | typeof SECOND_STEP>(FIRST_STEP);
	const [startMode, setStartMode] = useState<TStartMode>('solo');
	const [formValues, setFormValues] = useState<IRegisterDataAPI>(initialValues);
	const [errors, setErrors] = useState(initialValues);
	const { queryCall, loading, infiniteLoading } = useQueryCall(authService.registerUserTeam);

	// Ever ID sign-up: a person new to the product creates the workspace with the Ever ID they signed in with.
	// Only the one-time key is in the URL; the verified name and e-mail address are read from the server.
	const t = useTranslations();
	const locale = useLocale();
	const everIdHandoff = useMemo(() => readEverIdHandoff(query?.get(EVER_ID_HANDOFF_PARAM)), [query]);
	const [everIdPrefill, setEverIdPrefill] = useState<IEverIdSignupPrefill | null>(null);
	const [everIdError, setEverIdError] = useState<string | null>(null);
	const [everIdConfirmed, setEverIdConfirmed] = useState(false);
	const [everIdTermsAccepted, setEverIdTermsAccepted] = useState(false);
	const [everIdSubmitting, setEverIdSubmitting] = useState(false);

	useEffect(() => {
		if (!everIdHandoff) return;
		let cancelled = false;
		everIdService
			.signupPrefill(everIdHandoff, locale)
			.then(({ status, data }) => {
				if (cancelled) return;
				if (status === 200 && typeof data?.email === 'string') {
					setEverIdPrefill(data);
					setFormValues((values) => ({ ...values, name: data.name || values.name, email: data.email }));
				} else {
					setEverIdError(
						status === 410 ? t('pages.auth.everId.SIGNUP_EXPIRED') : t('pages.auth.everId.UNAVAILABLE')
					);
				}
			})
			.catch(() => {
				if (!cancelled) setEverIdError(t('pages.auth.everId.UNAVAILABLE'));
			});
		return () => {
			cancelled = true;
		};
	}, [everIdHandoff, locale, t]);

	/** The Ever ID confirmation (and the documents, when there are any) must be ticked before anything happens. */
	const everIdStepErrors = useCallback((): Record<string, string> | null => {
		if (!everIdHandoff) return null;
		if (!everIdPrefill) return { everId: everIdError || t('pages.auth.everId.UNAVAILABLE') };
		if (!everIdConfirmed) return { everId: t('pages.auth.everId.SIGNUP_CONFIRM_REQUIRED') };
		if (everIdPrefill.terms.length > 0 && !everIdTermsAccepted) {
			return { everId: t('pages.auth.everId.SIGNUP_TERMS_REQUIRED') };
		}
		return null;
	}, [everIdHandoff, everIdPrefill, everIdError, everIdConfirmed, everIdTermsAccepted, t]);

	const submitEverIdSignup = useCallback(
		async (handoff: string, prefill: IEverIdSignupPrefill, data: IRegisterDataAPI) => {
			setEverIdSubmitting(true);
			try {
				const { status, data: answer } = await everIdService.register({
					name: data.name,
					email: data.email,
					team: data.team,
					timezone: data.timezone,
					...(data.recaptcha ? { recaptcha: data.recaptcha } : {}),
					ever_id_handoff: handoff,
					confirm: true,
					terms: prefill.terms.map(({ documentId, version, sha256, locale: documentLocale }) => ({
						documentId,
						version,
						sha256,
						locale: documentLocale
					}))
				});
				if (status === 200) {
					router.push('/');
					return;
				}
				if (
					status === 403 &&
					typeof answer?.checkoutUrl === 'string' &&
					answer.checkoutUrl.startsWith('https:')
				) {
					window.location.assign(answer.checkoutUrl);
					return;
				}
				if (status === 400 && answer?.errors) {
					setErrors((current) => ({ ...current, ...answer.errors }) as IRegisterDataAPI);
				}
				setEverIdError(
					status === 410
						? t('pages.auth.everId.SIGNUP_EXPIRED')
						: (answer?.errors && Object.values(answer.errors)[0]) || t('pages.auth.everId.UNAVAILABLE')
				);
			} catch {
				setEverIdError(t('pages.auth.everId.UNAVAILABLE'));
			} finally {
				setEverIdSubmitting(false);
			}
		},
		[router, t]
	);

	/**
	 * Generate default team name for solo mode
	 */
	const generateDefaultTeamName = useCallback((userName: string): string => {
		const trimmedName = userName.trim();
		if (!trimmedName) return 'My Team';
		return `${trimmedName}'s Team`;
	}, []);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		// Ever ID sign-up: the confirmation comes first
		const everIdErrors = everIdStepErrors();
		if (everIdErrors) {
			setErrors((current) => ({ ...current, ...everIdErrors }) as IRegisterDataAPI);
			return;
		}

		// Step 1: Validate user info (name, email, captcha)
		if (step === FIRST_STEP) {
			const noRecaptchaArray = ['email', 'name'];
			const withRecaptchaArray = [...noRecaptchaArray, 'recaptcha'];
			// RECAPTCHA_SITE_KEY is a lazy { value } getter — the object itself is always truthy.
			const validationFields = RECAPTCHA_SITE_KEY.value ? withRecaptchaArray : noRecaptchaArray;

			const { errors, valid } = authFormValidate(validationFields, formValues);
			setErrors(errors as any);

			if (valid) {
				setStep(SECOND_STEP);
			}
			return;
		}

		// Step 2: Validate team name if in team mode, then submit
		if (startMode === 'team') {
			const { errors, valid } = authFormValidate(['team'], formValues);
			if (!valid) {
				setErrors(errors as any);
				return;
			}
		}

		// Build submission data without mutating state
		const submissionData: IRegisterDataAPI = {
			...formValues,
			team: startMode === 'team' ? formValues.team : generateDefaultTeamName(formValues.name),
			timezone: userTimezone()
		};

		if (everIdHandoff && everIdPrefill) {
			submitEverIdSignup(everIdHandoff, everIdPrefill, submissionData);
			return;
		}

		// Final submission
		infiniteLoading.current = true;

		queryCall(submissionData)
			.then(() => router.push('/'))
			.catch((err: AxiosError) => {
				if (err.response?.status === 400) {
					setErrors((err.response?.data as any)?.errors || {});
				}
			});
	};

	const handleOnChange = useCallback(
		(e: any) => {
			const { name, value } = e.target;
			const key = name as keyof IRegisterDataAPI;
			if (errors[key]) {
				errors[key] = '';
			}
			setFormValues((prevState) => ({
				...prevState,
				[name]: value
			}));
		},
		[errors]
	);

	const handleStartModeChange = useCallback((mode: TStartMode) => {
		setStartMode(mode);
		// Clear team name error when switching modes
		setErrors((prev) => ({ ...prev, team: '' }));
	}, []);

	return {
		handleSubmit,
		handleOnChange,
		handleStartModeChange,
		loading: loading || everIdSubmitting,
		everId: everIdHandoff
			? {
					prefill: everIdPrefill,
					error: everIdError,
					confirmed: everIdConfirmed,
					setConfirmed: setEverIdConfirmed,
					termsAccepted: everIdTermsAccepted,
					setTermsAccepted: setEverIdTermsAccepted
				}
			: null,
		FIRST_STEP,
		step,
		SECOND_STEP,
		setStep,
		errors,
		formValues,
		startMode
	};
}

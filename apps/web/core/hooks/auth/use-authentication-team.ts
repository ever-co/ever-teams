/* eslint-disable no-mixed-spaces-and-tabs */
'use client';

import { userTimezone } from '@/core/lib/helpers/date-and-time';
import { authFormValidate } from '@/core/lib/helpers/validations';
import { IRegisterDataAPI } from '@/core/types/interfaces/auth/auth';
import { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryCall } from '../common/use-query';
import { RECAPTCHA_SITE_KEY } from '@/core/constants/config/constants';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { useLocale, useTranslations } from 'next-intl';
import { EVER_ID_STEP_PARAM, isEverIdStep } from '@/core/lib/auth/ever-id/step';
import { everIdService } from '@/core/services/client/api/auth/ever-id.service';
import type { IEverIdSignupPrefill } from '@/core/types/interfaces/auth/ever-id';

// Step 1: User info (name, email, captcha)
// Step 2: Choose mode (solo or team)
const FIRST_STEP = 'STEP1' as const;
const SECOND_STEP = 'STEP2' as const;

// Start mode: solo (default) or team
export type TStartMode = 'solo' | 'team';

/** The message of an Ever ID sign-up step that did not succeed. */
function everIdStepMessage(status: number) {
	// 409: another Ever ID sign-in in this browser replaced the sign-up this page shows.
	if (status === 410 || status === 409) return 'pages.auth.everId.SIGNUP_EXPIRED' as const;
	if (status === 429) return 'pages.auth.everId.TOO_MANY_ATTEMPTS' as const;
	return 'pages.auth.everId.UNAVAILABLE' as const;
}

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
	// The URL only carries the step marker; the verified name and e-mail address are read from the server, which
	// holds the step's one-time key in a cookie this page cannot read.
	const t = useTranslations();
	const locale = useLocale();
	const everIdSignup = useMemo(() => isEverIdStep(query?.get(EVER_ID_STEP_PARAM), 'signup'), [query]);
	const [everIdPrefill, setEverIdPrefill] = useState<IEverIdSignupPrefill | null>(null);
	const [everIdPrefillLoading, setEverIdPrefillLoading] = useState(false);
	const [everIdPrefillError, setEverIdPrefillError] = useState<string | null>(null);
	const [everIdSubmitError, setEverIdSubmitError] = useState<string | null>(null);
	const [everIdConfirmed, setEverIdConfirmed] = useState(false);
	const [everIdTermsAccepted, setEverIdTermsAccepted] = useState(false);
	const [everIdSubmitting, setEverIdSubmitting] = useState(false);
	// The prefill is read once per step (and locale): the translation function must not re-run it.
	const translate = useRef(t);
	translate.current = t;

	useEffect(() => {
		if (!everIdSignup) {
			setEverIdPrefillLoading(false);
			return;
		}
		let cancelled = false;
		// Every read starts from nothing: no earlier identity, confirmation or acceptance carries over.
		setEverIdPrefill(null);
		setEverIdPrefillError(null);
		setEverIdSubmitError(null);
		setEverIdConfirmed(false);
		setEverIdTermsAccepted(false);
		setEverIdPrefillLoading(true);
		everIdService
			.signupPrefill(locale)
			.then(({ status, data }) => {
				if (cancelled) return;
				if (status === 200 && typeof data?.email === 'string') {
					setEverIdPrefill(data);
					// A usable verified name replaces the field; otherwise what the person typed meanwhile stays.
					const verified = data.name.trim().length >= 2;
					setFormValues((values) => ({
						...values,
						name: verified ? data.name : values.name || data.name,
						email: data.email
					}));
				} else {
					setEverIdPrefillError(translate.current(everIdStepMessage(status)));
				}
			})
			.catch(() => {
				if (!cancelled) setEverIdPrefillError(translate.current('pages.auth.everId.UNAVAILABLE'));
			})
			.finally(() => {
				if (!cancelled) setEverIdPrefillLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [everIdSignup, locale]);

	/** The verified name is used as it is (read-only); a missing or too short one is entered by the person. */
	const everIdNameVerified = !!everIdPrefill && everIdPrefill.name.trim().length >= 2;

	/** The Ever ID confirmation (and the documents, when there are any) must be ticked before anything happens. */
	const everIdStepErrors = useCallback((): Record<string, string> | null => {
		if (!everIdSignup) return null;
		// Still reading the Ever ID: nothing can be submitted yet, and nothing has failed either.
		if (everIdPrefillLoading) return {};
		if (!everIdPrefill) return { everId: everIdPrefillError || t('pages.auth.everId.UNAVAILABLE') };
		if (!everIdConfirmed) return { everId: t('pages.auth.everId.SIGNUP_CONFIRM_REQUIRED') };
		if (everIdPrefill.terms.length > 0 && !everIdTermsAccepted) {
			return { everId: t('pages.auth.everId.SIGNUP_TERMS_REQUIRED') };
		}
		return null;
	}, [
		everIdSignup,
		everIdPrefillLoading,
		everIdPrefill,
		everIdPrefillError,
		everIdConfirmed,
		everIdTermsAccepted,
		t
	]);

	/** A ticked or unticked box ends the message of the previous attempt. */
	const clearEverIdErrors = useCallback(() => {
		setEverIdSubmitError(null);
		setErrors((current) => ({ ...current, everId: '' }) as IRegisterDataAPI);
	}, []);

	const submitEverIdSignup = useCallback(
		async (prefill: IEverIdSignupPrefill, data: IRegisterDataAPI, nameVerified: boolean) => {
			setEverIdSubmitting(true);
			try {
				const { status, data: answer } = await everIdService.register({
					name: data.name,
					email: data.email,
					team: data.team,
					timezone: data.timezone,
					...(data.recaptcha ? { recaptcha: data.recaptcha } : {}),
					ever_id: 'signup',
					ever_id_flow: prefill.flow,
					confirm: true,
					verified_name: nameVerified,
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
				// Back to the first step, where the Ever ID confirmation shows what went wrong.
				setStep(FIRST_STEP);
				if (status === 400 && answer?.errors) {
					setErrors((current) => ({ ...current, ...answer.errors }) as IRegisterDataAPI);
				}
				const answered = answer?.errors && Object.values(answer.errors)[0];
				setEverIdSubmitError(
					status === 410 || status === 409 || status === 429 || !answered
						? t(everIdStepMessage(status))
						: answered
				);
			} catch {
				setStep(FIRST_STEP);
				setEverIdSubmitError(t('pages.auth.everId.UNAVAILABLE'));
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

		if (everIdSignup && everIdPrefill) {
			void submitEverIdSignup(everIdPrefill, submissionData, everIdNameVerified);
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
		// Reading the Ever ID details only disables the form (everId.loading); `loading` means creating the workspace.
		loading: loading || everIdSubmitting,
		everId: everIdSignup
			? {
					prefill: everIdPrefill,
					loading: everIdPrefillLoading,
					error: everIdSubmitError || everIdPrefillError,
					nameVerified: everIdNameVerified,
					confirmed: everIdConfirmed,
					setConfirmed: (confirmed: boolean) => {
						setEverIdConfirmed(confirmed);
						clearEverIdErrors();
					},
					termsAccepted: everIdTermsAccepted,
					setTermsAccepted: (accepted: boolean) => {
						setEverIdTermsAccepted(accepted);
						clearEverIdErrors();
					}
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

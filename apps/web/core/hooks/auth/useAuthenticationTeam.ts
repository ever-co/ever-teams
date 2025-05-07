/* eslint-disable no-mixed-spaces-and-tabs */
'use client';

import { userTimezone } from '@/core/lib/helpers/date-and-time';
import { authFormValidate } from '@/core/lib/helpers/validations';
import { IRegisterDataAPI } from '@/core/types/interfaces';
import { AxiosError } from 'axios';
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '../useQuery';
import { RECAPTCHA_SITE_KEY } from '@/core/constants/config/constants';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/core/services/client/api/auth/auth.service';

const FIRST_STEP = 'STEP1' as const;
const SECOND_STEP = 'STEP2' as const;

export interface IStepProps {
	handleOnChange: any;
	form: IRegisterDataAPI;
}

const initialValues: IRegisterDataAPI = RECAPTCHA_SITE_KEY
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
	const [formValues, setFormValues] = useState<IRegisterDataAPI>(initialValues);
	const [errors, setErrors] = useState(initialValues);
	const { queryCall, loading, infiniteLoading } = useQuery(authService.registerUserTeam);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (step === FIRST_STEP) {
			const { errors, valid } = authFormValidate(['team'], formValues);
			setErrors(errors as any);
			valid && setStep(SECOND_STEP);
			return;
		}

		const noRecaptchaArray = ['email', 'name'];

		const withRecaptchaArray = [...noRecaptchaArray, 'recaptcha'];

		const validationFields = RECAPTCHA_SITE_KEY ? withRecaptchaArray : noRecaptchaArray;

		const { errors, valid } = authFormValidate(validationFields, formValues);

		if (!valid) {
			console.log({ errors });
			setErrors(errors as any);
			return;
		}

		formValues['timezone'] = userTimezone();
		infiniteLoading.current = true;

		queryCall(formValues)
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

	return {
		handleSubmit,
		handleOnChange,
		loading,
		FIRST_STEP,
		step,
		SECOND_STEP,
		setStep,
		errors,
		formValues
	};
}

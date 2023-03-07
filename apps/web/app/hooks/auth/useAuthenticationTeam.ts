import { userTimezone } from '@app/helpers/date';
import { authFormValidate } from '@app/helpers/validations';
import { IRegisterDataAPI } from '@app/interfaces';
import { registerUserTeamAPI } from '@app/services/client/api';
import { AxiosError } from 'axios';
import { useCallback, useState } from 'react';
import { useQuery } from '../useQuery';

const FIRST_STEP = 'STEP1' as const;
const SECOND_STEP = 'STEP2' as const;

export interface IStepProps {
	handleOnChange: any;
	form: IRegisterDataAPI;
}

const initialValues: IRegisterDataAPI = {
	name: '',
	email: '',
	team: '',
	recaptcha: '434343434',
};

export function useAuthenticationTeam() {
	const [step, setStep] = useState<typeof FIRST_STEP | typeof SECOND_STEP>(
		FIRST_STEP
	);
	const [formValues, setFormValues] = useState<IRegisterDataAPI>(initialValues);
	const [errors, setErrors] = useState(initialValues);
	const { queryCall, loading, infiniteLoading } = useQuery(registerUserTeamAPI);

	const handleSubmit = (e: any) => {
		e.preventDefault();
		if (step === FIRST_STEP) {
			const { errors, valid } = authFormValidate(['team'], formValues);
			setErrors(errors as any);
			valid && setStep(SECOND_STEP);
			return;
		}

		const { errors, valid } = authFormValidate(
			['name', 'email', 'recaptcha'],
			formValues
		);

		if (!valid) {
			setErrors(errors as any);
			return;
		}

		formValues['timezone'] = userTimezone();
		infiniteLoading.current = true;

		queryCall(formValues)
			.then(() => window.location.reload())
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
				[name]: value,
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
		formValues,
	};
}

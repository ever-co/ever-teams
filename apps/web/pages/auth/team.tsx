import { useCallback, useState } from 'react';

import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { registerUserTeamAPI } from '@app/services/client/api/auth';
import { useQuery } from '@app/hooks/useQuery';
import { authFormValidate } from '@app/helpers/validations';
import { IRegisterDataAPI } from '@app/interfaces/IAuthentication';
import { AxiosError } from 'axios';
import { userTimezone } from '@app/helpers/date';
import { Spinner } from '@components/ui/loaders/spinner';
import { UserStep } from '@components/pages/auth/steppers/user-step';
import AppLogo from '@components/ui/svgs/app-logo';
import Footer from '@components/layout/footer/footer';
import { TeamStep } from '@components/pages/auth/steppers/team-step';

const FIRST_STEP = 'STEP1';
const SECOND_STEP = 'STEP2';

const initialValues: IRegisterDataAPI = {
	name: '',
	email: '',
	team: '',
	recaptcha: '',
};

const Team = () => {
	const [step, setStep] = useState(FIRST_STEP);
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

	return (
		<div className="flex flex-col h-screen items-center justify-between">
			<div />
			<div className="w-full md:w-[486px] p-[20px] md:px-[0px]">
				<div
					className="w-full  md:w-[486px] py-[30px] md:py-[50px] px-[30px] md:px-[70px] sm:px-[70px] md:mx-auto rounded-[40px] drop-shadow-[0px_3px_50px_#3E1DAD0D] dark:drop-shadow-[0px_3px_50px_#FFFFF]  bg-white
       dark:bg-[#202023] dark:bg-opacity-30 "
				>
					<div className="flex justify-center w-full">
						<AppLogo />
					</div>
					<div className="flex justify-center text-[#ACB3BB] font-light text-center text-[16px] md:text-[18px] w-full mt-[0px] md:mt-[10px]">
						Visibility for your Team
					</div>
					<div className="text-[20px] md:text-[24px]  mt-[30px] font-bold text-primary dark:text-white">
						Create new Team
					</div>
					<form onSubmit={handleSubmit} method="post">
						{step === FIRST_STEP && (
							<TeamStep
								errors={errors}
								handleOnChange={handleOnChange}
								values={formValues}
							/>
						)}
						<UserStep
							errors={errors}
							showForm={step === SECOND_STEP}
							handleOnChange={handleOnChange}
							values={formValues}
						/>
						<div className="mt-[20px] md:mt-[40px] flex flex-col-reverse w-full md:flex-row justify-between items-center">
							<div className="w-full md:w-1/2 text-center md:text-start justify-between underline text-primary cursor-pointer hover:text-primary dark:text-gray-400 dark:hover:opacity-90">
								{step === FIRST_STEP && (
									<Link href={'/auth/passcode'}>Joining existed Team?</Link>
								)}

								{step === SECOND_STEP && (
									<ArrowLeftIcon
										className="h-[30px] dark:text-white text-[#0200074D] hover:text-primary cursor-pointer w-full md:w-auto"
										aria-hidden="true"
										onClick={() => {
											setStep(FIRST_STEP);
										}}
									/>
								)}
							</div>
							<button
								disabled={loading}
								className={`w-full  md:w-1/2 h-[50px] ${
									loading ? 'opacity-50' : ''
								} my-4 inline-flex justify-center items-center tracking-wide text-white dark:text-primary transition-colors duration-200 transform bg-primary dark:bg-white rounded-[10px] hover:text-opacity-90 focus:outline-none`}
								type="submit"
							>
								{loading && (
									<span>
										<Spinner />
									</span>
								)}{' '}
								<span>{step === FIRST_STEP ? 'Continue' : 'Create Team'}</span>
							</button>
						</div>
					</form>
				</div>
			</div>
			<div className="w-full">
				<Footer />
			</div>
		</div>
	);
};

export default Team;

import { cn, IClassName } from '@ever-teams/toolkit-ui';
import React from 'react';
import { Card } from '../../card';
import { BackButton, Button } from '../../button';
import { InputField } from '../../inputs';
import { Text } from '../../typography';
import { AuthLayout } from '../auth-layout';

interface FillUserDataFormProps extends IClassName {
	form: {
		name: string;
		email: string;
	};
	errors: Record<string, string>;
	handleOnChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onPreviousStep?: () => void;
	loading?: boolean;
}

interface FullNameFormProps extends IClassName {
	form: {
		team: string;
	};
	errors: Record<string, string>;
	handleOnChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * First step form Component
 *
 * @param param0
 * @returns
 */
function FullNameForm({ form, errors, handleOnChange, className }: FullNameFormProps) {
	return (
		<Card className={cn('w-full dark:bg-[#25272D]', className)} shadow="custom">
			<div className="flex flex-col items-center justify-between">
				<Text.Heading as="h3" className="text-center mb-7">
					Input your full name
				</Text.Heading>

				<InputField
					name="team"
					value={''}
					errors={errors}
					onChange={handleOnChange}
					placeholder={'Please Enter your full name'}
					autoComplete="off"
					wrapperClassName="dark:bg-[#25272D]"
					className="dark:bg-[#25272D]"
					required
				/>

				<div className="flex items-center justify-between w-full mt-6">
					<Text.Link href="/" underline variant="primary" className="font-normal">
						Connection
					</Text.Link>
					<Button type="submit">CONTINUE</Button>
				</div>
			</div>
		</Card>
	);
}

/**
 * Second step form component
 *
 * @param param0
 * @returns
 */
function FillUserDataForm({ form, errors, handleOnChange, onPreviousStep, loading, className }: FillUserDataFormProps) {
	return (
		<Card className={cn('w-full dark:bg-[#25272D]', className)} shadow="bigger">
			<div className="flex flex-col items-center justify-between h-full">
				<Text.Heading as="h3" className="mb-10 text-center">
					Create your first team
				</Text.Heading>

				<div className="w-full mb-8">
					<InputField
						placeholder={'Entrer your fullName'}
						name="name"
						value={form.name}
						errors={errors}
						onChange={handleOnChange}
						autoComplete="off"
						wrapperClassName="dark:bg-[#25272D]"
						className="dark:bg-[#25272D]"
					/>
					<InputField
						type="email"
						placeholder={'Enter your email address'}
						className="dark:bg-[#25272D]"
						wrapperClassName="mb-5 dark:bg-[#25272D]"
						name="email"
						value={form.email}
						errors={errors}
						onChange={handleOnChange}
						autoComplete="off"
					/>
				</div>

				<div className="flex items-center justify-between w-full">
					<BackButton onClick={onPreviousStep} />
					<Button type="submit" disabled={loading}>
						Create account
					</Button>
				</div>
			</div>
		</Card>
	);
}

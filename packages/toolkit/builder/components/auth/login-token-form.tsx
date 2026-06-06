import { TokenFormProps } from '../../types/Auth';
import { Input, cn } from '@ever-teams/toolkit-ui';
import { Card } from '../card';
import { Text } from '../typography';
import { AuthFormFooter } from './auth-form-footer';

export function LoginTeamsTokenLoginForm({ form, onSwitch }: TokenFormProps) {
	const inputClassName = cn(
		'bg-[#f7f7f8] dark:bg-[#1E2025] dark:text-white',
		'py-2 px-4 rounded-[10px]',
		'text-sm outline-none',
		'h-[50px] w-full',
		'font-light tracking-tight'
	);

	return (
		<div className="w-full flex flex-col gap-4 bg-white dark:bg-transparent rounded-2xl">
			<Card className={cn('w-full bg-white dark:bg-[#25272D]')} shadow="bigger">
				<form
					onSubmit={form.handleSubmit}
					className="flex flex-col items-center justify-between bg-white dark:bg-[#25272D]"
				>
					<div className="flex flex-col items-center justify-between w-full p-4">
						<Text.Heading as="h3" className="mb-10 text-center text-gray-900 dark:text-white">
							Login with Token
						</Text.Heading>

						<div className="w-full flex flex-col gap-4 mb-8">
							<Input
								required
								onChange={form.handleInputChange}
								className={inputClassName}
								placeholder="Enter your token"
								value={form.tokenInput}
								size={30}
								type="text"
								name="token"
							/>

							{form.error && <span className="text-red-500 text-xs">{form.error}</span>}
						</div>

						<AuthFormFooter
							onSwitchMethod={onSwitch}
							switchMethodText="Log in with password"
							loading={form.isLoading}
						/>
					</div>
				</form>
			</Card>
		</div>
	);
}

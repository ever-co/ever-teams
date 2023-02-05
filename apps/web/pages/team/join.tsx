import { AuthCodeInputField, Button, Card, Text } from 'lib/components';
import { useTranslation } from 'lib/i18n';
import { AuthLayout } from 'lib/layout';

export default function AuthPasscode() {
	const { trans } = useTranslation('auth');

	return (
		<AuthLayout
			title={trans.JOIN_TEAM}
			description={trans.INPUT_INVITE_CODE_DESC}
		>
			<form className="w-[98%] md:w-[530px]" autoComplete="off">
				<Card className="w-full" shadow="bigger">
					<div className="flex flex-col justify-between items-center">
						<Text.Heading as="h3" className="text-center">
							{trans.INPUT_INVITE_CODE}
						</Text.Heading>

						{/* Auth code input */}
						<div className="w-full mt-5">
							<AuthCodeInputField
								allowedCharacters="numeric"
								length={6}
								containerClassName="mt-[21px] w-full flex justify-between"
								inputClassName="w-[40px] xs:w-[50px]"
								onChange={(code) => {
									console.log(code);
								}}
							/>
						</div>

						<div className="w-full flex justify-between mt-10">
							{/* Send code */}
							<div className="flex flex-col items-start">
								<Text className="text-xs text-gray-500 dark:text-gray-400 font-normal mb-1">
									{trans.UNRECEIVED_CODE}
								</Text>

								<button
									type="button"
									className="text-xs text-gray-500 dark:text-gray-400 font-normal cursor-pointer"
								>
									{'Re'}
									<span className="text-primary dark:text-primary-light">
										{trans.SEND_CODE}
									</span>
								</button>
							</div>

							<Button type="submit">{trans.JOIN}</Button>
						</div>
					</div>
				</Card>
			</form>
		</AuthLayout>
	);
}

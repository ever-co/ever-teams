import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'lib/i18n';
import {
	Button,
	Text,
	Modal,
	Card,
	InputField,
	AuthCodeInputField,
} from 'lib/components';
import { clsxm } from '@app/utils';
import { ArrowLeft } from 'lib/components/svgs';

export const RequestToJoinModal = ({
	open,
	closeModal,
}: {
	open: boolean;
	closeModal: () => void;
}) => {
	const [member, setMember] = useState<boolean>(true);
	const [join, setJoin] = useState<boolean>(false);
	const { register } = useForm();
	//const [message, setMessage] = useState<string>('');
	const { trans } = useTranslation();

	const handleClickMember = () => {
		member == false && setMember(true);
		join == true && setJoin(false);
	};

	const handleClickJoin = () => {
		member == true && setMember(false);
		join == false && setJoin(true);
	};

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form
				className="w-[98%] md:w-[480px]"
				autoComplete="off"
				onSubmit={() => ''}
			>
				<Card className="w-full" shadow="custom">
					<div className="flex justify-between items-center border-b ">
						<Text.Heading
							as="h3"
							className={clsxm(
								'text-center gap-32 pb-4 pr-5 hover:cursor-pointer',
								member && 'border-b border-primary border-b-2'
							)}
							onClick={handleClickMember}
						>
							{trans.common.EXISTING_MEMBER}
						</Text.Heading>
						<Text.Heading
							as="h3"
							className={clsxm(
								'text-center gap-32 pb-4 pl-5 hover:cursor-pointer',
								join && 'border-b border-primary border-b-2'
							)}
							onClick={handleClickJoin}
						>
							{trans.common.NEW_MEMBER}
						</Text.Heading>
					</div>

					<div>
						{join && (
							<div className="w-full mt-8">
								<InputField
									type="text"
									placeholder="Enter your name "
									className={`md:w-[220px] m-0 h-[54px]`}
								/>
								<InputField
									type="email"
									placeholder="Enter your email address "
									className={`md:w-[220px] m-0 h-[54px]`}
								/>
								<InputField
									type="text"
									placeholder="Enter your Link address "
									className={`md:w-[220px] m-0 h-[54px]`}
								/>
								<div
									className={
										'bg-light--theme-light dark:bg-dark--theme-light input-border py-2 px-4 rounded-[10px] text-sm outline-none h-[50px] w-full font-light tracking-tight flex justify-between items-center text-[#A8A6B6]'
									}
								>
									<div className="">
										<select data-te-select-init>
											<option value="1">Add Posisiton</option>
											<option value="2">Position</option>
											<option value="3">Position</option>
										</select>
									</div>
								</div>
							</div>
						)}
						{member && (
							<div className="w-full mt-8">
								<InputField
									type="email"
									placeholder="Yourmail@mail.com"
									{...register('email', {
										required: true,
										pattern:
											/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
									})}
									className={`md:w-[220px] m-0 h-[54px]`}
								/>
								{/*message && (
									<Text.Error className="self-start justify-self-start">
										{message}
									</Text.Error>
								)*/}
							</div>
						)}
						<div className="mt-5">
							<p className="text-left text-xs text-gray-500">
								{trans.pages.auth.INPUT_INVITE_CODE}
							</p>
							<div className="flex flex-col justify-between items-center">
								<div className="w-full">
									<AuthCodeInputField
										allowedCharacters="numeric"
										length={6}
										containerClassName="mt-[21px] w-full flex justify-between"
										inputClassName="w-[40px] xs:w-[50px]"
										onChange={() => ''}
									/>
									{/*message && (
										<Text.Error className="self-start justify-self-start">
											{message}
										</Text.Error>
									)*/}
								</div>
								<div className="w-full flex justify-between items-center mt-5">
									<div className="flex flex-col items-start">
										<div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
											{"Didn't recieve code ?"}
											{!false && (
												<button
													type="button"
													className="text-xs text-gray-500 dark:text-gray-400 font-normal"
													onClick={() => ''}
												>
													{'Re'}
													<span className="text-primary dark:text-primary-light">
														{trans.pages.auth.SEND_CODE}
													</span>
												</button>
											)}
										</div>
									</div>
								</div>
								<div className="w-full flex justify-between mt-5 items-center">
									<div
										className="flex justify-around hover:cursor-pointer"
										onClick={closeModal}
									>
										<ArrowLeft /> <p className="ml-5">{trans.common.BACK}</p>
									</div>

									<Button
										type="submit"
										className={
											'font-medium border border-primary disabled:border-0 md:min-w-[180px] rounded-xl'
										}
										onClick={() => ''}
									>
										{join ? trans.common.JOIN_REQUEST : trans.pages.auth.JOIN}
									</Button>
								</div>
							</div>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
};

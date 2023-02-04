/* eslint-disable no-mixed-spaces-and-tabs */
import { withAuthentication } from 'lib/app/authenticator';
import { Button, InputField, Text } from 'lib/components';
import { useForm } from 'react-hook-form';
import { useCallback, useEffect, useState } from 'react';
import { userState } from '@app/stores';
import { useRecoilState } from 'recoil';
import ListCard from './list-card';
import { LanguageDropDown } from './language-dropdown';
import {
	ClockIcon,
	CloseCircleIcon,
	LoginIcon,
	SearchStatusIcon,
	TickCircleIcon,
	TimerIcon,
} from 'lib/components/svgs';
import { PlusIcon } from '@heroicons/react/20/solid';

const TaskStatusesForm = () => {
	const [user] = useRecoilState(userState);
	const { register, setValue, handleSubmit } = useForm();
	const [createNew, setCreateNew] = useState(false);

	useEffect(() => {
		setValue('teamName', '');
		setValue('teamType', '');
		setValue('teamLink', '');
	}, [user]);

	const onSubmit = useCallback(
		async (values: any) => {
			console.log(values);
		},
		[user]
	);

	return (
		<>
			<form
				className="w-full"
				onSubmit={handleSubmit(onSubmit)}
				autoComplete="off"
			>
				<div className="flex">
					<div className="rounded-md m-h-64 p-[32px] flex gap-x-[2rem]">
						<Text className="flex-none flex-grow-0 text-md text-gray-400 font-normal mb-2 w-[20%]">
							Task Statuses
						</Text>

						<div className="flex flex-col">
							{!createNew && (
								<Button
									variant="outline"
									className="font-normal border-2 rounded-2xl text-md w-[250px]"
									onClick={() => {
										setCreateNew(true);
									}}
								>
									<span className="mr-[11px]">
										<PlusIcon className=" font-normal w-[16px] h-[16px]" />
									</span>
									Create new Statuses
								</Button>
							)}

							{createNew && (
								<>
									<Text className="flex-none flex-grow-0 text-md text-gray-400 font-normal mb-2">
										New Statuses
									</Text>
									<div className="flex  w-full gap-x-5 items-center mt-3">
										<InputField
											type="text"
											placeholder="Create Status"
											className="mb-0"
											wrapperClassName="mb-0"
										/>

										<LanguageDropDown />

										<LanguageDropDown />
									</div>
									<div className="flex gap-x-4 mt-5">
										<Button
											variant="primary"
											className="font-normal py-4 px-4 rounded-xl text-md"
											onClick={() => {
												setCreateNew(false);
											}}
										>
											Create
										</Button>
										<Button
											variant="grey"
											className="font-normal py-4 px-4 rounded-xl text-md"
											onClick={() => {
												setCreateNew(false);
											}}
										>
											Cancel
										</Button>
									</div>
								</>
							)}

							<Text className="flex-none flex-grow-0 text-md text-gray-400 font-normal mb-2 w-full mt-[32px]">
								List of Statuses
							</Text>
							<div className="flex flex-wrap w-full gap-3">
								<ListCard
									statusTitle="In Progress"
									bgColor={'#ECE8FC'}
									icon={<TimerIcon className="stroke-black" />}
								/>
								<ListCard
									statusTitle="Completed"
									bgColor={'#D4EFDF'}
									icon={<TickCircleIcon className="stroke-black" />}
								/>
								<ListCard
									statusTitle="Open"
									bgColor={'#D6E4F9'}
									icon={<LoginIcon />}
								/>
								<ListCard
									statusTitle="Blocked"
									bgColor={'#F5B8B8'}
									icon={<CloseCircleIcon />}
								/>
								<ListCard
									statusTitle="In Review"
									bgColor={'#F3D8B0'}
									icon={<SearchStatusIcon />}
								/>
								<ListCard
									statusTitle="Backlog"
									bgColor={'#F2F2F2'}
									icon={<SearchStatusIcon />}
								/>
								<ListCard
									statusTitle="Ready"
									bgColor={'#F5F1CB'}
									icon={<ClockIcon />}
								/>
							</div>
						</div>
					</div>
				</div>
			</form>
		</>
	);
};
export default withAuthentication(TaskStatusesForm, {
	displayName: 'TaskStatusesForm',
});

/* eslint-disable no-mixed-spaces-and-tabs */
import { withAuthentication } from 'lib/app/authenticator';
import { Button, InputField, Text } from 'lib/components';
import { useForm } from 'react-hook-form';
import { useCallback, useEffect, useState } from 'react';
import { userState } from '@app/stores';
import { useRecoilState } from 'recoil';
import { LanguageDropDown } from './language-dropdown';
import { PlusIcon } from '@heroicons/react/20/solid';

const TaskLabelForm = () => {
	const [user] = useRecoilState(userState);
	const { setValue, handleSubmit } = useForm();
	const [createNew, setCreateNew] = useState(false);

	useEffect(() => {
		setValue('teamName', '');
		setValue('teamType', '');
		setValue('teamLink', '');
	}, [user, setValue]);

	const onSubmit = useCallback(async (values: any) => {
		console.log(values);
	}, []);

	return (
		<>
			<form
				className="w-full"
				onSubmit={handleSubmit(onSubmit)}
				autoComplete="off"
			>
				<div className="flex">
					<div className="rounded-md m-h-64 p-[32px] flex gap-x-[2rem]">
						<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mb-2 w-[20%]">
							Task Label
						</Text>

						<div className="flex flex-col">
							{!createNew && (
								<Button
									variant="outline"
									className="font-normal border-2 justify-start rounded-[10px] text-md w-[230px] h-[46px] gap-0"
									onClick={() => {
										setCreateNew(true);
									}}
								>
									<span className="mr-[11px]">
										<PlusIcon className=" font-normal w-[16px] h-[16px]" />
									</span>
									Create new Label
								</Button>
							)}

							{createNew && (
								<>
									<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mb-2">
										New Label
									</Text>
									<div className="flex  w-full gap-x-5 items-center mt-3">
										<InputField
											type="text"
											placeholder="Create Label"
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

							<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mb-2 w-full mt-[32px]">
								List of Labels
							</Text>
							{/* <div className="flex flex-wrap w-full gap-3">
								
							</div> */}
						</div>
					</div>
				</div>
			</form>
		</>
	);
};
export default withAuthentication(TaskLabelForm, {
	displayName: 'TaskLabelForm',
});

import { imgTitle } from '@app/helpers/img-title';
import { useOrganizationTeams } from '@app/hooks/features/useOrganizationTeams';
import { Popover, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/24/solid';
import { useTheme } from 'next-themes';
import { Fragment, useState } from 'react';
import { SettingIcon } from './main/settingIcon';
import { SettingIconDark } from './main/settingIconDark';
import { Spinner } from './spinner';

export const TeamsDropDown = () => {
	const [edit, setEdit] = useState<boolean>(false);
	const { teams, activeTeam, setActiveTeam, teamsFetching } =
		useOrganizationTeams();
	const { theme } = useTheme();
	return (
		<div className="w-[223px] max-w-sm ">
			<Popover className="relative">
				{({ open, close }) => (
					<>
						<Popover.Button
							className={`w-[223px] h-[50px]
                ${open ? '' : 'text-opacity-90'}
                group inline-flex items-center rounded-[12px] bg-[#ffffff] dark:bg-[#2E394D] px-3 py-2 text-base font-medium text-white hover:text-opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 border-solid border-1 border-[#000000]`}
						>
							<div className="w-full flex items-center justify-between">
								<div className="flex items-center justify-center space-x-4">
									<div className="w-[32px] h-[32px] rounded-full bg-white text-primary flex justify-center items-center text-[10px]">
										{activeTeam ? imgTitle(activeTeam.name) : ''}
									</div>
									<span className="text-[18px] text-[#282048] text-semibold dark:text-white">
										{activeTeam?.name}
									</span>
								</div>

								{teamsFetching ? (
									<Spinner dark={false} />
								) : (
									<ChevronDownIcon
										className={`${open ? '' : 'text-opacity-70'}
                  ml-2 h-5 w-5 text-primary dark:text-white transition duration-150 ease-in-out group-hover:text-opacity-80`}
										aria-hidden="true"
									/>
								)}
							</div>
						</Popover.Button>
						<Transition
							as={Fragment}
							enter="transition ease-out duration-200"
							enterFrom="opacity-0 translate-y-1"
							enterTo="opacity-100 translate-y-0"
							leave="transition ease-in duration-150"
							leaveFrom="opacity-100 translate-y-0"
							leaveTo="opacity-0 translate-y-1"
						>
							<Popover.Panel className="absolute left-1/2 z-10 mt-3 w-[271px] max-w-sm -translate-x-1/2 transform px-4 sm:px-0 lg:max-w-3xl ml-[20px]">
								<div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
									<div className="relative grid gap-[8px] bg-[#FFFFFF] dark:bg-[#2E394D] px-3 py-4 lg:grid-cols-1 w-full">
										{teams.map((item) => {
											const color = '#F5F6FB';
											return (
												<div
													key={item.id}
													className="cursor-pointer font-light"
													onClick={() => {
														setActiveTeam(item);
														close();
													}}
												>
													<div className="flex flex-row">
														<div className="flex item-center justify-start mb-4 gap-[10px]">
															<div
																className={`w-[32px] h-[32px] rounded-full font-bold bg-[${color}]  text-primary flex justify-center items-center text-[10px]`}
															>
																AL
															</div>
															<div className="text-[16px] text-primary text-normal dark:text-white">
																ALL
															</div>
														</div>

														<div className="ml-auto">
															{theme === 'dark' ? (
																<SettingIconDark />
															) : (
																<SettingIcon />
															)}
														</div>
													</div>
													<div className="flex flex-row">
														<div className="flex items-center justify-start space-x-4">
															<div
																className={`w-[34px] h-[34px] rounded-full font-bold bg-[${color}]  text-primary flex justify-center items-center text-[10px]`}
															>
																{imgTitle(item.name)}
															</div>
															<div className="text-[16px] text-primary text-normal dark:text-white">
																{item.name} ({item.members.length})
															</div>
														</div>
														<div className="ml-auto">
															{theme === 'dark' ? (
																<SettingIconDark />
															) : (
																<SettingIcon />
															)}
														</div>
													</div>
												</div>
											);
										})}
									</div>
									{edit === true ? (
										<CreateNewTeam setEdit={setEdit} />
									) : (
										<div className="bg-white dark:bg-[#2E394D] p-4">
											<button
												className="rounded-[8px] bg-[#ffffff] dark:bg-[#2E394D] text-[16px] text-primary dark:text-white font-semibold text-center w-[239px] h-[40px] border-solid border-[1.5px] border-[#3826A6] dark:border-[#fff]"
												onClick={() => {
													setEdit(true);
												}}
											>
												<div className="flex items-center justify-center w-[239px]">
													<span className="mr-[11px]">
														<PlusIcon className="text-[#3826A6] dark:text-white font-bold w-[16px] h-[16px]" />
													</span>
													Create new team
												</div>
											</button>
										</div>
									)}
								</div>
							</Popover.Panel>
						</Transition>
					</>
				)}
			</Popover>
		</div>
	);
};

function CreateNewTeam({
	setEdit,
}: {
	setEdit: (value: React.SetStateAction<boolean>) => void;
}) {
	const { createOTeamLoading, createOrganizationTeam } = useOrganizationTeams();
	const [error, setError] = useState<string | null>(null);
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);
		const form = new FormData(e.currentTarget);
		const name = form.get('name') || '';

		createOrganizationTeam(name.toString())
			.then(() => {
				setEdit(false);
			})
			.catch((err) => {
				setError(err?.message);
			});
	};

	return (
		<div className="bg-white dark:bg-[#202023] p-4 border-t border-[#9490A0] border-opacity-10 ">
			<form
				onSubmit={handleSubmit}
				className="relative text-gray-600 focus-within:text-gray-400"
			>
				<input
					autoFocus
					className="w-full h-[40px] pr-[20px] dark:text-white text-primary bg-[#EEEFF5] border border-[#EEEFF5] dark:bg-[#1B1B1E] placeholder-[#9490A0] placeholder:font-light placeholder:text-sm dark:placeholder-[#616164] rounded-[10px] pl-[10px] shadow-inner "
					placeholder="Please enter your team name"
					disabled={createOTeamLoading}
					name="name"
				/>

				<span className="absolute inset-y-0 right-0 flex items-center pl-2">
					{createOTeamLoading ? (
						<Spinner dark={false} />
					) : (
						<XMarkIcon
							className="w-6 h-6 px-1 hover:bg-gray-300 hover:text-primary cursor-pointer mr-1 rounded-lg flex justify-center items-center"
							onClick={() => setEdit(false)}
						/>
					)}
				</span>
			</form>
			{error ? (
				<span className="text-xs text-red-400 pl-[10px]">{error}</span>
			) : (
				<span className="text-xs text-[#9490A0] pl-[10px]">
					Press Enter to validate
				</span>
			)}
		</div>
	);
}

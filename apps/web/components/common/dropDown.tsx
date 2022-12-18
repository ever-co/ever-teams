import { imgTitle } from '@app/helpers/img-title';
import { useOrganizationTeams } from '@app/hooks/features/useOrganizationTeams';
import { Popover, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/24/solid';
import { Fragment, useState } from 'react';
import { Spinner } from './spinner';

export const TeamsDropDown = () => {
	const [edit, setEdit] = useState<boolean>(false);
	const { teams, activeTeam, setActiveTeam, teamsFetching } =
		useOrganizationTeams();

	return (
		<div className="w-[290px] max-w-sm">
			<Popover className="relative">
				{({ open, close }) => (
					<>
						<Popover.Button
							className={`w-[290px] h-[50px]
                ${open ? '' : 'text-opacity-90'}
                group inline-flex items-center rounded-[12px] bg-[#ffffff] dark:bg-[#18181B] px-3 py-2 text-base font-medium text-white hover:text-opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 border-solid border-1 border-[#000000]`}
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
							<Popover.Panel className="absolute left-1/2 z-10 mt-3 w-[290px] max-w-sm -translate-x-1/2 transform px-4 sm:px-0 lg:max-w-3xl">
								<div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
									<div className="relative grid gap-[8px] bg-[#FFFFFF] dark:bg-[#18181B] px-3 py-4 lg:grid-cols-1 w-full">
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
															<svg
																width="24"
																height="24"
																viewBox="0 0 24 24"
																fill="none"
																xmlns="http://www.w3.org/2000/svg"
																className="flex justify-end order-2"
															>
																<path
																	d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
																	stroke="#292D32"
																	stroke-width="1.5"
																	stroke-miterlimit="10"
																	stroke-linecap="round"
																	stroke-linejoin="round"
																/>
																<path
																	d="M2 12.8799V11.1199C2 10.0799 2.85 9.21994 3.9 9.21994C5.71 9.21994 6.45 7.93994 5.54 6.36994C5.02 5.46994 5.33 4.29994 6.24 3.77994L7.97 2.78994C8.76 2.31994 9.78 2.59994 10.25 3.38994L10.36 3.57994C11.26 5.14994 12.74 5.14994 13.65 3.57994L13.76 3.38994C14.23 2.59994 15.25 2.31994 16.04 2.78994L17.77 3.77994C18.68 4.29994 18.99 5.46994 18.47 6.36994C17.56 7.93994 18.3 9.21994 20.11 9.21994C21.15 9.21994 22.01 10.0699 22.01 11.1199V12.8799C22.01 13.9199 21.16 14.7799 20.11 14.7799C18.3 14.7799 17.56 16.0599 18.47 17.6299C18.99 18.5399 18.68 19.6999 17.77 20.2199L16.04 21.2099C15.25 21.6799 14.23 21.3999 13.76 20.6099L13.65 20.4199C12.75 18.8499 11.27 18.8499 10.36 20.4199L10.25 20.6099C9.78 21.3999 8.76 21.6799 7.97 21.2099L6.24 20.2199C5.33 19.6999 5.02 18.5299 5.54 17.6299C6.45 16.0599 5.71 14.7799 3.9 14.7799C2.85 14.7799 2 13.9199 2 12.8799Z"
																	stroke="#292D32"
																	stroke-width="1.5"
																	stroke-miterlimit="10"
																	stroke-linecap="round"
																	stroke-linejoin="round"
																/>
															</svg>
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
															<svg
																width="24"
																height="24"
																viewBox="0 0 24 24"
																fill="none"
																xmlns="http://www.w3.org/2000/svg"
																className=""
															>
																<path
																	d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
																	stroke="#292D32"
																	stroke-width="1.5"
																	stroke-miterlimit="10"
																	stroke-linecap="round"
																	stroke-linejoin="round"
																/>
																<path
																	d="M2 12.8799V11.1199C2 10.0799 2.85 9.21994 3.9 9.21994C5.71 9.21994 6.45 7.93994 5.54 6.36994C5.02 5.46994 5.33 4.29994 6.24 3.77994L7.97 2.78994C8.76 2.31994 9.78 2.59994 10.25 3.38994L10.36 3.57994C11.26 5.14994 12.74 5.14994 13.65 3.57994L13.76 3.38994C14.23 2.59994 15.25 2.31994 16.04 2.78994L17.77 3.77994C18.68 4.29994 18.99 5.46994 18.47 6.36994C17.56 7.93994 18.3 9.21994 20.11 9.21994C21.15 9.21994 22.01 10.0699 22.01 11.1199V12.8799C22.01 13.9199 21.16 14.7799 20.11 14.7799C18.3 14.7799 17.56 16.0599 18.47 17.6299C18.99 18.5399 18.68 19.6999 17.77 20.2199L16.04 21.2099C15.25 21.6799 14.23 21.3999 13.76 20.6099L13.65 20.4199C12.75 18.8499 11.27 18.8499 10.36 20.4199L10.25 20.6099C9.78 21.3999 8.76 21.6799 7.97 21.2099L6.24 20.2199C5.33 19.6999 5.02 18.5299 5.54 17.6299C6.45 16.0599 5.71 14.7799 3.9 14.7799C2.85 14.7799 2 13.9199 2 12.8799Z"
																	stroke="#292D32"
																	stroke-width="1.5"
																	stroke-miterlimit="10"
																	stroke-linecap="round"
																	stroke-linejoin="round"
																/>
															</svg>
														</div>
													</div>
												</div>
											);
										})}
									</div>
									{edit === true ? (
										<CreateNewTeam setEdit={setEdit} />
									) : (
										<div className="bg-white dark:bg-[#18181B] p-4">
											<button
												className="rounded-[8px] bg-[#ffffff] dark:bg-[#202023] text-[16px] text-primary dark:text-white font-medium text-center w-[261px] h-[40px] border-solid border-[1.5px] border-[#3826A6]"
												onClick={() => {
													setEdit(true);
												}}
											>
												<div className="flex items-center justify-center">
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

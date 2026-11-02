import { imgTitle } from '@/core/lib/helpers/img-title';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { ChevronDown, Plus, X } from '@/core/components/icons';
import { useState } from 'react';
import { Spinner } from '../common/spinner';
import { useTranslations } from 'next-intl';
import { useOrganizationTeamsQuery, useCreateOrganizationTeam } from '@/core/hooks/organizations';
import { clsxm } from '@/core/lib/utils';
import { activeTeamState, organizationTeamsState } from '@/core/stores';
import { useAtomValue } from 'jotai';
export const TeamsDropDown = () => {
	const [edit, setEdit] = useState<boolean>(false);

	const activeTeam = useAtomValue(activeTeamState);
	const teams = useAtomValue(organizationTeamsState);
	const { getOrganizationTeamsLoading } = useOrganizationTeamsQuery();
	const { setActiveTeam } = useCreateOrganizationTeam();
	const t = useTranslations();
	return (
		<div className="w-[290px] max-w-sm">
			<Popover className="relative">
				{({ open, close }) => (
					<>
						<PopoverButton className="group inline-flex h-9 w-[290px] items-center rounded-md hairline-border border-transparent bg-card px-3 py-2 text-sm font-medium text-foreground hairline-ring ring-foreground/10 shadow-sm shadow-black/10 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 dark:ring-foreground/15">
							<div className="flex justify-between items-center w-full">
								<div className="flex items-center justify-center gap-2">
									<div className="flex size-6 items-center justify-center rounded-md bg-foreground/5 text-[10px] font-medium text-muted-foreground">
										{activeTeam ? imgTitle(activeTeam.name) : ''}
									</div>
									<span className="truncate text-sm text-foreground">{activeTeam?.name}</span>
								</div>

								{getOrganizationTeamsLoading ? (
									<Spinner dark={false} />
								) : (
									<ChevronDown
										className={clsxm(
											'ml-2 size-4 text-muted-foreground transition-transform duration-150',
											open && 'rotate-180'
										)}
										aria-hidden="true"
									/>
								)}
							</div>
						</PopoverButton>
						<Transition
							as="div"
							enter="transition ease-out duration-200"
							enterFrom="opacity-0 translate-y-1"
							enterTo="opacity-100 translate-y-0"
							leave="transition ease-in duration-150"
							leaveFrom="opacity-100 translate-y-0"
							leaveTo="opacity-0 translate-y-1"
						>
							<PopoverPanel className="absolute left-1/2 z-10 mt-3 w-[290px] max-w-sm -translate-x-1/2 transform px-4 sm:px-0 lg:max-w-3xl">
								<div className="overflow-hidden rounded-xl bg-popover hairline-ring ring-border shadow-md shadow-black/6.5">
									<div className="relative grid w-full gap-0.5 p-1 lg:grid-cols-1">
										{teams.map((item) => {
											return (
												<div
													key={item.id}
													className="cursor-pointer rounded-md px-2 py-1.5 transition-colors hover:bg-foreground/5"
													onClick={() => {
														setActiveTeam(item);
														close();
													}}
												>
													<div className="flex items-center justify-start gap-2">
														<div className="flex size-6 items-center justify-center rounded-md bg-foreground/5 text-[10px] font-medium text-muted-foreground">
															{imgTitle(item.name)}
														</div>
														<span className="text-sm text-foreground">
															{item.name} ({item.members?.length || 0})
														</span>
													</div>
												</div>
											);
										})}
									</div>
									{edit === true ? (
										<CreateNewTeam setEdit={setEdit} />
									) : (
										<div className="hairline-t border-border p-2">
											<button
												className="h-8 w-full rounded-md hairline-border border-transparent bg-card text-center text-xs font-medium text-foreground hairline-ring ring-foreground/10 shadow-sm shadow-black/10 transition-colors hover:bg-muted/50 dark:ring-foreground/15"
												onClick={() => {
													setEdit(true);
												}}
											>
												<div className="flex items-center justify-center">
													<span className="mr-2">
														<Plus className="size-4" />
													</span>
													{t('team.creation.NEW')}
												</div>
											</button>
										</div>
									)}
								</div>
							</PopoverPanel>
						</Transition>
					</>
				)}
			</Popover>
		</div>
	);
};

function CreateNewTeam({ setEdit }: { setEdit: (value: React.SetStateAction<boolean>) => void }) {
	const { loading: createOTeamLoading, createOrganizationTeam } = useCreateOrganizationTeam();
	const [error, setError] = useState<string | null>(null);
	const t = useTranslations();
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
		<div className="hairline-t border-border p-2">
			<form onSubmit={handleSubmit} className="relative text-muted-foreground">
				<input
					autoFocus
					className="h-8 w-full rounded-md hairline-border border-transparent bg-background pl-2.5 pr-8 text-sm text-foreground hairline-ring ring-foreground/10 shadow-sm shadow-black/10 outline-none transition-[color,box-shadow] placeholder:text-muted-foreground/75 focus-visible:border-foreground/35 focus-visible:ring-[3px] focus-visible:ring-ring/25 dark:bg-foreground/5 dark:ring-foreground/15"
					placeholder="Please enter your team name"
					disabled={createOTeamLoading}
					name="name"
				/>

				<span className="flex absolute inset-y-0 right-0 items-center pl-2">
					{createOTeamLoading ? (
						<Spinner dark={false} />
					) : (
						<X
							className="mr-1 flex size-6 cursor-pointer items-center justify-center rounded-md px-1 transition-colors hover:bg-foreground/5 hover:text-foreground"
							onClick={() => setEdit(false)}
						/>
					)}
				</span>
			</form>
			{error ? (
				<span className="pl-2.5 text-xs text-destructive-ink">{error}</span>
			) : (
				<span className="pl-2.5 text-xs text-muted-foreground">{t('placeholders.ENTER_TO_VALIDATE')}</span>
			)}
		</div>
	);
}

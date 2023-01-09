import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Button,
	Card,
	Dropdown,
	InputField,
	Modal,
	Text,
} from 'lib/components';
import { mapTeamItems, TeamItem } from './team-item';
import { PlusIcon } from '@heroicons/react/24/solid';
import { useModal, useOrganizationTeams } from '@app/hooks';
import { clsxm } from '@app/utils';

export const TeamsDropDown = () => {
	const { teams, activeTeam, setActiveTeam, teamsFetching } =
		useOrganizationTeams();

	const items = useMemo(() => mapTeamItems(teams), [teams]);

	const [teamItem, setTeamItem] = useState<TeamItem | null>(null);

	const { isOpen, closeModal, openModal } = useModal();

	useEffect(() => {
		setTeamItem(items.find((t) => t.key === activeTeam?.id) || null);
	}, [activeTeam, items]);

	const onChangeActiveTeam = useCallback(
		(item: TeamItem) => {
			if (item.data) {
				setActiveTeam(item.data);
			}
		},
		[setActiveTeam]
	);

	return (
		<>
			<Dropdown
				className="min-w-[230px] max-w-sm"
				buttonClassName={clsxm(
					'py-0 font-medium',
					items.length === 0 && ['py-2']
				)}
				value={teamItem}
				onChange={onChangeActiveTeam}
				items={items}
				loading={teamsFetching}
			>
				<Button
					className="w-full text-xs mt-3 dark:text-white dark:border-white"
					variant="outline"
					onClick={openModal}
				>
					<PlusIcon className="w-[16px] h-[16px]" /> Create new teams
				</Button>
			</Dropdown>

			<CreateTeamModal open={isOpen} closeModal={closeModal} />
		</>
	);
};

/**
 * Create team modal
 */
function CreateTeamModal({
	open,
	closeModal,
}: {
	open: boolean;
	closeModal: () => void;
}) {
	const { createOTeamLoading, createOrganizationTeam } = useOrganizationTeams();
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);
		const form = new FormData(e.currentTarget);
		const name = form.get('name') || '';

		createOrganizationTeam(name.toString())
			.then(closeModal)
			.catch((err) => {
				setError(err?.message);
			});
	};
	return (
		<Modal isOpen={open} closeModal={() => undefined}>
			<form
				className="w-[98%] md:w-[530px]"
				autoComplete="off"
				onSubmit={handleSubmit}
			>
				<Card className="w-full" shadow="custom">
					<div className="flex flex-col justify-between items-center">
						<Text.Heading as="h3" className="text-center">
							Create new team
						</Text.Heading>

						<div className="w-full mt-5">
							<InputField
								name="name"
								placeholder="Please Enter your team name"
								errors={error ? { name: error } : undefined}
								required
							/>
						</div>

						<div className="w-full flex justify-between mt-3 items-center">
							<button type="button" onClick={closeModal}>
								<Text className="text-sm text-gray-500 dark:text-gray-300">
									Cancel
								</Text>
							</button>
							<Button
								type="submit"
								disabled={createOTeamLoading}
								loading={createOTeamLoading}
							>
								Create
							</Button>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
}

import { cn, Select } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@lib/context/teams-context';

export const TeamsActiveOrganizationSelector = ({
	size,
	label,
	className,
	containerClassName
}: {
	size?: 'default' | 'sm' | 'lg' | null;
	label?: string;
	className?: string;
	containerClassName?: string;
}) => {
	const {
		userOrganizations,
		loadings: { userOrganizationsLoading },
		selectedOrganization,
		setSelectedOrganization
	} = useTeamsContext();

	return (
		<div className={cn(`flex flex-col gap-2`, containerClassName)}>
			{label && (
				<label htmlFor="organization" className="text-sm text-foreground">
					{label}
				</label>
			)}
			<Select
				loading={userOrganizationsLoading}
				className={className}
				name="organization"
				size={size}
				placeholder={'Select organization'}
				disabled={userOrganizationsLoading}
				value={selectedOrganization}
				// values={[
				// 	{
				// 		label: 'Team 1 (4)',
				// 		value: 'id1'
				// 		// icon: <Avatar  className="size-6 text-xs" src="" fallback="AB" title="Avatar" />
				// 	},
				// 	{
				// 		label: 'Team 2 (4)',
				// 		value: 'id2'
				// 		// icon: <Avatar  className="size-6 text-xs" src="" fallback="AB" title="Avatar" />
				// 	},
				// 	{
				// 		label: 'Team 3 (4)',
				// 		value: 'id3'
				// 		// icon: <Avatar  className="size-6 text-xs" src="" fallback="AB" title="Avatar" />
				// 	}
				// ]}
				values={
					userOrganizations?.items?.length
						? userOrganizations.items.map((elt) => {
								return {
									label: elt.organization.name,
									value: elt.organizationId
								};
							})
						: undefined
				}
				onValueChange={(e: string) => {
					setSelectedOrganization(e);
				}}
			/>
		</div>
	);
};

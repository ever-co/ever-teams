import { CHARACTER_LIMIT_TO_SHOW } from '@app/constants';
import { imgTitle } from '@app/helpers';
import { IOrganizationTeamList } from '@app/interfaces';
import { clsxm, isValidUrl } from '@app/utils';
import { Avatar, DropdownItem, Tooltip } from 'lib/components';
import { SettingsOutlineIcon } from 'lib/components/svgs';
import Link from 'next/link';
import stc from 'string-to-color';

export type TeamItem = DropdownItem<IOrganizationTeamList>;

export function mapTeamItems(
	teams: IOrganizationTeamList[],
	onChangeActiveTeam: (item: TeamItem) => void
) {
	const items = teams.map<TeamItem>((team) => {
		return {
			key: team.id,
			Label: ({ selected }) => (
				<Tooltip
					label={team.name || ''}
					placement="auto"
					enabled={
						(team.name || '').trim().length > CHARACTER_LIMIT_TO_SHOW - 5
					}
				>
					<div className="flex justify-between w-full">
						<div className="max-w-[90%]">
							<TeamItem
								title={team.name}
								count={team.members.length}
								className={clsxm(selected && ['font-medium'])}
								logo={team.image?.thumbUrl || team.image?.fullUrl || ''}
							/>
						</div>

						<Link
							onClick={() => {
								onChangeActiveTeam({
									data: team,
								} as TeamItem);
							}}
							href="/settings/team"
						>
							<SettingsOutlineIcon className="cursor-pointer" />
						</Link>
					</div>
				</Tooltip>
			),
			selectedLabel: (
				<Tooltip
					label={team.name || ''}
					placement="auto"
					enabled={
						(team.name || '').trim().length > CHARACTER_LIMIT_TO_SHOW - 5
					}
				>
					<TeamItem
						title={team.name}
						count={team.members?.length || 0}
						className="py-2 mb-0"
						logo={team.image?.thumbUrl || team.image?.fullUrl || ''}
					/>
				</Tooltip>
			),
			data: team,
		};
	});

	// if (items.length > 0) {
	// 	items.unshift({
	// 		key: 0,
	// 		Label: () => (
	// 			<div className="flex justify-between">
	// 				<TeamItem
	// 					title={'All'}
	// 					className="w-full cursor-default"
	// 					color="#F5F5F5"
	// 					disabled
	// 				/>
	// 			</div>
	// 		),
	// 		disabled: true,
	// 	});
	// }

	return items;
}

export function TeamItem({
	title,
	count,
	className,
	color,
	disabled,
	logo,
}: {
	title?: string;
	count?: number;
	className?: string;
	color?: string;
	disabled?: boolean;
	logo?: string;
}) {
	return (
		<div
			className={clsxm(
				'flex items-center justify-start space-x-2 text-sm',
				'cursor-pointer mb-4 max-w-full',
				className
			)}
		>
			<div>
				<div
					className={clsxm(
						'w-[27px] h-[27px]',
						'flex justify-center items-center',
						'rounded-full text-xs text-default dark:text-white',
						'shadow-md',
						disabled && ['dark:text-default']
					)}
					style={{ background: color || `${stc(title)}80` }}
				>
					{logo && isValidUrl(logo) ? (
						<Avatar
							size={27}
							className="relative cursor-pointer"
							imageUrl={logo}
							alt="user avatar"
						/>
					) : title ? (
						imgTitle(title)
					) : (
						''
					)}
				</div>
			</div>
			<span
				className={clsxm(
					'text-normal',
					'whitespace-nowrap text-ellipsis overflow-hidden'
				)}
			>
				{title}
			</span>
			<span
				className={clsxm('text-normal')}
				style={{
					marginLeft: 0,
				}}
			>
				{count ? `(${count})` : ''}
			</span>
		</div>
	);
}

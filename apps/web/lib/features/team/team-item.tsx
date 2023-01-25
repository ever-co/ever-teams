import { imgTitle } from '@app/helpers';
import { IOrganizationTeamList } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';
import { SettingsOutlineIcon } from 'lib/components/svgs';
import stc from 'string-to-color';

export type TeamItem = DropdownItem<IOrganizationTeamList>;

export function mapTeamItems(teams: IOrganizationTeamList[]) {
	const items = teams.map<TeamItem>((team) => {
		return {
			key: team.id,
			Label: ({ selected }) => (
				<div className="flex justify-between w-full">
					<div className="max-w-[90%]">
						<TeamItem
							title={team.name}
							count={team.members.length}
							className={clsxm(selected && ['font-medium'])}
						/>
					</div>

					<SettingsOutlineIcon className="cursor-pointer" />
				</div>
			),
			selectedLabel: <TeamItem title={team.name} className="py-2 mb-0" />,
			data: team,
		};
	});

	if (items.length > 0) {
		items.unshift({
			key: 0,
			Label: () => (
				<div className="flex justify-between">
					<TeamItem
						title={'All'}
						className="w-full cursor-default"
						color="#F5F5F5"
						disabled
					/>
					<SettingsOutlineIcon className="opacity-70" />
				</div>
			),
			disabled: true,
		});
	}

	return items;
}

export function TeamItem({
	title,
	count,
	className,
	color,
	disabled,
}: {
	title?: string;
	count?: number;
	className?: string;
	color?: string;
	disabled?: boolean;
}) {
	return (
		<div
			title={title}
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
					{title ? imgTitle(title) : ''}
				</div>
			</div>
			<span
				className={clsxm(
					'text-normal',
					'whitespace-nowrap text-ellipsis overflow-hidden'
				)}
			>
				{title} {count ? `(${count})` : ''}
			</span>
		</div>
	);
}

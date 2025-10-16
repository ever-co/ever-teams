import { CHARACTER_LIMIT_TO_SHOW } from '@/core/constants/config/constants';
import { imgTitle } from '@/core/lib/helpers/index';
import { clsxm, isValidUrl } from '@/core/lib/utils';
import { DropdownItem } from '@/core/components';
import { SettingOutlineIcon } from 'assets/svg';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { readableColor } from 'polished';
import stc from 'string-to-color';
import { Tooltip } from '../duplicated-components/tooltip';
import { Avatar } from '../duplicated-components/avatar';
import { TOrganizationTeam } from '@/core/types/schemas';

export type TeamItem = DropdownItem<TOrganizationTeam>;

export function mapTeamItems(teams: TOrganizationTeam[], onChangeActiveTeam: (item: TeamItem) => void) {
	const items = teams
		.filter((team) => team.id && team.name)
		.map<TeamItem>((team) => {
			return {
				key: team.id,
				Label: ({ selected }) => (
					<Tooltip
						label={team.name || ''}
						placement="auto"
						enabled={(team.name || '').trim().length > CHARACTER_LIMIT_TO_SHOW - 5}
					>
						<div className="flex gap-x-2 justify-between items-center my-1 w-full">
							<div className="max-w-[90%] flex items-center">
								<TeamItem
									title={team.name}
									count={team.members?.length}
									className={clsxm(selected && ['font-medium'])}
									logo={team.image?.thumbUrl || team.image?.fullUrl || ''}
									color={team.color || ''}
								/>
							</div>

							<Link
								className="flex justify-center items-center"
								onClick={(e) => {
									onChangeActiveTeam({
										data: team
									} as TeamItem);
									e.stopPropagation();
								}}
								href="/settings/team"
							>
								<SettingOutlineIcon className="w-5 h-5 cursor-pointer" />
							</Link>
						</div>
					</Tooltip>
				),
				selectedLabel: (
					<Tooltip
						label={team.name || ''}
						placement="auto"
						enabled={(team.name || '').trim().length > CHARACTER_LIMIT_TO_SHOW - 5}
					>
						<TeamItem
							title={team.name}
							count={team.members?.length || 0}
							className="py-2 mb-0"
							logo={team.image?.thumbUrl || team.image?.fullUrl || ''}
							color={team.color}
						/>
					</Tooltip>
				),
				data: team
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
	logo
}: {
	title?: string;
	count?: number;
	className?: string;
	color?: string | null;
	disabled?: boolean;
	logo?: string;
}) {
	const { theme } = useTheme();
	const readableColorHex = readableColor(color || (theme === 'light' ? '#FFF' : '#000'));

	return (
		<div
			className={clsxm(
				'flex justify-start items-center space-x-2 text-sm',
				'max-w-full cursor-pointer',
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
					style={{
						background: color || `${stc(title)}80`,

						...(color ? { color: readableColorHex } : {})
					}}
				>
					{logo && isValidUrl(logo) ? (
						<Avatar size={27} className="relative cursor-pointer" imageUrl={logo} alt="user avatar" />
					) : title ? (
						imgTitle(title)
					) : (
						''
					)}
				</div>
			</div>
			<div className="flex gap-1">
				<span
					className={clsxm('text-normal md:max-w-[100px]', 'overflow-hidden whitespace-nowrap text-ellipsis')}
				>
					{title}
				</span>
				<span
					className={clsxm('text-normal')}
					style={{
						marginLeft: 0
					}}
				>
					{count ? `(${count})` : ''}
				</span>
			</div>
		</div>
	);
}

export function AllTeamItem({ title, count }: { title: string; count: number }) {
	return (
		<Link className="h-full flex items-center " href="/all-teams">
			<div className={clsxm('flex justify-start items-center space-x-2 text-sm', ' max-w-full cursor-pointer')}>
				<div>
					<div
						className={clsxm(
							'w-[27px] h-[27px]',
							'flex justify-center items-center',
							'text-xs rounded-full text-default dark:text-white',
							'shadow-md'
						)}
					>
						{imgTitle(title)}
					</div>
				</div>
				<div className="flex gap-1">
					<span
						className={clsxm(
							'text-normal md:max-w-[100px]',
							'overflow-hidden whitespace-nowrap text-ellipsis'
						)}
					>
						{title}
					</span>
					<span
						className={clsxm('text-normal')}
						style={{
							marginLeft: 0
						}}
					>
						{count ? `(${count})` : ''}
					</span>
				</div>
			</div>
		</Link>
	);
}

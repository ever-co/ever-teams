import { CHARACTER_LIMIT_TO_SHOW } from '@/core/constants/config/constants';
import { imgTitle } from '@/core/lib/helpers/index';
import { clsxm, isValidUrl } from '@/core/lib/utils';
import { DropdownItem } from '@/core/components';
import { Settings } from '@/core/components/icons';
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
								className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
								onClick={(e) => {
									onChangeActiveTeam({
										data: team
									} as TeamItem);
									e.stopPropagation();
								}}
								href="/settings/team"
							>
								<Settings className="size-4 cursor-pointer" />
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
							className="py-0 mb-0"
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
		<div className={clsxm('flex max-w-full cursor-pointer items-center justify-start gap-2 text-sm', className)}>
			<div>
				<div
					className={clsxm(
						'size-6',
						'flex justify-center items-center',
						'rounded-md text-xs font-medium text-foreground',
						disabled && ['text-muted-foreground']
					)}
					style={{
						background: color || `${stc(title)}80`,

						...(color ? { color: readableColorHex } : {})
					}}
				>
					{logo && isValidUrl(logo) ? (
						<Avatar
							size={24}
							shape="square"
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
			<div className="flex gap-1">
				<span className="overflow-hidden text-ellipsis whitespace-nowrap md:max-w-[100px]">{title}</span>
				<span
					className="tabular-nums text-muted-foreground"
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
			<div className="flex max-w-full cursor-pointer items-center justify-start gap-2 text-sm">
				<div>
					<div
						className={clsxm(
							'size-6',
							'flex justify-center items-center',
							'rounded-md bg-foreground/5 text-xs font-medium text-muted-foreground'
						)}
					>
						{imgTitle(title)}
					</div>
				</div>
				<div className="flex gap-1">
					<span className="overflow-hidden text-ellipsis whitespace-nowrap md:max-w-[100px]">{title}</span>
					<span
						className="tabular-nums text-muted-foreground"
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

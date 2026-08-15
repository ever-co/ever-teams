import { Progress } from '@ever-teams/toolkit-ui';
import { cn } from '@ever-teams/toolkit-ui';
import { cva, VariantProps } from 'class-variance-authority';
import { Theme } from 'theme-ui';
import React from 'react';
import { Member } from '@ever-teams/toolkit-types';
import { TeamsBasicTimer } from '../../teams-time-trackers/teams-basic-timer';
import { useTranslation } from 'react-i18next';
import { defaultTheme } from '@lib/themes/themes';

// Variants with responsive design
const basicTeamsMemberVariants = cva(
	'backdrop-blur-xs p-6 bg-white dark:bg-gray-800 relative rounded-xl flex flex-col justify-start gap-5 shadow-2xl custom-scroll',
	{
		variants: {
			variant: {
				default: '',
				bordered: 'border-2 border-secondaryColor'
			},
			size: {
				default: 'w-full max-w-[1200px]',
				sm: 'w-full max-w-[300px] text-sm p-4',
				lg: 'w-full max-w-[40rem] px-10'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

export interface IBasicTeamsMemberProps
	extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof basicTeamsMemberVariants> {
	values?: Member[];
	className?: string;
	classNameTitle?: string;
	draggable?: boolean;
	showProgress?: boolean;
	showTime?: boolean;
	theme?: Theme<{}>;
	resizable?: boolean;
	renderItem?: React.ReactNode;
}

function BasicTeamsMember({
	values,
	variant = 'default',
	size = 'default',
	draggable = true,
	className,
	showProgress = false,
	theme = defaultTheme,
	renderItem,
	showTime,
	classNameTitle,
	title,
	...props
}: IBasicTeamsMemberProps): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<div
			{...props}
			className={cn(basicTeamsMemberVariants({ variant, size, className }), 'w-full resize custom-scroll handle')}
		>
			<div className="flex flex-col gap-4 w-full">
				<div className="flex justify-between items-center w-full">
					<span
						className={cn(
							'text-base font-medium md:text-lg text-slate-800 dark:text-slate-400',
							classNameTitle
						)}
					>
						{t('COMMON.members_activities')}
					</span>
					<button className="font-normal text-sm text-[#3826A6] dark:text-[#786bcd] hover:underline">
						{t('COMMON.view_more')}
					</button>
				</div>
				{values &&
					values.map(
						({ color, label, progress }, index) =>
							!renderItem && (
								<div key={index} className="flex gap-4 items-center w-full">
									<div className="flex gap-2 items-center">
										<div
											style={{ backgroundColor: color }}
											className="w-2.5 h-2.5 rounded-full"
										></div>
										<span className="text-sm text-slate-800 dark:text-slate-400">{label}</span>
									</div>
									{showProgress && (
										<>
											<Progress value={progress} className="w-full" />
											<span className="w-9 text-sm text-left text-slate-800 dark:text-slate-400">
												{progress}%
											</span>
										</>
									)}
									{showTime && (
										<div className="text-sm">
											<TeamsBasicTimer icon readonly className="py-0 text-sm" />
										</div>
									)}
								</div>
							)
					)}
			</div>
		</div>
	);
}

BasicTeamsMember.displayName = 'BasicTeamsMember';
export { BasicTeamsMember };

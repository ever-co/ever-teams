import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import { IIcon } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

export type IconItem = DropdownItem<IIcon>;

export function mapIconItems(icons: IIcon[]) {
	const items = icons.map((icon: IIcon) => {
		return {
			key: icon.path,
			Label: ({ selected }: { selected: boolean }) => (
				<div className="flex justify-between w-full">
					<div className="max-w-[90%]">
						<IconItem
							title={icon.title?.split('-').join(' ')}
							className={clsxm(selected && ['font-medium'])}
							url={icon.fullUrl || ''}
						/>
					</div>
				</div>
			),
			selectedLabel: <IconItem title={icon.title} url={icon.fullUrl || ''} className="py-2 mb-0" />,
			data: icon
		};
	});

	if (items.length > 0) {
		items.unshift({
			key: '',
			Label: () => (
				<div className="flex justify-between">
					<IconItem title={''} className="w-full cursor-default" url="" disabled />
				</div>
			),
			selectedLabel: <IconItem title={'Icons'} url={''} className="py-2 mb-0" />,
			data: { title: 'Icons', fullUrl: '' }
		});
	}

	return items;
}

export function IconItem({
	title,
	className,
	url,
	disabled
}: {
	title: string;
	className?: string;
	url: string;
	disabled?: boolean;
}) {
	const t = useTranslations();
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
				{url ? (
					<div
						className={clsxm(
							'w-[17px] h-[17px]',
							'flex justify-center items-center',
							'rounded-full text-xs text-default dark:text-white',
							disabled && ['dark:text-default']
						)}
					>
						<Image
							src={url}
							alt={title || ''}
							width={20}
							height={20}
							decoding="async"
							data-nimg="1"
							loading="lazy"
						/>
					</div>
				) : (
					<span>{t('common.ICON')}</span>
				)}
			</div>
		</div>
	);
}

export function generateIconList(iconFor: string, icons: string[]) {
	return icons.map((icon) => {
		return {
			fullUrl: `${GAUZY_API_BASE_SERVER_URL.value}/public/ever-icons/${iconFor}/${icon}.svg`,
			path: `ever-icons/${iconFor}/${icon}.svg`,
			title: icon
		};
	});
}

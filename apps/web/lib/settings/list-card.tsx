import { EditPenUnderlineIcon, TrashIcon } from 'assets/svg';
import { Button, Text, Tooltip } from 'lib/components';
import { CHARACTER_LIMIT_TO_SHOW } from '@app/constants';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { getTextColor } from '@app/helpers';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { svgFetch } from '@app/services/server/fetch';

export const StatusesListCard = ({
	statusIcon,
	statusTitle = '',
	bgColor,
	onEdit,
	onDelete,
	showDeleteButton = true,
	isStatus
}: IClassName<{
	statusIcon: string;
	statusTitle: string;
	bgColor: string;
	onEdit: any;
	onDelete: any;
	showDeleteButton?: boolean;
	isStatus?: boolean;
}>) => {
	const textColor = getTextColor(bgColor);
	const t = useTranslations();

	useEffect(() => {
		if (statusIcon) {
			loadSVG(statusIcon, 'icon-container' + statusTitle, textColor);
		}
	}, [statusIcon, statusTitle, textColor]);

	return (
		<div className="border w-[21.4rem] flex items-center p-1 rounded-xl justify-between">
			<div
				className={clsxm(
					'rounded-xl',
					isStatus || statusTitle.length >= CHARACTER_LIMIT_TO_SHOW ? 'w-2/3' : 'w-auto',
					'flex items-center p-3 gap-x-2 overflow-hidden mr-1'
				)}
				style={{ backgroundColor: bgColor === '' ? undefined : bgColor }}
			>
				{statusIcon && <div id={'icon-container' + statusTitle}></div>}
				<Tooltip
					label={statusTitle}
					enabled={statusTitle.length >= CHARACTER_LIMIT_TO_SHOW}
					placement="auto"
					className={clsxm('overflow-hidden text-ellipsis whitespace-nowrap w-full')}
				>
					<Text.Label
						className={clsxm(
							'flex-none flex-grow-0 !w-40 max-w-[190px] font-normal',
							'capitalize overflow-hidden text-ellipsis whitespace-nowrap w-full',
							bgColor === '' && ['dark:text-[#cdd1d8]'],
							statusIcon && 'max-w-[135px]'
						)}
						style={{ color: bgColor === '' ? undefined : textColor }}
					>
						{statusTitle}
					</Text.Label>
				</Tooltip>
			</div>
			<div className="flex items-center gap-x-[12PX] mr-[4px]">
				<Tooltip label={t('common.EDIT')}>
					<Button variant="ghost" className="p-0 m-0 min-w-0" onClick={onEdit}>
						<EditPenUnderlineIcon className="w-6 h-6 text-inherit" />
					</Button>
				</Tooltip>

				{showDeleteButton && (
					<Button variant="ghost" className="p-0 m-0 min-w-0" onClick={onDelete}>
						<TrashIcon className="h-5 w-5" />
					</Button>
				)}
			</div>
		</div>
	);
};

/**
 * A function to load an SVG and gives the ability to
 * update its attributes. e.g: fill color
 *
 * @param {string} url the URL of the SVG file to load
 * @param {string} containerId  the ID of the container where the SVG will be inserted
 * @param {string} color the fill color for the SVG
 */
const loadSVG = async (url: string, containerId: string, color: string): Promise<void> => {
	try {
		const response = await svgFetch(url);

		if (!response.ok) {
			throw new Error(`Failed to fetch SVG: ${response.statusText}`);
		}

		let svgContent = await response.text();

		// Update the fill color in the SVG content
		svgContent = svgContent.replace(/stroke="[^"]*"/g, `stroke="${color}"`);

		const container = document.getElementById(containerId);

		if (container) {
			console.log(container);
			container.innerHTML = svgContent;
		} else {
			console.error(`Container with ID "${containerId}" not found.`);
		}
	} catch (error) {
		console.error(`Error loading SVG: ${(error as Error).message}`);
	}
};

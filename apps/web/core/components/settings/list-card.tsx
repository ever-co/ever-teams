import { EditPenUnderlineIcon, TrashIcon } from 'assets/svg';
import { Button, Text } from '@/core/components';
import { CHARACTER_LIMIT_TO_SHOW } from '@/core/constants/config/constants';
import { clsxm } from '@/core/lib/utils';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { svgFetch } from '@/core/lib/helpers/svg-fetch';
import { sanitizeSvg } from '@/core/lib/helpers/sanitize-svg';
import { Tooltip } from '../duplicated-components/tooltip';
import { IClassName } from '@/core/types/interfaces/common/class-name';

// A disabled action lets the pointer through, so the tooltip around it still explains why.
const ICON_BUTTON =
	'size-8 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40';

/**
 * A compact chip for a status / priority / size / label / version: the colour as a dot, the icon in
 * the text colour, the name, and the edit / delete actions.
 */
export const StatusesListCard = ({
	statusId,
	statusIcon,
	statusTitle = '',
	bgColor,
	onEdit,
	onDelete,
	showDeleteButton = true,
	isStatus,
	readOnly = false,
	className
}: IClassName<{
	statusIcon: string;
	statusTitle: string;
	bgColor: string;
	onEdit: any;
	onDelete: any;
	showDeleteButton?: boolean;
	isStatus?: boolean;
	statusId?: string;
	/** Shows the edit and delete actions disabled, for a user who may not change this task setting. */
	readOnly?: boolean;
}>) => {
	const t = useTranslations();

	useEffect(() => {
		if (statusIcon) {
			// The chip is no longer filled with the colour, so the icon follows the text colour.
			void loadSVG(statusIcon, `icon-container-${statusTitle}-${statusId}`, 'currentColor');
		}
	}, [statusIcon, statusTitle, statusId]);

	return (
		<div
			className={clsxm(
				'inline-flex h-9 max-w-full items-center gap-2 rounded-md border border-border bg-card pl-2.5 pr-1 text-sm text-foreground',
				className
			)}
		>
			{bgColor ? (
				<span
					aria-hidden="true"
					className="size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-foreground/10"
					style={{ backgroundColor: bgColor }}
				/>
			) : null}
			{statusIcon && (
				<div
					id={`icon-container-${statusTitle}-${statusId}`}
					className="flex size-4 shrink-0 items-center justify-center [&>svg]:size-4"
				></div>
			)}
			<Tooltip
				label={statusTitle}
				enabled={statusTitle.length >= CHARACTER_LIMIT_TO_SHOW}
				placement="auto"
				className="min-w-0"
			>
				<Text.Label
					className={clsxm(
						'ml-0 block truncate font-normal capitalize text-foreground dark:text-foreground',
						isStatus ? 'max-w-[12rem]' : 'max-w-[10rem]'
					)}
				>
					{statusTitle}
				</Text.Label>
			</Tooltip>
			<div className="flex shrink-0 items-center">
				<Tooltip label={t('common.EDIT')} enabled={!readOnly}>
					<Tooltip label={t('pages.settingsTeam.TASK_SETTINGS_READ_ONLY')} enabled={readOnly}>
						<Button variant="ghost" className={ICON_BUTTON} onClick={onEdit} disabled={readOnly}>
							<EditPenUnderlineIcon className="size-4 text-inherit" />
						</Button>
					</Tooltip>
				</Tooltip>

				{showDeleteButton && (
					<Button variant="ghost" className={ICON_BUTTON} onClick={onDelete} disabled={readOnly}>
						<TrashIcon className="size-4" />
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
			// The icon URL is a team member's choice: insert drawing markup only, never script or event handlers.
			container.innerHTML = sanitizeSvg(svgContent);
		} else {
			console.error(`Container with ID "${containerId}" not found.`);
		}
	} catch (error) {
		console.error(`Error loading SVG: ${(error as Error).message}`);
	}
};

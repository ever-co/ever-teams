import { CommonToggle, Text } from 'lib/components';
import { useTranslation } from 'next-i18next';
import { PeriodDropdown } from './period-dropdown';
import { ProofDropdown } from './proof-dropdown';
import { VersionForm } from './version-form';
// import { IssueTypeForm } from './issue-type-form';
import { TaskLabelForm } from './task-labels-form';
import { TaskPrioritiesForm } from './task-priorities-form';
import { TaskSizesForm } from './task-sizes-form';
import { TaskStatusesForm } from './task-statuses-form';

export const IssuesSettings = () => {
	const { t } = useTranslation();
	return (
		<div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.TASK_PRIVACY')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.MULTIPLE_ASSIGNEES')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.MANUAL_TIME')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.GROUP_ESTIMATION')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.ESTIMATION_IN_HOURS')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.ESTIMATION_IN_STORY_POINTS')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.PROOF_OF_COMPLETION')}
				</Text>
				<div className="flex flex-row items-center flex-grow-0 w-4/5">
					<div className="w-[30%]">
						<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
					</div>
					<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-[14%]">In</Text>
					<ProofDropdown setValue={() => console.log('proof')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.LINKED_ISSUES')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.COMMENTS')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.HISTORY')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.ACCEPTANCE_CRITERIA')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.DRAFT_ISSUES')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.AUTO_CLOSE_ISSUE')}
				</Text>
				<div className="flex flex-row items-center flex-grow-0 w-4/5 gap-5">
					<CommonToggle enabledText={t('common.PERIOD')} disabledText={t('common.DEACTIVATED')} />
					<PeriodDropdown setValue={() => console.log('set value')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.AUTO_ARCHIVE_ISSUE')}
				</Text>
				<div className="flex flex-row items-center flex-grow-0 w-4/5 gap-5">
					<CommonToggle enabledText={t('common.PERIOD')} disabledText={t('common.DEACTIVATED')} />
					<PeriodDropdown setValue={() => console.log('set value')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.AUTO_STATUS')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.PERIOD')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>

			<div className="flex w-full items-center justify-between gap-[2rem]">
				<VersionForm />
			</div>
			{/* TODO */}
			{/* <div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<IssueTypeForm />
			</div> */}

			<div id="statuses" className="flex w-full items-center justify-between gap-[2rem]">
				<TaskStatusesForm />
			</div>
			<div id="priorities" className="flex w-full items-center justify-between gap-[2rem]">
				<TaskPrioritiesForm />
			</div>
			<div id="sizes" className="flex w-full items-center justify-between gap-[2rem]">
				<TaskSizesForm />
			</div>
			<div id="labels" className="flex w-full items-center justify-between gap-[2rem]">
				<TaskLabelForm />
			</div>
			{/* <div
				id="related-issue-types"
				className="flex w-full items-center justify-between gap-[2rem]"
			>
				<RelatedIssueTypeForm />
			</div> */}
		</div>
	);
};

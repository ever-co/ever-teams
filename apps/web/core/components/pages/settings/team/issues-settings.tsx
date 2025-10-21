import { CommonToggle, Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { PeriodDropdown } from '../../../settings/period-dropdown';
import { ProofDropdown } from '../../../settings/proof-dropdown';
import { TaskVersionForm } from '../../../tasks/version-form';
// import { IssueTypeForm } from './issue-type-form';
import { TaskLabelForm } from '../../../tasks/task-labels-form';
import { TaskPrioritiesForm } from '../../../tasks/task-priorities-form';
import { TaskSizesForm } from '../../../tasks/task-sizes-form';
import { TaskStatusesForm } from '../../../tasks/task-statuses-form';
import { DefaultIssueTypeForm } from '../../../tasks/default-issue-type-form';
import { useSetAtom } from 'jotai';
import { activeSettingTeamTab } from '@/core/stores/common/setting';
import { InteractionObserverVisible } from '@/core/components/pages/settings/interaction-observer';

export const IssuesSettings = () => {
	const setActiveTeam = useSetAtom(activeSettingTeamTab);
	const t = useTranslations();
	return (
		<div>
			{/* TODO */}
			<div className="hidden w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.TASK_PRIVACY')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.MULTIPLE_ASSIGNEES')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.MANUAL_TIME')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden  w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.GROUP_ESTIMATION')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden  w-full items-center justify-between gap-[2rem]">
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
			<div className="hidden w-full items-center justify-between gap-[2rem]">
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
			<div className="hidden w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.LINKED_ISSUES')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden  w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.COMMENTS')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden  w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.HISTORY')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.ACCEPTANCE_CRITERIA')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden  w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.DRAFT_ISSUES')}
				</Text>
				<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
					{t('pages.settingsTeam.AUTO_CLOSE_ISSUE')}
				</Text>
				<div className="flex flex-row items-center flex-grow-0 w-4/5 gap-5">
					<CommonToggle enabledText={t('common.PERIOD')} disabledText={t('common.DEACTIVATED')} />
					<PeriodDropdown setValue={() => console.log('set value')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden w-full items-center justify-between gap-[2rem]">
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
				<TaskVersionForm />
			</div>
			{/* TODO */}
			{/* <div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<IssueTypeForm />
			</div> */}
			<div className="flex w-full items-center justify-between gap-[2rem]">
				<DefaultIssueTypeForm />
			</div>
			<InteractionObserverVisible id="statuses" setActiveSection={setActiveTeam}>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<TaskStatusesForm />
				</div>
			</InteractionObserverVisible>
			<InteractionObserverVisible id="priorities" setActiveSection={setActiveTeam}>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<TaskPrioritiesForm />
				</div>
			</InteractionObserverVisible>
			<InteractionObserverVisible id="sizes" setActiveSection={setActiveTeam}>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<TaskSizesForm />
				</div>
			</InteractionObserverVisible>
			<InteractionObserverVisible id="labels" setActiveSection={setActiveTeam}>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<TaskLabelForm />
				</div>
			</InteractionObserverVisible>

			{/* <div
				id="related-issue-types"
				className="flex w-full items-center justify-between gap-[2rem]"
			>
				<RelatedIssueTypeForm />
			</div> */}
		</div>
	);
};

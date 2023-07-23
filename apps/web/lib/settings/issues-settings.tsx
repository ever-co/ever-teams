import { CommonToggle, Text } from 'lib/components';
import { useTranslation } from 'lib/i18n';
import { ProofDropdown } from './proof-dropdown';
import { PeriodDropdown } from './period-dropdown';
import { VersionForm } from './version-form';
// import { IssueTypeForm } from './issue-type-form';
import { TaskStatusesForm } from './task-statuses-form';
import { TaskPrioritiesForm } from './task-priorities-form';
import { TaskSizesForm } from './task-sizes-form';
import { TaskLabelForm } from './task-labels-form';
import { RelatedIssueTypeForm } from './related-issue-type-form';

export const IssuesSettings = () => {
	const { trans } = useTranslation('settingsTeam');
	return (
		<div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
					{trans.TASK_PRIVACY}
				</Text>
				<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
					<CommonToggle enabledText="Activated" disabledText="Deactivated" />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
					{trans.MULTIPLE_ASSIGNEES}
				</Text>
				<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
					<CommonToggle enabledText="Activated" disabledText="Deactivated" />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
					{trans.MANUAL_TIME}
				</Text>
				<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
					<CommonToggle enabledText="Activated" disabledText="Deactivated" />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
					{trans.GROUP_ESTIMATION}
				</Text>
				<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
					<CommonToggle enabledText="Activated" disabledText="Deactivated" />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
					{trans.ESTIMATION_IN_HOURS}
				</Text>
				<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
					<CommonToggle enabledText="Activated" disabledText="Deactivated" />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
					{trans.ESTIMATION_IN_STORY_POINTS}
				</Text>
				<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
					<CommonToggle enabledText="Activated" disabledText="Deactivated" />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
					{trans.PROOF_OF_COMPLETION}
				</Text>
				<div className="flex flex-row flex-grow-0 items-center  w-4/5">
					<div className="w-[30%]">
						<CommonToggle enabledText="Activated" disabledText="Deactivated" />
					</div>
					<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-[14%]">
						In
					</Text>
					<ProofDropdown setValue={() => console.log('proof')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
					{trans.LINKED_ISSUES}
				</Text>
				<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
					<CommonToggle enabledText="Activated" disabledText="Deactivated" />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
					{trans.COMMENTS}
				</Text>
				<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
					<CommonToggle enabledText="Activated" disabledText="Deactivated" />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
					{trans.HISTORY}
				</Text>
				<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
					<CommonToggle enabledText="Activated" disabledText="Deactivated" />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
					{trans.ACCEPTANCE_CRITERIA}
				</Text>
				<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
					<CommonToggle enabledText="Activated" disabledText="Deactivated" />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
					{trans.DRAFT_ISSUES}
				</Text>
				<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
					<CommonToggle enabledText="Activated" disabledText="Deactivated" />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
					{trans.AUTO_CLOSE_ISSUE}
				</Text>
				<div className="flex flex-row flex-grow-0 items-center  gap-5 w-4/5">
					<CommonToggle enabledText="Period" disabledText="Deactivated" />
					<PeriodDropdown setValue={() => console.log('set value')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
					{trans.AUTO_ARCHIVE_ISSUE}
				</Text>
				<div className="flex flex-row flex-grow-0 items-center  gap-5 w-4/5">
					<CommonToggle enabledText="Period" disabledText="Deactivated" />
					<PeriodDropdown setValue={() => console.log('set value')} />
				</div>
			</div>
			{/* TODO */}
			<div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
					{trans.AUTO_STATUS}
				</Text>
				<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
					<CommonToggle enabledText="Period" disabledText="Deactivated" />
				</div>
			</div>

			<div className="flex w-full items-center justify-between gap-[2rem]">
				<VersionForm />
			</div>
			{/* TODO */}
			{/* <div className="hidden _flex w-full items-center justify-between gap-[2rem]">
				<IssueTypeForm />
			</div> */}

			<div
				id="statuses"
				className="flex w-full items-center justify-between gap-[2rem]"
			>
				<TaskStatusesForm />
			</div>
			<div
				id="priorities"
				className="flex w-full items-center justify-between gap-[2rem]"
			>
				<TaskPrioritiesForm />
			</div>
			<div
				id="sizes"
				className="flex w-full items-center justify-between gap-[2rem]"
			>
				<TaskSizesForm />
			</div>
			<div
				id="labels"
				className="flex w-full items-center justify-between gap-[2rem]"
			>
				<TaskLabelForm />
			</div>
			<div
				id="related-issue-types"
				className="flex w-full items-center justify-between gap-[2rem]"
			>
				<RelatedIssueTypeForm />
			</div>
		</div>
	);
};

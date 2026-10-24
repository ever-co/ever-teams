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

// Settings row (still hidden until these settings exist): label column on the left, control on the right.
const HIDDEN_ROW =
	'hidden w-full grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4';
const LABEL = 'text-sm font-medium text-muted-foreground';
const CONTROL = 'flex min-w-0 flex-wrap items-center gap-2';
// The visible sections are separated by a hairline; the first starts at the top of the block, the
// last ends at its bottom.
const SECTION_FIRST = 'pb-4';
const SECTION = 'py-4';
const SECTION_LAST = 'pt-4';

export const IssuesSettings = () => {
	const setActiveTeam = useSetAtom(activeSettingTeamTab);
	const t = useTranslations();
	return (
		<div>
			{/* TODO */}
			<div className={HIDDEN_ROW}>
				<Text className={LABEL}>{t('pages.settingsTeam.TASK_PRIVACY')}</Text>
				<div className={CONTROL}>
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className={HIDDEN_ROW}>
				<Text className={LABEL}>{t('pages.settingsTeam.MULTIPLE_ASSIGNEES')}</Text>
				<div className={CONTROL}>
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className={HIDDEN_ROW}>
				<Text className={LABEL}>{t('pages.settingsTeam.MANUAL_TIME')}</Text>
				<div className={CONTROL}>
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className={HIDDEN_ROW}>
				<Text className={LABEL}>{t('pages.settingsTeam.GROUP_ESTIMATION')}</Text>
				<div className={CONTROL}>
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className={HIDDEN_ROW}>
				<Text className={LABEL}>{t('pages.settingsTeam.ESTIMATION_IN_HOURS')}</Text>
				<div className={CONTROL}>
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className={HIDDEN_ROW}>
				<Text className={LABEL}>{t('pages.settingsTeam.ESTIMATION_IN_STORY_POINTS')}</Text>
				<div className={CONTROL}>
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className={HIDDEN_ROW}>
				<Text className={LABEL}>{t('pages.settingsTeam.PROOF_OF_COMPLETION')}</Text>
				<div className={CONTROL}>
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
					<Text className="text-sm text-muted-foreground">In</Text>
					<ProofDropdown setValue={() => console.log('proof')} />
				</div>
			</div>
			{/* TODO */}
			<div className={HIDDEN_ROW}>
				<Text className={LABEL}>{t('pages.settingsTeam.LINKED_ISSUES')}</Text>
				<div className={CONTROL}>
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className={HIDDEN_ROW}>
				<Text className={LABEL}>{t('pages.settingsTeam.COMMENTS')}</Text>
				<div className={CONTROL}>
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className={HIDDEN_ROW}>
				<Text className={LABEL}>{t('pages.settingsTeam.HISTORY')}</Text>
				<div className={CONTROL}>
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className={HIDDEN_ROW}>
				<Text className={LABEL}>{t('pages.settingsTeam.ACCEPTANCE_CRITERIA')}</Text>
				<div className={CONTROL}>
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className={HIDDEN_ROW}>
				<Text className={LABEL}>{t('pages.settingsTeam.DRAFT_ISSUES')}</Text>
				<div className={CONTROL}>
					<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>
			{/* TODO */}
			<div className={HIDDEN_ROW}>
				<Text className={LABEL}>{t('pages.settingsTeam.AUTO_CLOSE_ISSUE')}</Text>
				<div className={CONTROL}>
					<CommonToggle enabledText={t('common.PERIOD')} disabledText={t('common.DEACTIVATED')} />
					<PeriodDropdown setValue={() => console.log('set value')} />
				</div>
			</div>
			{/* TODO */}
			<div className={HIDDEN_ROW}>
				<Text className={LABEL}>{t('pages.settingsTeam.AUTO_ARCHIVE_ISSUE')}</Text>
				<div className={CONTROL}>
					<CommonToggle enabledText={t('common.PERIOD')} disabledText={t('common.DEACTIVATED')} />
					<PeriodDropdown setValue={() => console.log('set value')} />
				</div>
			</div>
			{/* TODO */}
			<div className={HIDDEN_ROW}>
				<Text className={LABEL}>{t('pages.settingsTeam.AUTO_STATUS')}</Text>
				<div className={CONTROL}>
					<CommonToggle enabledText={t('common.PERIOD')} disabledText={t('common.DEACTIVATED')} />
				</div>
			</div>

			<div className="flex w-full flex-col divide-y divide-border">
				<div className={SECTION_FIRST}>
					<TaskVersionForm />
				</div>
				{/* TODO */}
				<div className={SECTION}>
					<DefaultIssueTypeForm />
				</div>
				<InteractionObserverVisible id="statuses" setActiveSection={setActiveTeam}>
					<div className={SECTION}>
						<TaskStatusesForm />
					</div>
				</InteractionObserverVisible>
				<InteractionObserverVisible id="priorities" setActiveSection={setActiveTeam}>
					<div className={SECTION}>
						<TaskPrioritiesForm />
					</div>
				</InteractionObserverVisible>
				<InteractionObserverVisible id="sizes" setActiveSection={setActiveTeam}>
					<div className={SECTION}>
						<TaskSizesForm />
					</div>
				</InteractionObserverVisible>
				<InteractionObserverVisible id="labels" setActiveSection={setActiveTeam}>
					<div className={SECTION_LAST}>
						<TaskLabelForm />
					</div>
				</InteractionObserverVisible>
			</div>
		</div>
	);
};

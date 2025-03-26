import { Button, VerticalSeparator } from '@/lib/components';
import { Fragment, ReactNode, useCallback } from 'react';
import { Calendar, Clipboard } from 'lucide-react';
import { useOrganizationProjects, useOrganizationTeams } from '@/app/hooks';
import { Thumbnail } from './basic-information-form';
import moment from 'moment';
import {
	ICreateProjectInput,
	IProjectRelation,
	ITag,
	OrganizationProjectBudgetTypeEnum,
	ProjectBillingEnum,
	TaskStatusEnum
} from '@/app/interfaces';
import { IStepElementProps } from '../container';
import { useTranslations } from 'next-intl';
import { useRoles } from '@/app/hooks/features/useRoles';
import { RolesEnum } from '@/app/interfaces/IRoles';

export default function FinalReview(props: IStepElementProps) {
	const { goToPrevious, finish, currentData: finalData, mode } = props;
	const {
		createOrganizationProject,
		createOrganizationProjectLoading,
		editOrganizationProject,
		editOrganizationProjectLoading,
		setOrganizationProjects
	} = useOrganizationProjects();
	const t = useTranslations();
	const { activeTeam } = useOrganizationTeams();
	const { roles } = useRoles();

	const simpleMemberRole = roles?.find((role) => role.name == RolesEnum.EMPLOYEE);
	const managerRole = roles?.find((role) => role.name == RolesEnum.MANAGER);

	const newProject: Partial<ICreateProjectInput> = {
		name: finalData?.name,
		startDate: finalData?.startDate,
		endDate: finalData?.endDate,
		projectUrl: finalData?.projectUrl,
		description: finalData?.description,
		imageUrl: finalData?.projectImage?.fullUrl ?? undefined,
		imageId: finalData?.projectImage?.id,
		tags: finalData?.tags,
		color: finalData?.color ?? '#000',
		memberIds:
			finalData?.members
				?.filter((el) => el.roleId == simpleMemberRole?.id && el.memberId)
				.map((el) => el.memberId) || [],
		managerIds:
			finalData?.members?.filter((el) => el.roleId == managerRole?.id && el.memberId).map((el) => el.memberId) ||
			[],
		budget: finalData?.budget,
		currency: finalData?.currency,
		budgetType: finalData?.budgetType,
		billing: finalData?.billing,
		teams: [...(activeTeam ? [activeTeam] : [])],
		status: TaskStatusEnum.OPEN,
		isActive: true,
		isArchived: false,
		isTasksAutoSync: true,
		isTasksAutoSyncOnLabel: true
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (mode == 'create') {
			const project = await createOrganizationProject({
				...newProject
			});

			if (project) {
				finish(project);
			}
		}

		if (mode == 'edit' && finalData.id) {
			const project = await editOrganizationProject(finalData.id, {
				...newProject
			});

			if (project) {
				setOrganizationProjects((prev) =>
					prev.map((el) => {
						if (el.id === finalData.id) {
							return { ...project.data };
						}
						return el;
					})
				);
				finish(project.data);
			}
		}
	};

	const handlePrevious = useCallback(() => {
		goToPrevious(finalData);
	}, [finalData, goToPrevious]);

	return (
		<form onSubmit={handleSubmit} className="w-full space-y-5 pt-4">
			<div className="w-full flex flex-col gap-6">
				<h2 className=" text-xl font-medium">{t('common.REVIEW')}</h2>
				<div className="w-full flex flex-col  gap-8">
					<BasicInformation
						projectTitle={finalData?.name ?? '-'}
						startDate={moment(finalData?.startDate).format('D.MM.YYYY')}
						endDate={moment(finalData?.endDate).format('D.MM.YYYY')}
						websiteUrl={finalData?.projectUrl}
						projectImageUrl={finalData?.projectImage?.fullUrl ?? undefined}
						description={finalData?.description}
					/>
					<FinancialSettings
						budgetAmount={finalData?.budget}
						billingType={finalData?.billing}
						budgetCurrency={finalData?.currency}
						budgetType={finalData?.budgetType}
					/>
					<Categorization tags={finalData?.tags} colorCode={finalData?.color} />
					<TeamAndRelations
						projectTitle={finalData?.name}
						projectImageUrl={finalData?.projectImage?.fullUrl ?? undefined}
						managerIds={
							finalData?.members
								?.filter((el) => el.roleId == managerRole?.id && el.memberId)
								.map((el) => el.memberId) || []
						}
						relations={finalData?.relations}
					/>
				</div>
			</div>
			<div className="w-full flex items-center justify-between">
				<Button onClick={handlePrevious} className=" h-[2.5rem]" type="button">
					{t('common.BACK')}
				</Button>
				{mode == 'edit' ? (
					<Button
						loading={editOrganizationProjectLoading}
						disabled={editOrganizationProjectLoading}
						type="submit"
						className=" h-[2.5rem]"
					>
						{t('common.SAVE_CHANGES')}
					</Button>
				) : (
					<Button
						loading={createOrganizationProjectLoading}
						disabled={createOrganizationProjectLoading}
						type="submit"
						className=" h-[2.5rem]"
					>
						{t('pages.projects.addOrEditModal.steps.createProject')}
					</Button>
				)}
			</div>
		</form>
	);
}

interface IAttribute {
	_key: string;
	value?: ReactNode;
	icon?: ReactNode;
}
function Attribute(props: IAttribute) {
	const { _key, value, icon } = props;
	return (
		<div className="flex min-w-[6rem] text-xs flex-col justify-between  gap-2 items-start">
			<div className="font-medium">{_key}</div>
			<div className="flex items-center text-gray-500  gap-1">
				{value ? (
					<>
						{icon ? icon : null} <span>{value}</span>
					</>
				) : (
					<span>-</span>
				)}
			</div>
		</div>
	);
}

/**
 * Basic Information
 */

interface IBasicInformationProps {
	projectTitle: string;
	projectImageUrl?: string;
	startDate?: string;
	endDate?: string;
	websiteUrl?: string;
	description?: string;
}
function BasicInformation(props: IBasicInformationProps) {
	const { projectTitle, projectImageUrl, description, startDate, endDate, websiteUrl } = props;
	const t = useTranslations();
	return (
		<div className="w-full flex flex-col gap-8">
			<div className="w-full flex gap-5">
				<Attribute
					_key={t('pages.projects.basicInformationForm.formFields.title')}
					icon={<Thumbnail imgUrl={projectImageUrl} size={'20px'} identifier={projectTitle} />}
					value={projectTitle}
				/>
				<VerticalSeparator />
				<Attribute _key={t('common.START_DATE')} value={startDate} icon={<Calendar size={10} />} />
				<Attribute _key={t('common.END_DATE')} value={endDate} icon={<Calendar size={10} />} />
				<VerticalSeparator />
				<Attribute
					_key={t('pages.projects.basicInformationForm.formFields.websiteUrl')}
					value={
						<div className="flex items-center gap-1">
							{websiteUrl ? (
								<>
									<Clipboard size={10} /> <span>{websiteUrl}</span>
								</>
							) : (
								<span>-</span>
							)}
						</div>
					}
				/>
			</div>

			<div className="w-full flex flex-col gap-2">
				<span className="text-xs font-medium">{t('common.DESCRIPTION')}</span>
				{description ? <p className="border min-h-20 rounded-lg text-xs p-3">{description}</p> : <span>-</span>}
			</div>
		</div>
	);
}

/**
 * Financial settings
 */

interface FinancialSettingsProps {
	budgetType?: OrganizationProjectBudgetTypeEnum;
	budgetAmount?: number;
	budgetCurrency?: string;
	billingType?: ProjectBillingEnum;
}
function FinancialSettings(props: FinancialSettingsProps) {
	const { budgetType, budgetAmount, budgetCurrency, billingType } = props;
	const t = useTranslations();

	const data = [
		{
			key: t('pages.projects.financialSettingsForm.formFields.budgetType'),
			value: budgetType ?? '-'
		},
		{
			key: t('pages.projects.financialSettingsForm.formFields.budgetAmount'),
			value: budgetAmount
				? new Intl.NumberFormat('us-US', {
						useGrouping: true
					}).format(Number(budgetAmount))
				: '-'
		},
		{
			key: t('pages.projects.financialSettingsForm.formFields.billing'),
			value: billingType ?? '-'
		},
		{
			key: t('pages.projects.financialSettingsForm.formFields.currency'),
			value: budgetCurrency ?? '-'
		}
	];

	return (
		<div className="w-full flex gap-5">
			{data?.map(({ key, value }, index) => {
				const isLastItem = index === data.length - 1;

				return (
					<Fragment key={index}>
						<Attribute _key={key} value={value} key={index} />

						{isLastItem ? null : <VerticalSeparator />}
					</Fragment>
				);
			})}
		</div>
	);
}

/**
 * Categorization
 */

interface ICategorizationProps {
	tags?: ITag[];
	colorCode?: string;
}

function Categorization(props: ICategorizationProps) {
	const { tags, colorCode } = props;
	const t = useTranslations();

	const ItemWithColor = ({ label, color }: { label: string; color: string }) => (
		<div key={label} className="px-1 shrink-0  text-[.7rem] border flex items-center gap-2 rounded">
			<span style={{ backgroundColor: color ?? 'black' }} className="h-[10px] w-[10px] rounded-full" />
			<span>{label}</span>
		</div>
	);

	return (
		<div className="w-full flex items-center gap-8 flex-wrap">
			<div className="flex flex-col gap-2">
				<p className=" text-xs font-medium">{t('pages.projects.categorizationForm.formFields.tags')}</p>
				<div className="w-full flex wrap items-center gap-2">
					{tags?.length ? (
						tags?.map((el) => {
							return <ItemWithColor key={el.name} label={el.name} color={el.color} />;
						})
					) : (
						<span>-</span>
					)}
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<p className=" text-xs font-medium">{t('pages.projects.categorizationForm.formFields.colorCode')}</p>
				<ItemWithColor color={colorCode ?? 'black'} label={colorCode ?? '-'} />
			</div>
		</div>
	);
}

/**
 * Team & Relations
 */

interface ITeamAndRelationsProps {
	managerIds?: string[];
	relations?: IProjectRelation[];
	projectImageUrl?: string;
	projectTitle?: string;
}

function TeamAndRelations(props: ITeamAndRelationsProps) {
	const { managerIds, relations, projectImageUrl, projectTitle } = props;
	const t = useTranslations();

	const { organizationProjects } = useOrganizationProjects();
	const { teams } = useOrganizationTeams();

	const members = teams?.flatMap((team) => team.members);

	const Item = ({ name, imgUrl }: { name: string; imgUrl?: string }) => (
		<div className="flex items-center gap-2">
			<Thumbnail className="rounded-full" size={'24px'} identifier={name} imgUrl={imgUrl} />
			<span className=" font-medium text-xs">{name}</span>
		</div>
	);

	return (
		<div className="w-full flex gap-8 flex-col">
			<div className="flex flex-col gap-2">
				<p className=" text-xs font-medium">{t('common.MANAGERS')}</p>
				<div className="w-full flex wrap items-center gap-2">
					{managerIds?.length ? (
						managerIds?.map((managerId) => {
							const member = members.find((el) => el.employeeId === managerId);

							const memberImgUrl = member?.employee.user?.imageUrl;

							const memberName = member?.employee.fullName;

							return <Item key={member?.id} name={memberName ?? '-'} imgUrl={memberImgUrl} />;
						})
					) : (
						<span>-</span>
					)}
				</div>
			</div>
			{
				// Will be implemented later on the api side (we keep this here)
			}
			<div className="hidden flex-col gap-2">
				<p className="text-xs font-medium">{t('pages.projects.teamAndRelationsForm.formFields.relations')}</p>
				<div className="w-full flex-col flex gap-2">
					{relations?.length ? (
						relations?.map((relation) => {
							const project = organizationProjects?.find((el) => el.id === relation.projectId);
							return (
								<div key={project?.id} className="flex items-center gap-3">
									<Item name={projectTitle ?? '-'} imgUrl={projectImageUrl} />
									<span className="text-xs italic text-gray-500 min-w-20">
										{relation.relationType}
									</span>
									<Item imgUrl={project?.imageUrl ?? undefined} name={project?.name ?? '-'} />
								</div>
							);
						})
					) : (
						<span>-</span>
					)}
				</div>
			</div>
		</div>
	);
}

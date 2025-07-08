import { Button } from '@/core/components';
import { Fragment, ReactNode, useCallback, useMemo } from 'react';
import { Calendar, Clipboard } from 'lucide-react';
import { Thumbnail } from './basic-information-form';
import moment from 'moment';

import { IStepElementProps } from '../container';
import { useTranslations } from 'next-intl';
import { useOrganizationProjects, useOrganizationTeams } from '@/core/hooks/organizations';
import { useRoles } from '@/core/hooks/roles';
import { useAuthenticateUser } from '@/core/hooks';
import { VerticalSeparator } from '@/core/components/duplicated-components/separator';
import { ERoleName } from '@/core/types/generics/enums/role';
import { IProjectRelation } from '@/core/types/interfaces/project/organization-project';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { EProjectBudgetType } from '@/core/types/generics/enums/project';
import { EProjectBilling } from '@/core/types/generics/enums/project';
import { TCreateProjectRequest, TOrganizationProject, TTag } from '@/core/types/schemas';
import { DEFAULT_USER_IMAGE_URL } from '@/core/constants/data/mock-data';
import { ECurrencies } from '@/core/types/generics/enums/currency';

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
	const { user } = useAuthenticateUser();

	const simpleMemberRole = roles?.find((role) => role.name == ERoleName.EMPLOYEE);
	const managerRole = roles?.find((role) => role.name == ERoleName.MANAGER);

	// Enhanced member assignment with default role logic
	const processedMembers = useMemo(() => {
		const members = finalData?.members || [];
		const hasManagers = members.some((el) => el.roleId == managerRole?.id && el.memberId);

		// If no managers are assigned and current user is available, assign current user as manager
		if (!hasManagers && user?.employee?.id && simpleMemberRole?.id && managerRole?.id) {
			const currentUserMember = {
				id: crypto.randomUUID(),
				memberId: user.employee.id,
				roleId: managerRole.id
			};

			// Check if current user is already assigned with a different role
			const existingUserIndex = members.findIndex((m) => m.memberId === user?.employee?.id);
			if (existingUserIndex >= 0) {
				// Update existing assignment to manager role
				const updatedMembers = [...members];
				updatedMembers[existingUserIndex] = { ...updatedMembers[existingUserIndex], roleId: managerRole.id };
				return updatedMembers;
			} else {
				// Add current user as manager
				return [...members, currentUserMember];
			}
		}

		// Assign default employee role to members without roles
		return members.map((member) => {
			if (!member.roleId && member.memberId && simpleMemberRole?.id) {
				return { ...member, roleId: simpleMemberRole.id };
			}
			return member;
		});
	}, [finalData?.members, managerRole?.id, simpleMemberRole?.id, user?.employee?.id]);

	const newProject: Partial<TCreateProjectRequest> = {
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
			processedMembers
				?.filter((el) => el.roleId == simpleMemberRole?.id && el.memberId)
				.map((el) => el.memberId) || [],
		managerIds:
			processedMembers?.filter((el) => el.roleId == managerRole?.id && el.memberId).map((el) => el.memberId) ||
			[],
		budget: finalData?.budget,
		currency: finalData?.currency,
		budgetType: finalData?.budgetType,
		billing: finalData?.billing,
		teams: [...(activeTeam ? [activeTeam] : [])],
		status: ETaskStatusName.OPEN,
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
				finish?.(project);
			}
		}

		if (mode == 'edit' && finalData?.id) {
			const project = await editOrganizationProject(finalData.id, {
				...newProject
			});

			if (project) {
				setOrganizationProjects((prev) =>
					prev.map((el) => {
						if (el.id === finalData.id) {
							return project.data as TOrganizationProject;
						}
						return el;
					})
				);
				finish?.(project.data as TOrganizationProject);
			}
		}
	};

	const handlePrevious = useCallback(() => {
		goToPrevious?.(finalData || {});
	}, [finalData, goToPrevious]);

	return (
		<form onSubmit={handleSubmit} className="w-full pt-4 space-y-5">
			<div className="flex flex-col w-full gap-6">
				<h2 className="text-xl font-medium ">{t('common.REVIEW')}</h2>
				<div className="flex flex-col w-full gap-8">
					<BasicInformation
						projectTitle={finalData?.name ?? '-'}
						startDate={moment(finalData?.startDate).format('D.MM.YYYY')}
						endDate={moment(finalData?.endDate).format('D.MM.YYYY')}
						websiteUrl={finalData?.projectUrl ?? undefined}
						projectImageUrl={finalData?.projectImage?.fullUrl ?? undefined}
						description={finalData?.description ?? undefined}
					/>
					<FinancialSettings
						budgetAmount={finalData?.budget}
						billingType={finalData?.billing as EProjectBilling}
						budgetCurrency={finalData?.currency as ECurrencies}
						budgetType={finalData?.budgetType}
					/>
					<Categorization tags={finalData?.tags} colorCode={finalData?.color} />
					<TeamAndRelations
						projectTitle={finalData?.name}
						projectImageUrl={finalData?.projectImage?.fullUrl ?? undefined}
						managerIds={
							processedMembers
								?.filter((el) => el.roleId == managerRole?.id && el.memberId)
								.map((el) => el.memberId) || []
						}
						memberIds={
							processedMembers
								?.filter((el) => el.roleId == simpleMemberRole?.id && el.memberId)
								.map((el) => el.memberId) || []
						}
						relations={finalData?.relations}
					/>
				</div>
			</div>
			<div className="flex items-center justify-between w-full">
				<Button
					disabled={createOrganizationProjectLoading || editOrganizationProjectLoading}
					onClick={handlePrevious}
					className=" h-[2.5rem]"
					type="button"
				>
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
			<div className="flex items-center gap-1 text-gray-500">
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
		<div className="flex flex-col w-full gap-8">
			<div className="flex w-full gap-5">
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

			<div className="flex flex-col w-full gap-2">
				<span className="text-xs font-medium">{t('common.DESCRIPTION')}</span>
				{description ? <p className="p-3 text-xs border rounded-lg min-h-20">{description}</p> : <span>-</span>}
			</div>
		</div>
	);
}

/**
 * Financial settings
 */

interface FinancialSettingsProps {
	budgetType?: EProjectBudgetType;
	budgetAmount?: number;
	budgetCurrency?: string;
	billingType?: EProjectBilling;
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
		<div className="flex w-full gap-5">
			{data?.map(({ key, value }, index) => {
				const isLastItem = index === data.length - 1;

				return (
					<Fragment key={index}>
						<Attribute _key={key} value={value} />

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
	tags?: TTag[];
	colorCode?: string | null;
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
		<div className="flex flex-wrap items-center w-full gap-8">
			<div className="flex flex-col gap-2">
				<p className="text-xs font-medium ">{t('pages.projects.categorizationForm.formFields.tags')}</p>
				<div className="flex items-center w-full gap-2 wrap">
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
				<p className="text-xs font-medium ">{t('pages.projects.categorizationForm.formFields.colorCode')}</p>
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
	memberIds?: string[];
	relations?: IProjectRelation[];
	projectImageUrl?: string;
	projectTitle?: string;
}

function TeamAndRelations(props: ITeamAndRelationsProps) {
	const { managerIds, memberIds, relations, projectImageUrl, projectTitle } = props;
	const t = useTranslations();

	const { organizationProjects } = useOrganizationProjects();
	const { teams } = useOrganizationTeams();

	// Deduplicated list of all team members to prevent user duplication
	const allMembers = useMemo(() => {
		if (!teams?.length) return [];

		// Create a Map to deduplicate users by employeeId
		const memberMap = new Map();

		teams.forEach((team) => {
			team.members?.forEach((member) => {
				const employeeId = member?.employeeId;
				if (employeeId && !memberMap.has(employeeId)) {
					memberMap.set(employeeId, member);
				}
			});
		});

		return Array.from(memberMap.values());
	}, [teams]);

	const Item = ({ name, imgUrl }: { name: string; imgUrl?: string }) => (
		<div className="flex items-center gap-2">
			<Thumbnail className="rounded-full" size={'24px'} identifier={name} imgUrl={imgUrl} />
			<span className="text-xs font-medium ">{name}</span>
		</div>
	);

	return (
		<div className="flex flex-col w-full gap-8">
			<div className="flex flex-col gap-2">
				<p className="text-xs font-medium ">{t('common.MANAGERS')}</p>
				<div className="flex items-center w-full gap-2 wrap">
					{managerIds?.length ? (
						managerIds?.map((managerId) => {
							const member = allMembers?.find((el) => el?.employeeId === managerId);

							const memberImgUrl = member?.employee?.user?.imageUrl;

							const memberName = member?.employee?.fullName;

							return (
								<Item
									key={`manager-${member?.id || managerId}-${managerId}`}
									name={memberName ?? '-'}
									imgUrl={memberImgUrl ?? DEFAULT_USER_IMAGE_URL}
								/>
							);
						})
					) : (
						<span>-</span>
					)}
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<p className="text-xs font-medium ">Members</p>
				<div className="flex items-center w-full gap-2 wrap">
					{memberIds?.length ? (
						memberIds?.map((memberId) => {
							const member = allMembers?.find((el) => el?.employeeId === memberId);

							const memberImgUrl = member?.employee?.user?.imageUrl;

							const memberName = member?.employee?.fullName;

							return (
								<Item
									key={`member-${member?.id || memberId}-${memberId}`}
									name={memberName ?? '-'}
									imgUrl={memberImgUrl ?? DEFAULT_USER_IMAGE_URL}
								/>
							);
						})
					) : (
						<span>-</span>
					)}
				</div>
			</div>
			{
				// Will be implemented later on the api side (we keep this here)
			}
			<div className="flex-col hidden gap-2">
				<p className="text-xs font-medium">{t('pages.projects.teamAndRelationsForm.formFields.relations')}</p>
				<div className="flex flex-col w-full gap-2">
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

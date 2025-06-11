import { Button } from '@/core/components';
import { CheckIcon, Plus, X } from 'lucide-react';
import { FormEvent, useCallback, useState } from 'react';
import { Identifiable, Select, Thumbnail } from './basic-information-form';
import { IStepElementProps } from '../container';
import { cn } from '@/core/lib/helpers';
import { useTranslations } from 'next-intl';
import { useOrganizationProjects, useOrganizationTeams } from '@/core/hooks/organizations';
import { useRoles } from '@/core/hooks/roles';
import { getInitialValue } from '@/core/lib/helpers/create-project';
import { EProjectRelation } from '@/core/types/generics/enums/project';
import { ERoleName } from '@/core/types/generics/enums/role';
import { TProjectRelation } from '@/core/types/schemas';

export default function TeamAndRelationsForm(props: IStepElementProps) {
	const { goToNext, goToPrevious, currentData } = props;
	const [members, setMembers] = useState<{ memberId: string; roleId: string; id: string }[]>(() =>
		getInitialValue(currentData, 'members', [])
	);
	const [relations, setRelations] = useState<(TProjectRelation & { id: string })[]>([]);
	const { organizationProjects } = useOrganizationProjects();
	const { teams } = useOrganizationTeams();
	const { roles } = useRoles();
	const relationsData = Object.values(EProjectRelation);
	const t = useTranslations();

	const handleAddNewMember = () => {
		setMembers((prev) => [...prev, { id: crypto.randomUUID(), memberId: '', roleId: '' }]);
	};

	const handleRemoveMember = (id: string) => {
		setMembers((prev) => prev.filter((el) => el.id !== id));
	};

	const handleAddNewRelation = () => {
		setRelations((prev) => [...prev, { id: crypto.randomUUID(), projectId: '', relationType: null }]);
	};

	const handleRemoveRelation = (id: string) => {
		setRelations((prev) => prev.filter((el) => el.id !== id));
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();

		goToNext({
			members,
			relations: relations.filter((el) => el.projectId && el.relationType)
		});
	};

	const handlePrevious = useCallback(() => {
		goToPrevious({
			members,
			relations: relations.filter((el) => el.projectId && el.relationType)
		});
	}, [goToPrevious, members, relations]);

	return (
		<form onSubmit={handleSubmit} className="w-full pt-4 space-y-5">
			<div className="flex flex-col w-full gap-2">
				<label className="text-xs font-medium">
					{t('pages.projects.teamAndRelationsForm.formFields.assignMembers')}
				</label>
				<div className="flex flex-col w-full gap-2">
					<div className="flex flex-col w-full gap-1">
						{members.length ? (
							members.map((el) => (
								<PairingItem
									selected={[el.memberId, el.roleId]}
									keys={teams
										?.flatMap((el) => el.members)
										?.map((el) => ({
											id: el?.employeeId || '',
											value: el?.employee?.fullName || '',
											imgUrl: el?.employee?.user?.imageUrl || undefined
										}))}
									values={roles
										?.filter((el) => el.name == ERoleName.EMPLOYEE || el.name == ERoleName.MANAGER)
										?.map((el) => ({
											id: String(el.id),
											value: el.name
										}))}
									onRemove={handleRemoveMember}
									key={el.id}
									id={el.id}
									keysLabel={t('pages.projects.teamAndRelationsForm.formFields.selectMember')}
									valuesLabel="Select role..."
									onKeyChange={(itemId, memberId) =>
										setMembers((prev) =>
											prev.map((el) => {
												if (el.id === itemId) {
													return { ...el, memberId };
												}
												return el;
											})
										)
									}
									onValueChange={(itemId, roleId) =>
										setMembers((prev) =>
											prev.map((el) => {
												if (el.id === itemId) {
													return { ...el, roleId };
												}
												return el;
											})
										)
									}
								/>
							))
						) : (
							<span className="text-xs ">
								{t('pages.projects.teamAndRelationsForm.formFields.noMembers')}
							</span>
						)}
					</div>
					<Button
						type="button"
						className="h-[1.8rem] w-28 bg-primary/10 border-gray-300 rounded-lg text-xs"
						variant="outline"
						onClick={handleAddNewMember}
					>
						<Plus size={15} /> <span>{t('pages.projects.teamAndRelationsForm.formFields.addMember')}</span>
					</Button>
				</div>
			</div>
			{
				// Will be implemented later on the api side (we keep this here)
			}
			<div className="flex-col hidden w-full gap-2">
				<label className="text-xs font-medium">
					{t('pages.projects.teamAndRelationsForm.formFields.relations')}
				</label>
				<div className="flex flex-col w-full gap-2">
					<div className="flex flex-col w-full gap-1">
						{relations.length ? (
							relations.map((el) => (
								<PairingItem
									keys={organizationProjects?.map((el) => ({
										id: el.id,
										value: el.name ?? '-',
										imgUrl: el.imageUrl ?? undefined
									}))}
									values={relationsData.map((el) => ({
										id: el,
										value: el
									}))}
									selected={[el.projectId, el.relationType ?? '']}
									onRemove={handleRemoveRelation}
									key={el.id}
									id={el.id}
									keysLabel={t('pages.projects.teamAndRelationsForm.formFields.selectProject')}
									valuesLabel={t('pages.projects.teamAndRelationsForm.formFields.selectRelationType')}
									onKeyChange={(itemId, projectId) =>
										setRelations((prev) =>
											prev.map((el) => {
												if (el.id === itemId) {
													return { ...el, projectId };
												}
												return el;
											})
										)
									}
									onValueChange={(itemId, relationType) =>
										setRelations((prev) =>
											prev.map((el) => {
												if (el.id === itemId) {
													return { ...el, relationType: relationType as EProjectRelation };
												}
												return el;
											})
										)
									}
								/>
							))
						) : (
							<span className="text-xs ">
								{t('pages.projects.teamAndRelationsForm.formFields.noRelations')}
							</span>
						)}
					</div>
					<Button
						type="button"
						className="h-[1.8rem] w-28 bg-primary/10 border-gray-300 rounded-lg text-xs"
						variant="outline"
						onClick={handleAddNewRelation}
					>
						<Plus size={15} />{' '}
						<span>{t('pages.projects.teamAndRelationsForm.formFields.addRelation')}</span>
					</Button>
				</div>
			</div>

			<div className="flex items-center justify-between w-full">
				<Button onClick={handlePrevious} className=" h-[2.5rem]" type="button">
					{t('common.BACK')}
				</Button>
				<Button type="submit" className=" h-[2.5rem]">
					{t('common.NEXT')}
				</Button>
			</div>
		</form>
	);
}

interface IPairingItemProps<K extends Identifiable, V extends Identifiable> {
	id: string;
	onRemove: (id: string) => void;
	keys: (K & { imgUrl?: string })[];
	values: V[];
	keysLabel?: string;
	selected: [string, string];
	valuesLabel?: string;
	onKeyChange?: (id: string, key: string) => void;
	onValueChange?: (id: string, value: string) => void;
}

function PairingItem<K extends Identifiable, V extends Identifiable>(props: IPairingItemProps<K, V>) {
	const { id, onRemove, keys, values, keysLabel, valuesLabel, onKeyChange, onValueChange, selected } = props;
	const [keyId, setKeyId] = useState<string | null>(selected[0] || null);
	const [valueId, setValueId] = useState<string | null>(selected[1] || null);

	return (
		<div className="flex items-center w-full gap-3">
			<div className="w-full">
				<Select
					placeholder={keysLabel}
					className="w-full"
					options={keys}
					onChange={(keyId) => {
						onKeyChange?.(id, keyId as string);
						setKeyId(keyId as string);
					}}
					selected={keyId}
					renderItem={(item, isSelected) => {
						return (
							<div
								className={cn(
									'w-full h-full p-1 px-2 flex items-center gap-2 rounded',
									isSelected && 'bg-primary text-primary-foreground dark:text-white'
								)}
							>
								{isSelected && <CheckIcon size={10} />}
								<span className={cn('  flex items-center gap-2', keyId && !isSelected && 'pl-[18px]')}>
									<Thumbnail
										className="z-20 text-gray-700 bg-white rounded-full"
										imgUrl={item?.imgUrl}
										size={'20px'}
										identifier={String(item?.value)}
									/>
									<span className="capitalize">{item?.value ?? '-'}</span>
								</span>
							</div>
						);
					}}
				/>
			</div>

			<div className="w-full">
				<Select
					placeholder={valuesLabel}
					className="w-full"
					options={values}
					onChange={(valueId) => {
						onValueChange?.(id, valueId as string);
						setValueId(valueId as string);
					}}
					selected={valueId}
				/>
			</div>

			<button onClick={() => onRemove(id)} className="w-[2.2rem] flex items-center justify-center h-full">
				<X size={15} />
			</button>
		</div>
	);
}

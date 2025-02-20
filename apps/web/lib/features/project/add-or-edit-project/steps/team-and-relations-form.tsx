import { Button } from '@/lib/components';
import { CheckIcon, Plus, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Identifiable, Select, Thumbnail } from './basic-information-form';
import { IStepElementProps } from '../container';
import { useOrganizationProjects, useOrganizationTeams } from '@/app/hooks';
import { useRoles } from '@/app/hooks/features/useRoles';
import { cn } from '@/lib/utils';
import { IProjectRelation, ProjectRelationEnum } from '@/app/interfaces';

export default function TeamAndRelationsForm(props: IStepElementProps) {
	const { goToNext } = props;
	const [members, setMembers] = useState<{ memberId: string; roleId: string; id: string }[]>([]);
	const [relations, setRelations] = useState<(IProjectRelation & { id: string })[]>([]);
	const { organizationProjects } = useOrganizationProjects();
	const { teams } = useOrganizationTeams();
	const { roles, getRoles } = useRoles();
	const relationsData = Object.values(ProjectRelationEnum);

	const handleAddNewMember = () => {
		setMembers((prev) => [...prev, { id: crypto.randomUUID(), memberId: '', roleId: '' }]);
	};

	const handleRemoveMember = (id: string) => {
		setMembers((prev) => prev.filter((el) => el.id !== id));
	};

	const handleAddNewRelation = () => {
		// @ts-ignore
		setRelations((prev) => [...prev, { id: crypto.randomUUID(), projectId: '', relationType: null }]);
	};

	const handleRemoveRelation = (id: string) => {
		setRelations((prev) => prev.filter((el) => el.id !== id));
	};

	useEffect(() => {
		getRoles();
	}, [getRoles]);

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();

		const simpleMemberRole = roles?.find((role) => role.name == 'EMPLOYEE');
		const managerRole = roles?.find((role) => role.name == 'MANAGER');

		goToNext({
			memberIds: members.filter((el) => el.roleId == simpleMemberRole?.id).map((el) => el.memberId),
			managerIds: members.filter((el) => el.roleId == managerRole?.id).map((el) => el.memberId),
			relations: relations.filter((el) => el.projectId && el.relationType)
		});
	};

	return (
		<form onSubmit={handleSubmit} className="w-full space-y-5 pt-4">
			<div className="w-full flex flex-col gap-2">
				<label className="text-xs font-medium">Assign Members & Managers</label>
				<div className="w-full flex flex-col gap-2">
					<div className="w-full flex flex-col gap-1">
						{members.length ? (
							members.map((el) => (
								<PairingItem
									keys={teams
										?.flatMap((el) => el.members)
										?.map((el) => ({
											id: el.id,
											value: el.employee.fullName,
											imgUrl: el.employee.user?.imageUrl
										}))}
									values={roles
										?.filter((el) => el.name == 'EMPLOYEE' || el.name == 'MANAGER')
										?.map((el) => ({
											id: el.id!,
											value: el.name
										}))}
									onRemove={handleRemoveMember}
									key={el.id}
									id={el.id}
									keysLabel="Select a member..."
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
							<span className=" text-xs ">No members or managers</span>
						)}
					</div>
					<Button
						type="button"
						className="h-[1.8rem] w-28 bg-primary/10 border-gray-300 rounded-lg text-xs"
						variant="outline"
						onClick={handleAddNewMember}
					>
						<Plus size={15} /> <span>Add Member</span>
					</Button>
				</div>
			</div>

			<div className="w-full flex flex-col gap-2">
				<label className="text-xs font-medium">Relations</label>
				<div className="w-full flex flex-col gap-2">
					<div className="w-full flex flex-col gap-1">
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
									onRemove={handleRemoveRelation}
									key={el.id}
									id={el.id}
									keysLabel="Select a project..."
									valuesLabel="Choose a relation type..."
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
													return { ...el, relationType: relationType as ProjectRelationEnum };
												}
												return el;
											})
										)
									}
								/>
							))
						) : (
							<span className=" text-xs ">No relations</span>
						)}
					</div>
					<Button
						type="button"
						className="h-[1.8rem] w-28 bg-primary/10 border-gray-300 rounded-lg text-xs"
						variant="outline"
						onClick={handleAddNewRelation}
					>
						<Plus size={15} /> <span>Add Relation</span>
					</Button>
				</div>
			</div>

			<div className="w-full flex items-center justify-end">
				<Button type="submit" className=" h-[2.5rem]">
					Next
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
	valuesLabel?: string;
	onKeyChange?: (id: string, key: string) => void;
	onValueChange?: (id: string, value: string) => void;
}

function PairingItem<K extends Identifiable, V extends Identifiable>(props: IPairingItemProps<K, V>) {
	const { id, onRemove, keys, values, keysLabel, valuesLabel, onKeyChange, onValueChange } = props;
	const [keyId, setKeyId] = useState<string | null>(null);
	const [valueId, setValueId] = useState<string | null>(null);

	return (
		<div className="w-full flex items-center gap-3">
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
										className="rounded-full z-20 bg-white text-gray-700"
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

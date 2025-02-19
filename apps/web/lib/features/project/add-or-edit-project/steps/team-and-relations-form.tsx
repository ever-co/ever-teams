import { Button } from '@/lib/components';
import { Plus, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Select } from './basic-information-form';
import { IStepElementProps } from '../container';

const membersData = [
	{ id: '1', value: 'Jane Doe' },
	{ id: '2', value: 'John Doe' },
	{ id: '3', value: 'Alice Doe' },
	{ id: '4', value: 'Bob Doe' },
	{ id: '5', value: 'Charlie Doe' },
	{ id: '6', value: 'David Doe' },
	{ id: '7', value: 'Emily Doe' },
	{ id: '8', value: 'Frank Doe' },
	{ id: '9', value: 'Grace Doe' }
];

const rolesData = [
	{ id: '1', value: 'Manager' },
	{ id: '2', value: 'Member' }
];

const projectsData = [
	{ id: '1', value: 'Team A' },
	{ id: '2', value: 'Team B' },
	{ id: '3', value: 'Team C' }
];

const relationTypesData = [
	{ id: '1', value: 'Related to' },
	{ id: '2', value: 'Blocked By' },
	{ id: '3', value: 'Blocking' }
];

export default function TeamAndRelationsForm(props: IStepElementProps) {
	const { goToNext } = props;
	const [members, setMembers] = useState<{ memberId: string; roleId: string; id: string }[]>([]);
	const [relations, setRelations] = useState<{ projectId: string; relationType: string; id: string }[]>([]);

	const handleAddNewMember = useCallback(() => {
		setMembers((prev) => [...prev, { id: crypto.randomUUID(), memberId: '', roleId: '' }]);
	}, []);

	const handleRemoveMember = useCallback((id: string) => {
		setMembers((prev) => prev.filter((el) => el.id !== id));
	}, []);

	const handleAddNewRelation = useCallback(() => {
		setRelations((prev) => [...prev, { id: crypto.randomUUID(), projectId: '', relationType: '' }]);
	}, []);

	const handleRemoveRelation = useCallback((id: string) => {
		setRelations((prev) => prev.filter((el) => el.id !== id));
	}, []);

	return (
		<div className="w-full space-y-5 pt-4">
			<div className="w-full flex flex-col gap-2">
				<label className="text-xs font-medium">Assign Members & Managers</label>
				<div className="w-full flex flex-col gap-2">
					<div className="w-full flex flex-col gap-1">
						{members.length > 0 ? (
							members.map((el) => (
								<PairingItem
									keys={membersData}
									values={rolesData}
									onRemove={handleRemoveMember}
									key={el.id}
									id={el.id}
									keysLabel="Select a member..."
									valuesLabel="Select role..."
								/>
							))
						) : (
							<span className=" text-xs ">No members or managers</span>
						)}
					</div>
					<Button
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
						{relations.length > 0 ? (
							relations.map((el) => (
								<PairingItem
									keys={projectsData}
									values={relationTypesData}
									onRemove={handleRemoveRelation}
									key={el.id}
									id={el.id}
									keysLabel="Select a peoject..."
									valuesLabel="Choose a relation type..."
								/>
							))
						) : (
							<span className=" text-xs ">No relations</span>
						)}
					</div>
					<Button
						className="h-[1.8rem] w-28 bg-primary/10 border-gray-300 rounded-lg text-xs"
						variant="outline"
						onClick={handleAddNewRelation}
					>
						<Plus size={15} /> <span>Add Relation</span>
					</Button>
				</div>
			</div>

			<div className="w-full flex items-center justify-end">
				<Button onClick={goToNext} className=" h-[2.5rem]">
					Next
				</Button>
			</div>
		</div>
	);
}

interface Identifiable {
	id: string;
	value: string | number;
}

interface IPairingItemProps<K extends Identifiable, V extends Identifiable> {
	id: string;
	onRemove: (id: string) => void;
	keys: K[];
	values: V[];
	keysLabel?: string;
	valuesLabel?: string;
}

function PairingItem<K extends Identifiable, V extends Identifiable>(props: IPairingItemProps<K, V>) {
	const { id, onRemove, keys, values, keysLabel, valuesLabel } = props;
	const [keyId, setKeyId] = useState<string | null>(null);
	const [valueId, setValueId] = useState<string | null>(null);

	return (
		<div className="w-full flex items-center gap-3">
			<div className="w-full">
				<Select
					placeholder={keysLabel}
					className="w-full"
					options={keys}
					onChange={(keyId) => setKeyId(keyId as string)}
					selected={keyId}
				/>
			</div>

			<div className="w-full">
				<Select
					placeholder={valuesLabel}
					className="w-full"
					options={values}
					onChange={(valueId) => setValueId(valueId as string)}
					selected={valueId}
				/>
			</div>

			<button onClick={() => onRemove(id)} className="w-[2.2rem] flex items-center justify-center h-full">
				<X size={15} />
			</button>
		</div>
	);
}

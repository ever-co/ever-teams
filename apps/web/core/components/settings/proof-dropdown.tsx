import { Dropdown } from '@/core/components';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { clsxm } from '@/core/lib/utils';
import { FieldValues, UseFormSetValue } from 'react-hook-form';
import { IProof, ProofItem, mapPropfItems } from './proof-items';

export const ProofDropdown = ({
	setValue,
	active
}: {
	setValue: UseFormSetValue<FieldValues>;
	active?: IProof | null;
}) => {
	const [ProofList, setProof] = useState<IProof[]>([
		{
			title: 'Private'
		},
		{
			title: 'Public'
		}
	]);

	const items: any = useMemo(() => mapPropfItems(ProofList), [ProofList]);

	const [ProofItem, setProofItem] = useState<ProofItem | null>();

	const onChangeActiveTeam = useCallback(
		(item: ProofItem) => {
			if (item.data) {
				setProofItem(item);
				setValue('Proof', item.data.title);
			}
		},
		[setProofItem, setValue]
	);

	useEffect(() => {
		if (!ProofItem && items.length > 0) {
			setProofItem(items[0]);
		}
	}, [ProofItem, items]);

	useEffect(() => {
		if (active && ProofList.every((Proof) => Proof.title !== active.title)) {
			setProof([...ProofList, active]);
		}
	}, [ProofList, setProof, setProofItem, active]);

	useEffect(() => {
		if (active) {
			setProofItem(items.find((item: any) => item.key === active?.title));
		}
	}, [active, items]);

	return (
		<>
			<Dropdown
				className="w-full min-w-[9rem] max-w-[12rem] rounded-md"
				buttonClassName={clsxm(
					'h-9 w-full rounded-md border-border bg-card px-3 py-0 text-sm font-normal',
					ProofList.length === 0 && ['py-2']
				)}
				value={ProofItem || null}
				onChange={onChangeActiveTeam}
				items={items}
			></Dropdown>
		</>
	);
};

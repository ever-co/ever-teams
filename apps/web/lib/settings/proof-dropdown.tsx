import { Dropdown } from 'lib/components';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { IProof } from '@app/interfaces/IProof';
import { clsxm } from '@app/utils';
import { FieldValues, UseFormSetValue } from 'react-hook-form';
import { ProofItem, mapPropfItems } from './proof-items';

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
		if (!ProofItem) {
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
				className="min-w-[250px] max-w-sm"
				buttonClassName={clsxm(
					'py-0 font-medium h-[54px] w-[150px] w-full',
					ProofList.length === 0 && ['py-2']
				)}
				value={ProofItem || null}
				onChange={onChangeActiveTeam}
				items={items}
			></Dropdown>
		</>
	);
};

import { IProof } from '@app/interfaces/IProof';
import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';

export type ProofItem = DropdownItem<IProof>;

export function mapPropfItems(ProofList: IProof[]) {
	const items = ProofList.map<ProofItem>((proof) => {
		return {
			key: proof.title,
			Label: ({ selected }) => (
				<div className="flex justify-between">
					<ProofItem title={proof.title} className={selected ? 'font-medium' : ''} />
				</div>
			),
			selectedLabel: <ProofItem title={proof.title} className="py-2 mb-0" />,
			data: proof
		};
	});

	if (items.length > 0) {
		items.unshift({
			key: 0,
			Label: () => (
				<div className="flex justify-between">
					<ProofItem title={'Select Proof'} className="w-full cursor-default" color="#F5F5F5" disabled />
				</div>
			),
			disabled: true
		});
	}

	return items;
}

export function ProofItem({
	title,
	// count,
	// color,
	// disabled,
	className
}: {
	title?: string;
	count?: number;
	className?: string;
	color?: string;
	disabled?: boolean;
}) {
	return (
		<div className={clsxm('flex items-center justify-start space-x-2 text-sm cursor-pointer mb-0 py-2', className)}>
			<span className={clsxm('text-normal mb-0')}>{title}</span>
		</div>
	);
}

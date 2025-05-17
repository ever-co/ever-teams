import { cn } from '@/core/lib/helpers';
import { useState, ReactNode } from 'react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '../common/dropdown-menu';

// A complete dropdown component that mimics Listbox functionality
export function CustomListboxDropdown<T>({
	value,
	values = [],
	onChange,
	disabled,
	enabled = true,
	trigger,
	items,
	renderItem,
	multiple = false,
	className,
	dropdownClassName,
	children
}: {
	value?: T;
	values?: T[];
	onChange?: (value: any) => void;
	disabled?: boolean;
	enabled?: boolean;
	trigger: ReactNode;
	items: any[];
	renderItem: (item: any, isSelected: boolean) => ReactNode;
	multiple?: boolean;
	className?: string;
	dropdownClassName?: string;
	children?: ReactNode;
}) {
	const [open, setOpen] = useState(false);

	const handleSelect = (itemValue: T) => {
		if (!onChange) return;
		if (multiple) {
			// Vérifier si l'élément est déjà sélectionné en utilisant une comparaison stricte de chaînes
			const stringItemValue = String(itemValue);
			const isAlreadySelected = values.some((v) => String(v) === stringItemValue);

			if (isAlreadySelected) {
				// Si déjà sélectionné, le retirer
				const newValues = values.filter((v) => String(v) !== stringItemValue);
				onChange(newValues);
			} else {
				// Sinon, l'ajouter en s'assurant qu'il n'y a pas de doublons
				// Convertir toutes les valeurs en chaînes
				const stringValues = values.map((v) => String(v));

				// Vérifier à nouveau pour éviter les doublons
				if (!stringValues.includes(stringItemValue)) {
					onChange([...values, itemValue]);
				} else {
					// Ne rien faire si la valeur existe déjà (double vérification)
					console.log('Valeur déjà sélectionnée, ignorée:', stringItemValue);
				}
			}
		} else {
			// Pour la sélection simple, remplacer la valeur actuelle
			onChange(itemValue);
			setOpen(false);
		}
	};

	return (
		<div className={cn('relative', className)}>
			<DropdownMenu open={open && enabled} onOpenChange={enabled ? setOpen : undefined}>
				<DropdownMenuTrigger asChild disabled={disabled || !enabled}>
					<div className="cursor-pointer outline-none">{trigger}</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					className={cn(
						'animate-in fade-in-80 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
						'max-h-[320px] overflow-auto scrollbar-hide',
						dropdownClassName
					)}
				>
					<DropdownMenuGroup>
						{items.map((item, i) => {
							const itemValue = item.value || item.name;
							const isSelected = multiple
								? values.some((v) => String(v) === String(itemValue))
								: String(value) === String(itemValue);

							return (
								<DropdownMenuItem key={i} disabled={disabled} onClick={() => handleSelect(itemValue)}>
									{renderItem(item, isSelected)}
								</DropdownMenuItem>
							);
						})}
						{children}
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

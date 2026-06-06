import { SelectContent, SelectItem, SelectTrigger, SelectValue, ShadCnSelect as InputSelect } from './select';
import { cva, VariantProps } from 'class-variance-authority';
import { ISelectValue } from '@ever-teams/toolkit-types';
import { SelectProps } from '@radix-ui/react-select';
import { cn } from '@/lib/utils/utils';
import React from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../command';

export const selectVariants = cva('border dark:border-slate-800', {
	variants: {
		size: {
			default: 'h-10 px-4 py-2',
			sm: 'h-8  text-xs',
			lg: 'h-11 rounded-md px-8'
		}
	},
	defaultVariants: {
		size: 'default'
	}
});

export interface ISelectProps extends VariantProps<typeof selectVariants>, SelectProps {
	placeholder: string;
	values?: ISelectValue[];
	className?: string;
	onValueChange?: (value: string) => void;
	value?: string;
	loading?: boolean;
	icon?: React.ReactNode;
	search?: boolean;
	onClear?: () => void;
}

const Select = ({
	className,
	size,
	placeholder,
	values,
	onValueChange,
	value,
	defaultValue,
	loading,
	search = false,
	onClear,
	...props
}: ISelectProps) => {
	const [, setOpen] = React.useState(false);

	return (
		<InputSelect onValueChange={onValueChange} defaultValue={defaultValue} value={value} {...props}>
			<SelectTrigger onClear={onClear} loading={loading} className={cn(selectVariants({ size, className }))}>
				<SelectValue className="truncate" placeholder={placeholder} />
			</SelectTrigger>
			{values && values[0] ? (
				<SelectContent>
					{search && (
						<Command>
							<CommandInput placeholder="Search..." />
							<CommandList>
								<CommandEmpty>
									<p className="text-sm opacity-40">No item found</p>
								</CommandEmpty>
								<CommandGroup>
									{values.map((item) => (
										<CommandItem
											key={item.value}
											value={item.value}
											onSelect={() => {
												setOpen(false);
											}}
										>
											<SelectItem className="truncate" key={item.value} value={item.value}>
												<div className="flex items-center justify-center gap-2">
													{item.icon && <span>{item.icon}</span>}
													<span>{item.label}</span>
												</div>
											</SelectItem>
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					)}

					{!search &&
						values.map((element) => {
							return (
								<SelectItem key={element.value} value={element.value}>
									<div className="flex gap-2">
										{element.icon && <span>{element.icon}</span>}
										<span>{element.label}</span>
									</div>
								</SelectItem>
							);
						})}
				</SelectContent>
			) : (
				<SelectContent>
					<p className="p-2 text-sm opacity-40 m-0">No item found</p>
				</SelectContent>
			)}
		</InputSelect>
	);
};

export { Select };

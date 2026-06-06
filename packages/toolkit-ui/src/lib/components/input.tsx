/** @jsxImportSource theme-ui */
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../utils/utils';
import { Label } from './label';

export interface IInputProps extends React.InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof inputVariants> {
	asChild?: boolean;
	icon?: React.ReactNode;
	ref?: React.RefObject<HTMLInputElement>;
}

const inputVariants = cva('w-full', {
	variants: {
		variant: {
			default: 'border dark:border-slate-800',
			error: ' text-input-error-foreground border border-red-500',
			success: 'bg-input-success text-input-success-foreground border border-green-500',
			warning: 'bg-input-warning text-input-warning-foreground border border-yellow-500'
		},
		inputSize: {
			default: 'h-10 px-3',
			sm: 'h-8 rounded-md  text-xs',
			lg: 'h-11 rounded-md px-8',
			custom: 'h-10 px-3'
		}
	},
	defaultVariants: {
		variant: 'default',
		inputSize: 'default'
	}
});

const Input = ({ ref, className, variant, inputSize, asChild = false, placeholder, icon, ...props }: IInputProps) => {
	const Comp = asChild ? Slot : 'input';
	return (
		<div className="relative flex items-center">
			{icon && <span className="absolute left-3">{icon}</span>}
			<Comp
				className={cn(
					inputVariants({ variant, inputSize, className }),
					icon ? 'pl-10' : '',
					'rounded-lg border bg-transparent focus:outline-hidden outline-hidden text-sm px-3'
				)}
				ref={ref}
				placeholder={placeholder && placeholder[0] + placeholder?.toLowerCase().substring(1)}
				{...props}
				sx={{ '&:focus': { borderColor: 'borderColor' } }}
			/>
		</div>
	);
};
Input.displayName = 'Input';

interface IInputFieldProps extends IInputProps {
	label?: string;
}

export function InputField({ label, name, type = 'text', value, className, onChange, ...props }: IInputFieldProps) {
	return (
		<div className="flex flex-col gap-2">
			<Label htmlFor={name} className="text-slate-500 dark:text-white text-sm">
				{label}
			</Label>
			<Input
				type={type}
				name={name}
				id={name}
				value={value}
				onChange={onChange}
				className={className}
				{...props}
			/>
		</div>
	);
}

export { Input, inputVariants };

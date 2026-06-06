import { Select } from '@/components/ui/select'
import { Input as Inputs } from '@builder.io/sdk';
// import { SelectProps } from '@radix-ui/react-select'
import React from 'react'

interface SelectProps {
  className?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  dir?: 'ltr' | 'rtl';
  name?: string;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
  options: { value: string; label: string }[];
}

export function BasicSelect({ ...props }: SelectProps) {
  return (
    <div>
      <Select
        {...props}
      />
    </div>
  )
}


export const InputBasicSelect: Inputs[] = [
  {
    name: 'className',
    type: 'string',
    defaultValue: '',
  },
  {
    name: 'value',
    type: 'string',
    defaultValue: '',
  },
  {
    name: 'defaultValue',
    type: 'string',
    defaultValue: '',
  },
  {
    name: 'dir',
    type: 'enum',
    enum: ['ltr', 'rtl'],
    defaultValue: 'ltr',
  },
  {
    name: 'name',
    type: 'string',
    defaultValue: '',
  },
  {
    name: 'autoComplete',
    type: 'string',
    defaultValue: 'off',
  },
  {
    name: 'disabled',
    type: 'boolean',
    defaultValue: false,
  },
  {
    name: 'required',
    type: 'boolean',
    defaultValue: false,
  },
  {
    name: 'options',
    type: 'list',
    defaultValue: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ],
    subFields: [
      { name: 'value', type: 'string' },
      { name: 'label', type: 'string' },
    ],
  },
];

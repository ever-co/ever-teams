import React from 'react';
import { Input as Inputs, Builder } from '@builder.io/sdk';
import { Checkbox, CheckboxIndicator } from '@radix-ui/react-checkbox';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export const InputTeamsCheckbox: Inputs[] = [
  {
    name: 'label',
    type: 'string',
    defaultValue: 'Checkbox Label',
  },
  {
    name: 'labelPosition',
    type: 'enum',
    enum: ['left', 'right'],
    defaultValue: 'right',
  },
  {
    name: 'defaultChecked',
    type: 'boolean',
    defaultValue: false,
  },
  {
    name: 'size',
    type: 'enum',
    enum: ['sm', 'md', 'lg'],
    defaultValue: 'md',
  },
  {
    name: 'disabled',
    type: 'boolean',
    defaultValue: false,
  },
  {
    name: 'className',
    type: 'string',
    defaultValue: '',
  },
  {
    name: 'theme',
    type: 'enum',
    enum: ['light', 'dark', 'system'],
    defaultValue: 'system',
    friendlyName: 'Theme Mode'
  }
];

interface CheckboxProps {
  label?: string;
  labelPosition?: 'left' | 'right';
  defaultChecked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  theme?: 'light' | 'dark' | 'system';
}

export const BasicCheckbox: React.FC<CheckboxProps> = ({
  label = 'Checkbox Label',
  labelPosition = 'right',
  defaultChecked = false,
  size = 'md',
  disabled = false,
  className,
  theme = 'system'
}) => {
  const [checked, setChecked] = React.useState(defaultChecked);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const checkSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const themeClasses = {
    light: 'border-gray-300 bg-white text-gray-900 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600',
    dark: 'border-gray-600 bg-gray-800 text-gray-100 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500',
    system: 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-600 dark:data-[state=checked]:border-blue-500'
  };

  const handleChange = (checked: boolean | 'indeterminate') => {
    setChecked(checked === true);
  };

  return (
    <div className={cn(
      "flex items-center space-x-2",
      theme === 'dark' ? 'text-gray-100' : theme === 'light' ? 'text-gray-900' : 'text-gray-900 dark:text-gray-100'
    )}>
      {labelPosition === 'left' && (
        <span className={cn(
          "text-sm",
          theme === 'dark' ? 'text-gray-100' : theme === 'light' ? 'text-gray-900' : 'text-gray-900 dark:text-gray-100'
        )}>
          {label}
        </span>
      )}
      <Checkbox
        checked={checked}
        onCheckedChange={handleChange}
        disabled={disabled}
        className={cn(
          'peer shrink-0 rounded-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          sizeClasses[size],
          themeClasses[theme],
          className
        )}
      >
        <CheckboxIndicator className="flex items-center justify-center">
          <Check className={cn(
            "text-white",
            checkSizeClasses[size]
          )} />
        </CheckboxIndicator>
      </Checkbox>
      {labelPosition === 'right' && (
        <span className={cn(
          "text-sm",
          theme === 'dark' ? 'text-gray-100' : theme === 'light' ? 'text-gray-900' : 'text-gray-900 dark:text-gray-100'
        )}>
          {label}
        </span>
      )}
    </div>
  );
};

// Register the component with Builder.io
Builder.registerComponent(BasicCheckbox, {
  name: 'Basic Checkbox',
  inputs: InputTeamsCheckbox,
  canHaveChildren: false,
  defaultChildren: [],
  image: 'https://tabler-icons.io/static/tabler-icons/icons/checkbox.svg',
  defaultStyles: {
    display: 'flex',
    alignItems: 'center',
  },
});

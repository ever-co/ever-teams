import * as Select from '@radix-ui/react-select';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';
import { forwardRef } from 'react';
import classnames from 'classnames';
type SelectItems = {
  label: string;
  value: string;
};
type Props = {
  title: string;
  items: SelectItems[];
  defaultValue: string;
  value: string;
  disabled: boolean;
  onValueChange: (val: string) => void;
};

const SelectItem = forwardRef(
  ({ children, className, ...props }: any, forwardedRef) => {
    return (
      <Select.Item
        className={classnames('SelectItem', className)}
        {...props}
        ref={forwardedRef}
      >
        <Select.ItemText>{children}</Select.ItemText>
        <Select.ItemIndicator className="SelectItemIndicator">
          <CheckIcon />
        </Select.ItemIndicator>
      </Select.Item>
    );
  },
);
export const SelectComponent = ({
  title,
  items,
  defaultValue,
  value,
  disabled,
  onValueChange,
}: Props) => {
  const { t } = useTranslation();
  return (
    <Select.Root
      defaultValue={defaultValue}
      value={value}
      disabled={disabled}
      onValueChange={onValueChange}
    >
      <Select.Trigger
        className="inline-flex items-center justify-center rounded px-[15px] text-[13px] leading-none h-[35px] gap-[5px] bg-white text-violet11 shadow-[0_2px_10px] shadow-black/10 hover:bg-mauve3 focus:shadow-[0_0_0_2px] focus:shadow-black data-[placeholder]:text-violet9 outline-none"
        aria-label="Food"
      >
        <Select.Value placeholder={title} />
        <Select.Icon className="text-violet11">
          <ChevronDownIcon />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="overflow-hidden bg-white rounded-md shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)]">
          <Select.ScrollUpButton className="flex items-center justify-center h-[25px] bg-white text-violet11 cursor-default">
            <ChevronUpIcon />
          </Select.ScrollUpButton>
          <Select.Viewport className="p-[5px]">
            <Select.Group>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {t(`FORM.LABELS.UPDATE_OPTIONS.${item.label}`)}
                </SelectItem>
              ))}
            </Select.Group>
          </Select.Viewport>
          <Select.ScrollDownButton className="flex items-center justify-center h-[25px] bg-white text-violet11 cursor-default">
            <ChevronDownIcon />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};

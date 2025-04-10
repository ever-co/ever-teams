import React from 'react';
import { FieldError, UseFormRegister } from 'react-hook-form';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

interface PhoneInputProps<T extends Record<string, any>> {
  name: string;
  label?: string;
  error?: FieldError;
  register: UseFormRegister<T>;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  wrapperClassName?: string;
  notValidBorder?: boolean;
}

const InternationalPhoneInput = <T extends Record<string, any>>({
  name,
  label,
  error,
  register,
  required,
  value,
  onChange,
  disabled = false,
  className = '',
  wrapperClassName = '',
  notValidBorder = false,
}: PhoneInputProps<T>) => {


  const { ref, ...registerProps } = register(name as any, {
    required: required ? 'Phone number is required' : false,
    validate: (value: string) => {
      if (!value) {
        return required ? 'Phone number is required' : true;
      }

      const digitsOnly = value.replace(/\s+/g, '').replace('+', '');

      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return 'Invalid phone number. Please enter a valid phone number';
      }

      return true;
    }
  });

  return (
    <div className={`w-full h-full ${wrapperClassName}`}>
      {label && (
        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className={`phone-input-wrapper w-full h-[54px] ${notValidBorder ? 'border border-red-500 rounded-lg' : 'input-border rounded-[10px]'}`}>
        <PhoneInput
          country="us"
          inputClass={`w-full h-[54px] !rounded-lg !pl-12 ${className} ${disabled ? 'bg-[#FCFCFC] dark:bg-[#1B1D22] cursor-not-allowed' : ''}`}
          containerClass="phone-input-container w-full h-full"
          buttonClass="phone-input-button h-full no-border"
          enableSearch={true}
          searchClass="search-class"
          {...registerProps}
          inputProps={{
            ref: ref,
            name: name,
            disabled,
            className: notValidBorder ? '!border-red-500' : 'no-focus-border',
            style: {
              width: '100%',
              height: '100%',
              borderRadius: '10px',
              border: 'none',
              paddingLeft: '56px',
              outline: 'none'
            }
          }}
          value={value || ''}
          onChange={(phone) => {
            if (registerProps.onChange) {
              registerProps.onChange({ target: { value: phone } });
            }
            if (onChange) {
              onChange(phone);
            }
          }}
          disabled={disabled}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error.message}</p>}
      {notValidBorder && !error && (
        <p className="mt-1 text-xs text-red-500">Please enter a valid phone number</p>
      )}
    </div>
  );
};

export default InternationalPhoneInput;

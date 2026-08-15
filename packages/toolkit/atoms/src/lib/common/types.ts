export const separatorOptions = [
  { value: ':', label: 'Colon (:)' },
  { value: '.', label: 'Dot (.)' },
  { value: '-', label: 'Dash (-)' },
  { value: ' ', label: 'Space' },
];

export type DigitStyle = 'normal' | 'outlined' | 'shadowed';

export type StyleOption = {
  value: string;
  label: string;
};

export interface BaseSelectProps {
  id?: string;
  label: string;
  value: string;
  options: StyleOption[];
  onChange: (value: string) => void;
  className?: string;
}

export interface ColorPickerProps {
  id?: string;
  label: string;
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export interface TimerCustomization {
  font: string;
  digitColor: string;
  backgroundColor: string;
  separator: string;
  digitStyle: DigitStyle;
}

export interface CustomizableTimerProps {
  initialCustomization?: TimerCustomization;
  onCustomizationChange?: (customization: TimerCustomization) => void;
  className?: string;
}

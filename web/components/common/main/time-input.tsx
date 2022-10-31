import { ITimeInputProps } from "@app/interfaces/hooks";

export const TimeInput = ({
  value,
  placeholder,
  handleChange,
  type,
  style,
}: ITimeInputProps) => {
  return (
    <input
      className={`placeholder:font-light text-[14px] text-center border-b-2 dark:border-[#616164] border-dashed outline-none  placeholder:text-center bg-transparent ${style}`}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      type={type}
    />
  );
};

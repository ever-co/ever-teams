import { ITimeInputProps } from "@app/interfaces/hooks";

export const TimeInput = ({
  value,
  placeholder,
  handleChange,
  type,
  style,
  name,
  handleDoubleClick,
  handleEnter,
  disabled,
}: ITimeInputProps) => {
  return (
    <input
      className={`placeholder:font-light text-[14px] text-center border-b-2 dark:border-[#616164] border-dashed outline-none  placeholder:text-center ${style}`}
      placeholder={placeholder}
      value={value}
      name={name}
      onChange={handleChange}
      type={type}
      onDoubleClick={handleDoubleClick}
      onKeyPress={(event) => {
        if (event.key === "Enter") {
          handleEnter(this);
        }
      }}
      disabled={disabled}
    />
  );
};

import { IInputProps } from "../../app/interfaces/hooks";

const Input = ({
  label,
  name,
  type,
  placeholder,
  required,
  onChange,
  value,
  centered = false,
}: IInputProps) => {
  return (
    <div>
      {value.length > 0 && (
        <label
          htmlFor={name}
          className={`block ${
            centered && "text-center"
          } text-[14px] font-light text-[#ACB3BB]`}
        >
          {label}
        </label>
      )}
      <input
        type={type}
        name={name}
        value={value}
        id={name}
        placeholder={placeholder}
        required={required}
        onChange={onChange}
        className={`w-full pt-1 text-[18px] ${
          centered && "text-center"
        } border-b placeholder:font-light focus:border-b-2 focus:border-[#1B005D]
         border-[#D7E1EB] bg-white pb-1 
        font-medium text-primary dark:text-white outline-none dark:bg-transparent`}
      />
    </div>
  );
};

Input.defaultProps = {
  type: "text",
};

export default Input;

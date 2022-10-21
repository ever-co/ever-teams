import { IInputProps } from "../../app/interfaces/hooks";

const Input = ({
  label,
  name,
  type,
  placeholder,
  required,
  onChange,
  value,
}: IInputProps) => {
  return (
    <div className="mt-10">
      {value.length > 0 && (
        <label
          htmlFor={name}
          className="block text-sm font-light text-[#ACB3BB]"
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
        className="w-full pt-1 border-b placeholder:font-light border-[#D7E1EB] bg-white pb-1 font-medium text-primary dark:text-white outline-none dark:bg-transparent"
      />
    </div>
  );
};

Input.defaultProps = {
  type: "text",
};

export default Input;

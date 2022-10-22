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
    <div className="mt-[39px]">
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
        className={`w-full text-[18px] pt-1 ${
          centered && "text-center"
        } border-b focus:border-b-2
        placeholder:font-light placeholder:text-[16px] border-[#D7E1EB]
         focus:border-[#1B005D] bg-white pb-1 font-medium text-primary
          dark:text-white outline-none dark:bg-transparent`}
      />
    </div>
  );
};

Input.defaultProps = {
  type: "text",
};

export default Input;

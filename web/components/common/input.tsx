import { IInputProps } from "../../app/interfaces/hooks";

const Input = ({
  label,
  name,
  type,
  placeholder,
  required,
  onChange,
}: IInputProps) => {
  return (
    <div className="mb-5">
      <label
        htmlFor={name}
        className="mb-3 block text-base font-medium text-label dark:text-gray-400"
      >
        {label}:
      </label>
      <input
        type={type}
        name={name}
        id={name}
        placeholder={placeholder}
        required={required}
        onChange={onChange}
        className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base font-medium text-[#6B7280] outline-none focus:border-[#7D56fd] focus:border focus:shadow-md dark:bg-dark_background_color"
      />
    </div>
  );
};

Input.defaultProps = {
  type: "text",
};

export default Input;

import React from "react";

interface FormInputProps {
  style?: React.CSSProperties;
}

const FormInput: React.FC<FormInputProps> = (style: any) => {
  return <input type="text" style={style} />;
};

export default FormInput;

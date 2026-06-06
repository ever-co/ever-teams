import React from "react";

interface ButtonProps {
  borderRadius?: string;
  color?: string;
  height?: string;
  width?: string;
  iconColor?: string;
  backgroundColor?: string;
  iconSize?: string;
}
const TimeButton = (props: ButtonProps) => {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        borderRadius: props.borderRadius,
        color: props.color,
        height: props.height,
        width: props.width,
        backgroundColor: props.backgroundColor,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={props.iconSize}
        height={props.iconSize}
        viewBox="0 0 24 24"
      >
        <path
          fill={props.iconColor}
          d="M10 15.577L15.577 12L10 8.423zM12.003 21q-1.866 0-3.51-.708q-1.643-.709-2.859-1.924t-1.925-2.856T3 12.003t.709-3.51Q4.417 6.85 5.63 5.634t2.857-1.925T11.997 3t3.51.709q1.643.708 2.859 1.922t1.925 2.857t.709 3.509t-.708 3.51t-1.924 2.859t-2.856 1.925t-3.509.709"
        />
      </svg>
    </div>
  );
};

export default TimeButton;

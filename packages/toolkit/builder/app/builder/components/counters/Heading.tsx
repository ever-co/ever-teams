import React from "react";

const Heading = (props: any) => {
  return (
    <p
      className="w-fit h-fit"
      style={{
        color: props.color,
        fontSize: props.fontSize,
        fontWeight: props.fontWeight,
      }}
    >
      {props.title}
    </p>
  );
};

export default Heading;

export const UnassignedTaskIcon = ({ color = "#5f5f5f" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width="13"
      height="13"
      className="mr-1"
    >
      <path
        fillRule="evenodd"
        fill={color}
        d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z"
      ></path>
    </svg>
  );
};

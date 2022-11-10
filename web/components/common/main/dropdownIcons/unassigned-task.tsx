interface IUnassignedTask {
  color?: string;
}

const UnassignedTask = ({ color = "#8b949e" }: IUnassignedTask) => {
  return (
    <svg
      aria-hidden="true"
      height="16"
      viewBox="0 0 16 16"
      version="1.1"
      width="16"
      data-view-component="true"
      className="octicon octicon-issue-opened mr-1"
    >
      <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" fill={color}></path>
      <path
        fillRule="evenodd"
        d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"
        fill={color}
      ></path>
    </svg>
  );
};

export default UnassignedTask;

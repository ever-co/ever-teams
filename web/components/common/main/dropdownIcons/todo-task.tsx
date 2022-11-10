const TodoTask = ({ color = "#747474" }: { color?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      height="16"
      viewBox="0 0 16 16"
      version="1.1"
      width="16"
      data-view-component="true"
      className="mr-1"
    >
      <path
        fill-rule="evenodd"
        fill={color}
        d="M6 0a6 6 0 100 12A6 6 0 006 0zm-.705 8.737L9.63 4.403 8.392 3.166 5.295 6.263l-1.7-1.702L2.356 5.8l2.938 2.938z"
      ></path>
    </svg>
  );
};

export default TodoTask;

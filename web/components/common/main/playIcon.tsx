import { IIconProps } from "../../../app/interfaces/hooks";

export const PlayIcon = ({ width, height }: IIconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      id="Group_7284"
      data-name="Group 7284"
      width={width}
      height={height}
      viewBox="0 0 64 64"
      className="fill-primary dark:fill-white "
    >
      <g id="Group_9197" data-name="Group 9197" transform="translate(0 0)">
        <circle
          id="Ellipse_226"
          data-name="Ellipse 226"
          cx="32"
          cy="32"
          r="32"
        />
        <path
          id="Icon_awesome-play"
          data-name="Icon awesome-play"
          d="M21.994,11.127,3.752.343A2.474,2.474,0,0,0,0,2.483V24.047a2.485,2.485,0,0,0,3.752,2.14L21.994,15.408a2.485,2.485,0,0,0,0-4.281Z"
          transform="translate(22.183 19.492)"
          className="fill-white dark:fill-black"
        />
      </g>
    </svg>
  );
};

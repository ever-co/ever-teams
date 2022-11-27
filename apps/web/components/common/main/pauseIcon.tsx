import { IIconProps } from "../../../app/interfaces/hooks";

export const PauseIcon = ({ width, height }: IIconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 68 68"
      className="fill-primary dark:fill-white "
    >
      <g
        id="Group_7255"
        data-name="Group 7255"
        transform="translate(-0.167 -0.027)"
      >
        <circle
          id="Ellipse_226"
          data-name="Ellipse 226"
          cx="34"
          cy="34"
          r="34"
          transform="translate(0.167 0.027)"
          fill="c"
        />
        <g
          id="Group_7278"
          data-name="Group 7278"
          transform="translate(-0.075 2.725)"
        >
          <rect
            id="Rectangle_733"
            data-name="Rectangle 733"
            width="5.533"
            height="20.55"
            rx="2.766"
            transform="translate(26.164 21.027)"
            className="fill-white dark:fill-black"
          />
          <rect
            id="Rectangle_734"
            data-name="Rectangle 734"
            width="5.533"
            height="20.55"
            rx="2.766"
            transform="translate(36.787 21.027)"
            className="fill-white dark:fill-black"
          />
        </g>
      </g>
    </svg>
  );
};

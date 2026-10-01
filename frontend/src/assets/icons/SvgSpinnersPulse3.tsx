import React, { SVGProps } from "react";

interface SvgSpinnersPulse3Props extends SVGProps<SVGSVGElement> {
  readonly width?: string | number;
  readonly height?: string | number;
}

export function SvgSpinnersPulse3({
  width = 24,
  height = 24,
  ...props
}: Readonly<SvgSpinnersPulse3Props>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      {...props}
    >
      {/* Icon from SVG Spinners by Utkarsh Verma - https://github.com/n3r4zzurr0/svg-spinners/blob/main/LICENSE */}
      <circle cx="12" cy="12" r="0" fill="currentColor">
        <animate
          id="SVGHRb9bJhy"
          fill="freeze"
          attributeName="r"
          begin="0;SVGUoIUme6Z.begin+0.4s"
          calcMode="spline"
          dur="1.2s"
          keySplines=".52,.6,.25,.99"
          values="0;11"
        />
        <animate
          fill="freeze"
          attributeName="opacity"
          begin="0;SVGUoIUme6Z.begin+0.4s"
          calcMode="spline"
          dur="1.2s"
          keySplines=".52,.6,.25,.99"
          values="1;0"
        />
      </circle>
      <circle cx="12" cy="12" r="0" fill="currentColor">
        <animate
          id="SVGaun8abat"
          fill="freeze"
          attributeName="r"
          begin="SVGHRb9bJhy.begin+0.4s"
          calcMode="spline"
          dur="1.2s"
          keySplines=".52,.6,.25,.99"
          values="0;11"
        />
        <animate
          fill="freeze"
          attributeName="opacity"
          begin="SVGHRb9bJhy.begin+0.4s"
          calcMode="spline"
          dur="1.2s"
          keySplines=".52,.6,.25,.99"
          values="1;0"
        />
      </circle>
      <circle cx="12" cy="12" r="0" fill="currentColor">
        <animate
          id="SVGUoIUme6Z"
          fill="freeze"
          attributeName="r"
          begin="SVGHRb9bJhy.begin+0.8s"
          calcMode="spline"
          dur="1.2s"
          keySplines=".52,.6,.25,.99"
          values="0;11"
        />
        <animate
          fill="freeze"
          attributeName="opacity"
          begin="SVGHRb9bJhy.begin+0.8s"
          calcMode="spline"
          dur="1.2s"
          keySplines=".52,.6,.25,.99"
          values="1;0"
        />
      </circle>
    </svg>
  );
}
export default SvgSpinnersPulse3;

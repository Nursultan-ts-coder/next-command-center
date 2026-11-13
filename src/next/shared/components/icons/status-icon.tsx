import { useTheme } from '@mui/material/styles';
import React from 'react';

export interface StatusIconProps extends React.SVGProps<SVGSVGElement> {
  color: string;
  size?: number;
}

const StatusIcon: React.FC<StatusIconProps> = ({ color, size = 15, className, ...rest }) => {
  const theme = useTheme();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size + 1}
      viewBox={`0 0 ${size} ${size + 1}`}
      fill="none"
      className={className}
      // Decorative: every caller pairs the dot with a visible text label.
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <rect opacity="0.3" y="0.447754" width={size} height={size} rx={size / 2} fill={color} />
      <rect
        x={size * 0.3}
        y={size * 0.3 + 0.447754}
        width={size * 0.4}
        height={size * 0.4}
        rx={size * 0.2}
        fill={theme.palette.common.white}
        stroke={color}
        strokeWidth="1.5"
      />
    </svg>
  );
};

export default StatusIcon;

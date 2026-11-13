import { Card } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
}

/** The translucent, blurred panel: the theme's `glass` card surface. */
const GlassCard: React.FC<GlassCardProps> = ({ children, className, sx }) => {
  return (
    <Card variant="glass" className={className} sx={sx}>
      {children}
    </Card>
  );
};

export default GlassCard;

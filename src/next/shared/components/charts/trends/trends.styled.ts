import type { TypographyProps } from '@mui/material';
import { Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

import { fillContainerCanvas } from '../../../styles/canvas';

export const ChartContainer = styled('div')(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  borderRadius: (theme.shape.borderRadius as number) * 2,
  height: 170,
  overflow: 'hidden',
  paddingBlock: theme.spacing(1),
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
}));

export const ChartWrapper = styled('div')({
  flex: 1,
  minHeight: 0,
  position: 'relative',
  overflow: 'hidden',
  ...fillContainerCanvas,
});

export const LineIndicatorRow = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  marginTop: theme.spacing(1),
  flexShrink: 0,
  minHeight: 24, // Reserves space for the legend row before data renders; not a design-scale value
  flexWrap: 'wrap',
}));

export const IndicatorItem = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  fontSize: theme.typography.caption.fontSize,
  color: theme.palette.text.subtle,
}));

export const LineContainer = styled('div')({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const LinePreview = styled('div', {
  shouldForwardProp: (prop) => prop !== 'lineColor' && prop !== 'isDashed',
})<{ lineColor: string; isDashed: boolean }>(({ lineColor, isDashed }) => ({
  width: 20,
  height: 0,
  borderRadius: 1, // Softens the ends of the 1px legend line
  borderColor: lineColor,
  borderStyle: isDashed ? 'dashed' : 'solid',
  borderWidth: '1px',
}));

export const LineCircle = styled('div', {
  shouldForwardProp: (prop) => prop !== 'lineColor',
})<{ lineColor: string }>(({ lineColor }) => ({
  position: 'absolute',
  width: 8,
  height: 8,
  borderRadius: '50%', // The legend dot
  border: '1px solid',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  backgroundColor: lineColor, // Solid dot matching the series' own line color
  borderColor: lineColor,
}));

export const LineLabel = styled(Typography)<TypographyProps>(({ theme }) => ({
  fontWeight: theme.typography.fontWeightMedium,
  whiteSpace: 'nowrap',
  textTransform: 'capitalize',
}));

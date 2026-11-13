/*
 * WidgetCard.js: one widget below the map, in grafana-restraurant-custom-widgets' widget card
 * (its AppCard, src/shared/components/app-card): the theme's `widget` card surface, 16px padding,
 * and a header row with the title, a line under it, and anything on the right.
 * AppCard itself is not copied in: it imports its info icon with Vite's `?react`, which this build doesn't set up.
 */
import React from 'react';
import { Card, Typography } from '@mui/material';

export default function WidgetCard({ title, subtitle, actions, className, children }) {
  return (
    <Card variant="widget" className={className} sx={{ p: 2, minWidth: 0, boxSizing: 'border-box' }}>
      {(title || subtitle || actions) && (
        <div className="cc-wc-head">
          <div className="cc-wc-titles">
            {title && <Typography component="h3" sx={(theme) => ({ ...theme.typography.cardTitle, m: 0, fontWeight: theme.typography.fontWeightSemiBold, lineHeight: 1.3, color: theme.palette.common.white })}>{title}</Typography>}
            {subtitle && <Typography component="div" variant="body2" color="text.secondary" className="cc-wc-subtitle">{subtitle}</Typography>}
          </div>
          {actions && <div className="cc-wc-actions">{actions}</div>}
        </div>
      )}
      {children}
    </Card>
  );
}

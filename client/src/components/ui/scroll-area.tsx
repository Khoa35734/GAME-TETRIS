import * as React from 'react';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className = '', style, ...props }, ref) => (
    <div
      ref={ref}
      className={className}
      style={{ overflow: 'auto', ...style }}
      {...props}
    />
  ),
);

ScrollArea.displayName = 'ScrollArea';

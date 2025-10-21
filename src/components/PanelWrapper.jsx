import { forwardRef } from "react";
import "@styles/PanelWrapper.scss";

const PanelWrapper = forwardRef(({ children, onScroll }, ref) => {
  return (
    <div
      ref={ref}
      className="panel-wrapper"
      onScroll={onScroll}
    >
      {children}
    </div>
  );
});

PanelWrapper.displayName = 'PanelWrapper';

export default PanelWrapper;

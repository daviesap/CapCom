import { CapcomIcon } from "../../icons/capcomIcons.jsx";

function ScheduleDockButton({ icon, label }) {
  return (
    <button
      className="schedule-dock-button"
      type="button"
      aria-label={label}
      title={label}
    >
      <CapcomIcon name={icon} size={16} weight="bold" />
      <span className="schedule-dock-label">{label}</span>
    </button>
  );
}

export default function ScheduleControlDock({ children }) {
  return (
    <div className="schedule-control-dock-wrap">
      <div className="schedule-control-dock">
        <div className="schedule-dock-filters">{children}</div>
        <div className="schedule-dock-actions" aria-label="Schedule controls">
          <div className="schedule-dock-inline-actions">
            <ScheduleDockButton icon="caretDoubleDown" label="Expand all" />
            <ScheduleDockButton icon="caretDoubleRight" label="Collapse all" />
          </div>
          <label className="schedule-dock-toggle" title="Allow row sorting">
            <input type="checkbox" />
            <span className="schedule-dock-toggle-track" aria-hidden="true">
              <span className="schedule-dock-toggle-thumb" />
            </span>
            <span className="schedule-dock-toggle-label">Sort rows</span>
          </label>
          <details className="schedule-dock-menu">
            <summary
              className="schedule-dock-button schedule-dock-icon-button"
              aria-label="More schedule controls"
              title="More schedule controls"
            >
              <CapcomIcon name="overflow" size={18} weight="bold" />
            </summary>
            <div className="schedule-dock-menu-panel">
              <ScheduleDockButton icon="caretDoubleDown" label="Expand all" />
              <ScheduleDockButton icon="caretDoubleRight" label="Collapse all" />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

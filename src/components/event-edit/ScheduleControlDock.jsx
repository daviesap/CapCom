import { CapcomIcon } from "../../icons/capcomIcons.jsx";

function ScheduleDockButton({ disabled = false, icon, label, onClick }) {
  return (
    <button
      className="schedule-dock-button"
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <CapcomIcon name={icon} size={16} weight="bold" />
      <span className="schedule-dock-label">{label}</span>
    </button>
  );
}

export default function ScheduleControlDock({
  children,
  dateGroupControlLabel,
  dateGroupControlIcon,
  onToggleDateGroups,
  hasDateGroups,
  sortRowsEnabled,
  onToggleSortRows,
  canSortRows,
  sortRowsDisabledLabel = "Allow row sorting",
  historicalEntriesControlLabel,
  onToggleHistoricalEntries,
  hasHistoricalEntries,
}) {
  return (
    <div className="schedule-control-dock-wrap">
      <div className="schedule-control-dock">
        <div className="schedule-dock-filters">{children}</div>
        <div className="schedule-dock-actions" aria-label="Schedule controls">
          <div className="schedule-dock-inline-actions">
            <ScheduleDockButton
              icon={dateGroupControlIcon}
              label={dateGroupControlLabel}
              onClick={onToggleDateGroups}
              disabled={!hasDateGroups}
            />
          </div>
          <label
            className="schedule-dock-toggle"
            title={canSortRows ? "Allow row sorting" : sortRowsDisabledLabel}
          >
            <input
              type="checkbox"
              checked={sortRowsEnabled}
              disabled={!canSortRows}
              onChange={(event) => onToggleSortRows(event.target.checked)}
            />
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
              <ScheduleDockButton
                icon="bookOpen"
                label={historicalEntriesControlLabel}
                onClick={onToggleHistoricalEntries}
                disabled={!hasHistoricalEntries}
              />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

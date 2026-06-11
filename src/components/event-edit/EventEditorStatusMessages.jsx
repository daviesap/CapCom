export default function EventEditorStatusMessages({
  error,
  warning,
  isOffline,
}) {
  if (!error && !warning && !isOffline) {
    return null;
  }

  return (
    <div className="event-editor-status-messages" aria-live="polite">
      {error ? <p className="message error-message">{error}</p> : null}
      {warning ? <p className="message warning-message">{warning}</p> : null}
      {isOffline ? (
        <p className="message offline-message">Offline mode: event editing is disabled.</p>
      ) : null}
    </div>
  );
}

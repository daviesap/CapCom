import { useRegisterSW } from "virtual:pwa-register/react";

export default function AppUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.warn("App update registration failed.", error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="app-update-prompt" role="status" aria-live="polite">
      <div className="app-update-copy">
        <strong>App update available</strong>
        <span>Reload to use the latest CapCom app version.</span>
      </div>
      <div className="app-update-actions">
        <button
          className="compact-button primary"
          type="button"
          onClick={() => updateServiceWorker(true)}
        >
          Update
        </button>
        <button
          className="compact-button"
          type="button"
          onClick={() => setNeedRefresh(false)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

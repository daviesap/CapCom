function formatArchiveChangeLine(value) {
  return String(value || "").replace(/^-\s*/, "").trim();
}

function parseArchiveChangeText(value) {
  const text = String(value || "").trim();
  if (!text) return [{ heading: "", lines: ["No change text recorded."] }];

  const groups = text
    .split(/\n\s*\n/)
    .map((groupText) => {
      const lines = groupText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) return null;
      if (lines.length === 1) {
        const singleLineMatch = lines[0].match(/^(.+\d{4})\s+-\s+(.+)$/);
        if (singleLineMatch) {
          return {
            heading: singleLineMatch[1].trim(),
            lines: [formatArchiveChangeLine(singleLineMatch[2])],
          };
        }
      }

      return {
        heading: lines.length > 1 ? lines[0] : "",
        lines: (lines.length > 1 ? lines.slice(1) : lines).map(formatArchiveChangeLine),
      };
    })
    .filter(Boolean);

  return groups.length > 0 ? groups : [{ heading: "", lines: [text] }];
}

export default function ArchiveChangeText({ text }) {
  const displayText = String(text || "No change text recorded.").trim();
  const groups = parseArchiveChangeText(displayText);

  return (
    <div
      className="archive-change-preview"
      data-tooltip={displayText}
      tabIndex={0}
    >
      <div className="archive-change-preview-content">
        {groups.map((group, groupIndex) => (
          <div className="archive-change-group" key={`${group.heading}-${groupIndex}`}>
            {group.heading ? <strong>{group.heading}</strong> : null}
            {group.lines.map((line, lineIndex) => (
              <span key={`${line}-${lineIndex}`}>{line}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

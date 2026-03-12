import { createRoot } from "react-dom/client";
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import { StoryPreview } from "./controls";
import componentDef from "./stories/component-entry";
import "./globals.css";

function CompsplorerApp() {
  const { app } = useApp({
    appInfo: { name: "Compsplorer", version: "0.1.0" },
    capabilities: {},
  });

  useHostStyles(app, app?.getHostContext());

  if (!componentDef) {
    return (
      <div style={{ background: "var(--color-background-secondary)" }}>
        <div style={{ maxWidth: 768, margin: "0 auto", padding: "48px 16px", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-secondary, #888)", fontSize: 14 }}>
            No component loaded
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--color-background-secondary)" }}>
      <div style={{ maxWidth: 768, margin: "0 auto" }}>
        <StoryPreview componentDef={componentDef} />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<CompsplorerApp />);

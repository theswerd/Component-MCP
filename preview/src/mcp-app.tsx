import { createRoot } from "react-dom/client";
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import { Button } from "@/stories/Button";
import type { ArgDef, ComponentDef } from "./controls";
import { StoryPreview } from "./controls";
import "./globals.css";

const buttonArgDefs: Record<string, ArgDef> = {
  label: {
    control: { type: "text" },
    description: "Button contents",
  },
  primary: {
    control: { type: "boolean" },
    description: "Is this the principal call to action on the page?",
  },
  size: {
    control: { type: "select", options: ["small", "medium", "large"] },
    description: "How large should the button be?",
  },
  backgroundColor: {
    control: { type: "color" },
    description: "What background color to use",
  },
};

const buttonDef: ComponentDef = {
  component: Button,
  variants: {
    Primary: { primary: true, label: "Button", size: "medium", backgroundColor: "#555ab9" },
    Secondary: { primary: false, label: "Button", size: "medium", backgroundColor: "transparent" },
    Large: { primary: false, label: "Button", size: "large", backgroundColor: "transparent" },
    Small: { primary: false, label: "Button", size: "small", backgroundColor: "transparent" },
  },
  args: buttonArgDefs,
};

function CompsplorerApp() {
  const { app } = useApp({
    appInfo: { name: "Compsplorer", version: "0.1.0" },
    capabilities: {},
  });

  useHostStyles(app, app?.getHostContext());

  return (
    <div style={{ padding: 24, background: "var(--color-background-secondary)" }}>
      <div style={{ maxWidth: 768, margin: "0 auto" }}>
        <StoryPreview componentDef={buttonDef} />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<CompsplorerApp />);

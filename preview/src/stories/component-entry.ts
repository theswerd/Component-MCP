import { Button } from "./component";
import type { ArgDef, ComponentDef } from "../controls";

const componentArgDefs: Record<string, ArgDef> = {
  label: { control: { type: "text" }, description: "Button contents" },
  primary: { control: { type: "boolean" }, description: "Is this the principal call to action on the page?" },
  size: { control: { type: "select", options: ["small", "medium", "large"] }, description: "How large should the button be?" },
  backgroundColor: { control: { type: "color" }, description: "What background color to use" },
};

const componentDef: ComponentDef = {
  component: Button,
  variants: {
    Primary: { label: "Button", primary: true },
    Secondary: { label: "Button", primary: false },
    Large: { label: "Button", size: "large" },
    Small: { label: "Button", size: "small" },
  },
  args: componentArgDefs,
};

export default componentDef;

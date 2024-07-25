import { ExtensionContext } from "@foxglove/extension";
import { initLeggedRobotPanel } from "./LeggedRobot";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({ name: "Legged Robot", initPanel: initLeggedRobotPanel });
}

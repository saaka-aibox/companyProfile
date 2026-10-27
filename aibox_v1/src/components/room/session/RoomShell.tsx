import type { ReactNode } from "react";
import { NativeHeader } from "../../landing/NativeHeader";

/** Focused full-height variant of ProfileShell: site header, no marketing footer. */
export function RoomShell({ children }: { children: ReactNode }) {
  return (
    <div className="native-profile">
      <a className="profile-skip-link" href="#main-content">Skip to content</a>
      <NativeHeader />
      <main id="main-content" tabIndex={-1}>{children}</main>
    </div>
  );
}

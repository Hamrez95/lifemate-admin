import { InstallPwaButton } from "@/src/components/pwa/InstallPwaButton";
import { GlobalCommandPalette } from "@/src/components/shell/GlobalCommandPalette";
import { NotificationCenter } from "@/src/components/shell/NotificationCenter";
import { OperatorMenu } from "@/src/components/shell/OperatorMenu";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { AppearanceControl } from "@/src/components/ui/AppearanceControl";
import { DirectionControl } from "@/src/components/ui/DirectionControl";

type TopbarProps = { title: string; subtitle?: string };

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar__page">
        <div className="topbar__context-line" aria-label="محیط فعال">
          <span className="topbar__context-dot" aria-hidden="true" />
          <span>LifeMate Command Center</span>
          <span className="topbar__context-divider" aria-hidden="true" />
          <span>محیط مدیریتی</span>
        </div>
        <PageHeader title={title} subtitle={subtitle} />
      </div>
      <div className="topbar__actions">
        <DirectionControl />
        <AppearanceControl />
        <InstallPwaButton />
        <GlobalCommandPalette />
        <NotificationCenter />
        <OperatorMenu />
      </div>
    </header>
  );
}

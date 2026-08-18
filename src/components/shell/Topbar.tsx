import { InstallPwaButton } from "@/src/components/pwa/InstallPwaButton";
import { GlobalCommandPalette } from "@/src/components/shell/GlobalCommandPalette";
import { NotificationCenter } from "@/src/components/shell/NotificationCenter";
import { OperatorMenu } from "@/src/components/shell/OperatorMenu";

type TopbarProps = { title: string; subtitle?: string };

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar__title">
        <p className="eyebrow">LifeMate Command Center</p>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="topbar__actions">
        <InstallPwaButton />
        <GlobalCommandPalette />
        <NotificationCenter />
        <OperatorMenu />
      </div>
    </header>
  );
}

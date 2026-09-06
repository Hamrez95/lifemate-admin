import { InstallPwaButton } from "@/src/components/pwa/InstallPwaButton";
import { GlobalCommandPalette } from "@/src/components/shell/GlobalCommandPalette";
import { NotificationCenter } from "@/src/components/shell/NotificationCenter";
import { OperatorMenu } from "@/src/components/shell/OperatorMenu";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { AppearanceControl } from "@/src/components/ui/AppearanceControl";

type TopbarProps = { title: string; subtitle?: string };

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="topbar">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="topbar__actions">
        <AppearanceControl />
        <InstallPwaButton />
        <GlobalCommandPalette />
        <NotificationCenter />
        <OperatorMenu />
      </div>
    </header>
  );
}

import { OperatorMenu } from "@/src/components/shell/OperatorMenu";
import { GlobalCommandPalette } from "@/src/components/shell/GlobalCommandPalette";

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
        <GlobalCommandPalette />
        <button className="icon-button" type="button" disabled aria-label="اعلان‌ها؛ به‌زودی">
          ♧
        </button>
        <OperatorMenu />
      </div>
    </header>
  );
}

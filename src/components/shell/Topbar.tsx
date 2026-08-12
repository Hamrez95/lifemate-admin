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
        <label className="search-control">
          <span className="sr-only">جست‌وجو</span>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="جست‌وجو و فرمان..."
            disabled
            aria-describedby="search-coming-soon"
          />
        </label>
        <span id="search-coming-soon" className="sr-only">
          جست‌وجو پس از اضافه شدن User Search امن فعال می‌شود.
        </span>
        <button className="icon-button" type="button" disabled aria-label="اعلان‌ها؛ به‌زودی">
          ♧
        </button>
        <OperatorMenu />
      </div>
    </header>
  );
}

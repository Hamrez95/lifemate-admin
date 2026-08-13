import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AdminDataTable,
  AdminPageState,
  AdminTableFilterBar,
  type AdminTableColumn,
} from "../src/components/admin-data-table";

type DemoRow = { id: string; label?: string };

const columns: readonly AdminTableColumn<DemoRow>[] = [
  { key: "label", header: "عنوان", render: (row) => row.label },
];

describe("shared table primitives", () => {
  it("renders semantic desktop and mobile representations", () => {
    const html = renderToStaticMarkup(
      <AdminDataTable
        title="نمونه جدول"
        rows={[{ id: "1" }]}
        columns={columns}
        rowKey={(row) => row.id}
        total={1}
      />,
    );

    expect(html).toContain("<table");
    expect(html).toContain("<article");
    expect(html).toContain('aria-label="ناموجود"');
    expect(html).toContain("—");
  });

  it("renders every standardized page state", () => {
    for (const state of ["loading", "empty", "error", "forbidden", "stale", "unavailable"] as const) {
      const html = renderToStaticMarkup(<AdminPageState state={state} />);
      expect(html).toContain(`data-state="${state}"`);
    }
  });

  it("keeps filters server-driven through a GET form", () => {
    const html = renderToStaticMarkup(
      <AdminTableFilterBar action="/example" clearHref="/example">
        <input name="q" aria-label="جست‌وجو" />
      </AdminTableFilterBar>,
    );

    expect(html).toContain('method="get"');
    expect(html).toContain('role="search"');
  });
});

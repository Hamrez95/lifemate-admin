import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FormField, Input, StatusBadge, Tabs } from "../src/components/ui";

describe("canonical UX v2 primitives", () => {
  it("connects a form control to its label and truthful validation copy", () => {
    const html = renderToStaticMarkup(
      <FormField label="نام کانال" hint="برای اعضای تیم قابل مشاهده است." error="نام را وارد کنید.">
        <Input />
      </FormField>,
    );

    expect(html).toMatch(/<label[^>]+for="field-/);
    expect(html).toMatch(/<input[^>]+id="field-/);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
  });

  it("exposes current navigation and status tone semantically", () => {
    const html = renderToStaticMarkup(
      <>
        <Tabs label="بخش‌ها" tabs={[{ label: "همه", href: "/all", current: true, count: 3 }]} />
        <StatusBadge tone="warning">نیازمند بررسی</StatusBadge>
      </>,
    );

    expect(html).toContain('aria-current="page"');
    expect(html).toContain('data-tone="warning"');
  });
});

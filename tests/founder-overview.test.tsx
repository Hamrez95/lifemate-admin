import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FounderOverview } from "../src/components/dashboard/FounderOverview";

describe("FounderOverview", () => {
  it("explicitly prevents placeholder metrics from being presented as production facts", () => {
    const html = renderToStaticMarkup(<FounderOverview />);

    expect(html).toContain("داده واقعی هنوز به این داشبورد متصل نشده است");
    expect(html).toContain("بدون داده ساختگی");
    expect(html).toContain("Read-only");
  });
});

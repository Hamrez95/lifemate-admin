import { createHash } from "node:crypto";

import {
  buildMarketingRenderCanonicalPayload,
  type MarketingRenderRequest,
} from "./marketing-creative-renderer-contract";

export function buildMarketingRenderFingerprint(request: MarketingRenderRequest): string {
  return createHash("sha256")
    .update(buildMarketingRenderCanonicalPayload(request), "utf8")
    .digest("hex");
}

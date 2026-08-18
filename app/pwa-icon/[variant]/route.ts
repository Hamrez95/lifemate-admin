import { PWA_ICON_192_BASE64, PWA_ICON_512_BASE64 } from "@/src/lib/pwa/icons";

type IconRouteContext = {
  params: Promise<{ variant: string }>;
};

const icons: Record<string, { base64: string; size: number }> = {
  "192": { base64: PWA_ICON_192_BASE64, size: 192 },
  "512": { base64: PWA_ICON_512_BASE64, size: 512 },
  "maskable-512": { base64: PWA_ICON_512_BASE64, size: 512 },
};

export async function GET(_request: Request, context: IconRouteContext) {
  const { variant } = await context.params;
  const icon = icons[variant];
  if (!icon) return new Response(null, { status: 404 });

  return new Response(Uint8Array.from(Buffer.from(icon.base64, "base64")), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/png",
      "Content-Length": String(Buffer.byteLength(icon.base64, "base64")),
      "X-Content-Type-Options": "nosniff",
      "X-LifeMate-PWA-Icon-Size": String(icon.size),
    },
  });
}

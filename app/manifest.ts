import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "LifeMate Command Center",
    short_name: "LifeMate Admin",
    description: "Secure internal management command center for the LifeMate ecosystem.",
    lang: "fa",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f8f7f4",
    theme_color: "#12343a",
    categories: ["business", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/pwa-icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon/maskable-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "کاربران",
        short_name: "کاربران",
        description: "دایرکتوری امن کاربران LifeMate",
        url: "/users",
      },
      {
        name: "امنیت",
        short_name: "امنیت",
        description: "ماتریس نقش و مجوز Command Center",
        url: "/security",
      },
      {
        name: "مالی",
        short_name: "مالی",
        description: "فضای کاری مالی LifeMate",
        url: "/finance",
      },
    ],
  };
}

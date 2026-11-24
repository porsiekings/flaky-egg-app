import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flaky Egg Distributor",
    short_name: "Flaky Egg",
    description: "Sales, stock, customers and money",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f3ec",
    theme_color: "#2f9e6e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

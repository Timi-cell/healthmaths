import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HealthMaths",
    short_name: "HealthMaths",
    description: "Clinical formulas by body system, with every step shown.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F7F8",
    theme_color: "#F5F7F8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

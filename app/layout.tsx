import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import RegisterSW from "@/components/RegisterSW";
import WelcomeScreen from "@/components/WelcomeScreen";
import "./globals.css";

const ui = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-ui" });
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: "800",
  variable: "--font-display",
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(
    configuredUrl ?? `${protocol.split(",")[0]}://${host}`,
  );
  const title = "HealthMaths – Clinical formulas, worked step by step.";
  const description =
    "Clinical formulas found under each body system, with every step shown and every unit handled.";
  return {
    metadataBase,
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "HealthMaths",
      title,
      description,
      images: [
        {
          url: "/icon-512.png",
          width: 512,
          height: 512,
          alt: "HealthMaths",
        },
      ],
    },
    twitter: { card: "summary", title, description, images: ["/icon-512.png"] },
  };
}
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F5F7F8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${ui.variable} ${display.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(JSON.parse(localStorage.getItem('healthmaths:v1:theme')||'null')==='dark')document.documentElement.dataset.theme='dark'}catch{}document.documentElement.dataset.showIntro='true';document.documentElement.dataset.introStart=String(Date.now());",
          }}
        />
      </head>
      <body>
        {children}
        <WelcomeScreen />
        <RegisterSW />
        <Analytics />
      </body>
    </html>
  );
}

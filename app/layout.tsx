import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

const ui = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-ui" });
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: "800",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "HealthMaths – Clinical formulas, worked step by step.",
  description:
    "Clinical formulas found under each body system, with every step shown and every unit handled.",
};
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
              "try{if(JSON.parse(localStorage.getItem('healthmaths:v1:theme')||'null')==='dark')document.documentElement.dataset.theme='dark'}catch{}",
          }}
        />
      </head>
      <body>
        {children}
        <RegisterSW /> <Analytics />
      </body>
    </html>
  );
}

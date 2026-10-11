import type { Metadata } from "next";
import App from "@/components/App";
import { F } from "@/lib/formulas";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ f?: string | string[] }>;
}): Promise<Metadata> {
  const { f: id } = await searchParams;
  const formulaId = Array.isArray(id) ? id[0] : id;
  const formula = F.find((item) => item.id === formulaId);
  const title = formula
    ? `${formula.n} | HealthMaths`
    : "HealthMaths – Clinical formulas, worked step by step.";
  const description = formula
    ? `${formula.d} Open the ${formula.n} calculator on HealthMaths.`
    : "Clinical formulas found under each body system, with every step shown and every unit handled.";
  const url = formula ? `/?f=${encodeURIComponent(formula.id)}` : "/";
  const image = {
    url: "/icon-512.png",
    width: 512,
    height: 512,
    alt: "HealthMaths",
  };

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "HealthMaths",
      title,
      description,
      url,
      images: [image],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [image.url],
    },
  };
}

export default function Page() {
  return <App />;
}

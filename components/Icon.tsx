import type { ReactNode } from "react";

export default function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  let shape: ReactNode;
  switch (name) {
    case "all":
    case "formulas":
      shape = (
        <>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </>
      );
      break;
    case "used":
      shape = (
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
      );
      break;
    case "history":
      shape = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </>
      );
      break;
    case "back":
      shape = (
        <>
          <path d="m15 18-6-6 6-6" />
          <path d="M9 12h11" />
        </>
      );
      break;
    case "sun":
      shape = (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
        </>
      );
      break;
    case "moon":
      shape = <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z" />;
      break;
    case "scale":
      shape = (
        <>
          <path d="M12 3v17m-7 1h14M5 7h14" />
          <path d="m5 7-3 6h6L5 7Zm14 0-3 6h6l-3-6Z" />
          <path d="M9 21h6" />
        </>
      );
      break;
    case "heart":
      shape = <path d="M20.8 8.8c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z" />;
      break;
    case "lungs":
      shape = (
        <>
          <path d="M12 4v8m0-3c-2-3-3-4-4-2-1.2 2.4-3.5 5.1-3.5 8.3A3.7 3.7 0 0 0 8.2 19c2 0 3.8-1.2 3.8-4V9Zm0 0c2-3 3-4 4-2 1.2 2.4 3.5 5.1 3.5 8.3A3.7 3.7 0 0 1 15.8 19c-2 0-3.8-1.2-3.8-4" />
        </>
      );
      break;
    case "droplet":
      shape = <path d="M12 3s7 7.2 7 12a7 7 0 0 1-14 0c0-4.8 7-12 7-12Z" />;
      break;
    case "endocrine":
      shape = (
        <>
          <circle cx="12" cy="5" r="2" />
          <circle cx="6" cy="17" r="2" />
          <circle cx="18" cy="17" r="2" />
          <path d="m11 7-4 8m6-8 4 8m-9 2h8" />
        </>
      );
      break;
    case "paediatrics":
      shape = (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 21a7.5 7.5 0 0 1 15 0M7 7a5 5 0 0 1 10 0" />
        </>
      );
      break;
    case "pharmacology":
      shape = (
        <>
          <path d="M8 4h8a4 4 0 0 1 0 8H8a4 4 0 0 1 0-8Zm0 8h8a4 4 0 0 1 0 8H8a4 4 0 0 1 0-8Z" />
          <path d="m9 5 6 6m-6 2 6 6" />
        </>
      );
      break;
    case "echo":
      shape = (
        <>
          <path d="M3 9v6m4-10v14m4-17v20m4-15v10m4-7v4m3-2h1" />
        </>
      );
      break;
    case "ecg":
      shape = <path d="M2 12h4l2-6 4 12 3-8 2 2h5" />;
      break;
    case "target":
      shape = (
        <>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" />
        </>
      );
      break;
    case "lipids":
      shape = (
        <>
          <path d="M12 3s6 6.3 6 10.5a6 6 0 0 1-12 0C6 9.3 12 3 12 3Z" />
          <path d="M9 15a3 3 0 0 0 3 3" />
        </>
      );
      break;
    case "check":
      shape = <path d="m5 12 4 4L19 6" />;
      break;
    default:
      shape = <circle cx="12" cy="12" r="8" />;
  }

  return (
    <svg
      className={["ui-icon", className].filter(Boolean).join(" ")}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...common}
    >
      {shape}
    </svg>
  );
}

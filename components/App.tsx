"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { F, HU, type Formula } from "@/lib/formulas";
import AboutDialog from "./AboutDialog";
import Calculator from "./Calculator";
import FeedbackDialog from "./FeedbackDialog";
import Icon from "./Icon";
import InstallPrompt from "./InstallPrompt";
import ProfileDialog from "./ProfileDialog";
import type { ProfileShareResult } from "./ProfileDialog";
import SystemSheet from "./SystemSheet";
import WhatsNewDialog from "./WhatsNewDialog";
import type { CategoryMode } from "./SystemSheet";
import { WHATS_NEW } from "@/lib/whats-new";
import {
  clearLocalProfile,
  getProfileDataConsent,
  loadLocalProfile,
  setProfileDataConsent,
  saveLocalProfile,
  type LocalProfile,
} from "@/lib/profile";
import { ENDPOINT, flush } from "@/lib/outbox";
import {
  flushAnalytics,
  getAnalyticsConsent,
  initializeAnalyticsConsent,
  isAnalyticsConfigured,
  sendProfileDetailsToPostHog,
  setAnalyticsConsent,
  track,
} from "@/lib/analytics";
import {
  KEYS,
  addEntry,
  ago,
  load,
  save,
  type Entry,
  type Used,
} from "@/lib/store";

const ECG =
  "M0 40H150l10-4 8 4h14l8-8 12 52 12-70 12 26h12l10-6 14 6H420l10-4 8 4h14l8-8 12 52 12-70 12 26h12l10-6 14 6H600";
type Tab = "all" | "used" | "history" | "whatsNew";
type PendingDeletion =
  | { type: "used-item"; id: string }
  | { type: "history-item"; id: string }
  | { type: "clear-used" }
  | { type: "clear-history" };
type WhatsNewState = {
  read: string[];
  dismissed: string[];
  opened: string[];
};
const CATEGORY_MODES: [CategoryMode, string][] = [
  ["systems", "Body systems"],
  ["departments", "Departments"],
];
const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const TABS: [Tab, string, string][] = [
  ["all", "formulas", "Formulas"],
  ["used", "used", "Used"],
  ["history", "history", "History"],
  ["whatsNew", "new", "What's New"],
];

export default function App() {
  const [q, setQ] = useState("");
  const [categoryMode, setCategoryMode] = useState<CategoryMode>("systems");
  const [category, setCategory] = useState("All");
  const [cur, setCur] = useState(F[0]);
  const [open, setOpen] = useState(false); // mobile: calculator full screen
  const [tab, setTab] = useState<Tab>("all");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [formulaOpened, setFormulaOpened] = useState(false);
  const [hist, setHist] = useState<Entry[]>([]);
  const [used, setUsed] = useState<Used>({});
  const [whatsNew, setWhatsNew] = useState<WhatsNewState>({
    read: [],
    dismissed: [],
    opened: [],
  });
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [analyticsConsent, setAnalyticsConsentState] = useState<boolean | null>(
    null,
  );
  const [introComplete, setIntroComplete] = useState(false);
  const [privacyChoicesOpen, setPrivacyChoicesOpen] = useState(false);
  const [seed, setSeed] = useState<{
    key: number;
    vals: Record<string, string>;
    units: Record<string, string>;
  } | null>(null);
  const [fb, setFb] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [shareProfileData, setShareProfileData] = useState(false);
  const [profileStorageError, setProfileStorageError] = useState<string | null>(
    null,
  );
  const [sheet, setSheet] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [animatedTab, setAnimatedTab] = useState<Tab | null>(null);
  const [iconAnimation, setIconAnimation] = useState(0);
  const [pendingDeletion, setPendingDeletion] =
    useState<PendingDeletion | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const calculator = useRef<HTMLDivElement>(null);
  const formulaListScroll = useRef<number | null>(null);
  const restoreFormulaListScroll = useRef<number | null>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const privacyDialog = useRef<HTMLDialogElement>(null);
  const appOpened = useRef(false);
  const previousOnline = useRef<boolean | null>(null);
  const themeTransitionTimer = useRef<number | null>(null);

  const visibleUpdates = WHATS_NEW.filter(
    (item) => !whatsNew.dismissed.includes(item.id),
  );
  const greetingName = profile?.username.trim() ?? "";
  const unreadUpdateIds = visibleUpdates
    .filter((item) => !whatsNew.read.includes(item.id))
    .map((item) => item.id);
  const unreadUpdates = unreadUpdateIds.length;
  const categories = useMemo(() => {
    const labels =
      categoryMode === "systems"
        ? F.flatMap((formula) => formula.systems ?? [formula.s])
        : F.flatMap((formula) => formula.departments ?? []);
    return ["All", ...new Set(labels)];
  }, [categoryMode]);
  const shown = useMemo(() => {
    const terms = normalizeSearch(q).split(/\s+/).filter(Boolean);
    return F.filter(
      (f) =>
        (category === "All" ||
          (categoryMode === "systems"
            ? (f.systems ?? [f.s]).includes(category)
            : (f.departments ?? []).includes(category))) &&
        terms.every((term) =>
          normalizeSearch(
            `${f.n} ${f.al} ${f.s} ${(f.systems ?? []).join(" ")} ${(f.departments ?? []).join(" ")}`,
          ).includes(term),
        ),
    );
  }, [q, category, categoryMode]);
  const usedList = useMemo(
    () =>
      Object.entries(used)
        .flatMap(([id, u]) => {
          const f = F.find((x) => x.id === id);
          return f ? [{ f, ...u }] : [];
        })
        .sort((a, b) => b.last - a.last),
    [used],
  );

  // Saved on this device: load once, then save on every change.
  useEffect(() => {
    setHist(load<Entry[]>(KEYS.history, []));
    setUsed(load<Used>(KEYS.used, {}));
    const savedWhatsNew = load<Partial<WhatsNewState>>(KEYS.whatsNew, {});
    setWhatsNew({
      read: Array.isArray(savedWhatsNew.read)
        ? savedWhatsNew.read.filter((id) => typeof id === "string")
        : [],
      dismissed: Array.isArray(savedWhatsNew.dismissed)
        ? savedWhatsNew.dismissed.filter((id) => typeof id === "string")
        : [],
      opened: Array.isArray(savedWhatsNew.opened)
        ? savedWhatsNew.opened.filter((id) => typeof id === "string")
        : [],
    });
    setFormulaOpened(load<boolean>(KEYS.formulaOpened, false));
    try {
      setProfile(loadLocalProfile());
    } catch {
      setProfileStorageError(
        "Your saved profile could not be read from this browser.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    const finishIntro = () => setIntroComplete(true);
    if (document.documentElement.dataset.showIntro !== "true") {
      finishIntro();
      return;
    }
    window.addEventListener("healthmaths:intro-complete", finishIntro);
    return () =>
      window.removeEventListener("healthmaths:intro-complete", finishIntro);
  }, []);
  useEffect(() => {
    if (!ready || !introComplete) return;
    const savedConsent = getAnalyticsConsent();
    const consent = initializeAnalyticsConsent();
    if (savedConsent === null) setPrivacyChoicesOpen(true);
    setAnalyticsConsentState(consent);
    try {
      const profileSharing = getProfileDataConsent();
      if (consent !== true && profileSharing) {
        setProfileDataConsent(false);
        setShareProfileData(false);
      } else {
        setShareProfileData(profileSharing);
      }
    } catch {
      setShareProfileData(false);
    }
    if (consent === true && !appOpened.current) {
      track("app_opened");
      appOpened.current = true;
    }
  }, [ready, introComplete]);
  useEffect(() => {
    const savedTheme = load<"light" | "dark">(KEYS.theme, "light");
    setTheme(savedTheme === "dark" ? "dark" : "light");
    document.documentElement.dataset.theme =
      savedTheme === "dark" ? "dark" : "light";
  }, []);
  useEffect(() => {
    if (ready) save(KEYS.history, hist);
  }, [hist, ready]);
  useEffect(() => {
    if (ready) save(KEYS.used, used);
  }, [used, ready]);
  useEffect(() => {
    if (ready) save(KEYS.whatsNew, whatsNew);
  }, [whatsNew, ready]);
  useEffect(() => {
    const dialog = deleteDialog.current;
    if (!dialog) return;
    if (pendingDeletion && !dialog.open) dialog.showModal();
    if (!pendingDeletion && dialog.open) dialog.close();
  }, [pendingDeletion]);
  useEffect(() => {
    const dialog = privacyDialog.current;
    if (!dialog) return;
    if (privacyChoicesOpen && !dialog.open) dialog.showModal();
    if (!privacyChoicesOpen && dialog.open) dialog.close();
  }, [privacyChoicesOpen]);

  const confirmDeletion = () => {
    if (!pendingDeletion) return;
    switch (pendingDeletion.type) {
      case "used-item":
        setUsed((items) => {
          const next = { ...items };
          delete next[pendingDeletion.id];
          return next;
        });
        break;
      case "history-item":
        setHist((entries) =>
          entries.filter((entry) => entry.id !== pendingDeletion.id),
        );
        break;
      case "clear-used":
        setUsed({});
        break;
      case "clear-history":
        setHist([]);
        break;
    }
    setPendingDeletion(null);
  };

  useEffect(() => {
    const openFromAddress = () => {
      const id = new URL(window.location.href).searchParams.get("f");
      const formula = F.find((item) => item.id === id);
      if (formula) {
        markFormulaOpened();
        track("formula_viewed", {
          formulaId: formula.id,
          category: formula.systems?.[0] ?? formula.s,
        });
        setCur(formula);
        setSeed(null);
        setTab("all");
        setOpen(true);
      } else {
        restoreFormulaListScroll.current = formulaListScroll.current;
        formulaListScroll.current = null;
        setSeed(null);
        setTab("all");
        setOpen(false);
      }
    };
    openFromAddress();
    window.addEventListener("popstate", openFromAddress);
    return () => window.removeEventListener("popstate", openFromAddress);
  }, []);

  // Send queued feedback when connectivity returns.
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const sync = async () => {
      update();
      if (!navigator.onLine) return;
      void flushAnalytics();
      const feedbackSent = await flush(ENDPOINT);
      if (feedbackSent > 0)
        window.dispatchEvent(
          new CustomEvent("healthmaths:toast", {
            detail: "Your feedback was sent.",
          }),
        );
    };
    sync();
    addEventListener("online", sync);
    addEventListener("offline", update);
    return () => {
      removeEventListener("online", sync);
      removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (!q.trim()) return;
    const timeout = window.setTimeout(() => {
      const metadata = {
        resultCount: shown.length,
        ...(category !== "All" ? { category } : {}),
      };
      track("formula_searched", metadata);
      if (shown.length === 0) track("search_no_results", metadata);
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [q, shown, category]);
  useEffect(() => {
    if (previousOnline.current === false && online)
      track("online_mode_entered");
    if (!online) track("offline_mode_entered");
    previousOnline.current = online;
  }, [online]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? "";
      if (e.key === "/" && tag !== "INPUT" && tag !== "SELECT") {
        e.preventDefault();
        search.current?.focus();
      }
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);

  useEffect(() => {
    const scrollTop = restoreFormulaListScroll.current;
    if (scrollTop === null || open || tab !== "all") return;
    restoreFormulaListScroll.current = null;
    let restoreFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      restoreFrame = window.requestAnimationFrame(() => {
        if (document.scrollingElement) {
          document.scrollingElement.scrollTop = scrollTop;
        } else {
          window.scrollTo(0, scrollTop);
        }
      });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(restoreFrame);
    };
  }, [open, tab]);

  const onResult = useCallback((e: Omit<Entry, "id" | "at">) => {
    const at = Date.now();
    setHist((h) => addEntry(h, { ...e, id: `${at}-${e.fid}`, at }));
    setUsed((u) => ({
      ...u,
      [e.fid]: { count: (u[e.fid]?.count ?? 0) + 1, last: at },
    }));
  }, []);

  const revealCalculator = () => {
    if (window.matchMedia("(min-width: 861px)").matches) {
      requestAnimationFrame(() =>
        calculator.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      );
    }
  };
  const setFormulaAddress = (id?: string, replace = false) => {
    const address = id ? `/?f=${encodeURIComponent(id)}` : "/";
    if (`${window.location.pathname}${window.location.search}` === address)
      return;
    if (replace) window.history.replaceState(window.history.state, "", address);
    else window.history.pushState(window.history.state, "", address);
  };
  const markFormulaOpened = () => {
    setFormulaOpened(true);
    save(KEYS.formulaOpened, true);
  };
  const openFormula = (f: Formula) => {
    formulaListScroll.current =
      document.scrollingElement?.scrollTop ?? window.scrollY;
    markFormulaOpened();
    track("formula_viewed", {
      formulaId: f.id,
      category: f.systems?.[0] ?? f.s,
    });
    setCur(f);
    setSeed(null);
    setOpen(true);
    setFormulaAddress(f.id);
    revealCalculator();
  };
  const openEntry = (e: Entry) => {
    const f = F.find((x) => x.id === e.fid);
    if (!f) return;
    formulaListScroll.current =
      document.scrollingElement?.scrollTop ?? window.scrollY;
    markFormulaOpened();
    track("formula_viewed", {
      formulaId: f.id,
      category: f.systems?.[0] ?? f.s,
    });
    setCur(f);
    setSeed({ key: e.at, vals: e.vals, units: e.units });
    setOpen(true);
    setFormulaAddress(f.id);
    revealCalculator();
  };
  const goTab = (t: Tab) => {
    if (t === "history") track("history_viewed");
    setTab(t);
    setOpen(false);
    setAnimatedTab(t === "whatsNew" ? null : t);
    setIconAnimation((key) => key + 1);
    setFormulaAddress(undefined, true);
    if (t === "whatsNew") {
      setWhatsNewOpen(true);
    } else {
      setWhatsNewOpen(false);
      if (t === "all") window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const backToFormulas = () => {
    restoreFormulaListScroll.current = formulaListScroll.current;
    formulaListScroll.current = null;
    setTab("all");
    setOpen(false);
    setWhatsNewOpen(false);
    setFormulaAddress(undefined, true);
  };
  const closeWhatsNew = () => {
    setWhatsNewOpen(false);
    setTab((current) => (current === "whatsNew" ? "all" : current));
  };
  const readAllUpdates = () => {
    setWhatsNew((current) => ({
      ...current,
      read: [
        ...new Set([
          ...current.read,
          ...WHATS_NEW.filter(
            (item) => !current.dismissed.includes(item.id),
          ).map((item) => item.id),
        ]),
      ],
    }));
  };
  const clearAllUpdates = () => {
    setWhatsNew((current) => ({
      read: current.read,
      opened: current.opened,
      dismissed: [
        ...new Set([
          ...current.dismissed,
          ...WHATS_NEW.filter(
            (item) => !current.dismissed.includes(item.id),
          ).map((item) => item.id),
        ]),
      ],
    }));
  };
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    track("theme_changed", { theme: next });
    const root = document.documentElement;
    const applyTheme = () => {
      setTheme(next);
      root.dataset.theme = next;
      save(KEYS.theme, next);
    };
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (themeTransitionTimer.current !== null) {
      window.clearTimeout(themeTransitionTimer.current);
      themeTransitionTimer.current = null;
    }
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => unknown;
    };
    if (!prefersReducedMotion && transitionDocument.startViewTransition) {
      root.classList.remove("theme-transitioning");
      transitionDocument.startViewTransition(applyTheme);
      return;
    }
    if (!prefersReducedMotion) {
      root.classList.add("theme-transitioning");
      themeTransitionTimer.current = window.setTimeout(() => {
        root.classList.remove("theme-transitioning");
        themeTransitionTimer.current = null;
      }, 350);
    } else {
      root.classList.remove("theme-transitioning");
    }
    applyTheme();
  };
  const chooseAnalytics = (enabled: boolean) => {
    if (enabled && !isAnalyticsConfigured()) return;
    if (!setAnalyticsConsent(enabled)) {
      window.dispatchEvent(
        new CustomEvent("healthmaths:toast", {
          detail: "Your privacy choice could not be saved in this browser.",
        }),
      );
      return;
    }
    setAnalyticsConsentState(enabled);
    if (!enabled) setShareProfileData(false);
    setPrivacyChoicesOpen(false);
    if (enabled && !appOpened.current) {
      track("app_opened");
      appOpened.current = true;
    }
    if (enabled && !online) track("offline_mode_entered");
  };
  const spot = (e: MouseEvent<HTMLButtonElement>) => {
    const c = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - c.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - c.top}px`);
  };
  const hue = (f?: Formula) =>
    ({ "--h": f ? HU[f.systems?.[0] ?? f.s] : 262 }) as CSSProperties;
  const navigationLabel = (key: Tab, label: string) => {
    if (key === "whatsNew")
      return (
        <span className="whats-new-label">
          What&apos;s{" "}
          <span className="new-word">
            New
            {unreadUpdates > 0 && (
              <>
                {/* <i className="update-dot" aria-hidden="true" /> */}
                <span className="update-badge" aria-hidden="true">
                  NEW
                </span>
              </>
            )}
          </span>
          {unreadUpdates > 0 && (
            <span className="visually-hidden">
              , {unreadUpdates} unread update{unreadUpdates === 1 ? "" : "s"}
            </span>
          )}
        </span>
      );
    if (key === "used") return `${label} · ${usedList.length}`;
    if (key === "history") return `${label} · ${hist.length}`;
    return label;
  };
  const deletionCopy = (() => {
    switch (pendingDeletion?.type) {
      case "clear-used":
        return {
          title: "Clear all used formulas?",
          description:
            "This removes every formula from your Used list on this device. This action cannot be undone.",
          action: "Clear Used",
        };
      case "clear-history":
        return {
          title: "Clear all calculation history?",
          description:
            "This permanently removes all saved calculations from this device. This action cannot be undone.",
          action: "Clear history",
        };
      case "used-item":
        return {
          title: "Remove this formula from Used?",
          description: `${F.find((formula) => formula.id === pendingDeletion.id)?.n ?? "This formula"} will be removed from your Used list. Your calculation history will not be affected.`,
          action: "Remove formula",
        };
      case "history-item": {
        const entry = hist.find((item) => item.id === pendingDeletion.id);
        return {
          title: "Delete this calculation?",
          description: entry
            ? `${entry.n} · ${entry.t} will be permanently removed from your history.`
            : "This calculation will be permanently removed from your history.",
          action: "Delete calculation",
        };
      }
      default:
        return {
          title: "",
          description: "",
          action: "Delete",
        };
    }
  })();
  // A plain render function (not a nested component) so buttons keep their state between renders.
  const formulaKey = (f: Formula, sub?: string, compact?: boolean) =>
    `${f.id}:${sub ?? "main"}:${compact ? "compact" : "full"}`;
  const formulaBtn = (f: Formula, sub?: string, compact?: boolean) => (
    <button
      key={formulaKey(f, sub, compact)}
      className={`item${compact ? " rc" : ""}`}
      aria-current={f.id === cur.id}
      style={hue(f)}
      onMouseMove={spot}
      onClick={() => openFormula(f)}
    >
      <div>
        <b>{f.n}</b>
        {!compact && (
          <span>
            {sub ??
              (f.kind === "outcome-measure"
                ? "Outcome measure"
                : (f.systems?.[0] ?? f.s))}
          </span>
        )}
      </div>
    </button>
  );

  return (
    <div className={`shell${open ? " open" : ""}`}>
      <header className={greetingName ? "header-with-greeting" : undefined}>
        <div className="top">
          <div className="logo">
            <img
              className="logo-mark"
              src="/icon-192.png"
              width={36}
              height={36}
              alt=""
            />
            HealthMaths
          </div>
          <div className="topr">
            <span
              className={`connection-status ${online ? "online" : "offline"}`}
              role="status"
              aria-live="polite"
              aria-label={online ? "Online" : "Offline"}
              title={online ? "Online" : "Offline"}
            />
            {/* <span className="pill">v1.0</span> */}
            <div
              className={`profile-anchor${greetingName ? " has-greeting" : ""}`}
            >
              <button
                className="profile-trigger"
                type="button"
                onClick={() => {
                  track("profile_opened");
                  setProfileOpen(true);
                }}
                aria-label={
                  profile?.username
                    ? `Open profile for ${profile.username}`
                    : "Open profile"
                }
                aria-haspopup="dialog"
                title="Profile"
              >
                <Icon name="profile" />
                {!profile?.username && <span>Profile</span>}
              </button>
              {greetingName && (
                <span className="profile-greeting" aria-hidden="true">
                  Hi, {greetingName}
                </span>
              )}
            </div>
            <button
              className="tg"
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              <Icon
                key={theme}
                name={theme === "light" ? "moon" : "sun"}
              />
              {/* <span>Theme</span> */}
            </button>
          </div>
        </div>
        <div className="hero">
          {/* <button
            className="about-trigger"
            onClick={() => setAboutOpen(true)}
            aria-haspopup="dialog"
          >
            Why HealthMaths?
          </button> */}
          <h1>
            Maths in Healthcare,
            <br />
            made easier.
          </h1>
          <svg
            className="ecg"
            viewBox="0 0 600 80"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="g" x1="0" x2="1">
                <stop offset="0" stopColor="var(--brand)" />
                <stop offset=".5" stopColor="var(--action)" />
                <stop offset="1" stopColor="#D5F4E6" />
              </linearGradient>
            </defs>
            <path className="b" pathLength={1000} d={ECG} />
            <path className="p" pathLength={1000} d={ECG} />
          </svg>
          {/* <p className="tag">
            Clinical formulas by body system or department, with clear
            equations, worked steps and unit conversion.
          </p> */}
          {/* <div className="stats">
            <span>
              <b>{F.length}</b> formulas
            </span>
            <span>
              <b>{systems.length - 1}</b> body systems
            </span>
            <span>
              <b>Every</b> step shown
            </span>
          </div> */}
        </div>
      </header>

      <div className="bar">
        <div className="wrap">
          <div className="search">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={search}
              type="text"
              inputMode="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setTab("all");
                setOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape" && q) {
                  setQ("");
                  e.currentTarget.focus();
                }
              }}
              placeholder={
                profile?.username
                  ? `Hi, ${profile.username}. What formula?...`
                  : "Hi, what formula?..."
              }
              aria-label="Search formulas"
              autoComplete="off"
            />
            {q ? (
              <button
                type="button"
                className="search-clear"
                aria-label="Clear search"
                onClick={() => {
                  setQ("");
                  search.current?.focus();
                }}
              >
                Clear
              </button>
            ) : (
              <kbd>/</kbd>
            )}
          </div>
        </div>
      </div>
      <div
        className={`wrap category-toolbar${tab !== "all" ? " category-toolbar-hidden" : ""}`}
        role="group"
        aria-label="Browse by body system or department"
      >
        {CATEGORY_MODES.map(([mode, label]) => (
          <button
            key={mode}
            className={`category-mode${categoryMode === mode && category !== "All" ? " category-selected" : ""}`}
            aria-pressed={categoryMode === mode && category !== "All"}
            aria-label={`${label}${categoryMode === mode && category !== "All" ? `: ${category}` : ""}`}
            onClick={() => {
              if (categoryMode !== mode) setCategory("All");
              setCategoryMode(mode);
              setTab("all");
              setSheet(true);
            }}
          >
            <Icon name={mode === "systems" ? "all" : "scale"} />
            <span className="category-label">{label}</span>
            <span className="category-choice">
              {categoryMode === mode && category !== "All"
                ? category
                : "Choose"}
            </span>
          </button>
        ))}
      </div>
      {/* {category !== "All" && (
        <div className="wrap filter-context" aria-live="polite">
          <span>
            {categoryMode === "systems" ? "Body System" : "Department"}:
          </span>
          <strong>{category}</strong>
        </div>
      )} */}
      <main>
        <div className="left">
          <InstallPrompt show={formulaOpened} />
          <div className="tabs" role="tablist" aria-label="Library">
            {TABS.map(([k, icon, l]) => (
              <button
                key={k}
                role="tab"
                className="tab"
                aria-selected={tab === k}
                onClick={() => goTab(k)}
              >
                <Icon
                  key={`${k}-${animatedTab === k ? iconAnimation : "idle"}`}
                  name={icon}
                  className={
                    animatedTab === k && k !== "whatsNew"
                      ? "nav-icon-animated"
                      : ""
                  }
                />
                {navigationLabel(k, l)}
              </button>
            ))}
          </div>

          <nav className="list" aria-label="Formulas">
            {tab === "all" &&
              (shown.length ? (
                shown.map((f) => formulaBtn(f))
              ) : (
                <div className="empty">
                  Formula not found! <br/> <br /> Try another word or request for the formula by clicking the "Send Feedback" button. We'll add it promptly.
                </div>
              ))}
            {tab === "used" &&
              (usedList.length ? (
                <>
                  <div className="list-tools">
                    <span>Formulas you’ve used</span>
                    <button
                      className="btn danger-outline"
                      aria-label="Clear all used formulas"
                      onClick={() => setPendingDeletion({ type: "clear-used" })}
                    >
                      Clear all
                    </button>
                  </div>
                  {usedList.map(({ f, count, last }) => (
                    <div className="item-row" key={f.id}>
                      {formulaBtn(f, `Used ${count}× · ${ago(last)}`)}
                      <button
                        className="remove-btn"
                        aria-label={`Remove ${f.n} from Used`}
                        title="Remove from Used"
                        onClick={() =>
                          setPendingDeletion({ type: "used-item", id: f.id })
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </>
              ) : (
                <div className="empty">
                  Formulas you use will be kept here, saved on this device.
                </div>
              ))}
            {tab === "history" &&
              (hist.length ? (
                <>
                  <div className="list-tools">
                    <span>Recent calculations</span>
                    <button
                      className="btn danger-outline"
                      aria-label="Clear all history"
                      onClick={() =>
                        setPendingDeletion({ type: "clear-history" })
                      }
                    >
                      Clear all
                    </button>
                  </div>
                  {hist.map((e) => {
                    const f = F.find((x) => x.id === e.fid);
                    return (
                      <div className="item-row" key={e.id}>
                        <button
                          className="item"
                          style={hue(f)}
                          onMouseMove={spot}
                          onClick={() => openEntry(e)}
                        >
                          <div>
                            <b>{e.t}</b>
                            <span>
                              {e.n} · {ago(e.at)}
                            </span>
                          </div>
                        </button>
                        <button
                          className="remove-btn"
                          aria-label={`Delete ${e.t} from history`}
                          title="Delete from History"
                          onClick={() =>
                            setPendingDeletion({
                              type: "history-item",
                              id: e.id,
                            })
                          }
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="empty">
                  Your calculations are saved here automatically, on this device
                  only. No account needed.
                </div>
              ))}
          </nav>
        </div>
        <div className="right" ref={calculator}>
          <Calculator
            key={`${cur.id}:${seed?.key ?? 0}`}
            f={cur}
            theme={theme}
            seed={seed}
            onResult={onResult}
            onBack={backToFormulas}
          />
        </div>
      </main>

      <footer>
        <span>
          For education and decision support only. HealthMaths does not replace
          clinical judgment. Always check results against your local protocol.
        </span>
        <div className="footer-links">
          {process.env.NEXT_PUBLIC_X_URL && (
            <a
              className="x-follow"
              href={process.env.NEXT_PUBLIC_X_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M18.9 1.15h3.68l-8.04 9.2L24 22.85h-7.41l-5.8-7.57-6.64 7.57H.47l8.6-9.83L0 1.15h7.59l5.24 6.93zm-1.29 19.66h2.04L6.49 3.08H4.3z"
                />
              </svg>
              Follow us on X
            </a>
          )}
          <button
            className="linkbtn"
            type="button"
            onClick={() => setPrivacyChoicesOpen(true)}
          >
            Privacy choices
          </button>
        </div>
        {/* <button className="linkbtn" onClick={() => setFb(true)}>
          Request a formula or send feedback
        </button> */}
      </footer>
      <button
        className="btn feedback-fab"
        onClick={() => setFb(true)}
        aria-haspopup="dialog"
        aria-controls="feedback-dialog"
      >
        Send feedback
      </button>
      <FeedbackDialog open={fb} onClose={() => setFb(false)} />
      <ProfileDialog
        open={profileOpen}
        profile={profile}
        storageError={profileStorageError}
        shareProfileData={shareProfileData}
        analyticsEnabled={analyticsConsent === true}
        onClose={() => setProfileOpen(false)}
        onComplete={() => {
          setProfileOpen(false);
          setTab("all");
          setOpen(false);
          setQ("");
        }}
        onSave={async (
          nextProfile,
          shareDetails,
        ): Promise<ProfileShareResult> => {
          saveLocalProfile(nextProfile);
          setProfileDataConsent(shareDetails);
          setProfile(nextProfile);
          setShareProfileData(shareDetails);
          setProfileStorageError(null);
          track("profile_saved");
          return shareDetails
            ? sendProfileDetailsToPostHog(nextProfile)
            : "not-consented";
        }}
        onClear={() => {
          clearLocalProfile();
          setProfile(null);
          setShareProfileData(false);
          setProfileStorageError(null);
        }}
      />
      <dialog
        ref={privacyDialog}
        className="privacy-dialog"
        aria-labelledby="analytics-consent-title"
        aria-describedby="analytics-consent-description"
        onClose={() => setPrivacyChoicesOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget)
            setPrivacyChoicesOpen(false);
        }}
      >
        <div className="privacy-dialog-heading">
       <div className="logo">
            <img
              className="logo-mark"
              src="/icon-192.png"
              width={36}
              height={36}
              alt=""
            />
          </div>
          <button
            className="dialog-close"
            type="button"
            aria-label="Close privacy choices"
            onClick={() => setPrivacyChoicesOpen(false)}
          >
            <Icon name="close" />
          </button>
        </div>
        {/* <span className="eyebrow">Your choice, your control</span> */}
        <h2 id="analytics-consent-title">Analytics are on by default</h2>
        <p id="analytics-consent-description" className="privacy-lead">
          HealthMaths uses limited usage events to understand which formulas
          and features are useful. You can turn analytics off now or any time
          in Privacy choices.
        </p>
        {/* <div className="privacy-choice-card">
          <strong>What is collected</strong>
          <p>
            Event names, formula IDs/categories, search result counts, and
            general device and online/offline status.
          </p>
          <p>
            Profile details are shared only if you separately enable profile
            sharing.
          </p>
        </div>
        <div className="privacy-choice-card privacy-choice-no">
          <strong>Turn analytics off</strong>
          <p>
            This stops future events and clears unsent events on this device.
          </p>
        </div> */}
        {!isAnalyticsConfigured() && (
          <p className="privacy-config-note" role="status">
            Analytics is not connected in this app build yet, so nothing can
            be sent. It will be available soon.
             {/* It will be available after the PostHog project settings
            are configured and the app is redeployed. */}
          </p>
        )}
        {analyticsConsent !== null && (
          <p className="privacy-status" role="status">
            Current choice: {analyticsConsent ? "Analytics On" : "Analytics Off"}.
          </p>
        )}
        <div className="privacy-dialog-actions">
          <button
            className="btn primary"
            type="button"
            disabled={!isAnalyticsConfigured()}
            onClick={() => chooseAnalytics(true)}
          >
            Keep analytics on
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => chooseAnalytics(false)}
          >
            Turn analytics off
          </button>
        </div>
        <p className="privacy-footnote">
          You can change this at any time using Privacy Choices in the footer.
        </p>
      </dialog>
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <WhatsNewDialog
        open={whatsNewOpen}
        onClose={closeWhatsNew}
        entries={visibleUpdates}
        unreadIds={unreadUpdateIds}
        openedIds={whatsNew.opened}
        unreadCount={unreadUpdates}
        onRead={(id) => {
          setWhatsNew((current) => ({
            ...current,
            read: [...new Set([...current.read, id])],
            opened: [...new Set([...current.opened, id])],
          }));
        }}
        onReadAll={readAllUpdates}
        onClearAll={clearAllUpdates}
        onExplore={(formulaId) => {
          const formula = F.find((item) => item.id === formulaId);
          if (formula) {
            closeWhatsNew();
            openFormula(formula);
          }
        }}
      />
      <dialog
        ref={deleteDialog}
        className="delete-dialog"
        aria-labelledby="delete-confirmation-title"
        aria-describedby="delete-confirmation-description"
        onClose={() => setPendingDeletion(null)}
      >
        <div className="delete-dialog-icon" aria-hidden="true">
          !
        </div>
        <h3 id="delete-confirmation-title">{deletionCopy.title}</h3>
        <p id="delete-confirmation-description">{deletionCopy.description}</p>
        <div className="actions">
          <button
            className="btn"
            type="button"
            onClick={() => setPendingDeletion(null)}
            autoFocus
          >
            Cancel
          </button>
          <button
            className="btn danger"
            type="button"
            onClick={confirmDeletion}
          >
            {deletionCopy.action}
          </button>
        </div>
      </dialog>
      <SystemSheet
        open={sheet}
        onClose={() => setSheet(false)}
        mode={categoryMode}
        categories={categories}
        category={category}
        onPickMode={(mode) => {
          if (categoryMode !== mode) setCategory("All");
          setCategoryMode(mode);
          setTab("all");
        }}
        onPickCategory={(item) => {
          if (category !== item) track("category_selected", { category: item });
          setCategory(item);
          setTab("all");
          setSheet(false);
        }}
      />

      {/* Phone navigation, in the thumb zone */}
      <nav className="bnav" aria-label="Main">
        {TABS.map(([k, icon, l]) => (
          <button
            key={k}
            aria-current={tab === k}
            onClick={() => goTab(k)}
          >
            <Icon
              key={`${k}-${animatedTab === k ? iconAnimation : "idle"}`}
              name={icon}
              className={
                animatedTab === k && k !== "whatsNew"
                  ? "nav-icon-animated"
                  : ""
              }
            />
            <span>
              {navigationLabel(k, l)}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}

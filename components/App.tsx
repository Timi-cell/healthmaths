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
import SystemSheet from "./SystemSheet";
import WhatsNewDialog from "./WhatsNewDialog";
import type { CategoryMode } from "./SystemSheet";
import { WHATS_NEW } from "@/lib/whats-new";
import { ENDPOINT, flush } from "@/lib/outbox";
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
type WhatsNewState = { read: string[]; dismissed: string[] };
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
  const [hist, setHist] = useState<Entry[]>([]);
  const [used, setUsed] = useState<Used>({});
  const [whatsNew, setWhatsNew] = useState<WhatsNewState>({
    read: [],
    dismissed: [],
  });
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [seed, setSeed] = useState<{
    key: number;
    vals: Record<string, string>;
    units: Record<string, string>;
  } | null>(null);
  const [fb, setFb] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [animatedTab, setAnimatedTab] = useState<Tab | null>(null);
  const [iconAnimation, setIconAnimation] = useState(0);
  const [pendingDeletion, setPendingDeletion] =
    useState<PendingDeletion | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const calculator = useRef<HTMLDivElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);

  const visibleUpdates = WHATS_NEW.filter(
    (item) => !whatsNew.dismissed.includes(item.id),
  );
  const unreadUpdates = visibleUpdates.filter(
    (item) => !whatsNew.read.includes(item.id),
  ).length;
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
    setWhatsNew(load<WhatsNewState>(KEYS.whatsNew, { read: [], dismissed: [] }));
    setReady(true);
  }, []);
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
        setCur(formula);
        setSeed(null);
        setTab("all");
        setOpen(true);
      } else {
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
  const openFormula = (f: Formula) => {
    setCur(f);
    setSeed(null);
    setOpen(true);
    setFormulaAddress(f.id);
    revealCalculator();
  };
  const openEntry = (e: Entry) => {
    const f = F.find((x) => x.id === e.fid);
    if (!f) return;
    setCur(f);
    setSeed({ key: e.at, vals: e.vals, units: e.units });
    setOpen(true);
    setFormulaAddress(f.id);
    revealCalculator();
  };
  const goTab = (t: Tab) => {
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
    setTheme(next);
    document.documentElement.dataset.theme = next;
    save(KEYS.theme, next);
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
            New{unreadUpdates > 0 && <i className="update-dot" aria-hidden="true" />}
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
      <header>
        <div className="top">
          <div className="logo">
            <span className="mark">+</span>HealthMaths
          </div>
          <div className="topr">
            <span
              className={`pill${online ? " online" : ""}`}
              role="status"
              aria-live="polite"
            >
              {online ? "Online" : "Offline"}
            </span>
            {/* <span className="pill">v1.0</span> */}
            <button
              className="tg"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              <Icon name={theme === "light" ? "moon" : "sun"} />
              {/* <span>Theme</span> */}
            </button>
          </div>
        </div>
        <div className="hero">
          <button
            className="about-trigger"
            onClick={() => setAboutOpen(true)}
            aria-haspopup="dialog"
          >
            About HealthMaths
          </button>
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
              placeholder="Hi, what formula?..."
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
        className="wrap category-toolbar"
        role="group"
        aria-label="Browse by body system or department"
      >
        {CATEGORY_MODES.map(([mode, label]) => (
          <button
            key={mode}
            className={`category-mode${categoryMode === mode && category !== "All" ? " category-selected" : ""}`}
            aria-pressed={categoryMode === mode}
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
          <InstallPrompt show={hist.length > 0} />
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
                  No formula found. Try another word or request for the formula using the "Send Feedback" button.
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
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <WhatsNewDialog
        open={whatsNewOpen}
        onClose={closeWhatsNew}
        entries={visibleUpdates}
        unreadCount={unreadUpdates}
        onReadAll={readAllUpdates}
        onClearAll={clearAllUpdates}
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

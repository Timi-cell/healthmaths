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
import { F, IC, HU, type Formula } from "@/lib/formulas";
import Calculator from "./Calculator";
import FeedbackDialog from "./FeedbackDialog";
import Icon from "./Icon";
import InstallPrompt from "./InstallPrompt";
import SystemSheet from "./SystemSheet";
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
type Tab = "all" | "used" | "history";
const CARDIOVASCULAR_SUBSYSTEMS = [
  "Haemodynamics",
  "Echo",
  "ECG",
  "Risk scores",
  "Lipids",
];
const isCardiovascularSubsystem = (system: string) =>
  CARDIOVASCULAR_SUBSYSTEMS.includes(system);
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
];

export default function App() {
  const [q, setQ] = useState("");
  const [sys, setSys] = useState("All");
  const [subSys, setSubSys] = useState("All");
  const [cur, setCur] = useState(F[0]);
  const [open, setOpen] = useState(false); // mobile: calculator full screen
  const [tab, setTab] = useState<Tab>("all");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hist, setHist] = useState<Entry[]>([]);
  const [used, setUsed] = useState<Used>({});
  const [calculationCount, setCalculationCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [seed, setSeed] = useState<{
    key: number;
    vals: Record<string, string>;
    units: Record<string, string>;
  } | null>(null);
  const [fb, setFb] = useState(false);
  const [sheet, setSheet] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const calculator = useRef<HTMLDivElement>(null);
  const calculationCountRef = useRef(0);

  const systems = useMemo(
    () => [
      "All",
      ...new Set(
        F.map((f) =>
          isCardiovascularSubsystem(f.s) ? "Cardiovascular" : f.s,
        ),
      ),
    ],
    [],
  );
  const shown = useMemo(() => {
    const terms = normalizeSearch(q).split(/\s+/).filter(Boolean);
    return F.filter(
      (f) =>
        (sys === "All" ||
          (sys === "Cardiovascular"
            ? isCardiovascularSubsystem(f.s) &&
              (subSys === "All" || f.s === subSys)
            : f.s === sys)) &&
        terms.every((term) =>
          normalizeSearch(
            `${f.n} ${f.al} ${f.s} ${isCardiovascularSubsystem(f.s) ? "Cardiovascular" : ""}`,
          ).includes(term),
        ),
    );
  }, [q, sys, subSys]);
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
    calculationCountRef.current = load<number>(KEYS.calculations, 0);
    setCalculationCount(calculationCountRef.current);
    setReady(true);
  }, []);
  useEffect(() => {
    const savedTheme = load<"light" | "dark">(KEYS.theme, "light");
    setTheme(savedTheme === "dark" ? "dark" : "light");
    document.documentElement.dataset.theme = savedTheme === "dark" ? "dark" : "light";
  }, []);
  useEffect(() => {
    if (ready) save(KEYS.history, hist);
  }, [hist, ready]);
  useEffect(() => {
    if (ready) save(KEYS.used, used);
  }, [used, ready]);

  // Track connection; when it returns, send any feedback written while offline.
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const sync = async () => {
      update();
      if (!ENDPOINT || !navigator.onLine) return;
      if ((await flush(ENDPOINT)) > 0)
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
    calculationCountRef.current += 1;
    setCalculationCount(calculationCountRef.current);
    save(KEYS.calculations, calculationCountRef.current);
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
  const openFormula = (f: Formula) => {
    setCur(f);
    setSeed(null);
    setOpen(true);
    revealCalculator();
  };
  const openEntry = (e: Entry) => {
    const f = F.find((x) => x.id === e.fid);
    if (!f) return;
    setCur(f);
    setSeed({ key: e.at, vals: e.vals, units: e.units });
    setOpen(true);
    revealCalculator();
  };
  const goTab = (t: Tab) => {
    setTab(t);
    setOpen(false);
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
  const hue = (f?: Formula) => ({ "--h": f ? HU[f.s] : 262 }) as CSSProperties;

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
        {!compact && <span>{sub ?? f.s}</span>}
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
            {!online && <span className="pill">Offline</span>}
            {/* <span className="pill">v1.0</span> */}
            <button
              className="tg"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              <Icon name={theme === "light" ? "moon" : "sun"} />
              <span>Theme</span>
            </button>
          </div>
        </div>
        <div className="hero">
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
          <p className="tag">
            Clinical formulas by body system, with every step shown and every
            unit handled.
          </p>
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
              placeholder="What formula?..."
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
          <button
            className="sysbtn"
            onClick={() => setSheet(true)}
            aria-label="Choose formula category"
          >
            <Icon name={sys === "All" ? "all" : IC[sys]} />
            <span>
              {subSys !== "All"
                ? subSys
                : sys === "All"
                  ? "All systems"
                  : sys}
            </span>
          </button>
        </div>
      </div>
      <div
        className="wrap chips"
        role="group"
        aria-label="Filter by category"
      >
        {systems.map((s) => (
          <button
            key={s}
            className="chip"
            aria-pressed={s === sys}
            onClick={() => {
              setSys(s);
              setSubSys("All");
              setTab("all");
              if (s === "Cardiovascular") setSheet(true);
            }}
          >
            <Icon name={s === "All" ? "all" : IC[s]} />
            {s === "All" ? "All" : s}
          </button>
        ))}
      </div>
      {sys !== "All" && (
        <div className="wrap filter-context" aria-live="polite">
          <span>Selected:</span>
          <strong>
            {sys}
            {sys === "Cardiovascular" && subSys !== "All" ? ` · ${subSys}` : ""}
          </strong>
        </div>
      )}

      <main>
        <div className="left">
          <InstallPrompt
            show={hist.length > 0}
            calculationCount={calculationCount}
          />
          <div className="tabs" role="tablist" aria-label="Library">
            {TABS.map(([k, , l]) => (
              <button
                key={k}
                role="tab"
                className="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
              >
                {k === "used" && usedList.length
                  ? `${l} · ${usedList.length}`
                  : l}
              </button>
            ))}
          </div>

          <nav className="list" aria-label="Formulas">
            {tab === "all" &&
              (shown.length ? (
                shown.map((f) => formulaBtn(f))
              ) : (
                <div className="empty">
                  No formula found. Try another word, or request it with the
                  link below.
                </div>
              ))}
            {tab === "used" &&
              (usedList.length ? (
                <>
                  <div className="list-tools">
                    <span>Formulas you’ve used</span>
                    <button
                      className="btn"
                      aria-label="Clear all used formulas"
                      onClick={() => setUsed({})}
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
                          setUsed((items) => {
                            const next = { ...items };
                            delete next[f.id];
                            return next;
                          })
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
                      className="btn"
                      aria-label="Clear all history"
                      onClick={() => setHist([])}
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
                            setHist((entries) =>
                              entries.filter((entry) => entry.id !== e.id),
                            )
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
            onBack={() => setOpen(false)}
          />
        </div>
      </main>

      <footer>
        <span>
          For education and decision support only. HealthMaths does not replace
          clinical judgment. Always check results against your local protocol.
        </span>
        <button className="linkbtn" onClick={() => setFb(true)}>
          Request a formula or send feedback
        </button>
      </footer>
      <FeedbackDialog open={fb} onClose={() => setFb(false)} />
      <SystemSheet
        open={sheet}
        onClose={() => setSheet(false)}
        systems={systems}
        sys={sys}
        subsystems={CARDIOVASCULAR_SUBSYSTEMS}
        subsystem={subSys}
        onPick={(s) => {
          setSys(s);
          setSubSys("All");
          setTab("all");
          if (s !== "Cardiovascular") setSheet(false);
        }}
        onPickSubsystem={(s) => {
          setSys("Cardiovascular");
          setSubSys(s);
          setTab("all");
          setSheet(false);
        }}
        onBack={() => {
          setSys("All");
          setSubSys("All");
          setTab("all");
        }}
      />

      {/* Phone navigation, in the thumb zone */}
      <nav className="bnav" aria-label="Main">
        {TABS.map(([k, icon, l]) => (
          <button key={k} aria-current={tab === k} onClick={() => goTab(k)}>
            <Icon name={icon} />
            <span>{l}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { motionVariables, useTransition } from "./ui/motion";
import { DetailNavigationContext } from "./ui/detail";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  saveRecord,
  removeRecord,
  recordMovement,
  archiveGoal,
  createHolding,
  savePreferences,
  saveCategoryBudget,
} from "./data/writes";
import { bucketMovement, holdingMovement } from "./lib/money.mjs";
import { db } from "./lib/firebase";
import { NOW_MONTH } from "./lib/format";
import { DEMO } from "./data/demo";
import { useAuth } from "./auth/AuthContext";
import { useKeelaData } from "./data/useKeelaData";
import { ThemeContext, themeFor } from "./lib/theme";
import { TabGlyph } from "./ui/primitives";
import { Lock, Loading } from "./screens/Lock";
import { Home } from "./screens/Home";
import {
  Spending,
  TxSheet,
  BillSheet,
  UpcomingSheet,
  WishlistSheet,
  CategoryBudgetSheet,
} from "./screens/Spending";
import {
  Buckets,
  BucketDetail,
  BucketSheet,
  EditBucketSheet,
} from "./screens/Buckets";
import {
  Assets,
  PortfolioDetail,
  HoldingDetail,
  PortfolioSheet,
  HoldingSheet,
  ActivitySheet,
} from "./screens/Assets";
import { Keela, MeetingDetail } from "./screens/Keela";
import { IncomeSettingsSheet } from "./screens/home-extras";

const TODAY = (() => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();

const TABS = [
  { v: "home", label: "Home", glyph: "home" },
  { v: "spending", label: "Spend", glyph: "spend" },
  { v: "buckets", label: "Buckets", glyph: "buckets" },
  { v: "assets", label: "Assets", glyph: "assets" },
  { v: "keela", label: "Keela", glyph: "keela" },
] as const;

// A floating navigation bar with stable targets and persistent labels.
function TabBar({
  tab,
  onChange,
}: {
  tab: string;
  onChange: (v: string) => void;
}) {
  return (
    <nav className="k-tabbar" aria-label="Main navigation">
      {TABS.map((t) => {
        const on = tab === t.v;
        return <button key={t.v} onClick={() => onChange(t.v)} aria-label={t.label}
          aria-current={on ? "page" : undefined} className={on ? 'is-active' : ''}>
          <TabGlyph name={t.glyph} color="currentColor" />
          <span className="k-tab-label" aria-hidden="true">{t.label}</span>
        </button>;
      })}
    </nav>
  );
}

type DisplayRecord = { id: string; [field: string]: any };
type DetailState = { kind: 'bucket' | 'portfolio' | 'meeting'; id: string }
  | { kind: 'holding'; id: string; portfolioId?: string };
type SheetState = { kind: 'tx'; tx: DisplayRecord | null }
  | { kind: 'bill'; bill: DisplayRecord | null }
  | { kind: 'upcoming' | 'wish'; item: DisplayRecord | null }
  | { kind: 'bucketEdit'; goalId: string | null }
  | { kind: 'bucketMove'; goalId: string; mode: string }
  | { kind: 'catBudget'; cat: string; cap: number }
  | { kind: 'pfEdit'; portfolio: DisplayRecord | null | undefined }
  | { kind: 'holdEdit'; holding: DisplayRecord | null; portfolioId: string | null }
  | { kind: 'holdAct'; holding: DisplayRecord; mode: string }
  | { kind: 'settings' };

export default function App() {
  const { transition: feedbackTransition } = useTransition("fade");
  const { user, loading: authLoading, denied, signIn, signOut } = useAuth();
  const {
    data,
    loading: dataLoading,
    error: dataError,
    offline,
    retry,
  } = useKeelaData(!!user);

  const [theme, setTheme] = useState<string>(
    () => localStorage.getItem("keela.theme") || "light",
  );
  const [tab, setTab] = useState<string>(() =>
    TABS.some((t) => t.v === localStorage.getItem("keela.tab"))
      ? localStorage.getItem("keela.tab")!
      : "home",
  );
  const [spendSub, setSpendSub] = useState("tx");
  const [bucketSub, setBucketSub] = useState("all");
  const [keelaSub, setKeelaSub] = useState("notes");
  const [overlay, setOverlay] = useState<DetailState | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [detailDirection, setDetailDirection] = useState(1);
  const detailPositions = useRef<Record<string, {scroll: number; focus: string | null}>>({});
  const positions = useRef<Record<string, number>>({});
  const [createdGoal, setCreatedGoal] = useState<any>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const saved = () => {
      clearTimeout(timer);
      setSavedNotice(true);
      timer = setTimeout(() => setSavedNotice(false), 2600);
    };
    window.addEventListener("keela:saved", saved);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keela:saved", saved);
    };
  }, []);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("keela.theme", theme);
  }, [theme]);
  // Mirror theme/density onto <html> so the theme variables cascade all the way
  // up to <html>/<body>. Without this the body keeps the light parchment canvas
  // in dark mode and leaks white through the bottom safe-area (the tab-bar gap).
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta)
      meta.setAttribute("content", theme === "dark" ? "#16120F" : "#ECE5D6");
  }, [theme]);
  useEffect(() => {
    localStorage.setItem("keela.tab", tab);
  }, [tab]);
  useLayoutEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = positions.current[tab] || 0;
  }, [tab, dataLoading]);

  // Capture a monthly snapshot once per session so trend charts (net worth,
  // savings rate) have real history. No Cloud Functions — the client upserts
  // snapshots/{YYYY-MM} on open; merge keeps the current month fresh each visit.
  const snappedRef = useRef(false);
  useEffect(() => {
    if (
      DEMO ||
      !user ||
      dataLoading ||
      dataError ||
      offline ||
      snappedRef.current ||
      !data?.profile
    )
      return;
    const cf = data.cashflow;
    if (!data.netWorth && !cf.income) return; // data still streaming in — try next session
    snappedRef.current = true;
    setDoc(
      doc(db, "snapshots", NOW_MONTH),
      {
        monthKey: NOW_MONTH,
        netWorth: data.netWorth,
        savingsBalance: data.goals.reduce(
          (sum: number, g: any) => sum + g.allocated - g.spent,
          0,
        ),
        assetBasis: data.assets.reduce(
          (sum: number, h: any) => sum + h.current,
          0,
        ),
        totalIncome: cf.income,
        totalExpenses: data.thisMonth.spending,
        savingsRate: cf.rate,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    ).catch((e) => console.error("snapshot failed", e));
  }, [user, dataLoading, data, dataError, offline]);

  const navigateDetail = (next: DetailState | null, direction = 1) => {
    const scroller = document.querySelector<HTMLElement>('.c-detail-scroll');
    if (overlay && scroller) {
      const focused = document.activeElement;
      detailPositions.current[`${overlay.kind}:${overlay.id}`] = {
        scroll: scroller.scrollTop,
        focus: focused?.getAttribute('aria-label') || focused?.textContent || null,
      };
    }
    setDetailDirection(direction);
    setOverlay(next);
  };

  const goTab = (v: string) => {
    if (scrollRef.current) positions.current[tab] = scrollRef.current.scrollTop;
    setOverlay(null);
    setTab(v);
  };

  // All interactive writes await confirmation; movement totals and entries commit together.
  const saveTxn = (tx: any, f: any) =>
    saveRecord(
      "transactions",
      tx?.id || f.operationId,
      {
        name: f.name,
        amount: f.amount,
        category: f.cat,
        date: f.date,
        notes: f.note || null,
        ...(!tx ? { icon: null, source: "app" } : {}),
      },
      !tx,
    );
  const deleteTxn = (id: string) => removeRecord("transactions", id);
  const moveBucket = (goalId: string, entry: any) =>
    recordMovement(`goals/${goalId}`, entry.operationId, entry, bucketMovement);
  const editGoal = async (goalId: string | null, f: any) => {
    const id = goalId || f.operationId;
    const fields = {
      name: f.name,
      target: f.target,
      targetDate: f.targetDate,
      status: f.status,
      color: f.color,
      note: f.note || null,
      pinned: f.pinned,
      monthlyPlan: f.monthlyPlan,
    };
    await saveRecord(
      "goals",
      id,
      {
        ...fields,
        ...(!goalId ? { allocated: 0, spent: 0, archived: false } : {}),
      },
      !goalId,
    );
    if (!goalId) {
      setCreatedGoal({
        ...fields,
        id,
        allocated: 0,
        spent: 0,
        entries: [],
        archived: false,
      });
      setBucketSub("all");
      goTab("buckets");
      navigateDetail({ kind: "bucket", id });
    }
  };
  const savePortfolio = (id: string | undefined, f: any) =>
    saveRecord(
      "portfolios",
      id || f.operationId,
      {
        name: f.name,
        target: f.target || 0,
        targetDate: f.targetDate || null,
        color: f.color,
        note: f.note || null,
      },
      !id,
    );
  const deletePortfolio = async (id: string) => {
    await removeRecord("portfolios", id);
    setOverlay(null);
  };
  const saveHolding = async (id: string | undefined, f: any) => {
    const base = {
      name: f.name,
      portfolioId: f.portfolioId || null,
      kind: f.kind,
      category: f.category,
      color: f.color,
      note: f.note || null,
    };
    if (id) {
      await saveRecord("assets", id, base);
      return;
    }
    const o = f.opening || {},
      position = f.kind === "position";
    const initial = {
      ...base,
      units: position ? o.units || 0 : null,
      allocated: o.amount || 0,
    };
    const opening =
      o.amount > 0
        ? {
            type: position ? "buy" : "deposit",
            amount: o.amount,
            units: position ? o.units : null,
            price: position ? o.price : null,
            note: "opening",
            date: TODAY,
          }
        : null;
    await createHolding(f.operationId, initial, opening);
  };
  const deleteHolding = async (id: string) => {
    const h = data.assets.find((x: any) => x.id === id);
    if (h && (h.entries.length || h.current !== 0))
      throw new Error(
        "Holdings with activity are kept to preserve their history.",
      );
    await removeRecord("assets", id);
    setOverlay(null);
  };
  const logActivity = (id: string, entry: any) =>
    recordMovement(`assets/${id}`, entry.operationId, entry, holdingMovement);
  const saveBill = (bill: any, f: any) =>
    saveRecord(
      "bills",
      bill?.id || f.operationId,
      {
        name: f.name,
        amount: f.amount,
        category: f.category,
        type: f.type,
        isSubscription: !!f.sub,
        billingDay: f.billingDay ?? null,
      },
      !bill,
    );
  const deleteBill = (id: string) => removeRecord("bills", id);
  const saveUpcoming = (item: any, f: any) =>
    saveRecord(
      "upcomingExpenses",
      item?.id || f.operationId,
      {
        name: f.name,
        amount: f.amount,
        dueDate: f.dueDate,
        category: f.category || "other",
        ...(!item
          ? { isMandatory: true, isRecurring: false, status: "pending" }
          : {}),
      },
      !item,
    );
  const deleteUpcoming = (id: string) => removeRecord("upcomingExpenses", id);
  const saveWish = (item: any, f: any) =>
    saveRecord(
      "wishlist",
      item?.id || f.operationId,
      { name: f.name, amount: f.amount },
      !item,
    );
  const deleteWish = (id: string) => removeRecord("wishlist", id);
  const saveSettings = (profile: any, income: any[]) =>
    savePreferences(profile, income, data.income);
  const goals =
    createdGoal && !data.goals.some((g: any) => g.id === createdGoal.id)
      ? [...data.goals, createdGoal]
      : data.goals;

  const nav = {
    goTab,
    addTx: () => setSheet({ kind: "tx", tx: null }),
    editTx: (t: any) => setSheet({ kind: "tx", tx: t }),
    addBill: () => setSheet({ kind: "bill", bill: null }),
    editBill: (b: any) => setSheet({ kind: "bill", bill: b }),
    addUpcoming: () => setSheet({ kind: "upcoming", item: null }),
    editUpcoming: (u: any) => setSheet({ kind: "upcoming", item: u }),
    addWishlist: () => setSheet({ kind: "wish", item: null }),
    editWishlist: (w: any) => setSheet({ kind: "wish", item: w }),
    openBucket: (id: string) => navigateDetail({ kind: "bucket", id }),
    openPortfolio: (id: string) => navigateDetail({ kind: "portfolio", id }),
    openHolding: (id: string, portfolioId: string) =>
      navigateDetail({ kind: "holding", id, portfolioId }),
    openMeeting: (id: string) => navigateDetail({ kind: "meeting", id }),
    addBucket: () => setSheet({ kind: "bucketEdit", goalId: null }),
    editBucket: (id: string) => setSheet({ kind: "bucketEdit", goalId: id }),
    restoreBucket: (id: string) => archiveGoal(id, false),
    editCatBudget: (cat: string, cap: number) =>
      setSheet({ kind: "catBudget", cat, cap }),
    addPortfolio: () => setSheet({ kind: "pfEdit", portfolio: null }),
    editPortfolio: (id: string) =>
      setSheet({
        kind: "pfEdit",
        portfolio: data.portfolios.find((p: any) => p.id === id),
      }),
    addHolding: (portfolioId: string | null) =>
      setSheet({ kind: "holdEdit", holding: null, portfolioId }),
    editHolding: (h: any) =>
      setSheet({ kind: "holdEdit", holding: h, portfolioId: h.portfolioId }),
    actHolding: (h: any, mode: string) =>
      setSheet({ kind: "holdAct", holding: h, mode }),
    deletePortfolio,
    deleteHolding,
    moveBucket: (id: string, mode: string) =>
      setSheet({ kind: "bucketMove", goalId: id, mode }),
    // delete handlers for swipe-to-delete on list rows
    deleteTx: deleteTxn,
    deleteBill,
    deleteUpcoming,
    deleteWish,
    openSettings: () => setSheet({ kind: "settings" }),
    signOut,
    theme,
    toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
  };

  const handleSignIn = () => signIn();

  let content: JSX.Element;
  if (authLoading) {
    content = <Loading />;
  } else if (!user) {
    content = <Lock onSignIn={handleSignIn} denied={denied} />;
  } else if (dataError) {
    content = (
      <div className="c-state-page" role="alert">
        <h1>Unable to load your records</h1>
        <p>{dataError}</p>
        <button className="c-button c-primary" onClick={retry}>
          Try again
        </button>
        <button className="c-button" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    );
  } else if (dataLoading) {
    content = <Loading />;
  } else {
    let screen: JSX.Element | null = null;
    if (tab === "home") screen = <Home data={data} nav={nav} />;
    else if (tab === "spending")
      screen = (
        <Spending data={data} nav={nav} sub={spendSub} setSub={setSpendSub} />
      );
    else if (tab === "buckets")
      screen = (
        <Buckets data={data} nav={nav} sub={bucketSub} setSub={setBucketSub} />
      );
    else if (tab === "assets") screen = <Assets data={data} nav={nav} />;
    else if (tab === "keela")
      screen = (
        <Keela data={data} nav={nav} sub={keelaSub} setSub={setKeelaSub} />
      );

    let overlayEl: JSX.Element | null = null;
    if (overlay?.kind === "bucket") {
      const g = goals.find((x: any) => x.id === overlay.id);
      if (g)
        overlayEl = (
          <BucketDetail
            g={g}
            data={{ ...data, goals }}
            onSwitch={(id: string) => navigateDetail({ kind: "bucket", id })}
            onClose={() => navigateDetail(null, -1)}
            onMove={(id: string, mode: string) =>
              setSheet({ kind: "bucketMove", goalId: id, mode })
            }
            onEdit={(id: string) =>
              setSheet({ kind: "bucketEdit", goalId: id })
            }
          />
        );
    } else if (overlay?.kind === "portfolio") {
      const p = data.portfolios.find((x: any) => x.id === overlay.id);
      if (p)
        overlayEl = (
          <PortfolioDetail
            p={p}
            onClose={() => navigateDetail(null, -1)}
            onEdit={(id: string) => nav.editPortfolio(id)}
            onAddHolding={() => nav.addHolding(p.isDefault ? null : p.id)}
            onOpenHolding={(hid: string) => nav.openHolding(hid, p.id)}
          />
        );
    } else if (overlay?.kind === "holding") {
      const h = data.assets.find((x: any) => x.id === overlay.id);
      const p =
        data.portfolios.find((x: any) => x.id === overlay.portfolioId) ||
        data.portfolios.find((pp: any) =>
          pp.holdings.some((hh: any) => hh.id === overlay.id),
        );
      if (h)
        overlayEl = (
          <HoldingDetail
            h={h}
            portfolio={p || { value: h.current, name: "Portfolio" }}
            onClose={() =>
              navigateDetail(p ? { kind: "portfolio", id: p.id } : null, -1)
            }
            onEdit={() => nav.editHolding(h)}
            onAct={(mode: string) => nav.actHolding(h, mode)}
          />
        );
    } else if (overlay?.kind === "meeting") {
      const m = data.meetings.find((x: any) => x.id === overlay.id);
      if (m)
        overlayEl = <MeetingDetail m={m} onClose={() => navigateDetail(null, -1)} />;
    }

    let sheetEl: JSX.Element | null = null;
    const closeSheet = () => setSheet(null);
    if (sheet?.kind === "tx")
      sheetEl = (
        <TxSheet
          tx={sheet.tx}
          txns={data.txns}
          onClose={closeSheet}
          onSave={(f: any) => saveTxn(sheet.tx, f)}
          onDelete={deleteTxn}
        />
      );
    else if (sheet?.kind === "bill")
      sheetEl = (
        <BillSheet
          bill={sheet.bill}
          onClose={closeSheet}
          onSave={(f: any) => saveBill(sheet.bill, f)}
          onDelete={deleteBill}
        />
      );
    else if (sheet?.kind === "upcoming")
      sheetEl = (
        <UpcomingSheet
          item={sheet.item}
          onClose={closeSheet}
          onSave={(f: any) => saveUpcoming(sheet.item, f)}
          onDelete={deleteUpcoming}
        />
      );
    else if (sheet?.kind === "wish")
      sheetEl = (
        <WishlistSheet
          item={sheet.item}
          onClose={closeSheet}
          onSave={(f: any) => saveWish(sheet.item, f)}
          onDelete={deleteWish}
        />
      );
    else if (sheet?.kind === "bucketMove")
      sheetEl = (
        <BucketSheet
          goal={goals.find((g: any) => g.id === sheet.goalId)}
          goals={goals}
          mode={sheet.mode}
          onClose={closeSheet}
          onSave={moveBucket}
        />
      );
    else if (sheet?.kind === "bucketEdit") {
      const blank = {
        id: null,
        name: "",
        target: 0,
        targetDate: null,
        status: "active",
        color: undefined,
        note: "",
      };
      sheetEl = (
        <EditBucketSheet
          goal={
            sheet.goalId ? goals.find((g: any) => g.id === sheet.goalId) : blank
          }
          onClose={closeSheet}
          onSave={editGoal}
          onArchive={archiveGoal}
        />
      );
    } else if (sheet?.kind === "pfEdit")
      sheetEl = (
        <PortfolioSheet
          portfolio={sheet.portfolio}
          onClose={closeSheet}
          onSave={savePortfolio}
          onDelete={deletePortfolio}
        />
      );
    else if (sheet?.kind === "holdEdit")
      sheetEl = (
        <HoldingSheet
          holding={sheet.holding}
          portfolioId={sheet.portfolioId}
          portfolios={data.portfolios}
          onClose={closeSheet}
          onSave={saveHolding}
          onDelete={deleteHolding}
        />
      );
    else if (sheet?.kind === "holdAct")
      sheetEl = (
        <ActivitySheet
          holding={sheet.holding}
          mode={sheet.mode}
          onClose={closeSheet}
          onSave={logActivity}
        />
      );
    else if (sheet?.kind === "settings")
      sheetEl = (
        <IncomeSettingsSheet
          nav={nav}
          profile={data.profile}
          income={data.income}
          onClose={closeSheet}
          onSave={saveSettings}
        />
      );
    else if (sheet?.kind === "catBudget")
      sheetEl = (
        <CategoryBudgetSheet
          cat={sheet.cat}
          cap={sheet.cap}
          onClose={closeSheet}
          onSave={saveCategoryBudget}
        />
      );

    content = (
      <>
        <div className="k-app">
          <motion.div className="k-scroll" ref={scrollRef} layoutScroll>
            {offline && (
              <div className="c-status-banner" role="status">
                Offline · showing saved records. Reconnect to save changes.
              </div>
            )}
            {screen}
          </motion.div>
        </div>
        {overlayEl && overlay && <DetailNavigationContext.Provider key={`${overlay.kind}:${overlay.id}`}
          value={{ id: `${overlay.kind}:${overlay.id}`, direction: detailDirection, positions: detailPositions }}>
          {overlayEl}
        </DetailNavigationContext.Provider>}
        <AnimatePresence>
          {savedNotice && <motion.div className="c-toast" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={feedbackTransition}>
            ✓ Changes saved
          </motion.div>}
        </AnimatePresence>
        <TabBar tab={tab} onChange={goTab} />
        {sheetEl}
      </>
    );
  }

  return (
    <MotionConfig reducedMotion="user"><ThemeContext.Provider value={themeFor(theme)}>
      <div className="k-root" data-theme={theme} style={motionVariables as React.CSSProperties}>
        {content}
        <div id="k-overlays" />
      </div>
    </ThemeContext.Provider></MotionConfig>
  );
}

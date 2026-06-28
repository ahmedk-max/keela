import { useEffect, useRef, useState } from 'react'
import {
  addDoc, collection, deleteDoc, deleteField, doc, increment, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore'
import { db } from './lib/firebase'
import { NOW_MONTH } from './lib/format'
import { DEMO } from './data/demo'
import { useAuth } from './auth/AuthContext'
import { useKeelaData } from './data/useKeelaData'
import { ThemeContext, themeFor, useTheme } from './lib/theme'
import { TabGlyph, Fab } from './ui/primitives'
import { Lock, Loading } from './screens/Lock'
import { Home } from './screens/Home'
import { Spending, TxSheet, BillSheet, UpcomingSheet, WishlistSheet, CategoryBudgetSheet } from './screens/Spending'
import { Buckets, BucketDetail, BucketSheet, EditBucketSheet } from './screens/Buckets'
import { Assets, PortfolioDetail, HoldingDetail, PortfolioSheet, HoldingSheet, ActivitySheet } from './screens/Assets'
import { Keela, MeetingDetail } from './screens/Keela'
import { IncomeSettingsSheet } from './screens/home-extras'

const TODAY = (() => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` })()

const TABS = [
  { v: 'home', label: 'Home', glyph: 'home' },
  { v: 'spending', label: 'Spend', glyph: 'spend' },
  { v: 'buckets', label: 'Buckets', glyph: 'buckets' },
  { v: 'assets', label: 'Assets', glyph: 'assets' },
  { v: 'keela', label: 'Keela', glyph: 'keela' },
] as const

// Floating, blurred pill tab bar. The active tab grows (flex transition) and
// reveals its label beside the glyph — the design's signature bottom nav.
function TabBar({ tab, onChange }: { tab: string; onChange: (v: string) => void }) {
  const th = useTheme()
  return (
    <nav style={{
      position: 'fixed', left: 16, right: 16, zIndex: 75,
      // Float just above the home-indicator zone — don't STACK a gap on top of the
      // safe inset (that left ~48px of dead space on notch/island phones). Sit a
      // touch inside the inset so the pill hugs the bottom; 12px floor for flat-bottom devices.
      bottom: 'max(12px, calc(env(safe-area-inset-bottom) - 8px))',
      display: 'flex', alignItems: 'center', gap: 3,
      background: th.tabbar, border: `1px solid ${th.line}`, borderRadius: 24, padding: 7,
      boxShadow: '0 12px 34px rgba(30,22,12,.16)',
      backdropFilter: 'blur(18px) saturate(1.3)', WebkitBackdropFilter: 'blur(18px) saturate(1.3)',
    }}>
      {TABS.map((t) => {
        const on = tab === t.v
        return (
          <button key={t.v} onClick={() => onChange(t.v)} style={{
            flex: on ? 2.3 : 1, border: 'none', background: on ? th.accent : 'transparent', borderRadius: 999,
            padding: '11px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            cursor: 'pointer', transition: 'flex .28s cubic-bezier(.2,.8,.2,1)',
          }}>
            <TabGlyph name={t.glyph} color={on ? '#fff' : th.ink3} />
            {on && <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{t.label}</span>}
          </button>
        )
      })}
    </nav>
  )
}

export default function App() {
  const { user, loading: authLoading, signIn, signOut } = useAuth()
  const { data, loading: dataLoading } = useKeelaData(!!user)

  const [theme, setTheme] = useState<string>(() => localStorage.getItem('keela.theme') || 'light')
  const [tab, setTab] = useState<string>(() => localStorage.getItem('keela.tab') || 'home')
  const [spendSub, setSpendSub] = useState('tx')
  const [bucketSub, setBucketSub] = useState('saving')
  const [keelaSub, setKeelaSub] = useState('notes')
  const [overlay, setOverlay] = useState<any>(null)
  const [sheet, setSheet] = useState<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { localStorage.setItem('keela.theme', theme) }, [theme])
  // Mirror theme/density onto <html> so the theme variables cascade all the way
  // up to <html>/<body>. Without this the body keeps the light parchment canvas
  // in dark mode and leaks white through the bottom safe-area (the tab-bar gap).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#16120F' : '#ECE5D6')
  }, [theme])
  useEffect(() => { localStorage.setItem('keela.tab', tab) }, [tab])
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0 }, [tab])

  // Capture a monthly snapshot once per session so trend charts (net worth,
  // savings rate) have real history. No Cloud Functions — the client upserts
  // snapshots/{YYYY-MM} on open; merge keeps the current month fresh each visit.
  const snappedRef = useRef(false)
  useEffect(() => {
    if (DEMO || !user || dataLoading || snappedRef.current || !data?.profile) return
    const cf = data.cashflow
    if (!data.netWorth && !cf.income) return // data still streaming in — try next session
    snappedRef.current = true
    setDoc(doc(db, 'snapshots', NOW_MONTH), {
      monthKey: NOW_MONTH,
      netWorth: data.netWorth,
      totalIncome: cf.income,
      totalExpenses: data.thisMonth.spending,
      savingsRate: cf.rate,
      createdAt: serverTimestamp(),
    }, { merge: true }).catch((e) => console.error('snapshot failed', e))
  }, [user, dataLoading, data])

  const goTab = (v: string) => { setOverlay(null); setTab(v) }

  // ----- Firestore write handlers (write-only; sheets animate themselves closed) -----
  const saveTxn = async (tx: any, f: any) => {
    const data = { name: f.name, amount: f.amount, category: f.cat, date: f.date, notes: f.note || null }
    if (tx?.id) await updateDoc(doc(db, 'transactions', String(tx.id)), data)
    else await addDoc(collection(db, 'transactions'), { ...data, icon: null, source: 'app', createdAt: serverTimestamp() })
  }
  const deleteTxn = async (id: string) => { await deleteDoc(doc(db, 'transactions', String(id))) }

  const moveBucket = async (goalId: string, entry: any) => {
    await addDoc(collection(db, `goals/${goalId}/entries`), {
      type: entry.type, amount: entry.amount, note: entry.note || null, date: entry.date,
    })
    const gref = doc(db, 'goals', goalId)
    if (entry.type === 'deposit') await updateDoc(gref, { allocated: increment(entry.amount) })
    else if (entry.type === 'withdrawal') await updateDoc(gref, { allocated: increment(-entry.amount) })
    else if (entry.type === 'spend') await updateDoc(gref, { spent: increment(entry.amount) })
  }
  const editGoal = async (goalId: string | null, fields: any) => {
    if (!goalId) {
      await addDoc(collection(db, 'goals'), {
        name: fields.name, target: fields.target, targetDate: fields.targetDate,
        status: fields.status, color: fields.color, note: fields.note || null,
        allocated: 0, spent: 0, createdAt: serverTimestamp(),
      })
      return
    }
    await updateDoc(doc(db, 'goals', goalId), {
      name: fields.name, target: fields.target, targetDate: fields.targetDate,
      status: fields.status, color: fields.color, note: fields.note || null,
    })
  }
  const deleteBucket = async (id: string) => { setOverlay(null); await deleteDoc(doc(db, 'goals', id)) }

  // ----- Portfolios & holdings (cost-basis model; see DATA_MODEL.md) -----
  const savePortfolio = async (id: string | undefined, f: any) => {
    const payload = { name: f.name, target: f.target || 0, targetDate: f.targetDate || null, color: f.color, note: f.note || null }
    if (id) await updateDoc(doc(db, 'portfolios', String(id)), payload)
    else await addDoc(collection(db, 'portfolios'), { ...payload, icon: null, createdAt: serverTimestamp() })
  }
  const deletePortfolio = async (id: string) => { setOverlay(null); await deleteDoc(doc(db, 'portfolios', String(id))) }

  const saveHolding = async (id: string | undefined, f: any) => {
    const base = { name: f.name, portfolioId: f.portfolioId || null, kind: f.kind, category: f.category, color: f.color, note: f.note || null }
    if (id) { await updateDoc(doc(db, 'assets', String(id)), base); return }
    const o = f.opening || {}
    const units = f.kind === 'position' ? (o.units || 0) : null
    const allocated = o.amount || 0
    const ref = await addDoc(collection(db, 'assets'), { ...base, units, allocated, icon: null, createdAt: serverTimestamp() })
    if (allocated > 0) {
      const entry = f.kind === 'position'
        ? { type: 'buy', units: o.units || 0, price: o.price || 0, amount: allocated, note: 'opening', date: TODAY }
        : { type: 'deposit', amount: allocated, note: 'opening', date: TODAY }
      await addDoc(collection(db, `assets/${ref.id}/entries`), entry)
    }
  }
  const deleteHolding = async (id: string) => { setOverlay(null); await deleteDoc(doc(db, 'assets', String(id))) }

  // Activity drives the holding's cost basis. Buy/deposit raise it; withdraw lowers
  // it; sell removes cost at the running average (so avg cost is unchanged by sells).
  const logActivity = async (holdingId: string, entry: any) => {
    const h = data.assets.find((x: any) => x.id === holdingId)
    const ref = doc(db, 'assets', String(holdingId))
    let costRemoved = null
    if (entry.type === 'sell') {
      const avg = h && h.units > 0 ? h.costBasis / h.units : 0
      costRemoved = Math.round(avg * (entry.units || 0))
    }
    await addDoc(collection(db, `assets/${holdingId}/entries`), {
      type: entry.type, units: entry.units ?? null, price: entry.price ?? null,
      amount: entry.amount || 0, costRemoved, note: entry.note || null, date: entry.date,
    })
    if (entry.type === 'buy') await updateDoc(ref, { allocated: increment(entry.amount), units: increment(entry.units || 0) })
    else if (entry.type === 'deposit') await updateDoc(ref, { allocated: increment(entry.amount) })
    else if (entry.type === 'withdraw') await updateDoc(ref, { allocated: increment(-entry.amount) })
    else if (entry.type === 'sell') await updateDoc(ref, { allocated: increment(-(costRemoved || 0)), units: increment(-(entry.units || 0)) })
  }

  const saveBill = async (bill: any, f: any) => {
    const data = { name: f.name, amount: f.amount, category: f.category, type: f.type, isSubscription: !!f.sub, billingDay: f.billingDay ?? null }
    if (bill?.id) await updateDoc(doc(db, 'bills', String(bill.id)), data)
    else await addDoc(collection(db, 'bills'), { ...data, icon: null, notes: null, createdAt: serverTimestamp() })
  }
  const deleteBill = async (id: string) => { await deleteDoc(doc(db, 'bills', String(id))) }

  const saveUpcoming = async (item: any, f: any) => {
    const data = { name: f.name, amount: f.amount, dueDate: f.dueDate, category: f.category || 'other' }
    if (item?.id) await updateDoc(doc(db, 'upcomingExpenses', String(item.id)), data)
    else await addDoc(collection(db, 'upcomingExpenses'), { ...data, isMandatory: true, isRecurring: false, status: 'pending' })
  }
  const deleteUpcoming = async (id: string) => { await deleteDoc(doc(db, 'upcomingExpenses', String(id))) }

  const saveWish = async (item: any, f: any) => {
    const data = { name: f.name, amount: f.amount }
    if (item?.id) await updateDoc(doc(db, 'wishlist', String(item.id)), data)
    else await addDoc(collection(db, 'wishlist'), { ...data, createdAt: serverTimestamp() })
  }
  const deleteWish = async (id: string) => { await deleteDoc(doc(db, 'wishlist', String(id))) }

  // Per-category variable budgets live as a map on the profile doc. amount 0 clears.
  const saveCatBudget = async (cat: string, amount: number) => {
    await updateDoc(doc(db, 'profile', 'main'), {
      [`categoryBudgets.${cat}`]: amount > 0 ? amount : deleteField(),
    })
  }

  const saveSettings = async (profile: any, income: any[]) => {
    const salary = income.find((s) => s.id === 'salary')
    await updateDoc(doc(db, 'profile', 'main'), {
      salary: salary ? salary.amount : profile.salary,
      payday: profile.payday, split: profile.split, updatedAt: serverTimestamp(),
    })
    for (const s of income) {
      if (s.id === 'salary') continue
      await setDoc(doc(db, 'income', String(s.id)), { name: s.name, amount: s.amount, icon: null, isRecurring: s.recurring }, { merge: true })
    }
  }

  const nav = {
    goTab,
    addTx: () => setSheet({ kind: 'tx', tx: null }),
    editTx: (t: any) => setSheet({ kind: 'tx', tx: t }),
    addBill: () => setSheet({ kind: 'bill', bill: null }),
    editBill: (b: any) => setSheet({ kind: 'bill', bill: b }),
    addUpcoming: () => setSheet({ kind: 'upcoming', item: null }),
    editUpcoming: (u: any) => setSheet({ kind: 'upcoming', item: u }),
    addWishlist: () => setSheet({ kind: 'wish', item: null }),
    editWishlist: (w: any) => setSheet({ kind: 'wish', item: w }),
    openBucket: (id: string) => setOverlay({ kind: 'bucket', id }),
    openPortfolio: (id: string) => setOverlay({ kind: 'portfolio', id }),
    openHolding: (id: string, portfolioId: string) => setOverlay({ kind: 'holding', id, portfolioId }),
    openMeeting: (id: string) => setOverlay({ kind: 'meeting', id }),
    addBucket: () => setSheet({ kind: 'bucketEdit', goalId: null }),
    editBucket: (id: string) => setSheet({ kind: 'bucketEdit', goalId: id }),
    editCatBudget: (cat: string, cap: number) => setSheet({ kind: 'catBudget', cat, cap }),
    addPortfolio: () => setSheet({ kind: 'pfEdit', portfolio: null }),
    editPortfolio: (id: string) => setSheet({ kind: 'pfEdit', portfolio: data.portfolios.find((p: any) => p.id === id) }),
    addHolding: (portfolioId: string | null) => setSheet({ kind: 'holdEdit', holding: null, portfolioId }),
    editHolding: (h: any) => setSheet({ kind: 'holdEdit', holding: h, portfolioId: h.portfolioId }),
    actHolding: (h: any, mode: string) => setSheet({ kind: 'holdAct', holding: h, mode }),
    deletePortfolio,
    deleteHolding,
    deleteBucket,
    // delete handlers for swipe-to-delete on list rows
    deleteTx: deleteTxn,
    deleteBill,
    deleteUpcoming,
    deleteWish,
    openSettings: () => setSheet({ kind: 'settings' }),
    signOut,
    theme,
    toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
  }

  const handleSignIn = () => { signIn().catch((e) => console.error('sign-in failed', e)) }

  let content: JSX.Element
  if (authLoading) {
    content = <Loading />
  } else if (!user) {
    content = <Lock onSignIn={handleSignIn} />
  } else if (dataLoading) {
    content = <Loading />
  } else {
    let screen: JSX.Element | null = null
    if (tab === 'home') screen = <Home data={data} nav={nav} />
    else if (tab === 'spending') screen = <Spending data={data} nav={nav} sub={spendSub} setSub={setSpendSub} />
    else if (tab === 'buckets') screen = <Buckets data={data} nav={nav} sub={bucketSub} setSub={setBucketSub} />
    else if (tab === 'assets') screen = <Assets data={data} nav={nav} />
    else if (tab === 'keela') screen = <Keela data={data} nav={nav} sub={keelaSub} setSub={setKeelaSub} />

    let overlayEl: JSX.Element | null = null
    if (overlay?.kind === 'bucket') {
      const g = data.goals.find((x: any) => x.id === overlay.id)
      if (g) overlayEl = <BucketDetail g={g} onClose={() => setOverlay(null)} onMove={(id: string, mode: string) => setSheet({ kind: 'bucketMove', goalId: id, mode })} onEdit={(id: string) => setSheet({ kind: 'bucketEdit', goalId: id })} />
    } else if (overlay?.kind === 'portfolio') {
      const p = data.portfolios.find((x: any) => x.id === overlay.id)
      if (p) overlayEl = (
        <PortfolioDetail p={p} onClose={() => setOverlay(null)}
          onEdit={(id: string) => nav.editPortfolio(id)}
          onAddHolding={() => nav.addHolding(p.isDefault ? null : p.id)}
          onOpenHolding={(hid: string) => nav.openHolding(hid, p.id)}
          onEditHolding={(h: any) => nav.editHolding(h)}
          onDeleteHolding={deleteHolding} />
      )
    } else if (overlay?.kind === 'holding') {
      const h = data.assets.find((x: any) => x.id === overlay.id)
      const p = data.portfolios.find((x: any) => x.id === overlay.portfolioId)
        || data.portfolios.find((pp: any) => pp.holdings.some((hh: any) => hh.id === overlay.id))
      if (h) overlayEl = (
        <HoldingDetail h={h} portfolio={p || { value: h.current, name: 'Portfolio' }}
          onClose={() => setOverlay(p ? { kind: 'portfolio', id: p.id } : null)}
          onEdit={() => nav.editHolding(h)}
          onAct={(mode: string) => nav.actHolding(h, mode)} />
      )
    } else if (overlay?.kind === 'meeting') {
      const m = data.meetings.find((x: any) => x.id === overlay.id)
      if (m) overlayEl = <MeetingDetail m={m} onClose={() => setOverlay(null)} />
    }

    let sheetEl: JSX.Element | null = null
    const closeSheet = () => setSheet(null)
    if (sheet?.kind === 'tx') sheetEl = <TxSheet tx={sheet.tx} onClose={closeSheet} onSave={(f: any) => saveTxn(sheet.tx, f)} onDelete={deleteTxn} />
    else if (sheet?.kind === 'bill') sheetEl = <BillSheet bill={sheet.bill} onClose={closeSheet} onSave={(f: any) => saveBill(sheet.bill, f)} onDelete={deleteBill} />
    else if (sheet?.kind === 'upcoming') sheetEl = <UpcomingSheet item={sheet.item} onClose={closeSheet} onSave={(f: any) => saveUpcoming(sheet.item, f)} onDelete={deleteUpcoming} />
    else if (sheet?.kind === 'wish') sheetEl = <WishlistSheet item={sheet.item} onClose={closeSheet} onSave={(f: any) => saveWish(sheet.item, f)} onDelete={deleteWish} />
    else if (sheet?.kind === 'bucketMove') sheetEl = <BucketSheet goal={data.goals.find((g: any) => g.id === sheet.goalId)} mode={sheet.mode} onClose={closeSheet} onSave={moveBucket} />
    else if (sheet?.kind === 'bucketEdit') {
      const blank = { id: null, name: '', target: 0, targetDate: NOW_MONTH, status: 'active', color: undefined, note: '' }
      sheetEl = <EditBucketSheet goal={sheet.goalId ? data.goals.find((g: any) => g.id === sheet.goalId) : blank} onClose={closeSheet} onSave={editGoal} onDelete={deleteBucket} />
    }
    else if (sheet?.kind === 'pfEdit') sheetEl = <PortfolioSheet portfolio={sheet.portfolio} onClose={closeSheet} onSave={savePortfolio} onDelete={deletePortfolio} />
    else if (sheet?.kind === 'holdEdit') sheetEl = <HoldingSheet holding={sheet.holding} portfolioId={sheet.portfolioId} portfolios={data.portfolios} onClose={closeSheet} onSave={saveHolding} onDelete={deleteHolding} />
    else if (sheet?.kind === 'holdAct') sheetEl = <ActivitySheet holding={sheet.holding} mode={sheet.mode} onClose={closeSheet} onSave={logActivity} />
    else if (sheet?.kind === 'settings') sheetEl = <IncomeSettingsSheet profile={data.profile} income={data.income} onClose={closeSheet} onSave={saveSettings} />
    else if (sheet?.kind === 'catBudget') sheetEl = <CategoryBudgetSheet cat={sheet.cat} cap={sheet.cap} onClose={closeSheet} onSave={saveCatBudget} />

    content = (
      <>
        <div className="k-app">
          <div className="k-scroll" ref={scrollRef}><div key={tab} className="fade-in">{screen}</div></div>
        </div>
        {overlayEl}
        {/* Floating quick-add — adds a transaction, so it only rides the two tabs where
            that's the primary action (Home, Spend). Buckets/Assets have their own inline
            create buttons; Keela is read-only. Hidden while an overlay/sheet is open. */}
        {!overlay && !sheet && (tab === 'home' || tab === 'spending') && <Fab onClick={() => nav.addTx()} />}
        <TabBar tab={tab} onChange={goTab} />
        {sheetEl}
      </>
    )
  }

  return (
    <ThemeContext.Provider value={themeFor(theme)}>
      <div className="k-root" data-theme={theme}>
        {content}
      </div>
    </ThemeContext.Provider>
  )
}

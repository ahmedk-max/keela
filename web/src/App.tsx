import { useEffect, useRef, useState } from 'react'
import {
  addDoc, collection, deleteDoc, deleteField, doc, increment, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore'
import { db } from './lib/firebase'
import { NOW_MONTH } from './lib/format'
import { DEMO } from './data/demo'
import { useAuth } from './auth/AuthContext'
import { useKeelaData } from './data/useKeelaData'
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

function TabBar({ tab, onChange }: { tab: string; onChange: (v: string) => void }) {
  return (
    <nav className="k-tabbar">
      {TABS.map((t) => (
        <button key={t.v} className={'k-tab' + (tab === t.v ? ' on' : '')} onClick={() => onChange(t.v)}>
          {(TabGlyph as Record<string, JSX.Element>)[t.glyph]}
          <span className="k-tab-lbl">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}

export default function App() {
  const { user, loading: authLoading, signIn, signOut } = useAuth()
  const { data, loading: dataLoading } = useKeelaData(!!user)

  const [theme, setTheme] = useState<string>(() => localStorage.getItem('keela.theme') || 'light')
  const [density] = useState<string>(() => localStorage.getItem('keela.density') || 'compact')
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
    document.documentElement.setAttribute('data-density', density)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#1B1510' : '#FAF9F5')
  }, [theme, density])
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
  const editGoal = async (goalId: string, fields: any) => {
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
    else if (sheet?.kind === 'bucketEdit') sheetEl = <EditBucketSheet goal={data.goals.find((g: any) => g.id === sheet.goalId)} onClose={closeSheet} onSave={editGoal} onDelete={deleteBucket} />
    else if (sheet?.kind === 'pfEdit') sheetEl = <PortfolioSheet portfolio={sheet.portfolio} onClose={closeSheet} onSave={savePortfolio} onDelete={deletePortfolio} />
    else if (sheet?.kind === 'holdEdit') sheetEl = <HoldingSheet holding={sheet.holding} portfolioId={sheet.portfolioId} portfolios={data.portfolios} onClose={closeSheet} onSave={saveHolding} onDelete={deleteHolding} />
    else if (sheet?.kind === 'holdAct') sheetEl = <ActivitySheet holding={sheet.holding} mode={sheet.mode} onClose={closeSheet} onSave={logActivity} />
    else if (sheet?.kind === 'settings') sheetEl = <IncomeSettingsSheet profile={data.profile} income={data.income} onClose={closeSheet} onSave={saveSettings} />
    else if (sheet?.kind === 'catBudget') sheetEl = <CategoryBudgetSheet cat={sheet.cat} cap={sheet.cap} onClose={closeSheet} onSave={saveCatBudget} />

    content = (
      <>
        <div className="k-app">
          <div className="k-safetop" />
          <div className="k-scroll" ref={scrollRef}><div key={tab} className="fade-in">{screen}</div></div>
        </div>
        {overlayEl}
        {/* Floating quick-add — the daily action, one thumb-tap from any tab.
            Hidden while a detail overlay or sheet is open so it never overlaps. */}
        {!overlay && !sheet && tab !== 'keela' && <Fab onClick={() => nav.addTx()} />}
        <TabBar tab={tab} onChange={goTab} />
        {sheetEl}
      </>
    )
  }

  return (
    <div className="k-root" data-theme={theme} data-density={density}>
      {content}
    </div>
  )
}

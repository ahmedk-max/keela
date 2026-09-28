// Development-only catalogue of the real components. Never imported by the app.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { DEMO, demoRaw } from '../src/data/demo';
import { buildData } from '../src/data/useKeelaData';
import { ThemeContext, themeFor } from '../src/lib/theme';
import { motionVariables } from '../src/ui/motion';
import { Home } from '../src/screens/Home';
import { Spending } from '../src/screens/Spending';
import { Buckets, BucketDetail, BucketSheet, EditBucketSheet, ContributionPlan } from '../src/screens/Buckets';
import { Assets, PortfolioDetail, HoldingDetail, PortfolioSheet, HoldingSheet, ActivitySheet } from '../src/screens/Assets';
import { Keela, MeetingDetail } from '../src/screens/Keela';
import { IncomeSettingsSheet } from '../src/screens/home-extras';
import { TxSheet, BillSheet, UpcomingSheet, WishlistSheet, CategoryBudgetSheet } from '../src/screens/spending-extras';
import { Loading, Lock } from '../src/screens/Lock';
import '../src/index.css';
if (!import.meta.env.DEV || !DEMO) throw new Error('This catalogue requires local development and ?demo.');
const params = new URLSearchParams(location.search);
const scenes = ['home','spending','recurring','upcoming','wishlist','buckets','assets','keela','memory','bucket-detail','portfolio-detail','holding-detail','meeting-detail','expense','edit-expense','bill','edit-bill','upcoming-form','wish-form','budget','bucket-form','bucket-options','deposit','withdraw','spend','portfolio-form','edit-portfolio','holding-form','edit-holding','buy','sell','cash-deposit','cash-withdraw','settings','contribution','loading','lock','error'];
const selected = params.get('scene');
if (!selected) {
  createRoot(document.getElementById('root')).render(<main style={{padding:24,overflow:'auto',height:'100%'}}><h1>Keela interface verification</h1>
    <p>Real components with synthetic records. This catalogue is excluded from production.</p>
    {scenes.map((scene) => <p key={scene}><a href={`?demo&scene=${scene}`}>{scene}</a></p>)}
    <p>Each scene accepts theme=light|dark, expanded, empty, stress, largeText, offline, and reduced query flags.</p>
  </main>);
} else {
  if (params.has('offline')) Object.defineProperty(navigator, 'onLine', {configurable:true,value:false});
  if (params.has('reduced')) {
    const native = window.matchMedia.bind(window);
    window.matchMedia = (query) => query.includes('prefers-reduced-motion') ? { media:query,matches:true,onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;} } : native(query);
  }
  const raw = { ...demoRaw };
  if (params.has('empty')) for (const key of ['transactions','goals','assets','portfolios','bills','wishlist','upcoming','meetings','memory','entries','snapshots']) raw[key] = [];
  if (params.has('stress')) raw.goals = demoRaw.goals.map((g) => ({...g,name:'A very long bucket name for the next important chapter of our life', allocated:1234567.89,target:2345678.90}));
  const data = buildData(raw), standard = buildData(demoRaw);
  const goal = data.goals[0] || standard.goals[0], portfolio = standard.portfolios.find((p) => p.holdings.length), holding = portfolio.holdings.find((h) => h.kind === 'position') || standard.assets.find((h) => h.kind === 'position');
  const cash = standard.assets.find((h) => h.kind === 'cash');
  function Gallery() {
    const [theme,setTheme] = React.useState(params.get('theme') || 'light'), [open,setOpen] = React.useState(true);
    const nav = new Proxy({theme,toggleTheme:()=>setTheme(theme === 'light' ? 'dark' : 'light')}, {get:(target,key)=>target[key] || (()=>{})});
    const props = {onClose:()=>setOpen(false),onSave:async()=>{},onDelete:async()=>{},onArchive:async()=>{}};
    React.useLayoutEffect(() => { document.documentElement.dataset.theme=theme; },[theme]);
    React.useEffect(() => {
      if (params.has('expanded')) document.querySelectorAll('details').forEach((el) => {el.open=true;});
      if (params.has('largeText')) {
        const style=document.createElement('style'); style.textContent='html { font-size:32px; }'; document.head.append(style);return ()=>style.remove();
      }
    },[]);
    const views = {
      home:<Home data={data} nav={nav}/>,spending:<Spending data={data} nav={nav} sub="tx" setSub={()=>{}}/>,recurring:<Spending data={data} nav={nav} sub="recurring" setSub={()=>{}}/>,upcoming:<Spending data={data} nav={nav} sub="upcoming" setSub={()=>{}}/>,wishlist:<Spending data={data} nav={nav} sub="upcoming" setSub={()=>{}}/>,
      buckets:<Buckets data={data} nav={nav} sub="all" setSub={()=>{}}/>,assets:<Assets data={data} nav={nav}/>,keela:<Keela data={data} nav={nav} sub="notes" setSub={()=>{}}/>,memory:<Keela data={data} nav={nav} sub="memory" setSub={()=>{}}/>,
      'bucket-detail':<BucketDetail g={goal} data={data} {...props} onSwitch={()=>{}} onMove={()=>{}} onEdit={()=>{}}/>,
      'portfolio-detail':<PortfolioDetail p={portfolio} {...props} onEdit={()=>{}} onAddHolding={()=>{}} onOpenHolding={()=>{}}/>,
      'holding-detail':<HoldingDetail h={holding} portfolio={portfolio} {...props} onEdit={()=>{}} onAct={()=>{}}/>,
      'meeting-detail':<MeetingDetail m={standard.meetings[0]} {...props}/>,
      expense:<TxSheet tx={null} txns={data.txns} {...props}/>, 'edit-expense':<TxSheet tx={standard.txns[0]} txns={data.txns} {...props}/>,
      bill:<BillSheet bill={null} {...props}/>, 'edit-bill':<BillSheet bill={standard.bills[0]} {...props}/>,
      'upcoming-form':<UpcomingSheet item={null} {...props}/>, 'wish-form':<WishlistSheet item={null} {...props}/>, budget:<CategoryBudgetSheet cat="Food" cap={300} {...props}/>,
      'bucket-form':<EditBucketSheet goal={{id:null,name:'',target:0}} {...props}/>, 'bucket-options':<EditBucketSheet goal={goal} {...props}/>,
      deposit:<BucketSheet goal={goal} goals={data.goals} mode="deposit" {...props}/>,withdraw:<BucketSheet goal={goal} goals={data.goals} mode="withdrawal" {...props}/>,spend:<BucketSheet goal={goal} goals={data.goals} mode="spend" {...props}/>,
      'portfolio-form':<PortfolioSheet portfolio={null} {...props}/>, 'edit-portfolio':<PortfolioSheet portfolio={portfolio} {...props}/>,
      'holding-form':<HoldingSheet holding={null} portfolioId={portfolio.id} portfolios={data.portfolios} {...props}/>, 'edit-holding':<HoldingSheet holding={holding} portfolioId={portfolio.id} portfolios={data.portfolios} {...props}/>,
      buy:<ActivitySheet holding={holding} mode="buy" {...props}/>,sell:<ActivitySheet holding={holding} mode="sell" {...props}/>, 'cash-deposit':<ActivitySheet holding={cash} mode="deposit" {...props}/>, 'cash-withdraw':<ActivitySheet holding={cash} mode="withdrawal" {...props}/>,
      settings:<IncomeSettingsSheet profile={data.profile} income={data.income} nav={nav} {...props}/>,contribution:<ContributionPlan data={data} onClose={props.onClose}/>,
      loading:<Loading/>,lock:<Lock onSignIn={async()=>{}} denied={false}/>,error:<div className="c-state-page" role="alert"><h1>Unable to load your records</h1><p>Reconnect and try again.</p><button className="c-button c-primary">Try again</button></div>,
    };
    return <MotionConfig reducedMotion={params.has('reduced')?'always':'user'}><ThemeContext.Provider value={themeFor(theme)}>
      <div className="k-root" data-theme={theme} style={motionVariables}>
        <div className="k-app"><div className="k-scroll">{open ? views[selected] : <p>Closed</p>}</div></div><div id="k-overlays"/>
      </div>
    </ThemeContext.Provider></MotionConfig>;
  }
  createRoot(document.getElementById('root')).render(<Gallery/>);
}

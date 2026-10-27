function dashboardTheme() {
  return `
/* NEXA Operations Interface ------------------------------------------------ */
:root{
  --bg:#070914;
  --panel:#0b1020;
  --card:#10172a;
  --card2:#161f36;
  --line:#283650;
  --text:#f5f7ff;
  --muted:#93a0b7;
  --cyan:#5fd4ff;
  --red:#ff667d;
  --gold:#f2b84b;
  --shadow:0 24px 70px rgba(0,0,0,.32);
}
*{scrollbar-color:#3b332c #0b0a09;scrollbar-width:thin}
body{
  letter-spacing:-.01em;
  background:
    linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px),
    radial-gradient(850px 520px at 70% -8%,rgba(168,115,69,.13),transparent 72%),
    #090908;
  background-size:48px 48px,48px 48px,auto,auto;
}
body::before{
  content:"";
  position:fixed;
  inset:0;
  pointer-events:none;
  background:linear-gradient(180deg,rgba(9,9,8,.08),rgba(9,9,8,.76));
  z-index:-1;
}
.topbar{
  height:76px;
  background:rgba(12,11,10,.94);
  border-bottom:1px solid rgba(255,255,255,.08);
  box-shadow:0 12px 35px rgba(0,0,0,.18);
}
.topbar-inner{max-width:1920px;margin:auto;padding:0 30px;gap:20px}
.brand{font-size:18px;letter-spacing:.1px}
.brand-mark{
  width:42px;height:42px;border-radius:11px;
  background:linear-gradient(145deg,#e0c29d 0,#9b6840 100%);
  color:#17120e;
  box-shadow:0 0 0 1px rgba(255,255,255,.25),0 10px 32px rgba(0,0,0,.32);
}
.brand-mark::after{inset:4px;border-color:rgba(23,18,14,.2);border-radius:8px}
.brand-text{color:#f5efe8}.brand span{color:inherit}.brand-text span{color:var(--accent)}
.live-pill{
  border-color:rgba(137,159,155,.28);
  background:#111817;
  color:#b5c6c2;
  letter-spacing:.65px;
  padding:7px 11px;
}
.navlinks{border:0;background:transparent;padding:0;gap:3px}
.navlinks a{padding:9px 13px;border-radius:8px;font-size:12px;letter-spacing:.2px}
.live-dot{background:#8fa8a1;box-shadow:0 0 0 3px rgba(143,168,161,.12)}
.navlinks a.active{background:#1b1815;box-shadow:inset 0 0 0 1px #342d27}
.navlinks a.active::after{display:none}
.locale-switch{display:flex;padding:3px;border:1px solid var(--line);border-radius:9px;background:#100e0c}
.locale-switch a{padding:6px 8px;border-radius:6px;text-decoration:none;color:var(--muted);font-size:11px;font-weight:900}
.locale-switch a.active{background:#2b241e;color:#fff}
.owner-language-lock span{padding:6px 9px;color:#9ed3ff;font:900 10px ui-monospace,monospace;letter-spacing:.7px;white-space:nowrap}
.avatar{border-radius:10px}
.app{grid-template-columns:284px minmax(0,1fr);min-height:calc(100vh - 76px)}
.sidebar{
  top:76px;height:calc(100vh - 76px);
  padding:28px 18px;
  background:rgba(13,12,10,.95);
  border-right:1px solid rgba(255,255,255,.07);
}
.side-label{padding:18px 13px 7px;color:#586579;font-size:10px;letter-spacing:1.8px}
.side-label:first-child{padding-top:4px}
.side-link{
  position:relative;
  gap:11px;margin:3px 0;padding:11px 13px;
  border:1px solid transparent;border-radius:9px;
  color:#8d99aa;font-size:13px;font-weight:720;
}
.side-link:hover{color:#fff;background:#191613;border-color:#302a24;box-shadow:none}
.side-link.active{
  color:#fff;background:#211b17;border-color:#3a3028;
  box-shadow:none;
}
.side-link.active::before{
  content:"";position:absolute;left:-19px;top:7px;bottom:7px;width:3px;border-radius:3px;
  background:var(--accent);box-shadow:none;
}
main{max-width:1540px;padding:42px 46px 110px}
.public-main{max-width:1460px;padding-top:0}
.page-head{align-items:flex-end;justify-content:space-between;margin-bottom:28px}
.page-head h1{margin:6px 0 5px;font-size:clamp(34px,4vw,54px);font-weight:850;letter-spacing:-2.1px;line-height:1.05}
.section-kicker{color:var(--accent);font-size:10px;letter-spacing:1.7px}
.btn{
  min-height:42px;padding:10px 16px;border-radius:9px;
  background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 88%,#fff),var(--primary));
  border:1px solid color-mix(in srgb,var(--primary) 72%,#fff);
  box-shadow:0 9px 24px rgba(0,0,0,.22);
  font-size:13px;font-weight:800;
}
.btn:hover{transform:translateY(-1px);filter:brightness(1.1)}
.btn.secondary{background:#15120f;border-color:#382f28;color:#d9d1c7}
.btn.green{background:#0b6b50;border-color:#168566;color:#edfff8}
.btn.danger{background:#78263a;border-color:#a13d54}
.btn.small{min-height:34px;padding:7px 11px;font-size:11px}
.stats{gap:1px;margin:22px 0;background:var(--line);border:1px solid var(--line);border-radius:13px;overflow:hidden}
.stat{border:0;border-radius:0;background:#15120f;padding:19px 21px}
.stat-value{font-size:27px;line-height:1.1;letter-spacing:-1px;font-variant-numeric:tabular-nums}
.stat-label{margin-top:7px;color:#768398;font-size:9px;letter-spacing:1.25px}
.card{
  background:linear-gradient(145deg,rgba(22,19,16,.98),rgba(13,12,10,.98));
  border:1px solid #302a24;border-radius:14px;padding:23px;
  box-shadow:0 18px 55px rgba(0,0,0,.22);
}
.card::before{display:none}
.card h2,.card h3{letter-spacing:-.45px}
.section-title{font-size:20px;margin-top:4px}
.grid{gap:14px}
.notice{border-radius:9px;padding:12px 14px;background:#0b1916;border-color:#1b4a3b}
.notice.warn{background:#19150d;border-color:#4b3b1d}
.notice.error,.error{background:#1c0f15;border-color:#572334}
select,textarea,input[type=text],input[type=number],input[type=url],input[type=color],input[type=password],input[type=datetime-local],input[type=search]{
  border-radius:8px!important;border-color:#3b332c!important;background:#0e0c0b!important;
  min-height:44px;color:#f4f7fb!important;padding:10px 12px!important;
}
select:focus,textarea:focus,input:focus{border-color:var(--primary)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 12%,transparent)!important}
label{font-size:12px;color:#d3dbe7}
.help{color:#748196}
.field-grid{gap:16px 18px}
.module-grid{gap:9px}
.switch{min-height:64px;border-radius:9px;background:#11100e;border-color:#302a24;padding:13px}
.switch:hover{background:#191613;border-color:#4a3e33}
.switch input{accent-color:var(--accent)}
.savebar{bottom:16px;border-radius:11px;border-color:#334157;background:rgba(10,14,21,.95)}
.badge{border:1px solid rgba(82,224,164,.2);background:#0c1b17;color:#84e9bf}
.badge.pro{border-color:rgba(40,200,255,.25);background:#0b1920;color:#6edcff}
.badge.ultimate{border-color:color-mix(in srgb,var(--primary) 45%,transparent);background:color-mix(in srgb,var(--primary) 12%,#0c1119);color:#d5cdff}
table{font-size:12px;border:1px solid #1f2936;border-radius:10px;overflow:hidden}
thead{background:#0a0f17}th{color:#78869a}th,td{padding:12px 10px;border-color:#202a38}
tbody tr:hover{background:rgba(255,255,255,.018)}
.desktop-owner-nav{
  top:90px;padding:7px;border-radius:10px;border-color:#253142;background:rgba(8,12,18,.96);
  box-shadow:0 12px 35px rgba(0,0,0,.22);
}
.desktop-owner-nav a{border-radius:7px;padding:9px 14px}
.desktop-owner-nav a:hover{background:#17202c}

/* Owner network cards */
.owner-server-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.owner-server{gap:16px;padding:20px;border-radius:13px;background:#0b1018}
.owner-server:hover{border-color:#344357;transform:translateY(-1px);transition:.18s ease}
.owner-server-head img,.owner-server-head .server-icon{width:50px;height:50px;flex-basis:50px;border-radius:11px}
.owner-server-title h3{font-size:16px}.owner-server-id{color:#66758a}
.owner-server-metrics{gap:1px;border:1px solid #202a38;border-radius:9px;overflow:hidden;background:#202a38}
.owner-server-metric{border:0;border-radius:0;background:#0e141e;padding:11px}
.owner-server-metric strong{font-size:18px;font-variant-numeric:tabular-nums}
.owner-server-metric span{font-size:8px;letter-spacing:1px}
.owner-server-details{font-size:11px;line-height:1.6}
.owner-server-actions{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.owner-server-actions>.btn,.owner-server-actions>form>.btn{min-height:39px;padding:8px;font-size:11px}
.owner-package{grid-column:1/-1;grid-template-columns:minmax(0,1fr) auto}
.owner-package select{min-height:39px!important;font-size:11px}
.owner-search{padding:10px;border:1px solid #202a38;border-radius:11px;background:#0a0f16}
.owner-search input[type=search]{margin:0}
.owner-server.blacklisted{background:#160d12;border-color:#5c2636}

/* Dashboard server picker */
.server.card{padding:17px 18px;border-radius:11px;background:#0b1018}
.server.card:hover{border-color:#344357;background:#0e151f}
.server img,.server-icon{width:48px;height:48px;border-radius:10px}
.server-body h3{font-size:15px}.server-body .muted{font-size:11px;margin-top:4px}

/* Public site */
.marketing .hero{display:grid;grid-template-columns:minmax(0,.95fr) minmax(520px,1.05fr);align-items:center;gap:64px;min-height:690px;padding:80px 0 64px}
.marketing .hero h1{font-size:clamp(58px,6.3vw,94px);letter-spacing:-5.5px;line-height:.91;margin:24px 0 28px}
.marketing .hero .lead{max-width:680px;font-size:18px;line-height:1.7}
.gradient{background:linear-gradient(100deg,#fff 5%,var(--accent) 46%,var(--cyan));-webkit-background-clip:text;color:transparent}
.eyebrow{border-radius:7px;background:#0c1517;border-color:#214239;color:#90eaca;letter-spacing:1.45px}
.hero-proof{display:flex;flex-wrap:wrap;gap:9px 20px;margin-top:23px;color:#8491a3;font-size:12px}
.hero-proof span{display:flex;align-items:center;gap:7px}.hero-proof i{color:var(--accent);font-style:normal}
.product-stage{position:relative;padding:40px 0 30px}
.product-shell{overflow:hidden;border:1px solid #2c394a;border-radius:15px;background:#080c12;box-shadow:0 40px 110px rgba(0,0,0,.55),0 0 0 8px rgba(255,255,255,.018)}
.shell-bar{height:42px;display:flex;align-items:center;gap:6px;padding:0 14px;border-bottom:1px solid #202a37;background:#0b1018}
.shell-bar>i{width:7px;height:7px;border-radius:50%;background:#314052}.shell-title{margin-left:8px;color:#77869b;font:800 9px/1 ui-monospace,monospace;letter-spacing:1.3px}
.shell-body{display:grid;grid-template-columns:150px 1fr;min-height:400px}.shell-side{padding:18px 11px;border-right:1px solid #1e2734;background:#090d13}.shell-brand{display:flex;align-items:center;gap:7px;margin:0 7px 20px;font-size:11px;font-weight:900}.shell-brand b{display:grid;place-items:center;width:26px;height:26px;border-radius:7px;background:#dce7f2;color:#071017}.shell-link{padding:9px 10px;margin:4px 0;border-radius:6px;color:#667589;font-size:9px;font-weight:800}.shell-link.active{color:#eaf2fb;background:#151e2a}.shell-main{padding:22px}.shell-head{display:flex;justify-content:space-between;align-items:center}.shell-head h3{margin:3px 0;font-size:18px}.shell-status{padding:6px 8px;border:1px solid #1e5a46;border-radius:6px;background:#0a1c16;color:#70e5b5;font-size:8px;font-weight:900;letter-spacing:1px}.shell-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:20px 0}.shell-metric{padding:14px;border:1px solid #202a38;border-radius:8px;background:#0b111a}.shell-metric strong{display:block;font-size:20px}.shell-metric span{color:#728095;font-size:8px;text-transform:uppercase;letter-spacing:.9px}.signal-card{padding:14px;border:1px solid #202a38;border-radius:8px;background:#090e15}.signal-top{display:flex;justify-content:space-between;font-size:9px;font-weight:800}.signal-bars{height:72px;display:flex;align-items:flex-end;gap:5px;margin-top:12px}.signal-bars i{flex:1;border-radius:2px 2px 0 0;background:linear-gradient(var(--accent),#164f43)}.signal-bars i:nth-child(1){height:28%}.signal-bars i:nth-child(2){height:48%}.signal-bars i:nth-child(3){height:34%}.signal-bars i:nth-child(4){height:68%}.signal-bars i:nth-child(5){height:43%}.signal-bars i:nth-child(6){height:82%}.signal-bars i:nth-child(7){height:61%}.signal-bars i:nth-child(8){height:94%}.signal-bars i:nth-child(9){height:72%}.signal-bars i:nth-child(10){height:88%}
.float-chip{position:absolute;z-index:3;min-width:142px;padding:10px 12px;border:1px solid #2a3747;border-radius:9px;background:rgba(10,15,22,.96);box-shadow:0 15px 36px rgba(0,0,0,.35);color:#7f8da0;font-size:9px}.float-chip strong{display:block;color:#eef4fb;font-size:10px}.chip-a{top:15px;right:-24px}.chip-b{bottom:0;left:-28px}
.live-network{display:grid;grid-template-columns:2fr repeat(4,1fr);border:1px solid #202b38;border-radius:12px;overflow:hidden;background:#0a0f16}
.network-intro,.network-stat{padding:18px 20px}.network-stat{border-left:1px solid #202b38}.network-stat strong,.network-stat span{display:block}.network-stat strong{font-size:18px}.network-stat span,.network-intro span{color:#758398;font-size:10px;text-transform:uppercase;letter-spacing:.7px}.network-intro strong{display:block;margin:3px 0}
.section-block{padding:100px 0 0}.section-heading{display:grid;grid-template-columns:1fr minmax(300px,.65fr);gap:50px;align-items:end;margin-bottom:30px}.section-heading h2,.security-copy h2,.cta-panel h2{font-size:clamp(34px,4.3vw,58px);line-height:1.02;letter-spacing:-2.4px;margin:9px 0}.section-heading>p{color:#8491a3;line-height:1.75}
.capability-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;padding:1px;background:#202a38;border:1px solid #202a38;border-radius:13px;overflow:hidden}.capability{min-height:285px;padding:25px;background:#0b1018}.capability.wide{grid-column:span 2}.capability-code{display:inline-flex;padding:5px 7px;border:1px solid #2a3748;border-radius:5px;color:var(--accent);font:900 9px/1 ui-monospace,monospace;letter-spacing:1px}.capability h3{margin:35px 0 9px;font-size:20px}.capability p,.capability li{color:#7f8da0;font-size:12px}.capability ul,.access-card ul{padding:0;margin:18px 0 0;list-style:none}.capability li,.access-card li{padding:6px 0;border-top:1px solid #192330}.capability li::before,.access-card li::before{content:"+";margin-right:8px;color:var(--accent)}
.workflow{display:grid;grid-template-columns:repeat(3,1fr);counter-reset:step}.workflow-step{position:relative;padding:24px 24px 24px 76px;border-top:1px solid #263342;counter-increment:step}.workflow-step::before{content:"0" counter(step);position:absolute;left:10px;top:19px;color:#536176;font:800 25px/1 ui-monospace,monospace}.workflow-step h3{margin:0 0 7px}.workflow-step p{color:#7f8da0;font-size:13px}
.access-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.access-card{padding:24px;border:1px solid #202a38;border-radius:12px;background:#0b1018}.access-card.featured{border-color:color-mix(in srgb,var(--primary) 52%,#202a38);box-shadow:inset 0 3px var(--primary)}.access-name{color:var(--accent);font:900 9px/1 ui-monospace,monospace;letter-spacing:1.4px}.access-card h3{font-size:22px;margin:16px 0}.access-card li{color:#8b98aa;font-size:12px}.access-note{margin-top:18px;color:#5f6d80;font-size:10px}
.security-showcase{display:grid;grid-template-columns:.85fr 1.15fr;gap:50px}.trust-list{display:grid;gap:8px;margin-top:25px}.trust-item{display:flex;gap:14px;padding:13px 0;border-top:1px solid #202a38}.trust-item>b{color:var(--accent);font:800 11px/1.6 ui-monospace,monospace}.trust-item strong,.trust-item span{display:block}.trust-item span{color:#758397;font-size:11px}.security-console{align-self:center;padding:20px;border:1px solid #263342;border-radius:12px;background:#070b10;box-shadow:0 30px 75px rgba(0,0,0,.34)}.console-line{display:grid;grid-template-columns:72px 1fr auto;gap:15px;padding:12px 8px;border-bottom:1px solid #17212d;font:11px/1.4 ui-monospace,monospace}.console-line time{color:#59687d}.console-line span{color:#a5b0bf}.console-line b{color:var(--accent)}
.cta-panel{text-align:center;padding:70px 30px;border:1px solid #273444;border-radius:14px;background:radial-gradient(520px 260px at 50% 120%,color-mix(in srgb,var(--primary) 20%,transparent),transparent),#0a0f16}.cta-panel p{max-width:690px;margin:auto;color:#8491a3}.site-footer{display:flex;align-items:center;gap:22px;margin-top:90px;padding:28px 0;border-top:1px solid #202a38;color:#677589;font-size:11px}.site-footer>a:not(.brand){margin-left:auto;text-decoration:none}.site-footer>a:not(.brand)+a{margin-left:0}

/* Subscriptions and billing */
.pricing-hero{padding:76px 0 34px;text-align:center}.pricing-hero h1{font-size:clamp(48px,6vw,78px);line-height:.98;letter-spacing:-4px;margin:18px auto;max-width:980px}.pricing-hero .lead{margin:auto}.pricing-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:34px}.price-card{display:flex;flex-direction:column;min-height:520px;padding:25px;border:1px solid #263342;border-radius:14px;background:linear-gradient(155deg,#111821,#090e15);position:relative;overflow:hidden}.price-card.featured{border-color:#9f7a56;box-shadow:inset 0 3px #d2b079,0 25px 70px rgba(0,0,0,.28)}.price-card .price-plan{color:var(--accent);font:900 11px/1 ui-monospace,monospace;letter-spacing:1.4px}.price-card h2{font-size:28px;margin:15px 0 4px}.price-value{font-size:33px;font-weight:950;letter-spacing:-1.5px}.price-value small{font-size:12px;color:var(--muted);font-weight:700;letter-spacing:0}.price-year{min-height:24px;color:#7f8da0;font-size:11px}.price-card ul{list-style:none;margin:22px 0;padding:0}.price-card li{padding:9px 0;border-top:1px solid #202a38;color:#9da9b8;font-size:12px}.price-card li::before{content:"✓";color:#7ed6b4;margin-right:9px}.price-card .actions{margin-top:auto}.price-card .btn{width:100%}.billing-grid{display:grid;grid-template-columns:minmax(0,.7fr) minmax(420px,1.3fr);gap:18px}.billing-plans{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.billing-plan{padding:18px;border:1px solid #263342;border-radius:12px;background:#0b1119}.billing-plan h3{margin:7px 0}.billing-plan .btn{width:100%;margin-top:10px}.billing-cycle{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.billing-cycle label{display:flex;align-items:center;gap:7px;padding:9px;border:1px solid #293648;border-radius:8px;font-size:11px}.secure-checkout{display:flex;gap:12px;align-items:center;padding:14px;border:1px solid #234639;border-radius:10px;background:#0b1915;color:#a8ddca;font-size:12px}

/* Knowledge Base */
.knowledge-hero{padding:72px 0 34px;max-width:940px}.knowledge-hero h1{font-size:clamp(48px,6vw,82px);line-height:.95;letter-spacing:-4px;margin:20px 0 24px}.knowledge-index{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;margin:24px 0 34px;border:1px solid var(--line);border-radius:13px;overflow:hidden;background:var(--line)}.knowledge-index span{display:flex;gap:9px;align-items:center;min-height:58px;padding:12px;background:#12100e;color:#a79e94;font-size:10px;font-weight:780}.knowledge-index b{color:var(--accent);font:900 9px/1 ui-monospace,monospace}.knowledge-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.knowledge-card{border:1px solid #332c26;border-radius:12px;background:linear-gradient(145deg,#161310,#100f0d);overflow:hidden}.knowledge-card[open]{border-color:#5a493a;background:#181410}.knowledge-card summary{display:grid;grid-template-columns:34px 1fr 24px;align-items:center;gap:10px;min-height:76px;padding:17px 19px;cursor:pointer;list-style:none}.knowledge-card summary::-webkit-details-marker{display:none}.knowledge-card summary span{color:var(--accent);font:900 10px/1 ui-monospace,monospace}.knowledge-card summary strong{font-size:15px}.knowledge-card summary i{display:grid;place-items:center;width:22px;height:22px;border:1px solid #42372e;border-radius:5px;color:#a99a8b;font-style:normal;transition:transform .18s ease}.knowledge-card[open] summary i{transform:rotate(45deg);color:var(--accent)}.knowledge-body{padding:0 19px 19px}.knowledge-body dl{margin:0;border-top:1px solid #302923}.knowledge-body dl>div{display:grid;grid-template-columns:145px 1fr;gap:16px;padding:12px 0;border-bottom:1px solid #28221d}.knowledge-body dl>div:last-child{border-bottom:0}.knowledge-body dt{color:#d7c7b5;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.75px}.knowledge-body dd{margin:0;color:#9f968c;font-size:12px;line-height:1.65}

/* AEGIS */
.aegis-score{display:grid;place-items:center;width:168px;aspect-ratio:1;border:1px solid #514235;border-radius:50%;background:radial-gradient(circle,#1d1814 0 54%,transparent 55%),conic-gradient(var(--accent) var(--score),#2d2721 0);padding:7px}.aegis-score>div{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;background:#11100e;text-align:center}.aegis-score strong{font-size:38px;line-height:1}.aegis-score span{color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:1px}.risk-critical{color:#ff7d88}.risk-high{color:#e5a267}.risk-medium{color:#d5bf78}.risk-low{color:#91aaa2}.dna-code{display:block;max-width:100%;overflow-wrap:anywhere;padding:10px;border:1px solid #332c26;border-radius:7px;background:#0d0c0b;color:#d2b079;font:10px/1.5 ui-monospace,monospace}

/* Dedicated ticket center */
.ticket-center{border-color:#31506a;background:radial-gradient(700px 300px at 100% 0,rgba(56,139,181,.12),transparent),linear-gradient(145deg,#101820,#0c1118)}
.ticket-status-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0 28px}.ticket-status-grid>div{padding:14px;border:1px solid #273b4d;border-radius:10px;background:#0b1219}.ticket-status-grid strong,.ticket-status-grid span{display:block}.ticket-status-grid strong{margin-bottom:7px;color:#758da2;font:850 9px/1.2 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.8px}.ticket-status-grid span{color:#d8e5ef;font-size:12px;font-weight:800}
.ticket-flow{display:grid;grid-template-columns:1fr auto 1fr auto 1fr auto 1fr;gap:9px;align-items:center;margin-top:22px;padding:14px;border:1px solid #294459;border-radius:10px;background:#091118}.ticket-flow span{padding:9px;border-radius:7px;background:#111d27;color:#c6d9e8;text-align:center;font-size:10px;font-weight:850}.ticket-flow b{color:#5eaacb}
.settings-jump{position:sticky;top:68px;z-index:8;display:flex;gap:7px;overflow-x:auto;margin:0 0 16px;padding:9px;border:1px solid #293645;border-radius:11px;background:rgba(9,13,18,.94);backdrop-filter:blur(14px)}.settings-jump a{flex:0 0 auto;padding:8px 11px;border-radius:7px;color:#8d9bad;text-decoration:none;font-size:10px;font-weight:850}.settings-jump a:hover{background:#182430;color:#e7f2fa}

.settings-jump a.active{background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 24%,#121a2a),#121927);color:#fff;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--primary) 48%,transparent)}
.contextbar{display:flex;align-items:center;gap:8px;margin:-8px 0 24px;color:#64738e;font:800 10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase;letter-spacing:1px}.contextbar strong{color:#cfd8ee}.contextbar b{color:var(--primary)}
.field-invalid{border-color:var(--red)!important;box-shadow:0 0 0 3px rgba(255,102,125,.15)!important}.section-attention{border-color:rgba(255,102,125,.55)!important;box-shadow:0 0 0 2px rgba(255,102,125,.08),0 20px 70px rgba(0,0,0,.34)!important}
.live-sync{display:inline-flex;align-items:center;gap:6px;padding:3px 7px;border:1px solid var(--line);border-radius:999px;color:#7d8aa2;font:800 9px/1.4 ui-monospace,monospace;letter-spacing:.6px}.live-sync.is-live{border-color:rgba(82,224,196,.3);background:rgba(82,224,196,.08);color:var(--accent)}.live-sync.is-live::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 10px var(--accent)}
.support-message{padding:15px!important;background:linear-gradient(145deg,rgba(16,23,42,.98),rgba(9,14,26,.98))!important}.support-message p{white-space:pre-wrap;overflow-wrap:anywhere}
.cycle-disabled{opacity:.48;cursor:not-allowed}.billing-cycle label:has(input:checked){border-color:color-mix(in srgb,var(--primary) 55%,var(--line));background:color-mix(in srgb,var(--primary) 10%,transparent)}
/* 14.0 visual cleanup: remove the previous brown legacy skin without changing layout semantics */
body{background:linear-gradient(rgba(255,255,255,.014) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.014) 1px,transparent 1px),radial-gradient(900px 560px at 72% -8%,color-mix(in srgb,var(--primary) 18%,transparent),transparent 72%),#060812;background-size:48px 48px,48px 48px,auto,auto}.topbar{background:rgba(6,8,18,.90)}.brand-mark{background:linear-gradient(145deg,var(--primary),#372789);color:#fff}.sidebar{background:linear-gradient(180deg,rgba(9,13,26,.97),rgba(6,9,18,.94))}.side-link:hover{background:#111a2c;border-color:#25324a}.side-link.active{background:linear-gradient(90deg,color-mix(in srgb,var(--primary) 20%,#10172a),#101725);border-color:color-mix(in srgb,var(--primary) 35%,#283650)}.card{background:linear-gradient(145deg,rgba(16,23,42,.98),rgba(9,14,25,.98));border-color:#293650}.stat{background:#101725}.btn.secondary{background:#111827;border-color:#2c3a55;color:#dbe5f7}.locale-switch{background:#0b1020}.locale-switch a.active{background:#18223a}.switch{background:#0d1423;border-color:#293650}.switch:hover{background:#121c30;border-color:#3b4b6d}.knowledge-card{background:linear-gradient(145deg,#10172a,#0b1020);border-color:#293650}.knowledge-card[open]{background:#121a2c;border-color:#425575}.knowledge-index span{background:#101725}.aegis-score>div{background:#0b1020}.dna-code{background:#0a0f1b;border-color:#293650;color:#b9c5ff}.price-card.featured{border-color:color-mix(in srgb,var(--primary) 52%,#293650);box-shadow:inset 0 3px var(--primary),0 25px 70px rgba(0,0,0,.28)}

@media(min-width:1500px){.owner-mode main{max-width:1700px}.owner-server-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:1180px) and (min-width:901px){.access-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:1180px){.marketing .hero{grid-template-columns:1fr;gap:25px}.product-stage{max-width:760px}.live-network{grid-template-columns:repeat(2,1fr)}.network-intro{grid-column:1/-1}.network-stat{border-top:1px solid #202b38}.capability-grid{grid-template-columns:repeat(2,1fr)}.capability.wide{grid-column:auto}.owner-server-actions{grid-template-columns:repeat(2,1fr)}.knowledge-index{grid-template-columns:repeat(2,1fr)}.pricing-grid{grid-template-columns:repeat(2,1fr)}.billing-grid{grid-template-columns:1fr}.billing-plans{grid-template-columns:1fr}}
@media(max-width:900px){.app{grid-template-columns:1fr}.sidebar{display:none}main{padding:28px 18px 80px}.public-main{padding-top:0}.marketing .hero{min-height:auto;padding-top:60px}.topbar-inner{padding:0 16px}.section-heading,.security-showcase{grid-template-columns:1fr}.live-network{grid-template-columns:1fr 1fr}.owner-server-grid{grid-template-columns:1fr}.workflow{grid-template-columns:1fr}.workflow-step{border-top:1px solid #263342}.access-grid{grid-template-columns:1fr}.knowledge-grid{grid-template-columns:1fr}.site-footer{flex-wrap:wrap}.site-footer>a:not(.brand){margin-left:0}.ticket-status-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ticket-flow{grid-template-columns:1fr}.ticket-flow b{display:none}}
@media(max-width:600px){.topbar{height:64px}.marketing .hero h1{font-size:48px;letter-spacing:-3px}.product-stage{display:none}.capability-grid{grid-template-columns:1fr}.live-network{grid-template-columns:1fr}.network-intro,.network-stat{grid-column:auto;border-left:0}.section-block{padding-top:70px}.owner-server-metrics{grid-template-columns:repeat(2,1fr)}.owner-server-actions{grid-template-columns:1fr}.owner-package{grid-template-columns:1fr}.page-head{align-items:flex-start;flex-direction:column}.stats{grid-template-columns:1fr 1fr}.stat{padding:15px}.console-line{grid-template-columns:60px 1fr}.console-line b{display:none}.knowledge-hero h1{font-size:45px;letter-spacing:-2.6px}.knowledge-index{grid-template-columns:1fr}.knowledge-body dl>div{grid-template-columns:1fr;gap:3px}.pricing-grid{grid-template-columns:1fr}.pricing-hero h1{font-size:44px;letter-spacing:-2.5px}.billing-plans{grid-template-columns:1fr}}

/* NEXA 21 Reborn • preserve the established control-center layout */
:root{--primary:#497bf4;--accent:#8fcaff;--bg:#070c18;--panel:#0c1527;--card:#101b30;--card2:#14233d;--line:#263d60;--muted:#9cabc3;--text:#edf4ff;--shadow:0 18px 55px rgba(0,5,18,.4)}
body{background:radial-gradient(1000px 650px at 82% -10%,rgba(74,119,238,.17),transparent 70%),radial-gradient(900px 600px at 4% 48%,rgba(61,180,215,.07),transparent 68%),#070c18;background-attachment:fixed;color:var(--text)}
body::before{background:linear-gradient(180deg,rgba(7,12,24,.06),rgba(7,12,24,.45))}
.topbar{background:rgba(9,17,32,.94);border-color:#233753;backdrop-filter:blur(18px)}
.sidebar{background:rgba(9,17,31,.96);border-color:#213550}.brand-mark{background:linear-gradient(145deg,#99d2ff,#4e7ff3);color:#08152a}.brand-text{color:#edf6ff}.brand-mark::after{border-color:rgba(8,21,42,.2)}
.card,.section,.stat{background:linear-gradient(150deg,rgba(17,30,51,.96),rgba(11,21,38,.96));border-color:var(--line);box-shadow:0 9px 28px rgba(0,5,18,.18)}
.card:hover{border-color:#375b89}.side-link:hover,.side-link.active,.navlinks a.active{background:#15283e;border-color:#304f74}.side-link.active::before{background:#78bcff;box-shadow:0 0 15px rgba(95,176,255,.35)}
.btn{transition:transform .16s,box-shadow .16s,background .16s}.btn:hover{transform:translateY(-1px);box-shadow:0 6px 22px rgba(39,112,235,.21)}.btn.secondary{background:#142338;border-color:#2d486a;color:#d3e5fa}.btn.green{background:linear-gradient(135deg,#397cec,#3162c7);border-color:#5999fa;color:#fff}
.locale-switch{background:#101f34}.locale-switch a.active{background:#234361}.live-pill{background:#0b2027;border-color:#224d52;color:#8ee1d8}.live-dot{background:#5ad7c5;box-shadow:0 0 0 3px rgba(90,215,197,.12)}
input,select,textarea{background:#09182b!important;border-color:#294561!important;color:#e2efff!important}input:focus,select:focus,textarea:focus{border-color:#75b6ff!important;box-shadow:0 0 0 3px rgba(79,154,245,.14)!important;outline:none}.notice{border-color:#305174;background:#102641}.notice.warn{border-color:#826c39;background:#2a241a}.notice.error{border-color:#843c51;background:#291825}
.support-message p{white-space:pre-wrap;overflow-wrap:anywhere}.record{background:rgba(13,27,46,.85);border-color:#294360}.record:hover{background:#152f4c;border-color:#4774a3}.ticket-center{background:radial-gradient(600px 350px at 100% 0,rgba(60,146,242,.14),transparent),#0e1b2c;border-color:#365775}
.section-kicker{color:#8fcaff}.muted,.help{color:#9eafc5}.savebar{background:rgba(9,20,37,.96);border-color:#304e70;backdrop-filter:blur(12px)}.live-sync.is-live{color:#67d9c5}.stat-value{color:#edf5ff}
:focus-visible{outline:2px solid #86c5ff;outline-offset:3px}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;
}

module.exports = { dashboardTheme };

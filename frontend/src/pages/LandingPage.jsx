import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useReducedMotion, AnimatePresence } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { formatDistanceToNow } from 'date-fns';
import {
  MapPin,
  ShieldCheck,
  Radio,
  Camera,
  KeyRound,
  Sparkles,
  QrCode,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Phone,
} from 'lucide-react';
import SiteNav from '../components/layout/SiteNav';
import Footer from '../components/landing/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useReport } from '../contexts/ReportContext';
import { itemService, staffService } from '../services';

/* ─── High-Definition Photography ─── */
const HERO_IMAGE = '/images/campus_hero.jpg';
const PARALLAX_IMAGE = '/images/vault_exhibit.jpg';

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/* ─── White Desert Signature Diamond Arrow ─── */
function DiamondArrow({ className = 'w-3 h-3 text-current' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 11 11" className={className}>
      <path stroke="currentColor" strokeMiterlimit="10" strokeWidth="0.5" d="M5.5 1v9M1 5.502h9" />
      <path fill="currentColor" d="m5.45 3.449 1.99 1.99-1.99 1.99-1.991-1.99z" />
    </svg>
  );
}

/* ─── Hand-Drawn Delicate Scribble Flourish SVG ─── */
function TitleScribble({ className = 'w-56 h-8 text-midnight/40 dark:text-slate-500' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 191 62" fill="none" className={className}>
      <path
        d="M118.7 58.8C100.4 49.1 48.3 20.5 30.5 10.1C12.6 -0.4 12.5 -1.7 36.1 2.4C59.6 6.6 106.8 16.3 133.8 23C160.7 29.7 166 33.1 169.1 35.3C172.3 37.6 173.1 38.5 173.1 39.5C173.4 45.3 163.9 46.3 149.3 49.1C138.1 51.2 119 52.2 97.3 48.4C75.6 44.6 51.8 35.4 39.7 29.4C27.6 23.5 27.9 21.2 28.4 19.3C29 17.4 29.9 16.1 31.4 14.8C33 13.5 35.3 12.3 43.5 11.3C51.7 10.3 65.8 9.6 82.7 10.7C99.5 11.9 118.7 14.9 135.9 19.1C153.1 23.3 167.8 28.5 176.5 32C185.2 35.4 187.7 36.9 189.1 38.4C190.5 40 190.9 41.4 188.8 43.5C186.7 45.7 182.1 48.4 173.6 51.3C165 54.3 152.6 57.3 123.2 59.1C93.7 60.8 47.7 61 0.3 61.3"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ─── 3-Step Custody Protocol Data ─── */
const PROTOCOL_STEPS = [
  {
    step: '01',
    name: 'Secret-Mark Ingestion',
    tagline: 'Private verification markers only you possess',
    description:
      'When filing a report, you record a unique secret mark — an engraved initial, a concealed scratch on the hinge, or an internal device wallpaper. This trait is encrypted and never shown publicly, preventing fraudulent claims.',
    icon: KeyRound,
    highlights: ['End-to-end encrypted trait', 'Zero public image disclosure', 'Deterministic matching'],
  },
  {
    step: '02',
    name: 'Neural Match Engine',
    tagline: 'Automated correlation across all campus zones',
    description:
      'Every time a student or security officer turns in a found item, our multi-modal matching engine scores semantic overlap, timestamps, and sector proximity, notifying potential owners the instant correlation reaches 90% confidence.',
    icon: Sparkles,
    highlights: ['Multi-modal spatial scoring', 'Proximity timestamp matching', 'Automated email alerts'],
  },
  {
    step: '03',
    name: 'Encrypted QR Handover',
    tagline: 'Physical transfer with verified chain of custody',
    description:
      'Once your secret mark is verified, the system generates a single-use time-expiring cryptographic QR token. Present this to the duty officer at the campus vault to physically release and inspect your belonging.',
    icon: QrCode,
    highlights: ['Single-use cryptographic token', '15-minute expiration window', 'Tamper-proof audit log'],
  },
];

/* ─── Active Dispatches: live found items from the database ─── */
const dispatchStatus = (item) => {
  if (item.status === 'resolved') return 'Reunited';
  if (item.handoverStatus === 'pending') return 'Custody Handover Pending';
  if (item.status === 'claimed') return 'Claim In Progress';
  return 'In Guard Vault';
};

const dispatchAge = (date) => {
  if (!date) return 'recently';
  const text = formatDistanceToNow(new Date(date))
    .replace('about ', '')
    .replace('less than a minute', '1m')
    .replace(/ minutes?/g, 'm')
    .replace(/ hours?/g, 'h')
    .replace(/ days?/g, 'd')
    .replace(/ months?/g, 'mo');
  return `${text} ago`;
};

/* ─── Frequently Asked Questions Data ─── */
const FAQS = [
  {
    q: 'How does the secret-mark claim challenge protect my valuables?',
    a: 'When claiming an item, you are prompted to describe hidden, unpictured characteristics (such as a unique scratch on the hinge, specific keychain engravings, or private lock screen text). Because only the true owner knows these confidential details, no one else can talk their way into claiming your belonging.',
  },
  {
    q: 'Are my uploaded photographs visible to the entire university?',
    a: 'No. Photo reports are stored encrypted and remain private within university custody. Photos are only previewed to you when our correlation engine detects an affirmative match with an incoming guard vault item, protecting serial numbers and personal belongings from public display.',
  },
  {
    q: 'What is the procedure if I lose my official university student ID card?',
    a: 'Found student identification cards and access badges are automatically routed to the Dean of Student Affairs and logged into the campus security vault within 24 hours. The owner receives an immediate automated notification to collect their card.',
  },
  {
    q: 'How long are items retained in security custody before clearance?',
    a: 'All unclaimed belongings are protected in reinforced campus security lockers for a mandatory 90 academic days. Following this period, unclaimed items are reviewed under university registrar guidelines.',
  },
  {
    q: 'Where do I physically go once my claim is approved?',
    a: 'Once your secret-mark claim is verified by the custodian, you receive a dynamic single-use QR token with a 15-minute countdown. Take this token to the designated sector desk (e.g. Library Desk or Engineering Post) where the on-duty officer verifies the code and hands over your item.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openReport } = useReport();
  const reduce = useReducedMotion();

  /* State */
  const [activeFlick, setActiveFlick] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [localTime, setLocalTime] = useState('');
  const [guards, setGuards] = useState([]);
  const [guardsLoading, setGuardsLoading] = useState(true);
  const [guardsError, setGuardsError] = useState(false);
  const [dispatches, setDispatches] = useState([]);
  const [dispatchesLoading, setDispatchesLoading] = useState(true);
  const [dispatchesError, setDispatchesError] = useState(false);

  /* Live found items held in campus custody */
  const loadDispatches = useCallback(() => {
    setDispatchesLoading(true);
    itemService
      .getItems({ type: 'found', status: 'active', page: 1, pageSize: 3 })
      .then((data) => {
        setDispatches(Array.isArray(data?.items) ? data.items : []);
        setDispatchesError(false);
      })
      .catch(() => setDispatchesError(true))
      .finally(() => setDispatchesLoading(false));
  }, []);

  useEffect(() => {
    loadDispatches();
  }, [loadDispatches]);

  /* Live security roster from the database */
  useEffect(() => {
    let active = true;
    staffService
      .getSecurityTeam()
      .then((data) => {
        if (!active) return;
        setGuards(Array.isArray(data?.guards) ? data.guards : []);
        setGuardsError(false);
      })
      .catch(() => {
        if (!active) return;
        setGuardsError(true);
      })
      .finally(() => {
        if (active) setGuardsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  /* Clock for coordinates */
  useEffect(() => {
    function tick() {
      const now = new Date();
      setLocalTime(now.toLocaleTimeString('en-GB', { hour12: false }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* Parallax Scroll Hooks */
  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(heroProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(heroProgress, [0, 0.75], [1, 0]);

  /* Word Scroll Scrub in Introduction */
  const introRef = useRef(null);
  const { scrollYProgress: introProgress } = useScroll({
    target: introRef,
    offset: ['start 85%', 'end 35%'],
  });
  const introOpacity = useTransform(introProgress, [0, 0.5, 1], [0.35, 0.8, 1]);

  /* Parallax Mountain Banner */
  const tallBannerRef = useRef(null);
  const { scrollYProgress: tallProgress } = useScroll({
    target: tallBannerRef,
    offset: ['start end', 'end start'],
  });
  const tallY = useTransform(tallProgress, [0, 1], ['-15%', '15%']);

  /* Flight Path Animation */
  const radarSectionRef = useRef(null);
  const { scrollYProgress: radarProgress } = useScroll({
    target: radarSectionRef,
    offset: ['start end', 'end center'],
  });
  const flightPathLength = useSpring(useTransform(radarProgress, [0.1, 0.85], [0, 1]), {
    stiffness: 80,
    damping: 20,
  });

  function go(path) {
    navigate(user ? path : `/login?next=${encodeURIComponent(path)}`);
  }

  function report(type) {
    if (user) {
      openReport(type);
      return;
    }
    go(`/feed?type=${type}`);
  }

  const selectedStep = PROTOCOL_STEPS[activeStepIndex];

  return (
    <div className="relative min-h-screen bg-white dark:bg-slate-950 font-sans text-midnight dark:text-slate-100 antialiased">
      {/* ─── White Desert Liquid Glass SVG Turbulence Filter Definition ─── */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          <filter id="white-desert-liquid-glass" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="100" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
            <feDisplacementMap in="SourceGraphic" in2="blurred" scale="35" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* ─── Architectural Swiss Grid Lines (White Desert Signature) ─── */}
      <div className="grid-overlay pointer-events-none" aria-hidden="true">
        <div className="mx-auto flex h-full max-w-7xl justify-between px-6 lg:px-12">
          <div className="grid-line left-6 lg:left-12" />
          <div className="grid-line left-1/4 hidden md:block" />
          <div className="grid-line left-2/4 hidden lg:block" />
          <div className="grid-line left-3/4 hidden md:block" />
          <div className="grid-line right-6 lg:right-12" />
        </div>
      </div>

      <SiteNav />

      <main>
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            1. HERO: "ANTARCTICA" INSPIRED FULL-BLEED BANNER
            - Full-bleed panoramic campus photography
            - Left italic subtitle, right pill button
            - Monumental architectural serif title at the bottom: "RUHUNA"
            - Realistic cloud/mist layer transition bleeding into white
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section ref={heroRef} className="relative h-[100svh] min-h-[540px] sm:h-screen sm:min-h-[640px] overflow-hidden bg-midnight">
          {/* Panoramic Campus Background with Parallax */}
          <motion.div
            className="absolute inset-0 -top-16 -bottom-16"
            style={reduce ? {} : { y: heroY }}
          >
            <img
              src={HERO_IMAGE}
              alt="Faculty of Technology campus pavilion at twilight"
              className="h-full w-full object-cover"
              loading="eager"
            />
            {/* Cinematic subtle contrast darkening */}
            <div className="absolute inset-0 bg-black/35" />
          </motion.div>

          {/* Hero Content */}
          <motion.div
            className="relative z-10 flex h-full flex-col justify-center gap-8 pt-16 pb-[calc(env(safe-area-inset-bottom)_+_5rem)] px-6 sm:justify-between sm:gap-0 sm:pt-24 sm:pb-24 lg:px-16 max-w-7xl mx-auto w-full"
            style={reduce ? {} : { opacity: heroOpacity }}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:pt-6">
              <div className="max-w-md">
                <p className="t-title-italic text-base sm:text-xl text-white/90 leading-snug">
                  Quiet precision and recovery across the Faculty of Technology
                </p>
                <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-white/60">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400 animate-ping" />
                  <span>06°03′N 80°13′E · {localTime || 'LIVE'}</span>
                </div>
              </div>

              <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
                <button
                  onClick={() => report('lost')}
                  className="btn-liquid flex w-full items-center justify-center gap-3 text-xs tracking-wider uppercase sm:w-auto"
                >
                  <span>Report Misplaced Item</span>
                  <DiamondArrow />
                </button>
                <button
                  onClick={() => report('found')}
                  className="btn-liquid flex w-full items-center justify-center gap-3 text-xs tracking-wider uppercase !bg-transparent hover:!bg-white hover:!text-midnight sm:w-auto"
                >
                  <span>Turn In Found Item</span>
                  <Camera size={14} />
                </button>
              </div>
            </div>

            {/* Giant Monumental Title (Exact match to "ANTARCTICA" in screenshot) */}
            <div className="mt-8 sm:mt-auto sm:pb-10">
              <span className="block text-[11px] uppercase tracking-[0.18em] sm:text-xs sm:tracking-[0.35em] text-white/70 mb-2 font-mono">
                Faculty of Technology · University of Ruhuna
              </span>
              <h1 className="font-extrabold uppercase text-[clamp(3.5rem,17vw,12rem)] sm:text-[clamp(4.5rem,14vw,12rem)] leading-[0.82] text-white tracking-tighter drop-shadow-md">
                Ruhuna
              </h1>
            </div>
          </motion.div>

          {/* White Desert Billowing Cloud / Mist Transition Layer */}
          <div className="mist-gradient-bottom pointer-events-none absolute inset-x-0 bottom-0 z-0 h-28 sm:h-40" />
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            2. "THE LAST CONTINENT" INSPIRED INTRO SECTION (Pure White)
            - Expansive whitespace
            - Italic headline with hand-drawn SVG scribble
            - Indented statement paragraph in uppercase/light typography with scroll scrub
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section ref={introRef} className="relative z-20 bg-white dark:bg-slate-950 py-24 sm:py-32 lg:py-36">
          <div className="mx-auto max-w-6xl px-6 lg:px-12">
            <div className="relative inline-block">
              <p className="t-title-italic text-2xl sm:text-3xl text-midnight dark:text-slate-100">
                The Campus Lost &amp; Found
              </p>
              <div className="mt-1">
                <TitleScribble className="w-56 h-6 text-midnight/35 dark:text-slate-500" />
              </div>
            </div>

            <div className="mt-12 grid gap-14 sm:mt-16 lg:grid-cols-12 lg:items-center">
              <motion.div
                style={reduce ? {} : { opacity: introOpacity }}
                className="lg:col-span-7 sm:pl-4 lg:pl-8 transition-opacity duration-300"
              >
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light text-midnight dark:text-slate-100 leading-relaxed uppercase tracking-wide">
                  Vast, bustling and filled with daily discovery — misplacing a valuable belonging across the Faculty of Technology is common, but leaving it lost is not.
                </h2>

                <div className="mt-10 flex flex-wrap gap-4 pt-6 border-t border-midnight/10 dark:border-white/10">
                  <button
                    onClick={() => report('lost')}
                    className="btn-liquid-dark flex items-center gap-2.5"
                  >
                    <span>Report Misplaced Item</span>
                    <DiamondArrow />
                  </button>
                  <button
                    onClick={() => report('found')}
                    className="btn-liquid-dark flex items-center gap-2.5 !bg-transparent hover:!bg-brand-600 hover:!text-white"
                  >
                    <span>Turn In Found Item</span>
                    <Camera size={14} />
                  </button>
                </div>
              </motion.div>

              <div className="lg:col-span-5">
                <DotLottieReact
                  src="/animation/map.lottie"
                  loop
                  autoplay={!reduce}
                  style={{ width: '100%', height: 'auto' }}
                />
                <div className="mt-4 flex items-center justify-between border-t border-midnight/10 dark:border-white/10 pt-4 font-mono text-[11px] text-midnight/60 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-brand-600 dark:text-brand-300" />
                    06°03′12″ N 80°13′45″ E
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
                    {localTime || 'LIVE'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            3. THE THREE PILLARS OF INTEGRITY (Interactive Custody Protocol)
            - White Desert Expedition Planning / Protocol translation
            - Interactive step tabs with deep editorial description
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="bg-brand-50/50 dark:bg-slate-900 py-24 sm:py-32 border-y border-midnight/10 dark:border-white/10">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="max-w-2xl">
              <span className="font-mono text-xs uppercase tracking-widest text-midnight/60 dark:text-slate-400">
                The Architecture of Recovery
              </span>
              <h2 className="t-title-italic text-3xl sm:text-4xl lg:text-5xl text-midnight dark:text-slate-100 mt-2">
                Three Pillars of Campus Custody
              </h2>
              <div className="mt-2">
                <TitleScribble className="w-56 h-6 text-midnight/35 dark:text-slate-500" />
              </div>
              <p className="mt-4 text-sm sm:text-base text-midnight/75 dark:text-slate-300 leading-relaxed font-light">
                Built to eliminate fraudulent claims and preserve complete dignity for students and staff.
              </p>
            </div>

            {/* Interactive Step Selector Grid */}
            <div className="mt-14 grid gap-8 lg:grid-cols-12 lg:items-start">
              {/* Step Navigation Tabs */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                {PROTOCOL_STEPS.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = activeStepIndex === idx;
                  return (
                    <button
                      key={item.step}
                      onClick={() => setActiveStepIndex(idx)}
                      className={`text-left p-6 rounded-2xl transition-all duration-300 border ${
                        isActive
                          ? 'bg-white dark:bg-slate-900 border-midnight/20 dark:border-white/15 shadow-xl'
                          : 'bg-transparent border-transparent hover:bg-white/60 dark:hover:bg-slate-800/60 text-midnight/70 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-midnight/50 dark:text-slate-400">STEP {item.step}</span>
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                            isActive ? 'bg-midnight dark:bg-brand-600 text-white' : 'bg-midnight/5 dark:bg-white/5 text-midnight/60 dark:text-slate-400'
                          }`}
                        >
                          <Icon size={15} />
                        </div>
                      </div>
                      <h3 className="t-title-italic text-xl text-midnight dark:text-slate-100 mt-2">{item.name}</h3>
                      <p className="text-xs text-midnight/65 dark:text-slate-300 mt-1 font-light">{item.tagline}</p>
                    </button>
                  );
                })}
              </div>

              {/* Active Step Detailed View */}
              <div className="lg:col-span-7">
                <div className="rounded-3xl bg-white dark:bg-slate-900 p-8 sm:p-12 border border-midnight/15 dark:border-white/15 shadow-xl min-h-[380px] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs uppercase tracking-widest text-brand-600 dark:text-brand-300 bg-brand-50 px-3 py-1 rounded-full border border-brand-200 dark:bg-brand-500/15 dark:border-brand-500/30">
                        Protocol Standard {selectedStep.step}
                      </span>
                    </div>

                    <h3 className="t-title-italic text-2xl sm:text-3xl text-midnight dark:text-slate-100 mt-4">
                      {selectedStep.name}
                    </h3>

                    <p className="mt-4 text-sm sm:text-base text-midnight/80 dark:text-slate-300 leading-relaxed font-light">
                      {selectedStep.description}
                    </p>

                    <div className="mt-8 pt-6 border-t border-midnight/10 dark:border-white/10">
                      <p className="font-mono text-xs uppercase tracking-wider text-midnight/60 dark:text-slate-400 mb-3">
                        Security Safeguards:
                      </p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {selectedStep.highlights.map((h, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs text-midnight/85 dark:text-slate-300 bg-brand-50/50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-midnight/5 dark:border-white/10"
                          >
                            <CheckCircle2 size={13} className="text-brand-600 dark:text-brand-400 flex-shrink-0" />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between pt-6 border-t border-midnight/10 dark:border-white/10">
                    <button
                      onClick={() => go('/feed')}
                      className="text-xs font-semibold uppercase tracking-wider text-midnight dark:text-slate-100 hover:underline flex items-center gap-2"
                    >
                      <span>Explore Active Vault Catalog</span>
                      <ArrowRight size={14} />
                    </button>
                    <span className="font-mono text-[11px] text-midnight/40 dark:text-slate-500">
                      SEC PROTOCOL 2026
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            4. TALL PARALLAX BANNER (Mountain Peak interlude from screenshot)
            - Full-bleed panoramic tall photography with scroll scrub
            - Floating narrative text column on the mid-left
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section ref={tallBannerRef} className="relative h-[85vh] min-h-[520px] overflow-hidden bg-midnight">
          <motion.div
            className="absolute inset-0 -top-[20%] -bottom-[20%]"
            style={reduce ? {} : { y: tallY }}
          >
            <img
              src={PARALLAX_IMAGE}
              alt="Curated vault items and campus grounds"
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-midnight/40" />
          </motion.div>

          <div className="relative z-10 flex h-full items-center px-6 lg:px-16 max-w-7xl mx-auto w-full">
            <div className="max-w-md rounded-2xl bg-black/60 p-8 backdrop-blur-xl border border-white/15 text-white">
              <p className="t-title-italic text-lg text-gold-200 mb-2">Our Custody Protocol</p>
              <p className="text-sm sm:text-base leading-relaxed text-white/90 font-light">
                Between lecture halls, the silent library floors, and research laboratories, university security works around the clock. Every find is cataloged in the vault, verified through a secret mark only you know, and collected with an encrypted single-use QR token.
              </p>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            5. "OUR TRIPS" CARD FLICK SECTION (Multi-panel accordion)
            - Direct translation of the Emperor penguins card-flick in screenshot
            - Active panel expands to reveal details, price/status & button
            - 3 vertical photo strips to the right that expand on hover/click
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="bg-white dark:bg-slate-950 py-24 sm:py-32 lg:py-36">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="text-center mb-16">
              <div className="relative inline-block">
                <h2 className="t-title-italic text-3xl sm:text-4xl lg:text-5xl text-midnight dark:text-slate-100">
                  Active Dispatches
                </h2>
                <div className="mt-2 flex justify-center">
                  <TitleScribble className="w-64 h-7 text-midnight/35 dark:text-slate-500" />
                </div>
              </div>
              <p className="mt-4 text-sm text-midnight/70 dark:text-slate-300 max-w-xl mx-auto font-light">
                Recent belongings logged in campus custody. Select any record to review location tags and claim requirements.
              </p>
            </div>

            {/* Horizontal Multi-Panel Accordion (The Card Flick) */}
            <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[560px]">
              {dispatchesLoading &&
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`dispatch-skeleton-${index}`}
                    className="min-h-[380px] lg:min-h-0 flex-1 animate-pulse rounded-2xl border border-midnight/10 dark:border-white/10 bg-slate-200/60 dark:bg-slate-800/60"
                  />
                ))}

              {!dispatchesLoading && dispatchesError && (
                <div className="w-full rounded-2xl border border-rose-300/60 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 p-10 text-center">
                  <p className="text-sm text-rose-700 dark:text-rose-300">
                    Live dispatch feed is unavailable right now.
                  </p>
                  <button
                    onClick={loadDispatches}
                    className="btn-liquid mt-5 flex items-center gap-2 !py-2 !px-4 text-xs"
                  >
                    <span>Retry</span>
                    <DiamondArrow />
                  </button>
                </div>
              )}

              {!dispatchesLoading && !dispatchesError && dispatches.length === 0 && (
                <div className="w-full rounded-2xl border border-midnight/10 dark:border-white/10 bg-slate-50 dark:bg-slate-900 p-12 text-center">
                  <ShieldCheck className="mx-auto text-brand-500" size={30} />
                  <p className="mt-4 font-editorial text-xl italic text-midnight dark:text-slate-100">
                    The vault is quiet for the moment.
                  </p>
                  <p className="mt-2 text-sm text-midnight/60 dark:text-slate-400 font-light">
                    No belongings are currently held in campus custody. Found something? Turn it in and it
                    will appear here instantly.
                  </p>
                  <button
                    onClick={() => (user ? openReport('found') : go('/login?next=%2F'))}
                    className="btn-liquid mt-6 flex items-center gap-2 !py-2.5 !px-5 text-xs"
                  >
                    <span>Turn In Found Item</span>
                    <DiamondArrow />
                  </button>
                </div>
              )}

              {!dispatchesLoading &&
                !dispatchesError &&
                dispatches.map((item, index) => {
                  const isActive = activeFlick === index;
                  return (
                    <div
                      key={item._id}
                      onClick={() => setActiveFlick(index)}
                      className={`card-flick-item relative cursor-pointer overflow-hidden rounded-2xl border border-midnight/10 dark:border-white/10 bg-midnight ${
                        isActive ? 'lg:flex-[3.5] shadow-2xl' : 'lg:flex-1 opacity-90 hover:opacity-100'
                      } min-h-[380px] lg:min-h-0 flex flex-col justify-end p-6 sm:p-8 text-white transition-all duration-500`}
                    >
                      {/* Background Item Image */}
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-midnight to-slate-900" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                      {/* Content Layer */}
                      <div className="relative z-10">
                        <div className="flex items-center justify-between text-xs text-white/70 mb-2 font-mono">
                          <span className="uppercase tracking-wider">{item.category}</span>
                          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] backdrop-blur-md">
                            {dispatchAge(item.createdAt)}
                          </span>
                        </div>

                        <h3 className="t-title-italic text-xl sm:text-2xl text-white">
                          {item.title}
                        </h3>

                        <p className="mt-2 flex items-center gap-1.5 text-xs text-white/80">
                          <MapPin size={13} className="shrink-0 text-gold-300" />
                          <span>{item.location || 'Location withheld'}</span>
                        </p>

                        {/* Expanded Details when Active */}
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            transition={{ duration: 0.4 }}
                            className="mt-4 pt-4 border-t border-white/20"
                          >
                            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-light">
                              {item.description ||
                                'Secured in campus custody awaiting verified owner identification.'}
                            </p>

                            <div className="mt-5 flex items-center justify-between gap-4">
                              <span className="text-xs font-mono text-gold-300">
                                Status: {dispatchStatus(item)}
                              </span>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  go(`/items/${item._id}`);
                                }}
                                className="btn-liquid flex items-center gap-2 !py-2 !px-4 text-xs"
                              >
                                <span>Claim Item</span>
                                <DiamondArrow />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {!dispatchesLoading && !dispatchesError && dispatches.length > 0 && (
              <div className="mt-10 text-center">
                <button
                  onClick={() => go('/feed?type=found')}
                  className="font-mono text-xs uppercase tracking-[0.2em] text-brand-700 dark:text-brand-300 hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
                >
                  View all items in campus custody →
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            7. COMMUNITY PULL-QUOTE SECTION (Patrick Woodhead quote in screenshot)
            - Large quotation mark
            - Inspiring community quote
            - Author signature flourish
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="bg-white dark:bg-slate-950 py-24 sm:py-32 border-t border-midnight/10 dark:border-white/10">
          <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
            <div className="text-6xl font-editorial italic text-midnight/25 dark:text-slate-600 leading-none mb-6">
              “
            </div>

            <p className="t-title-italic text-2xl sm:text-3xl lg:text-4xl text-midnight dark:text-slate-100 font-normal leading-relaxed">
              A university is not just a campus of buildings; it is a shared community of integrity. When a student recovers their misplaced belonging from the guard desk, that trust is reaffirmed.
            </p>

            <div className="mt-10 flex flex-col items-center">
              <TitleScribble className="w-48 h-6 text-midnight/25 dark:text-slate-600" />
              <p className="mt-4 font-semibold text-midnight dark:text-slate-100 text-sm">
                Faculty of Technology Administration
              </p>
              <p className="text-xs text-midnight/50 dark:text-slate-400">
                University of Ruhuna, Sri Lanka
              </p>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            8. "TO THE END OF THE EARTH" FLIGHT PATH & TELEMETRY
            (Exact reproduction of the black globe / flight path section in screenshot)
            - Deep black background
            - Top 3-column coordinates bar
            - Flight path SVG line connecting sectors with animated glow
            - Floating liquid-glass telemetry card on left
            - Floating video/radar instrument card on right
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section
          ref={radarSectionRef}
          className="bg-midnight text-white py-24 sm:py-36 relative overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            {/* Top 3-Column Coordinates Header (Match to screenshot) */}
            <div className="border-b border-white/10 pb-8 mb-16">
              <div className="grid gap-6 md:grid-cols-12 md:items-center text-center md:text-left">
                <div className="md:col-span-4">
                  <p className="font-mono text-xs text-white/50 tracking-wider">
                    06°03′12″ N 80°13′45″ E<br />
                    Matara Campus
                  </p>
                </div>

                <div className="md:col-span-4 text-center">
                  <h3 className="t-title-italic text-2xl sm:text-3xl text-white">
                    To the Heart of the Campus
                  </h3>
                  <p className="text-xs text-white/60 mt-1 font-light">
                    An automated recovery network linking every department around the clock.
                  </p>
                </div>

                <div className="md:col-span-4 text-center md:text-right">
                  <p className="font-mono text-xs text-white/50 tracking-wider">
                    SEC 04 · RUHUNA TECH<br />
                    Central Guard Vault
                  </p>
                </div>
              </div>
            </div>

            {/* Flight Path / Radar Visual Map with Floating Cards */}
            <div className="relative my-8">
              {/* Flight Path SVG Line */}
              <div className="flex justify-center relative">
                <svg
                  className="w-full max-w-2xl h-96 overflow-visible"
                  viewBox="0 0 400 300"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Background Path Track */}
                  <path
                    d="M 50,50 Q 200,80 350,250"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />

                  {/* Animated Flown Path */}
                  <motion.path
                    d="M 50,50 Q 200,80 350,250"
                    stroke="#d55a3c"
                    strokeWidth="2"
                    style={{ pathLength: flightPathLength }}
                  />

                  {/* Start Point: Student Origin */}
                  <circle cx="50" cy="50" r="5" fill="#d55a3c" />
                  <circle cx="50" cy="50" r="12" stroke="#d55a3c" strokeWidth="1" opacity="0.4" className="animate-ping" />
                  <text x="65" y="55" fill="white" fontSize="11" fontFamily="sans-serif">Report Ingested</text>

                  {/* End Point: Central Vault */}
                  <circle cx="350" cy="250" r="6" fill="#f3b619" />
                  <circle cx="350" cy="250" r="16" stroke="#f3b619" strokeWidth="1" opacity="0.4" className="animate-ping" />
                  <text x="240" y="275" fill="#f3b619" fontSize="11" fontFamily="sans-serif">Verified Guard Vault</text>
                </svg>
              </div>

              {/* Floating Cards (Match to screenshot: Left Telemetry Card + Right Video Card) */}
              <div className="grid gap-6 md:grid-cols-12 mt-8 lg:-mt-24 relative z-20">
                {/* Left: Floating Liquid Glass Telemetry Card */}
                <div className="md:col-span-5 lg:col-span-4">
                  <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-2xl border border-white/15 shadow-2xl">
                    <div>
                      <p className="t-title-italic text-white/70 text-xs">Average Reconnection Time</p>
                      <h4 className="text-2xl font-light text-white mt-1">03:20 hrs</h4>
                    </div>

                    <div className="my-3 border-b border-white/10 border-dashed" />

                    <div>
                      <p className="t-title-italic text-white/70 text-xs">Monitored Campus Sectors</p>
                      <h4 className="text-2xl font-light text-white mt-1">6 Active Zones</h4>
                    </div>

                    <div className="my-3 border-b border-white/10 border-dashed" />

                    <div>
                      <p className="t-title-italic text-white/70 text-xs">Custody Verification Rate</p>
                      <h4 className="text-2xl font-light text-white mt-1">99.4% Verified</h4>
                    </div>
                  </div>
                </div>

                {/* Right: Floating Sonar Radar Video Instrument Card */}
                <div className="md:col-span-7 lg:col-span-5 md:ml-auto">
                  <div className="rounded-2xl bg-white/5 p-5 backdrop-blur-2xl border border-white/15 shadow-2xl">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <Radio size={14} className="text-rose-400 animate-pulse" />
                        <span className="font-mono text-[11px] text-white uppercase tracking-wider">
                          Active Sonar Radar
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-gold-400 bg-gold-500/10 px-2 py-0.5 rounded border border-gold-500/25">
                        Live 24/7
                      </span>
                    </div>

                    <div className="my-3 h-48 rounded-xl bg-black/50 overflow-hidden flex items-center justify-center border border-white/5">
                      <DotLottieReact
                        src="/animation/Sonar_Radar.lottie"
                        loop
                        autoplay
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>

                    <button
                      onClick={() => go('/feed')}
                      className="btn-liquid w-full justify-center text-xs tracking-wider uppercase mt-2"
                    >
                      <span>Explore Live Feed Radar</span>
                      <DiamondArrow />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            9. CUSTODY GUARDIANS — live security roster from the database
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="bg-white dark:bg-slate-950 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="text-center mb-16">
              <span className="font-mono text-xs uppercase tracking-widest text-midnight/60 dark:text-slate-400">
                Custody Guardians
              </span>
              <h2 className="t-title-italic text-3xl sm:text-4xl lg:text-5xl text-midnight dark:text-slate-100 mt-2">
                Safeguarding Campus Property
              </h2>
              <div className="mt-2 flex justify-center">
                <TitleScribble className="w-56 h-6 text-midnight/35 dark:text-slate-500" />
              </div>
              <p className="mt-4 text-sm text-midnight/70 dark:text-slate-300 max-w-xl mx-auto font-light">
                Meet the registered security officers who hold the vault lockers, verify secret-mark
                proofs, and execute handovers every day.
              </p>
            </div>

            {guardsError ? (
              <p className="text-center text-sm text-midnight/60 dark:text-slate-400">
                The security roster is unavailable right now. Please refresh in a moment.
              </p>
            ) : guardsLoading ? (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-3xl border border-midnight/10 dark:border-white/10 bg-brand-50/50 dark:bg-slate-900 p-6 sm:p-8 animate-pulse"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-midnight/10 dark:bg-white/10" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-32 rounded bg-midnight/10 dark:bg-white/10" />
                        <div className="h-3 w-24 rounded bg-midnight/10 dark:bg-white/10" />
                      </div>
                    </div>
                    <div className="mt-6 h-9 rounded-lg bg-midnight/10 dark:bg-white/10" />
                    <div className="mt-4 h-3 w-full rounded bg-midnight/10 dark:bg-white/10" />
                  </div>
                ))}
              </div>
            ) : guards.length === 0 ? (
              <p className="text-center text-sm text-midnight/60 dark:text-slate-400">
                No security officers are registered yet.
              </p>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {guards.map((officer) => (
                  <div
                    key={officer.id}
                    className="rounded-3xl border border-midnight/10 dark:border-white/10 bg-brand-50/50 dark:bg-slate-900 p-6 sm:p-8 flex flex-col justify-between hover:shadow-xl transition-all duration-300"
                  >
                    <div>
                      <div className="flex items-center gap-4">
                        {officer.avatar ? (
                          <img
                            src={officer.avatar}
                            alt={officer.name}
                            loading="lazy"
                            className="h-14 w-14 rounded-full object-cover border-2 border-white shadow-md dark:border-slate-700"
                          />
                        ) : (
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-base font-extrabold text-white">
                            {initials(officer.name)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-semibold text-midnight dark:text-slate-100 text-base truncate">
                            {officer.name}
                          </h3>
                          <p className="text-xs text-midnight/60 dark:text-slate-400">Security Officer</p>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between gap-3 text-[11px] font-mono border-y border-midnight/10 dark:border-white/10 py-2.5">
                        <span className="truncate text-midnight/60 dark:text-slate-400">{officer.email}</span>
                        <span className="shrink-0 text-brand-600 dark:text-brand-300 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 dark:bg-brand-500/15 dark:border-brand-500/30">
                          {officer.since ? `Since ${officer.since}` : 'Officer'}
                        </span>
                      </div>

                      <dl className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-midnight/5 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 p-3">
                          <dt className="font-mono text-[10px] uppercase tracking-wider text-midnight/50 dark:text-slate-400">
                            In custody
                          </dt>
                          <dd className="mt-1 text-lg font-semibold text-midnight dark:text-slate-100">
                            {officer.itemsInCustody}
                            <span className="ml-1 text-[11px] font-normal text-midnight/50 dark:text-slate-400">
                              items
                            </span>
                          </dd>
                        </div>
                        <div className="rounded-xl border border-midnight/5 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 p-3">
                          <dt className="font-mono text-[10px] uppercase tracking-wider text-midnight/50 dark:text-slate-400">
                            Handovers
                          </dt>
                          <dd className="mt-1 text-lg font-semibold text-midnight dark:text-slate-100">
                            {officer.handoversCompleted}
                            <span className="ml-1 text-[11px] font-normal text-midnight/50 dark:text-slate-400">
                              approved
                            </span>
                          </dd>
                        </div>
                      </dl>

                      <p className="mt-5 flex items-center gap-2 text-xs text-midnight/70 dark:text-slate-300">
                        <Phone size={12} className="text-brand-600 dark:text-brand-300" />
                        <span className="font-mono">
                          {officer.mobileNumber || 'Contact via campus desk'}
                        </span>
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-midnight/10 dark:border-white/10 flex items-center justify-between text-[10px] font-mono text-midnight/50 dark:text-slate-400">
                      <span>SECURITY DIVISION</span>
                      <span className="text-brand-600 dark:text-brand-300 flex items-center gap-1 font-semibold">
                        <ShieldCheck size={12} /> VERIFIED CUSTODIAN
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            10. FREQUENTLY ASKED QUESTIONS & GUIDES
            - Editorial interactive FAQ accordion
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="bg-brand-50/50 dark:bg-slate-900 py-24 sm:py-32 border-t border-midnight/10 dark:border-white/10">
          <div className="mx-auto max-w-4xl px-6 lg:px-12">
            <div className="text-center mb-16">
              <span className="font-mono text-xs uppercase tracking-widest text-midnight/60 dark:text-slate-400">
                Protocol &amp; Answers
              </span>
              <h2 className="t-title-italic text-3xl sm:text-4xl lg:text-5xl text-midnight dark:text-slate-100 mt-2">
                Frequently Asked Questions
              </h2>
              <div className="mt-2 flex justify-center">
                <TitleScribble className="w-56 h-6 text-midnight/35 dark:text-slate-500" />
              </div>
              <p className="mt-4 text-sm text-midnight/70 dark:text-slate-300 max-w-md mx-auto font-light">
                Everything you need to know regarding reporting, privacy protections, and physical locker custody.
              </p>
            </div>

            <div className="divide-y divide-midnight/10 dark:divide-white/10 border-y border-midnight/10 dark:border-white/10">
              {FAQS.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div key={index} className="py-6 transition-colors">
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                      className="flex w-full items-center justify-between text-left group"
                    >
                      <span className="t-title-italic text-lg sm:text-xl text-midnight dark:text-slate-100 group-hover:text-midnight/80 dark:group-hover:text-slate-200">
                        {faq.q}
                      </span>
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center transition-transform duration-300 ${
                          isOpen ? 'rotate-180 bg-midnight dark:bg-brand-600 text-white' : 'bg-midnight/5 dark:bg-white/5 text-midnight dark:text-slate-100'
                        }`}
                      >
                        <ChevronDown size={14} />
                      </div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <p className="mt-4 text-sm text-midnight/80 dark:text-slate-300 leading-relaxed font-light pr-8">
                            {faq.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            11. "START PLANNING YOUR ADVENTURE" BANNER (From screenshot)
            - Panoramic full-bleed photo
            - Centered call to action
            - Liquid glass button
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="relative h-[65vh] min-h-[440px] overflow-hidden bg-midnight flex items-center justify-center text-center">
          <img
            src={HERO_IMAGE}
            alt="Faculty of Technology campus"
            className="absolute inset-0 h-full w-full object-cover filter brightness-75"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/45" />

          <div className="relative z-10 max-w-2xl px-6">
            <h2 className="t-title-italic text-4xl sm:text-5xl lg:text-6xl text-white">
              Start your recovery
            </h2>

            <p className="mt-4 text-base text-white/80 max-w-md mx-auto font-light">
              Misplaced something today? Report it now so the auto-match engine can pair it with incoming vault custody records.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => report('lost')}
                className="btn-liquid flex items-center justify-center gap-3 text-xs tracking-wider uppercase !py-3.5 !px-8"
              >
                <span>Report Misplaced Item</span>
                <DiamondArrow />
              </button>
              <button
                onClick={() => report('found')}
                className="btn-liquid flex items-center justify-center gap-3 text-xs tracking-wider uppercase !py-3.5 !px-8 !bg-transparent hover:!bg-white hover:!text-midnight"
              >
                <span>Turn In Found Item</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          12. MONUMENTAL FOOTER (White Desert signature bottom in screenshot)
          - Gigantic "RUHUNA TECH" letters spanning the entire screen width
          - Clean navigational links and credits
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Footer />
    </div>
  );
}

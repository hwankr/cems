"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import {
  ArrowLeft,
  Coins,
  Gauge,
  Gift,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from "lucide-react";
import mapboxgl from "mapbox-gl";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./game-preview.module.css";

type Status = "saving" | "neutral" | "overuse";
type View = "campus" | "hunt";

type Building = {
  id: string;
  name: string;
  shortName: string;
  lng: number;
  lat: number;
  status: Status;
  savingsRate: number;
  guardianLevel: number;
  buff: number;
  stage: number;
  rewards: number;
  rank: number;
  fallback: { left: string; top: string };
};

const BUILDINGS: Building[] = [
  { id: "yu-it", name: "IT관", shortName: "IT", lng: 128.75859, lat: 35.83393, status: "saving", savingsRate: 9.3, guardianLevel: 18, buff: 4, stage: 12, rewards: 3, rank: 1, fallback: { left: "68%", top: "28%" } },
  { id: "yu-mechanical", name: "기계관", shortName: "ME", lng: 128.75663, lat: 35.83437, status: "overuse", savingsRate: -6.9, guardianLevel: 11, buff: 1, stage: 8, rewards: 0, rank: 4, fallback: { left: "28%", top: "22%" } },
  { id: "yu-humanities", name: "인문관", shortName: "HM", lng: 128.75921, lat: 35.83172, status: "saving", savingsRate: 12.5, guardianLevel: 16, buff: 5, stage: 11, rewards: 2, rank: 2, fallback: { left: "77%", top: "72%" } },
  { id: "yu-library", name: "중앙도서관", shortName: "LIB", lng: 128.757416, lat: 35.83287, status: "neutral", savingsRate: -4.4, guardianLevel: 14, buff: 2, stage: 10, rewards: 1, rank: 3, fallback: { left: "49%", top: "50%" } },
];

const STATUS: Record<Status, { label: string; marker: string; copy: string }> = {
  saving: { label: "절약 중", marker: "⚡", copy: "예측 사용량보다 낮게 유지되고 있습니다." },
  neutral: { label: "관찰 중", marker: "🛡️", copy: "절약 목표선 근처에서 움직이고 있습니다." },
  overuse: { label: "과사용", marker: "💧", copy: "예측 사용량을 초과해 공동 버프가 낮아졌습니다." },
};

export function GamePreview({ mapboxToken }: { mapboxToken: string }) {
  const [view, setView] = useState<View>("campus");
  const [selectedId, setSelectedId] = useState(BUILDINGS[0].id);
  const [points, setPoints] = useState(2480);
  const [power, setPower] = useState(120);
  const [speed, setSpeed] = useState(1.4);
  const [battle, setBattle] = useState({ hp: 146, maxHp: 146, kills: 18, materials: 86, hit: 0 });

  const building = useMemo(
    () => BUILDINGS.find((item) => item.id === selectedId) ?? BUILDINGS[0],
    [selectedId],
  );
  const damage = Math.round(power * (1 + building.buff / 100) * 0.18);
  const powerCost = 320 + Math.floor((power - 120) / 12) * 160;
  const speedCost = 480 + Math.round((speed - 1.4) * 10) * 210;

  useEffect(() => {
    if (view !== "hunt") return;
    const timer = window.setInterval(() => {
      setBattle((current) => {
        if (current.hp <= damage) {
          const maxHp = Math.round(146 + (current.kills + 1) * 3.5);
          return { hp: maxHp, maxHp, kills: current.kills + 1, materials: current.materials + 3, hit: current.hit + 1 };
        }
        return { ...current, hp: current.hp - damage, hit: current.hit + 1 };
      });
    }, Math.max(280, Math.round(1050 / speed)));
    return () => window.clearInterval(timer);
  }, [damage, speed, view]);

  const upgrade = (kind: "power" | "speed") => {
    const cost = kind === "power" ? powerCost : speedCost;
    if (points < cost) return;
    setPoints((value) => value - cost);
    if (kind === "power") setPower((value) => value + 12);
    else setSpeed((value) => Number((value + 0.1).toFixed(1)));
  };

  return (
    <main className="min-h-screen bg-[#07120f] p-3 text-emerald-50 sm:p-5">
      <header className="mx-auto mb-3 flex max-w-[1500px] flex-col gap-4 border border-emerald-200/15 bg-[#091a15]/90 p-4 shadow-2xl backdrop-blur lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="inline-flex items-center gap-2 border border-emerald-200/15 px-3 py-2 text-xs text-emerald-100/70 hover:bg-emerald-300/10">
            <ArrowLeft size={15} /> 기존 대시보드
          </Link>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 to-sky-400 text-[#04110d] shadow-[0_0_32px_rgba(52,211,153,.28)]">
            <Zap size={22} fill="currentColor" />
          </span>
          <div>
            <p className="text-[10px] font-black tracking-[.16em] text-emerald-300">INTERACTION PROTOTYPE</p>
            <h1 className="mt-1 text-xl font-bold sm:text-2xl">캠퍼스 에너지 RPG</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <HeaderStat icon={<Coins size={16} />} label="성장 포인트" value={`${points.toLocaleString()} P`} />
          <HeaderStat icon={<Trophy size={16} />} label="공과대학" value="주간 1위" />
        </div>
      </header>

      <nav className="mx-auto mb-3 flex w-fit max-w-[1500px] border border-emerald-200/10 bg-[#091a15] p-1">
        <Tab active={view === "campus"} icon={<MapPinned size={16} />} onClick={() => setView("campus")}>캠퍼스 월드</Tab>
        <Tab active={view === "hunt"} icon={<Swords size={16} />} onClick={() => setView("hunt")}>자동 사냥</Tab>
      </nav>

      {view === "campus" ? (
        <CampusView token={mapboxToken} building={building} selectedId={selectedId} onSelect={setSelectedId} onHunt={() => setView("hunt")} />
      ) : (
        <HuntView building={building} battle={battle} damage={damage} points={points} power={power} speed={speed} powerCost={powerCost} speedCost={speedCost} onBack={() => setView("campus")} onUpgrade={upgrade} />
      )}
    </main>
  );
}

function CampusView({ token, building, selectedId, onSelect, onHunt }: { token: string; building: Building; selectedId: string; onSelect: (id: string) => void; onHunt: () => void }) {
  return (
    <section className="mx-auto grid max-w-[1500px] gap-3 lg:grid-cols-[minmax(0,1fr)_390px]">
      <div className="relative min-h-[690px] overflow-hidden border border-emerald-200/15 bg-[#0b211a] shadow-2xl">
        <div className="pointer-events-none absolute left-4 top-4 z-10 border border-white/10 bg-[#030d0b]/80 px-4 py-3 backdrop-blur">
          <p className="text-[10px] font-black tracking-[.15em] text-emerald-300">● LIVE CAMPUS</p>
          <strong className="mt-1 block text-xs">건물을 선택해 수호자와 사냥터를 확인하세요</strong>
        </div>
        <CampusMap token={token} selectedId={selectedId} onSelect={onSelect} />
        <div className="absolute bottom-4 left-4 z-10 flex gap-3 border border-white/10 bg-[#030d0b]/80 px-3 py-2 text-[10px] text-emerald-50/70 backdrop-blur">
          <Legend color="bg-emerald-400">절약</Legend><Legend color="bg-amber-400">관찰</Legend><Legend color="bg-rose-400">과사용</Legend>
        </div>
      </div>

      <aside className="border border-emerald-200/15 bg-[#091a15] p-5 shadow-2xl">
        <div className="grid grid-cols-[112px_1fr] items-center gap-4 border-b border-emerald-200/10 pb-4">
          <div className={`${styles.guardianAura} ${styles[building.status]}`}>
            <div className={styles.guardian}><Zap size={44} fill="currentColor" /></div>
            <b>Lv.{building.guardianLevel}</b>
          </div>
          <div>
            <p className="text-[10px] font-black tracking-[.15em] text-emerald-300">BUILDING GUARDIAN</p>
            <h2 className="mt-1 text-xl font-bold">{building.name} 수호자</h2>
            <p className="mt-2 text-xs leading-5 text-emerald-50/55">실제 절약 상태가 캐릭터 표정과 공동 버프로 반영됩니다.</p>
          </div>
        </div>

        <div className={`${styles.statusBox} ${styles[building.status]}`}>
          <div className="flex items-center justify-between"><span>{STATUS[building.status].label}</span><strong>{building.savingsRate > 0 ? "+" : ""}{building.savingsRate.toFixed(1)}%</strong></div>
          <p>{STATUS[building.status].copy}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Metric icon={<Swords size={17} />} label="사냥터 단계" value={`${building.stage} 스테이지`} />
          <Metric icon={<ShieldCheck size={17} />} label="공동 버프" value={`공격력 +${building.buff}%`} />
          <Metric icon={<Trophy size={17} />} label="주간 순위" value={`#${building.rank}`} />
          <Metric icon={<Gift size={17} />} label="미수령 보상" value={`${building.rewards}개`} />
        </div>

        <div className="mt-3 flex items-center gap-3 border border-sky-300/15 bg-sky-400/5 p-3">
          <Sparkles className="text-sky-300" size={20} />
          <div><span className="block text-[10px] text-emerald-50/55">오프라인 사냥 6시간 24분</span><strong className="mt-1 block text-xs">철 조각 82개 · 코어 3개</strong></div>
        </div>

        <button type="button" onClick={onHunt} className="mt-4 flex min-h-13 w-full items-center justify-center gap-2 bg-gradient-to-r from-emerald-400 to-green-500 font-black text-[#04110d] shadow-lg transition hover:-translate-y-0.5">
          <Swords size={19} /> {building.name} 사냥터 입장
        </button>
        <p className="mt-3 text-center text-[10px] leading-4 text-emerald-50/35">지도에서는 상태와 진입점만 제공하고, 전투는 별도 장면으로 전환합니다.</p>
      </aside>
    </section>
  );
}

function CampusMap({ token, selectedId, onSelect }: { token: string; selectedId: string; onSelect: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef(new Map<string, { marker: mapboxgl.Marker; el: HTMLButtonElement }>());

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({ accessToken: token, container: containerRef.current, center: [128.757416, 35.83287], zoom: 15.4, pitch: 60, bearing: -24, antialias: true, style: "mapbox://styles/mapbox/standard", config: { basemap: { theme: "monochrome", lightPreset: "dusk" } } });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");

    BUILDINGS.forEach((building) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `${styles.marker} ${styles[building.status]}${building.id === selectedId ? ` ${styles.selected}` : ""}`;
      el.innerHTML = `<span>${STATUS[building.status].marker}</span><b>Lv.${building.guardianLevel}</b><small>${building.shortName}</small>${building.rewards ? `<i>${building.rewards}</i>` : ""}`;
      el.addEventListener("click", () => onSelect(building.id));
      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat([building.lng, building.lat]).addTo(map);
      markersRef.current.set(building.id, { marker, el });
    });

    return () => { markersRef.current.forEach(({ marker }) => marker.remove()); markersRef.current.clear(); map.remove(); mapRef.current = null; };
  }, [onSelect, token]);

  useEffect(() => {
    markersRef.current.forEach(({ el }, id) => el.classList.toggle(styles.selected, id === selectedId));
    const selected = BUILDINGS.find((item) => item.id === selectedId);
    if (selected && mapRef.current) mapRef.current.flyTo({ center: [selected.lng, selected.lat], zoom: 16.1, duration: 800, essential: true });
  }, [selectedId]);

  if (!token) {
    return (
      <div className={styles.mockMap}>
        <div className="absolute right-4 top-4 z-[2] border border-amber-300/20 bg-amber-950/70 px-3 py-2 text-[10px] text-amber-200">Mapbox 토큰 연결 시 실제 캠퍼스 지도 표시</div>
        {BUILDINGS.map((building) => (
          <button key={building.id} type="button" onClick={() => onSelect(building.id)} style={building.fallback} className={`${styles.marker} ${styles[building.status]} ${building.id === selectedId ? styles.selected : ""}`}>
            <span>{STATUS[building.status].marker}</span><b>Lv.{building.guardianLevel}</b><small>{building.shortName}</small>{building.rewards ? <i>{building.rewards}</i> : null}
          </button>
        ))}
      </div>
    );
  }
  return <div className="absolute inset-0" ref={containerRef} />;
}

function HuntView({ building, battle, damage, points, power, speed, powerCost, speedCost, onBack, onUpgrade }: { building: Building; battle: { hp: number; maxHp: number; kills: number; materials: number; hit: number }; damage: number; points: number; power: number; speed: number; powerCost: number; speedCost: number; onBack: () => void; onUpgrade: (kind: "power" | "speed") => void }) {
  const hp = Math.max(0, Math.min(100, (battle.hp / battle.maxHp) * 100));
  return (
    <section className="mx-auto grid max-w-[1500px] gap-3 lg:grid-cols-[minmax(0,1fr)_390px]">
      <div className="overflow-hidden border border-emerald-200/15 bg-[#091a15] shadow-2xl">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-emerald-200/10 p-3">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 border border-emerald-200/15 px-3 py-2 text-xs text-emerald-50/70"><ArrowLeft size={15} /> 캠퍼스로</button>
          <div><span className="block text-[10px] font-black tracking-[.13em] text-emerald-300">{building.name}</span><strong className="text-xs">스테이지 {building.stage} · 대기전력 지대</strong></div>
          <span className="border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-black tracking-[.15em] text-emerald-300">● AUTO</span>
        </div>
        <div className={styles.scene}>
          <div className={styles.enemyHud}><div><span>대기전력 슬라임</span><b>{battle.hp} / {battle.maxHp}</b></div><div><i style={{ width: `${hp}%` }} /></div></div>
          <div className={styles.hero}><small>내 캐릭터 · Lv.14</small><div><Zap size={52} fill="currentColor" /></div></div>
          <div key={battle.hit} className={styles.monster}><em>-{damage}</em><small>대기전력 슬라임</small><div><span>●</span><span>●</span><i /></div></div>
          <div className={styles.ticker}><Sparkles size={15} /> 자동 사냥 중 · 처치 {battle.kills} · 철 조각 {battle.materials}</div>
        </div>
        <div className="grid sm:grid-cols-3"><Summary icon={<Swords size={18} />} label="예상 DPS" value={Math.round(power * speed * 1.04)} /><Summary icon={<ShieldCheck size={18} />} label="건물 버프" value={`+${building.buff}%`} /><Summary icon={<Gift size={18} />} label="이번 세션" value={`${battle.materials} 재료`} /></div>
      </div>

      <aside className="border border-emerald-200/15 bg-[#091a15] p-5 shadow-2xl">
        <div className="flex justify-between border-b border-emerald-200/10 pb-4"><div><p className="text-[10px] font-black tracking-[.15em] text-emerald-300">CHARACTER GROWTH</p><h2 className="mt-1 text-xl font-bold">캐릭터 강화</h2></div><b className="h-fit border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">{points.toLocaleString()} P</b></div>
        <div className="my-3 grid grid-cols-[66px_1fr] items-center gap-3 border border-emerald-200/10 bg-white/[.025] p-3"><div className={styles.miniHero}><Zap size={38} fill="currentColor" /></div><div><span className="text-[10px] text-emerald-50/50">에너지 레인저</span><strong className="block text-sm">전투력 {Math.round(power * speed * 10)}</strong><small className="text-amber-200">⚙️ 터빈 브로치</small></div></div>
        <Upgrade icon={<Swords size={19} />} label="힘" value={`${power}`} detail="한 번의 공격 피해량 증가" cost={powerCost} disabled={points < powerCost} onClick={() => onUpgrade("power")} />
        <Upgrade icon={<Gauge size={19} />} label="스피드" value={`${speed.toFixed(1)}회/초`} detail="공격 주기와 연출 속도 증가" cost={speedCost} disabled={points < speedCost} onClick={() => onUpgrade("speed")} />
        <div className="mt-3 flex gap-3 border border-sky-300/15 bg-sky-400/5 p-3 text-sky-200"><Coins size={19} /><div><strong className="text-xs">포인트와 사냥 재료 분리</strong><p className="mt-1 text-[10px] leading-4 text-sky-100/50">강화 포인트는 실제 절약 성과에서, 자동 사냥은 장비 재료에서 획득합니다.</p></div></div>
        <button type="button" className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 border border-emerald-200/15 bg-white/[.03] text-xs text-emerald-50/75"><Sparkles size={17} /> 장비 · 액세서리 관리</button>
      </aside>
    </section>
  );
}

function HeaderStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="grid min-w-36 grid-cols-[auto_1fr] items-center gap-x-2 border border-emerald-200/10 bg-white/[.025] px-3 py-2 text-emerald-300">{icon}<span className="text-[10px] text-emerald-50/45">{label}</span><strong className="col-span-2 mt-1 text-xs text-white">{value}</strong></div>; }
function Tab({ active, icon, onClick, children }: { active: boolean; icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`flex items-center gap-2 px-4 py-2 text-xs ${active ? "bg-emerald-300 font-black text-[#04110d]" : "text-emerald-50/45"}`}>{icon}{children}</button>; }
function Legend({ color, children }: { color: string; children: React.ReactNode }) { return <span className="flex items-center gap-1"><i className={`h-2 w-2 rounded-full ${color}`} />{children}</span>; }
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex min-h-16 items-center gap-2 border border-emerald-200/10 bg-white/[.025] p-2"><span className="grid h-8 w-8 place-items-center bg-emerald-400/10 text-emerald-300">{icon}</span><div><p className="text-[10px] text-emerald-50/45">{label}</p><strong className="text-xs">{value}</strong></div></div>; }
function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) { return <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 border-r border-t border-emerald-200/10 p-4 text-emerald-300">{icon}<span className="text-[10px] text-emerald-50/45">{label}</span><strong className="col-start-2 text-sm text-white">{value}</strong></div>; }
function Upgrade({ icon, label, value, detail, cost, disabled, onClick }: { icon: React.ReactNode; label: string; value: string; detail: string; cost: number; disabled: boolean; onClick: () => void }) { return <div className="mt-2 grid grid-cols-[38px_1fr_auto] items-center gap-2 border border-emerald-200/10 bg-white/[.025] p-3"><span className="grid h-9 w-9 place-items-center bg-emerald-400/10 text-emerald-300">{icon}</span><div><strong className="text-xs">{label} <i className="not-italic text-emerald-300">{value}</i></strong><p className="text-[9px] text-emerald-50/40">{detail}</p></div><button type="button" disabled={disabled} onClick={onClick} className="border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-bold text-emerald-200 disabled:opacity-30">강화<small className="block text-[8px] opacity-60">{cost.toLocaleString()} P</small></button></div>; }

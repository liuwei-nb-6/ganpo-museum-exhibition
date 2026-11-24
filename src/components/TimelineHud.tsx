import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Music } from 'lucide-react';
import type { Artifact, StampRecord } from '../types/museum';
import { soundEngine } from '../audio/soundEngine';

interface TimelineHudProps {
  artifacts: Artifact[];
  activeArtifact: Artifact;
  stamps: Record<string, StampRecord>;
  onSelectArtifact: (a: Artifact) => void;
  onInspect: () => void;
  onBack: () => void;
}

const ERAS: Array<{ id: 'ALL' | Artifact['dynastyGroup']; label: string }> = [
  { id: 'ALL', label: '全纪年' },
  { id: '商周', label: '商周古国' },
  { id: '两汉', label: '大汉海昏' },
  { id: '宋元', label: '宋元雅工' },
  { id: '明清民国', label: '明清民国' },
];

export const TimelineHud: React.FC<TimelineHudProps> = ({
  artifacts,
  activeArtifact,
  stamps,
  onSelectArtifact,
  onInspect,
  onBack,
}) => {
  const [era, setEra] = useState<'ALL' | Artifact['dynastyGroup']>('ALL');
  const railRef = useRef<HTMLDivElement | null>(null);

  const sorted = useMemo(() => {
    const list = [...artifacts].sort((a, b) => a.yearSort - b.yearSort || a.index - b.index);
    return era === 'ALL' ? list : list.filter((a) => a.dynastyGroup === era);
  }, [artifacts, era]);

  const currentIdx = Math.max(
    0,
    sorted.findIndex((a) => a.id === activeArtifact.id)
  );

  const stepEra = (dir: 1 | -1) => {
    if (!sorted.length) return;
    const next = sorted[(currentIdx + dir + sorted.length) % sorted.length];
    soundEngine.playRelicSummon();
    onSelectArtifact(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        stepEra(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        stepEra(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        soundEngine.playUiConfirm();
        onInspect();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIdx, sorted, onBack, onInspect]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && railRef.current) {
      railRef.current.scrollLeft += e.deltaY * 1.1;
    }
  };

  const yearDisplay =
    activeArtifact.yearSort < 0
      ? `公元前 ${Math.abs(activeArtifact.yearSort)} 年`
      : `公元 ${activeArtifact.yearSort} 年`;

  return (
    <div className="timeline-game-hud">
      {/* Top Bar */}
      <header className="game-top-bar">
        <div className="game-top-left">
          <button type="button" className="hud-bevel-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>返回</span>
            <kbd className="hide-mobile">ESC</kbd>
          </button>
          <div className="inspect-header-title">
            <span className="inspect-hall-kicker">CHRONICLE ORBIT · 三千年纪年星轨</span>
            <h1>赣鄱三千年三维长卷</h1>
          </div>
        </div>

        <div className="timeline-era-tabs">
          {ERAS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`era-tab-btn ${era === item.id ? 'is-active' : ''}`}
              onClick={() => {
                setEra(item.id);
                const nextList =
                  item.id === 'ALL'
                    ? [...artifacts].sort((a, b) => a.yearSort - b.yearSort)
                    : artifacts
                        .filter((a) => a.dynastyGroup === item.id)
                        .sort((a, b) => a.yearSort - b.yearSort);
                if (nextList.length) {
                  soundEngine.playRelicSummon();
                  onSelectArtifact(nextList[0]);
                }
                railRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Left Floating Giant Era Stamp & Active Relic Callout */}
      <div className="timeline-hero-badge">
        <div className="timeline-big-year">{yearDisplay}</div>
        <div className="timeline-big-dynasty">
          {activeArtifact.dynasty} · {activeArtifact.museum === '江西省博物馆' ? '江西省博' : '海昏侯馆'}
        </div>
        <h2>{activeArtifact.name}</h2>
        <p>「{activeArtifact.tagline}」</p>
        <button
          type="button"
          className="hud-primary-action"
          onClick={() => {
            soundEngine.playUiConfirm();
            onInspect();
          }}
        >
          <Eye size={15} />
          <span>鉴赏此件真迹</span>
          <kbd className="hide-mobile">ENTER</kbd>
        </button>
      </div>

      {/* Bottom Interactive 3D-Linked Chronological Scrubber Rail */}
      <div className="timeline-bottom-rail-wrap">
        <button type="button" className="slot-step-btn" onClick={() => stepEra(-1)} aria-label="上一纪年">
          <ChevronLeft size={18} />
        </button>

        <div className="timeline-scrubber" ref={railRef} onWheel={handleWheel}>
          <div className="timeline-scrubber-track">
            <div className="scrubber-gold-wire" aria-hidden="true" />
            {sorted.map((art) => {
              const active = art.id === activeArtifact.id;
              const stamped = Boolean(stamps[art.id]);
              const yr = art.yearSort < 0 ? `前${Math.abs(art.yearSort)}` : `${art.yearSort}`;
              return (
                <button
                  key={art.id}
                  type="button"
                  className={`chrono-node ${active ? 'is-active' : ''}`}
                  onClick={() => {
                    if (!active) {
                      soundEngine.playRelicSummon();
                      onSelectArtifact(art);
                    } else {
                      soundEngine.playUiConfirm();
                      onInspect();
                    }
                  }}
                >
                  <div className="chrono-node-top">
                    <span className="chrono-diamond" />
                    <span className="chrono-year">{yr}</span>
                    <span className="chrono-dyn">{art.dynasty}</span>
                  </div>

                  <div className="chrono-node-card">
                    <img src={art.thumbUrl} alt={art.name} />
                    <div className="chrono-node-meta">
                      <strong>{art.name.replace(/^[^·]+·/, '')}</strong>
                      <span>
                        {art.material}
                        {art.instrument ? ' · 古乐' : ''}
                        {stamped ? ' · 已印' : ''}
                      </span>
                    </div>
                    {art.instrument && <Music size={12} className="chrono-music-ico" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button type="button" className="slot-step-btn" onClick={() => stepEra(1)} aria-label="下一纪年">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

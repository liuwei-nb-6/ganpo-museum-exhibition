import React, { useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Music,
  Stamp,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Grid,
  Clock,
} from 'lucide-react';
import type { Artifact, HallId, StampRecord } from '../types/museum';
import { HALLS } from '../data/galleries';
import { soundEngine } from '../audio/soundEngine';

interface HallStageHudProps {
  activeHallId: HallId;
  activeArtifact: Artifact;
  artifacts: Artifact[];
  stamps: Record<string, StampRecord>;
  ambientOn: boolean;
  isFullscreen: boolean;
  onSelectHall: (hallId: HallId) => void;
  onSelectArtifact: (a: Artifact) => void;
  onEnterInspect: () => void;
  onBackTitle: () => void;
  onOpenTimeline: () => void;
  onOpenCodex: () => void;
  onOpenBlindBox: () => void;
  onOpenPassport: () => void;
  onToggleAmbient: () => void;
  onToggleFullscreen: () => void;
}

const ROMAN = ['I', 'II', 'III', 'IV'];

export const HallStageHud: React.FC<HallStageHudProps> = ({
  activeHallId,
  activeArtifact,
  artifacts,
  stamps,
  ambientOn,
  isFullscreen,
  onSelectHall,
  onSelectArtifact,
  onEnterInspect,
  onBackTitle,
  onOpenTimeline,
  onOpenCodex,
  onOpenBlindBox,
  onOpenPassport,
  onToggleAmbient,
  onToggleFullscreen,
}) => {
  const hallArtifacts = artifacts.filter((a) => a.hallId === activeHallId);
  const currentHall = HALLS.find((h) => h.id === activeHallId) || HALLS[0];
  const slotIdx = Math.max(
    0,
    hallArtifacts.findIndex((a) => a.id === activeArtifact.id)
  );
  const stampedCount = Object.keys(stamps).length;

  const stepRelic = (dir: 1 | -1) => {
    if (!hallArtifacts.length) return;
    const next = hallArtifacts[(slotIdx + dir + hallArtifacts.length) % hallArtifacts.length];
    soundEngine.playRelicSummon();
    onSelectArtifact(next);
  };

  // Keyboard shortcuts: Left/Right or A/D to swap relic, Enter to inspect, Esc back to Title
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        stepRelic(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        stepRelic(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        soundEngine.playUiConfirm();
        onEnterInspect();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onBackTitle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slotIdx, hallArtifacts, onEnterInspect, onBackTitle]);

  return (
    <div className="hall-stage-hud">
      {/* TOP GAME HUD BAR */}
      <header className="game-top-bar">
        <div className="game-top-left">
          <button
            type="button"
            className="hud-bevel-btn"
            onClick={() => {
              soundEngine.playUiHover();
              onBackTitle();
            }}
          >
            <ArrowLeft size={14} />
            <span>主界面</span>
            <kbd className="hide-mobile">ESC</kbd>
          </button>
        </div>

        {/* Center 4-Realm Hall Selector */}
        <nav className="hall-realm-tabs" role="tablist" aria-label="切换四大展殿">
          {HALLS.map((h, i) => {
            const active = h.id === activeHallId;
            const hallItems = artifacts.filter((a) => a.hallId === h.id);
            const hallDone = hallItems.filter((a) => stamps[a.id]).length;
            return (
              <button
                key={h.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`realm-tab ${active ? 'is-active' : ''}`}
                onClick={() => {
                  if (h.id !== activeHallId) {
                    soundEngine.playRelicSummon();
                    onSelectHall(h.id);
                  }
                }}
              >
                <span className="realm-roman">{ROMAN[i]}</span>
                <span className="realm-name">{h.title}</span>
                <span className="realm-prog">
                  {hallDone}/{hallItems.length}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Top-Right RPG Utility HUD */}
        <div className="game-top-right">
          <button
            type="button"
            className="hud-diamond-btn hide-mobile"
            onClick={() => {
              soundEngine.playUiConfirm();
              onOpenTimeline();
            }}
            title="三千年星轨"
          >
            <Clock size={15} />
          </button>
          <button
            type="button"
            className="hud-diamond-btn hide-mobile"
            onClick={() => {
              soundEngine.playUiConfirm();
              onOpenCodex();
            }}
            title="博物影神图"
          >
            <Grid size={15} />
          </button>
          <button
            type="button"
            className="hud-diamond-btn hide-mobile"
            onClick={() => {
              soundEngine.playUiConfirm();
              onOpenBlindBox();
            }}
            title="天机奇珍匣"
          >
            <Sparkles size={15} />
          </button>

          <button
            type="button"
            className="hud-seal-counter"
            onClick={() => {
              soundEngine.playUiConfirm();
              onOpenPassport();
            }}
            title="打开观展印鉴簿"
          >
            <Stamp size={14} className="seal-red-ico" />
            <span>
              {stampedCount}/{artifacts.length}
            </span>
          </button>

          <button
            type="button"
            className={`hud-diamond-btn ${ambientOn ? 'is-active' : ''}`}
            onClick={onToggleAmbient}
            title="环境古乐开关"
          >
            {ambientOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          <button
            type="button"
            className="hud-diamond-btn hide-mobile"
            onClick={onToggleFullscreen}
            title="大屏全屏"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </header>

      {/* LEFT FLOATING RELIC LORE CALLOUT (Zero heavy boxes!) */}
      <div className="hall-left-plaque">
        <div className="hall-realm-subtitle">
          {currentHall.numberLabel} · {currentHall.title} — {currentHall.subtitle}
        </div>

        <div className="relic-tag-strip">
          <span className="tag-gold">{activeArtifact.dynasty}</span>
          <span className="tag-dim">{activeArtifact.material}</span>
          <span className="tag-dim">{activeArtifact.code}</span>
          {stamps[activeArtifact.id] && <span className="tag-vermilion">已钤印</span>}
        </div>

        <h2 className="hall-relic-name">{activeArtifact.name}</h2>
        <div className="hall-relic-en">{activeArtifact.englishName}</div>
        <p className="hall-relic-quote">「{activeArtifact.tagline}」</p>

        <div className="hall-relic-meta-lines">
          <div>
            <span>馆藏</span>
            <strong>{activeArtifact.museum}</strong>
          </div>
          <div>
            <span>尺寸</span>
            <strong>{activeArtifact.dimensions.label}</strong>
          </div>
        </div>

        <div className="hall-cta-group">
          <button
            type="button"
            className="hud-primary-action"
            onClick={() => {
              soundEngine.playUiConfirm();
              onEnterInspect();
            }}
          >
            <Eye size={16} />
            <span>深度鉴宝 · 展卷详考</span>
            <kbd className="hide-mobile">ENTER</kbd>
          </button>

          {activeArtifact.instrument && (
            <button
              type="button"
              className="hud-secondary-action"
              onClick={() => {
                soundEngine.playUiConfirm();
                onEnterInspect();
              }}
            >
              <Music size={15} />
              <span>可试奏古乐</span>
            </button>
          )}
        </div>
      </div>

      {/* RIGHT SUBTLE ORBIT HINT */}
      <div className="hall-right-hint hide-mobile">
        <div className="hall-curatorial-note">
          <div className="note-kicker">策展导语</div>
          <p>{currentHall.curatorialNote}</p>
        </div>
        <div className="orbit-gesture-tip">
          ◆ 拖拽大殿可自由旋转细观 · 滚轮缩放真迹
        </div>
      </div>

      {/* BOTTOM RPG RELIC SLOT CAROUSEL */}
      <footer className="hall-bottom-dock">
        <button
          type="button"
          className="slot-step-btn"
          onClick={() => stepRelic(-1)}
          aria-label="上一件文物"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="relic-slots-row" role="listbox" aria-label="本厅珍宝槽位">
          {hallArtifacts.map((art, i) => {
            const selected = art.id === activeArtifact.id;
            const stamped = Boolean(stamps[art.id]);
            return (
              <button
                key={art.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`relic-slot ${selected ? 'is-selected' : ''}`}
                onClick={() => {
                  if (!selected) {
                    soundEngine.playRelicSummon();
                    onSelectArtifact(art);
                  }
                }}
              >
                <div className="relic-slot-img">
                  <img src={art.thumbUrl} alt={art.name} />
                  <span className="slot-num">0{i + 1}</span>
                  {art.instrument && (
                    <span className="slot-music-dot" title="可试奏古乐">
                      <Music size={10} />
                    </span>
                  )}
                  {stamped && <span className="slot-seal-mark" title="已钤印">印</span>}
                </div>
                <div className="relic-slot-info">
                  <span className="slot-dynasty">{art.dynasty}</span>
                  <strong>{art.name.replace(/^[^·]+·/, '')}</strong>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="slot-step-btn"
          onClick={() => stepRelic(1)}
          aria-label="下一件文物"
        >
          <ChevronRight size={18} />
        </button>
      </footer>
    </div>
  );
};

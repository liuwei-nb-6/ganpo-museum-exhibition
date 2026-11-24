import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Flashlight,
  Ruler,
  Sun,
  RotateCcw,
  RefreshCw,
  Music,
  Play,
  Square,
  Stamp,
  BookOpen,
  History,
  Crosshair,
  Sparkles,
  ScrollText,
  X,
} from 'lucide-react';
import type { Artifact, Hotspot, LightingPreset, StampRecord } from '../types/museum';
import { ARTIFACT_MAP } from '../data/artifacts';
import { HALL_MAP } from '../data/galleries';
import { soundEngine } from '../audio/soundEngine';
import { SealStampSvg } from './SealStampSvg';

interface InspectHudProps {
  artifact: Artifact;
  allArtifacts: Artifact[];
  stampRecord?: StampRecord;
  lighting: LightingPreset;
  flashlightOn: boolean;
  scaleRefOn: boolean;
  showHotspots: boolean;
  autoRotate: boolean;
  loreOpen: boolean;
  activeHotspot: Hotspot | null;
  onBack: () => void;
  onSelectArtifact: (a: Artifact) => void;
  onToggleHotspots: () => void;
  onToggleFlashlight: () => void;
  onToggleScaleRef: () => void;
  onCycleLighting: () => void;
  onToggleAutoRotate: () => void;
  onResetCamera: () => void;
  onToggleLore: () => void;
  onSelectHotspot: (h: Hotspot | null) => void;
  onStampArtifact: (artifactId: string, hotspotId?: string) => void;
  onTriggerPulse: () => void;
}

const LIGHTING_LABELS: Record<LightingPreset, string> = {
  gallery: '暗场聚光',
  warm: '展柜暖金',
  daylight: '自然鉴真',
};

const INSTRUMENT_KEYS = ['Q', 'W', 'E', 'R', 'T', 'Y'];

export const InspectHud: React.FC<InspectHudProps> = ({
  artifact,
  allArtifacts,
  stampRecord,
  lighting,
  flashlightOn,
  scaleRefOn,
  showHotspots,
  autoRotate,
  loreOpen,
  activeHotspot,
  onBack,
  onSelectArtifact,
  onToggleHotspots,
  onToggleFlashlight,
  onToggleScaleRef,
  onCycleLighting,
  onToggleAutoRotate,
  onResetCamera,
  onToggleLore,
  onSelectHotspot,
  onStampArtifact,
  onTriggerPulse,
}) => {
  const [dossierTab, setDossierTab] = useState<'overview' | 'stories' | 'hotspots'>('overview');
  const [musicDeckOpen, setMusicDeckOpen] = useState<boolean>(Boolean(artifact.instrument));
  const [useSideStrike, setUseSideStrike] = useState(false);
  const [activeNoteIdx, setActiveNoteIdx] = useState<number | null>(null);
  const [isPlayingMelody, setIsPlayingMelody] = useState(false);
  const [justStamped, setJustStamped] = useState(false);

  const hall = HALL_MAP[artifact.hallId];
  const isStamped = Boolean(stampRecord);
  const idxInAll = allArtifacts.findIndex((a) => a.id === artifact.id);
  const prevArt = allArtifacts[(idxInAll - 1 + allArtifacts.length) % allArtifacts.length];
  const nextArt = allArtifacts[(idxInAll + 1) % allArtifacts.length];

  useEffect(() => {
    setMusicDeckOpen(Boolean(artifact.instrument));
    setUseSideStrike(false);
    setActiveNoteIdx(null);
    setIsPlayingMelody(false);
    setDossierTab('overview');
    soundEngine.stopMelody();
    return () => soundEngine.stopMelody();
  }, [artifact.id, artifact.instrument]);

  const triggerStamp = (hotspotId?: string) => {
    const already = isStamped;
    onStampArtifact(artifact.id, hotspotId);
    if (!already) {
      soundEngine.playSealStamp();
      setJustStamped(true);
      setTimeout(() => setJustStamped(false), 2600);
    }
  };

  const handlePlayNote = (idx: number) => {
    if (!artifact.instrument) return;
    const inst = artifact.instrument;
    const note = inst.notes[idx];
    if (!note) return;

    soundEngine.stopMelody();
    setIsPlayingMelody(false);
    setActiveNoteIdx(idx);
    onTriggerPulse();

    if (inst.type === 'bianzhong') {
      soundEngine.playBianzhong(
        useSideStrike && note.altFreq ? note.altFreq : note.freq,
        useSideStrike
      );
    } else if (inst.type === 'sheng') {
      soundEngine.playSheng(note.chord || [note.freq, note.freq * 1.498]);
    } else {
      soundEngine.playPaixiao(note.freq);
    }

    if (!isStamped) triggerStamp();
    window.setTimeout(() => {
      setActiveNoteIdx((cur) => (cur === idx ? null : cur));
    }, 550);
  };

  const handleToggleMelody = () => {
    if (!artifact.instrument) return;
    const inst = artifact.instrument;
    if (isPlayingMelody) {
      soundEngine.stopMelody();
      setIsPlayingMelody(false);
      setActiveNoteIdx(null);
      return;
    }

    setIsPlayingMelody(true);
    if (!isStamped) triggerStamp();
    soundEngine.playMelody(inst.type, inst.notes, inst.melodySequence, (stepIdx) => {
      setActiveNoteIdx(stepIdx);
      if (stepIdx !== null) {
        onTriggerPulse();
      } else {
        setIsPlayingMelody(false);
      }
    });
  };

  const stepHotspot = (dir: 1 | -1) => {
    const list = artifact.hotspots;
    if (!list.length) return;
    const cur = activeHotspot ? list.findIndex((h) => h.id === activeHotspot.id) : -1;
    const next = cur === -1 ? 0 : (cur + dir + list.length) % list.length;
    onSelectHotspot(list[next]);
  };

  // True Game Hotkeys: 1-5 action bar, Tab Lore Scroll, Esc Back, Q-Y instrument keys!
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        soundEngine.playUiHover();
        onToggleLore();
      } else if (e.key === '1') {
        onToggleHotspots();
      } else if (e.key === '2') {
        onToggleFlashlight();
      } else if (e.key === '3') {
        onToggleScaleRef();
      } else if (e.key === '4') {
        onCycleLighting();
      } else if (e.key === '5' && artifact.instrument) {
        setMusicDeckOpen((v) => !v);
      } else if (e.key === 'r' || e.key === 'R') {
        onResetCamera();
      } else if (artifact.instrument && musicDeckOpen) {
        const keyIdx = INSTRUMENT_KEYS.indexOf(e.key.toUpperCase());
        if (keyIdx !== -1 && keyIdx < artifact.instrument.notes.length) {
          handlePlayNote(keyIdx);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    artifact,
    musicDeckOpen,
    useSideStrike,
    isStamped,
    onBack,
    onToggleLore,
    onToggleHotspots,
    onToggleFlashlight,
    onToggleScaleRef,
    onCycleLighting,
    onResetCamera,
  ]);

  return (
    <div className="inspect-hud-layer">
      {/* TOP BAR */}
      <header className="game-top-bar is-inspect">
        <div className="game-top-left">
          <button
            type="button"
            className="hud-bevel-btn"
            onClick={() => {
              soundEngine.playUiHover();
              onBack();
            }}
          >
            <ArrowLeft size={14} />
            <span>退回展殿</span>
            <kbd className="hide-mobile">ESC</kbd>
          </button>

          <div className="inspect-header-title">
            <span className="inspect-hall-kicker">
              {hall.numberLabel} · {hall.title} · {artifact.code}
            </span>
            <h1>{artifact.name}</h1>
          </div>
        </div>

        <div className="game-top-right">
          <button
            type="button"
            className="hud-diamond-btn"
            onClick={() => {
              soundEngine.playRelicSummon();
              onSelectArtifact(prevArt);
            }}
            title={`上一件：${prevArt.name}`}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="hud-diamond-btn"
            onClick={() => {
              soundEngine.playRelicSummon();
              onSelectArtifact(nextArt);
            }}
            title={`下一件：${nextArt.name}`}
          >
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            className={`hud-bevel-btn ${isStamped ? 'is-vermilion' : ''}`}
            onClick={() => triggerStamp()}
          >
            <Stamp size={14} />
            <span>{isStamped ? '已钤朱印' : '钤印入册'}</span>
          </button>

          <button
            type="button"
            className={`hud-bevel-btn ${loreOpen ? 'is-gold-active' : ''}`}
            onClick={() => {
              soundEngine.playUiHover();
              onToggleLore();
            }}
          >
            <ScrollText size={14} />
            <span>{loreOpen ? '收起卷宗' : '展卷详考'}</span>
            <kbd className="hide-mobile">TAB</kbd>
          </button>
        </div>
      </header>

      {/* SEAL STAMPED CELEBRATION TOAST */}
      {justStamped && (
        <div className="game-stamp-toast" role="status">
          <SealStampSvg text={artifact.sealText} size={44} variant="vermilion" />
          <div>
            <strong>钤印落成 · 「{artifact.sealText}」</strong>
            <span>已收录至观展印鉴簿</span>
          </div>
        </div>
      )}

      {/* ACTIVE HOTSPOT GUIDED PLAQUE */}
      {activeHotspot && (
        <div className={`game-hotspot-callout ${loreOpen ? 'has-lore-open' : ''}`}>
          <div className="callout-head">
            <div className="callout-title">
              <Crosshair size={14} />
              <span>
                看点 {artifact.hotspots.findIndex((h) => h.id === activeHotspot.id) + 1}/
                {artifact.hotspots.length} · {activeHotspot.label}
              </span>
            </div>
            <div className="callout-nav">
              <button type="button" onClick={() => stepHotspot(-1)} title="上一处">
                <ChevronLeft size={14} />
              </button>
              <button type="button" onClick={() => stepHotspot(1)} title="下一处">
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectHotspot(null);
                  onResetCamera();
                }}
              >
                全景
              </button>
            </div>
          </div>
          <p>{activeHotspot.summary}</p>
        </div>
      )}

      {/* FEATURE ④: FLOATING PLAYABLE ANCIENT INSTRUMENT DECK */}
      {artifact.instrument && musicDeckOpen && (
        <div className={`game-music-deck ${loreOpen ? 'has-lore-open' : ''}`}>
          <div className="music-deck-top">
            <div className="music-deck-title">
              <Music size={14} />
              <strong>{artifact.instrument.title}</strong>
            </div>

            <div className="music-deck-controls">
              {artifact.instrument.dualTone && (
                <div className="deck-strike-switch">
                  <button
                    type="button"
                    className={!useSideStrike ? 'is-active' : ''}
                    onClick={() => setUseSideStrike(false)}
                  >
                    正鼓音
                  </button>
                  <button
                    type="button"
                    className={useSideStrike ? 'is-active' : ''}
                    onClick={() => setUseSideStrike(true)}
                  >
                    侧鼓音 (+三度)
                  </button>
                </div>
              )}

              <button
                type="button"
                className={`deck-melody-btn ${isPlayingMelody ? 'is-playing' : ''}`}
                onClick={handleToggleMelody}
              >
                {isPlayingMelody ? <Square size={12} /> : <Play size={12} />}
                <span>{isPlayingMelody ? '停奏' : '一键奏古曲'}</span>
              </button>

              <button
                type="button"
                className="deck-close-btn"
                onClick={() => setMusicDeckOpen(false)}
                aria-label="收起古乐台"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="music-deck-keys">
            {artifact.instrument.notes.map((n, idx) => (
              <button
                key={n.id}
                type="button"
                className={`deck-key ${activeNoteIdx === idx ? 'is-struck' : ''}`}
                onClick={() => handlePlayNote(idx)}
              >
                <kbd className="hide-mobile">{INSTRUMENT_KEYS[idx]}</kbd>
                <strong>{n.label}</strong>
                <span>{n.sublabel}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BOTTOM RPG SKILL HOTBAR */}
      <div className={`game-skill-hotbar ${loreOpen ? 'has-lore-open' : ''}`} role="toolbar">
        <button
          type="button"
          className={`skill-slot ${showHotspots ? 'is-active' : ''}`}
          onClick={onToggleHotspots}
        >
          <kbd className="hide-mobile">1</kbd>
          <MapPin size={16} />
          <span>3D看点</span>
        </button>

        <button
          type="button"
          className={`skill-slot ${flashlightOn ? 'is-active is-radiant' : ''}`}
          onClick={onToggleFlashlight}
        >
          <kbd className="hide-mobile">2</kbd>
          <Flashlight size={16} />
          <span>斜光手电</span>
        </button>

        <button
          type="button"
          className={`skill-slot ${scaleRefOn ? 'is-active' : ''}`}
          onClick={onToggleScaleRef}
        >
          <kbd className="hide-mobile">3</kbd>
          <Ruler size={16} />
          <span>真实比例</span>
        </button>

        <button type="button" className="skill-slot" onClick={onCycleLighting}>
          <kbd className="hide-mobile">4</kbd>
          <Sun size={16} />
          <span>{LIGHTING_LABELS[lighting]}</span>
        </button>

        {artifact.instrument && (
          <button
            type="button"
            className={`skill-slot ${musicDeckOpen ? 'is-active is-radiant' : ''}`}
            onClick={() => setMusicDeckOpen((v) => !v)}
          >
            <kbd className="hide-mobile">5</kbd>
            <Music size={16} />
            <span>古乐试奏</span>
          </button>
        )}

        <button
          type="button"
          className={`skill-slot hide-xs ${autoRotate ? 'is-active' : ''}`}
          onClick={onToggleAutoRotate}
        >
          <RefreshCw size={15} />
          <span>缓转</span>
        </button>

        <button
          type="button"
          className="skill-slot"
          onClick={() => {
            onSelectHotspot(null);
            onResetCamera();
          }}
        >
          <kbd className="hide-mobile">R</kbd>
          <RotateCcw size={15} />
          <span>复位</span>
        </button>
      </div>

      {/* RIGHT FLOATING TRANSLUCENT LORE SCROLL ("展卷详考") */}
      {loreOpen && (
        <aside className="game-lore-scroll">
          <div className="lore-scroll-inner">
            <div className="lore-top-header">
              <div className="lore-tags">
                <span className="tag-gold">{artifact.dynasty}</span>
                <span className="tag-dim">{artifact.museum}</span>
                <span className="tag-dim">{artifact.material}</span>
              </div>
              <button
                type="button"
                className="lore-close-btn show-mobile-only"
                onClick={onToggleLore}
                aria-label="收起卷宗"
              >
                <X size={16} />
              </button>
            </div>

            <div className="lore-title-block">
              <div>
                <h2>{artifact.name}</h2>
                <div className="lore-en">{artifact.englishName}</div>
              </div>
              <button
                type="button"
                className={`lore-seal-btn ${isStamped ? 'is-stamped' : ''}`}
                onClick={() => triggerStamp()}
              >
                <SealStampSvg
                  text={artifact.sealText}
                  size={50}
                  variant={isStamped ? 'vermilion' : 'gold'}
                />
                <span>{isStamped ? '已钤印' : '钤印'}</span>
              </button>
            </div>

            <p className="lore-quote">「{artifact.tagline}」</p>

            {/* Archive Attributes */}
            <div className="lore-attrs">
              <div>
                <span>年代</span>
                <strong>{artifact.eraSpan}</strong>
              </div>
              <div>
                <span>工艺</span>
                <strong>{artifact.materialDetail}</strong>
              </div>
              <div className="is-span2">
                <span>来历</span>
                <strong>{artifact.provenance}</strong>
              </div>
              <div className="is-span2">
                <span>实测尺寸</span>
                <strong>{artifact.dimensions.label}</strong>
              </div>
            </div>

            {/* Lore Section Tabs */}
            <div className="lore-tabs" role="tablist">
              <button
                type="button"
                className={dossierTab === 'overview' ? 'is-active' : ''}
                onClick={() => setDossierTab('overview')}
              >
                <BookOpen size={13} /> 简介来历
              </button>
              <button
                type="button"
                className={dossierTab === 'stories' ? 'is-active' : ''}
                onClick={() => setDossierTab('stories')}
              >
                <History size={13} /> 历史故事
              </button>
              <button
                type="button"
                className={dossierTab === 'hotspots' ? 'is-active' : ''}
                onClick={() => setDossierTab('hotspots')}
              >
                <Crosshair size={13} /> 部位看点
              </button>
            </div>

            {dossierTab === 'overview' && (
              <div className="lore-body">
                <div className="lore-entry">
                  <h4>器物简介</h4>
                  <p>{artifact.brief}</p>
                </div>
                <div className="lore-entry">
                  <h4>身世考源</h4>
                  <p>{artifact.origin}</p>
                </div>
                <div className="lore-craft-callout">
                  <span>
                    <Sparkles size={12} /> 工艺绝技
                  </span>
                  <p>{artifact.craftHighlight}</p>
                </div>
              </div>
            )}

            {dossierTab === 'stories' && (
              <div className="lore-body">
                {artifact.stories.map((st, idx) => (
                  <div key={st.title} className="lore-story-item">
                    <div className="lore-story-idx">轶闻 · 0{idx + 1}</div>
                    <h4>{st.title}</h4>
                    <p>{st.content}</p>
                  </div>
                ))}
              </div>
            )}

            {dossierTab === 'hotspots' && (
              <div className="lore-body">
                {artifact.hotspots.map((h, idx) => (
                  <button
                    key={h.id}
                    type="button"
                    className={`lore-hotspot-btn ${activeHotspot?.id === h.id ? 'is-active' : ''}`}
                    onClick={() => {
                      if (!showHotspots) onToggleHotspots();
                      onSelectHotspot(h);
                    }}
                  >
                    <span className="lore-hs-num">{idx + 1}</span>
                    <div>
                      <strong>{h.label}</strong>
                      <p>{h.summary}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Cross-linked Artifacts */}
            <div className="lore-related">
              <div className="lore-related-kicker">◆ 延伸寻踪 · 隔空对话</div>
              {artifact.related.map((rel) => {
                const target = ARTIFACT_MAP[rel.id];
                if (!target) return null;
                return (
                  <button
                    key={rel.id}
                    type="button"
                    className="lore-rel-row"
                    onClick={() => {
                      soundEngine.playRelicSummon();
                      onSelectArtifact(target);
                    }}
                  >
                    <img src={target.thumbUrl} alt={target.name} />
                    <div>
                      <strong>{target.name}</strong>
                      <p>{rel.reason}</p>
                    </div>
                    <ChevronRight size={15} />
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};

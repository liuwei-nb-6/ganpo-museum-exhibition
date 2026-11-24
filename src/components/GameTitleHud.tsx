import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Maximize2, Minimize2, ArrowUpRight, Music } from 'lucide-react';
import type { Artifact } from '../types/museum';
import { PROLOGUE_ARTIFACTS } from '../data/artifacts';
import { soundEngine } from '../audio/soundEngine';

export type TitleCommand = 'hall' | 'timeline' | 'codex' | 'blindbox' | 'passport';

interface GameTitleHudProps {
  activeArtifact: Artifact;
  stampedCount: number;
  totalCount: number;
  ambientOn: boolean;
  isFullscreen: boolean;
  onSelectCenterpiece: (a: Artifact) => void;
  onCommand: (cmd: TitleCommand) => void;
  onInspectDirect: (a: Artifact) => void;
  onToggleAmbient: () => void;
  onToggleFullscreen: () => void;
}

export const GameTitleHud: React.FC<GameTitleHudProps> = ({
  activeArtifact,
  stampedCount,
  totalCount,
  ambientOn,
  isFullscreen,
  onSelectCenterpiece,
  onCommand,
  onInspectDirect,
  onToggleAmbient,
  onToggleFullscreen,
}) => {
  const [focusedIdx, setFocusedIdx] = useState(0);

  const menuItems: Array<{ id: TitleCommand; label: string; sub: string; badge?: string }> = [
    { id: 'hall', label: '踏入藏珍殿', sub: 'ENTER THE SANCTUARY · 四厅实景选宝' },
    { id: 'timeline', label: '三千年星轨', sub: 'CHRONICLE ORBIT · 商代至民国纪年' },
    { id: 'codex', label: '博物影神图', sub: 'RELIC CODEX · 二十件馆藏图鉴' },
    { id: 'blindbox', label: '天机奇珍匣', sub: 'MYSTERY RELIC · 启封今日有缘国宝' },
    {
      id: 'passport',
      label: '观展印鉴簿',
      sub: 'SEAL ARCHIVE · 钤印收藏与藏书票',
      badge: `${stampedCount}/${totalCount}`,
    },
  ];

  // Authentic AAA game keyboard menu navigation (ArrowUp / ArrowDown / Enter)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        soundEngine.playUiHover();
        setFocusedIdx((i) => (i + 1) % menuItems.length);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        soundEngine.playUiHover();
        setFocusedIdx((i) => (i - 1 + menuItems.length) % menuItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        soundEngine.playUiConfirm();
        onCommand(menuItems[focusedIdx].id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusedIdx, onCommand]);

  return (
    <div className="game-title-hud">
      {/* Top-right minimal system controls */}
      <div className="hud-corner-tools">
        <button
          type="button"
          className={`hud-diamond-btn ${ambientOn ? 'is-active' : ''}`}
          onClick={onToggleAmbient}
          title={ambientOn ? '关闭大殿环境古乐' : '开启大殿环境古乐'}
        >
          {ambientOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <button
          type="button"
          className="hud-diamond-btn hide-mobile"
          onClick={onToggleFullscreen}
          title={isFullscreen ? '退出全屏' : '进入全屏沉浸'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Left AAA Game Title & Command List */}
      <div className="title-menu-column">
        <div className="title-crest-header">
          <div className="title-vermilion-seal" aria-hidden="true">
            <span>双馆</span>
            <span>秘藏</span>
          </div>
          <div>
            <div className="title-eyebrow">江西省博物馆 × 海昏侯博物馆 · 三维典藏</div>
            <h1 className="game-main-title">赣鄱千年</h1>
            <div className="game-main-en">CHRONICLES OF GANPO · 3D RELIC SANCTUARY</div>
          </div>
        </div>

        <nav className="game-command-list" aria-label="主菜单">
          {menuItems.map((item, idx) => {
            const focused = idx === focusedIdx;
            return (
              <button
                key={item.id}
                type="button"
                className={`game-command-item ${focused ? 'is-focused' : ''}`}
                onMouseEnter={() => {
                  if (focusedIdx !== idx) {
                    setFocusedIdx(idx);
                    soundEngine.playUiHover();
                  }
                }}
                onClick={() => {
                  soundEngine.playUiConfirm();
                  onCommand(item.id);
                }}
              >
                <span className="cmd-marker" aria-hidden="true">
                  {focused ? '◆' : '◇'}
                </span>
                <span className="cmd-body">
                  <strong className="cmd-label">{item.label}</strong>
                  <small className="cmd-sub">{item.sub}</small>
                </span>
                {item.badge && <span className="cmd-badge">{item.badge}</span>}
              </button>
            );
          })}
        </nav>

        <div className="title-key-hints hide-mobile">
          <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
          <span><kbd>ENTER</kbd> 确认</span>
          <span>共收录 20 件馆藏三维真迹</span>
        </div>
      </div>

      {/* Bottom-right Subtle Live Altar Plaque & Hero Relic Switcher */}
      <div className="title-altar-plaque">
        <div className="altar-plaque-meta">
          <span className="altar-dynasty">{activeArtifact.dynasty}</span>
          <span>·</span>
          <span>{activeArtifact.museum === '江西省博物馆' ? '江西省博' : '海昏侯馆'}</span>
          {activeArtifact.instrument && (
            <span className="altar-music-tag">
              <Music size={11} /> 古乐
            </span>
          )}
        </div>

        <button
          type="button"
          className="altar-plaque-title"
          onClick={() => {
            soundEngine.playUiConfirm();
            onInspectDirect(activeArtifact);
          }}
        >
          <span>{activeArtifact.name}</span>
          <ArrowUpRight size={17} />
        </button>

        <div className="altar-switcher-dots" role="tablist" aria-label="切换镇殿展品">
          {PROLOGUE_ARTIFACTS.map((art) => {
            const active = art.id === activeArtifact.id;
            return (
              <button
                key={art.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`altar-dot-btn ${active ? 'is-active' : ''}`}
                onClick={() => {
                  soundEngine.playRelicSummon();
                  onSelectCenterpiece(art);
                }}
                title={art.name}
              >
                <span className="altar-dot-diamond" />
                <span className="altar-dot-name">
                  {art.name.replace(/^[^·]+·/, '').slice(0, 6)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

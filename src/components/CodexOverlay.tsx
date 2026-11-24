import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, X, Music, Eye } from 'lucide-react';
import type { Artifact, MaterialCategory, MuseumName, StampRecord } from '../types/museum';
import { soundEngine } from '../audio/soundEngine';

interface CodexOverlayProps {
  artifacts: Artifact[];
  stamps: Record<string, StampRecord>;
  onSelectInspect: (a: Artifact) => void;
  onBack: () => void;
}

const MATERIALS: Array<'ALL' | MaterialCategory> = [
  'ALL',
  '青铜',
  '玉器',
  '金银',
  '漆器',
  '陶瓷',
  '竹木乐器',
];

export const CodexOverlay: React.FC<CodexOverlayProps> = ({
  artifacts,
  stamps,
  onSelectInspect,
  onBack,
}) => {
  const [query, setQuery] = useState('');
  const [museumFilter, setMuseumFilter] = useState<'ALL' | MuseumName>('ALL');
  const [materialFilter, setMaterialFilter] = useState<'ALL' | MaterialCategory>('ALL');
  const [specialFilter, setSpecialFilter] = useState<'ALL' | 'music' | 'unstamped'>('ALL');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return artifacts.filter((a) => {
      if (museumFilter !== 'ALL' && a.museum !== museumFilter) return false;
      if (materialFilter !== 'ALL' && a.material !== materialFilter) return false;
      if (specialFilter === 'music' && !a.instrument) return false;
      if (specialFilter === 'unstamped' && stamps[a.id]) return false;
      if (q) {
        const hay = `${a.name} ${a.dynasty} ${a.museum} ${a.material} ${a.tagline} ${a.provenance}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [artifacts, query, museumFilter, materialFilter, specialFilter, stamps]);

  return (
    <div className="codex-game-overlay">
      <div className="codex-shell">
        <header className="codex-header">
          <div className="game-top-left">
            <button type="button" className="hud-bevel-btn" onClick={onBack}>
              <ArrowLeft size={14} />
              <span>返回</span>
              <kbd className="hide-mobile">ESC</kbd>
            </button>
            <div className="inspect-header-title">
              <span className="inspect-hall-kicker">RELIC CODEX · 博物影神图</span>
              <h1>赣鄱双馆三维全图鉴（{filtered.length}/{artifacts.length}）</h1>
            </div>
          </div>

          <div className="codex-search">
            <Search size={15} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="检索文物名、朝代、铭文或材质..."
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="清除搜索">
                <X size={14} />
              </button>
            )}
          </div>
        </header>

        <div className="codex-filter-bar">
          <div className="codex-filter-row">
            {(['ALL', '江西省博物馆', '南昌汉代海昏侯国遗址博物馆'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`codex-chip ${museumFilter === m ? 'is-active' : ''}`}
                onClick={() => setMuseumFilter(m)}
              >
                {m === 'ALL' ? '双馆全录' : m === '江西省博物馆' ? '江西省博 (10)' : '海昏侯馆 (10)'}
              </button>
            ))}
            <span className="codex-sep">|</span>
            {MATERIALS.map((mat) => (
              <button
                key={mat}
                type="button"
                className={`codex-chip ${materialFilter === mat ? 'is-active' : ''}`}
                onClick={() => setMaterialFilter(mat)}
              >
                {mat === 'ALL' ? '全材质' : mat}
              </button>
            ))}
            <span className="codex-sep">|</span>
            <button
              type="button"
              className={`codex-chip ${specialFilter === 'music' ? 'is-active' : ''}`}
              onClick={() => setSpecialFilter((v) => (v === 'music' ? 'ALL' : 'music'))}
            >
              可试奏古乐 (3)
            </button>
            <button
              type="button"
              className={`codex-chip ${specialFilter === 'unstamped' ? 'is-active' : ''}`}
              onClick={() => setSpecialFilter((v) => (v === 'unstamped' ? 'ALL' : 'unstamped'))}
            >
              未钤印
            </button>
          </div>
        </div>

        <div className="codex-scroll-wrap">
          <div className="codex-scroll-grid">
            {filtered.map((art) => {
            const stamped = Boolean(stamps[art.id]);
            return (
              <div
                key={art.id}
                role="button"
                tabIndex={0}
                className={`codex-card ${stamped ? 'is-stamped' : ''}`}
                onMouseEnter={() => soundEngine.playUiHover()}
                onClick={() => {
                  soundEngine.playRelicSummon();
                  onSelectInspect(art);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    soundEngine.playRelicSummon();
                    onSelectInspect(art);
                  }
                }}
              >
                <div className="codex-card-thumb">
                  <img src={art.thumbUrl} alt={art.name} loading="lazy" />
                  <span className="codex-code">{art.code}</span>
                  {art.instrument && (
                    <span className="codex-music-badge">
                      <Music size={10} /> 古乐
                    </span>
                  )}
                  {stamped && <span className="codex-seal-badge">印</span>}
                  <div className="codex-hover-enter">
                    <Eye size={13} /> 传召入台
                  </div>
                </div>
                <div className="codex-card-info">
                  <div className="codex-card-meta">
                    <span>{art.dynasty}</span>
                    <span>·</span>
                    <span>{art.material}</span>
                  </div>
                  <h3>{art.name}</h3>
                  <p>{art.tagline}</p>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
};

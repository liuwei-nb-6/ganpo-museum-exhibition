import React, { useState } from 'react';
import { X, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';
import type { Artifact } from '../types/museum';
import { HALL_MAP } from '../data/galleries';

interface BlindBoxModalProps {
  artifact: Artifact;
  onClose: () => void;
  onReroll: () => void;
  onInspect: (artifact: Artifact) => void;
}

export const BlindBoxModal: React.FC<BlindBoxModalProps> = ({
  artifact,
  onClose,
  onReroll,
  onInspect,
}) => {
  const [revealed, setRevealed] = useState(false);

  const handleReroll = () => {
    setRevealed(false);
    onReroll();
  };

  const hall = HALL_MAP[artifact.hallId];

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="blindbox-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="关闭">
          <X size={18} />
        </button>

        <div className="blindbox-eyebrow">
          <Sparkles size={14} />
          <span>今日缘分奇珍 · 盲盒启封</span>
        </div>

        {!revealed ? (
          <div className="blindbox-sealed-body">
            <div className="blindbox-clue-card">
              <div className="blindbox-clue-meta">
                <span>年代线索：{artifact.dynasty}</span>
                <span>·</span>
                <span>材质线索：{artifact.material}</span>
              </div>
              <p className="blindbox-riddle">「{artifact.riddle}」</p>
              <div className="blindbox-hall-hint">
                藏于 {hall.numberLabel} · {hall.title}
              </div>
            </div>

            <button
              type="button"
              className="btn-gold-primary blindbox-open-btn"
              onClick={() => setRevealed(true)}
            >
              <Sparkles size={16} />
              <span>启封匣印 · 揭晓真迹</span>
            </button>

            <button type="button" className="btn-ghost-subtle" onClick={handleReroll}>
              <RefreshCw size={14} />
              <span>换一则历史谜语</span>
            </button>
          </div>
        ) : (
          <div className="blindbox-revealed-body">
            <div className="blindbox-thumb-wrap">
              <img src={artifact.thumbUrl} alt={artifact.name} />
              <span className="blindbox-code">{artifact.code}</span>
            </div>

            <div className="blindbox-meta-row">
              <span>{artifact.dynasty}</span>
              <span>·</span>
              <span>{artifact.museum}</span>
            </div>

            <h3 className="blindbox-title">{artifact.name}</h3>
            <p className="blindbox-tagline">{artifact.tagline}</p>

            <div className="blindbox-actions">
              <button
                type="button"
                className="btn-gold-primary"
                onClick={() => {
                  onClose();
                  onInspect(artifact);
                }}
              >
                <span>步入三维鉴宝室</span>
                <ArrowRight size={16} />
              </button>
              <button type="button" className="btn-outline-gold" onClick={handleReroll}>
                <RefreshCw size={15} />
                <span>再抽一匣</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

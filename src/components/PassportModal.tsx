import React, { useState } from 'react';
import { X, Download, Award, RotateCcw } from 'lucide-react';
import type { Artifact, StampRecord } from '../types/museum';
import { HALLS } from '../data/galleries';
import { SealStampSvg } from './SealStampSvg';

interface PassportModalProps {
  artifacts: Artifact[];
  stamps: Record<string, StampRecord>;
  onClose: () => void;
  onSelectArtifact: (artifact: Artifact) => void;
  onResetStamps: () => void;
}

function getVisitorRank(count: number, total: number): { title: string; desc: string } {
  if (count === 0) return { title: '初入序厅', desc: '推开暗夜展馆大门，深度鉴赏任意文物即可钤印入册' };
  if (count < 5) return { title: '寻珍新客', desc: '初识赣鄱风华，青铜与玉韵正徐徐展开' };
  if (count < 12) return { title: '博物雅士', desc: '已穿梭两馆千年时光，渐通金石、漆艺与窑火之道' };
  if (count < total) return { title: '赣鄱知音', desc: '距离集齐二十方典藏朱印仅一步之遥' };
  return { title: '双馆大鉴赏家', desc: '二十件镇馆珍品悉数鉴毕，圆满缔结赣鄱千年之约' };
}

export const PassportModal: React.FC<PassportModalProps> = ({
  artifacts,
  stamps,
  onClose,
  onSelectArtifact,
  onResetStamps,
}) => {
  const [exporting, setExporting] = useState(false);
  const stampedCount = Object.keys(stamps).length;
  const total = artifacts.length;
  const pct = Math.round((stampedCount / total) * 100);
  const rank = getVisitorRank(stampedCount, total);

  // Generate downloadable dark-gold museum souvenir ticket PNG via Canvas2D
  const handleDownloadSouvenir = () => {
    setExporting(true);
    try {
      const w = 1080;
      const h = 1480;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Obsidian background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#0d0f14');
      bg.addColorStop(0.5, '#08090d');
      bg.addColorStop(1, '#12100d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Double gold museum frame
      ctx.strokeStyle = 'rgba(201,164,101,0.55)';
      ctx.lineWidth = 3;
      ctx.strokeRect(36, 36, w - 72, h - 72);
      ctx.strokeStyle = 'rgba(201,164,101,0.22)';
      ctx.lineWidth = 1;
      ctx.strokeRect(50, 50, w - 100, h - 100);

      // Header text
      ctx.fillStyle = '#C9A465';
      ctx.font = '500 22px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('江西省博物馆 × 南昌汉代海昏侯国遗址博物馆 · 数字联展', w / 2, 118);

      ctx.fillStyle = '#F2ECE1';
      ctx.font = '700 66px "Noto Serif SC", "STSong", serif';
      ctx.fillText('赣鄱千年 · 观展印鉴簿', w / 2, 206);

      ctx.fillStyle = '#B8A88A';
      ctx.font = '400 24px "Noto Sans SC", sans-serif';
      ctx.fillText(`典藏称号：${rank.title}   ·   已钤印 ${stampedCount} / ${total} 方`, w / 2, 266);

      // Divider
      ctx.strokeStyle = 'rgba(201,164,101,0.35)';
      ctx.beginPath();
      ctx.moveTo(140, 304);
      ctx.lineTo(w - 140, 304);
      ctx.stroke();

      // Draw 20 seal slots (4 cols x 5 rows)
      const cols = 4;
      const cellW = 216;
      const cellH = 200;
      const startX = (w - cols * cellW) / 2;
      const startY = 342;

      artifacts.forEach((art, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = startX + col * cellW + cellW / 2;
        const cy = startY + row * cellH + 74;
        const isStamped = Boolean(stamps[art.id]);

        const boxSize = 104;
        const bx = cx - boxSize / 2;
        const by = cy - boxSize / 2;

        ctx.save();
        ctx.strokeStyle = isStamped ? '#C03D31' : 'rgba(201,164,101,0.22)';
        ctx.fillStyle = isStamped ? 'rgba(192,61,49,0.14)' : 'rgba(255,255,255,0.015)';
        ctx.lineWidth = isStamped ? 3.5 : 1.5;
        if (!isStamped) ctx.setLineDash([6, 5]);
        ctx.strokeRect(bx, by, boxSize, boxSize);
        ctx.fillRect(bx, by, boxSize, boxSize);
        ctx.setLineDash([]);

        const chars = Array.from(art.sealText.slice(0, 4));
        ctx.fillStyle = isStamped ? '#D44B3E' : 'rgba(201,164,101,0.22)';
        ctx.font = '700 28px "Noto Serif SC", "STSong", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(chars[0] || '', cx + 22, cy - 22);
        ctx.fillText(chars[1] || '', cx + 22, cy + 22);
        ctx.fillText(chars[2] || '', cx - 22, cy - 22);
        ctx.fillText(chars[3] || '', cx - 22, cy + 22);
        ctx.restore();

        ctx.fillStyle = isStamped ? '#E8DFCF' : '#6A655C';
        ctx.font = '400 17px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        const shortName = art.name.replace(/^[^·]+·/, '').slice(0, 9);
        ctx.fillText(shortName, cx, cy + 78);
      });

      // Footer timestamp
      const dateStr = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      ctx.fillStyle = '#8F836F';
      ctx.font = '400 20px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`留念日期：${dateStr} · 赣鄱千年数字文物特展纪念藏书票`, w / 2, h - 86);

      const link = document.createElement('a');
      link.download = `赣鄱千年观展印鉴簿-${stampedCount}of${total}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="passport-modal" onClick={(e) => e.stopPropagation()}>
        <div className="passport-header">
          <div>
            <div className="passport-eyebrow">MUSEUM SEAL PASSPORT · 观展印鉴簿</div>
            <h2 className="passport-title">赣鄱千年 · 典藏钤印录</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="passport-summary-bar">
          <div className="passport-rank-box">
            <Award size={22} className="gold-icon" />
            <div>
              <div className="passport-rank-name">{rank.title}</div>
              <div className="passport-rank-desc">{rank.desc}</div>
            </div>
          </div>

          <div className="passport-progress-box">
            <div className="passport-progress-nums">
              <strong>{stampedCount}</strong>
              <span>/ {total} 方朱印</span>
              <small>({pct}%)</small>
            </div>
            <div className="passport-progress-track">
              <div className="passport-progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        <div className="passport-halls-strip">
          {HALLS.map((h) => {
            const hallArts = artifacts.filter((a) => a.hallId === h.id);
            const done = hallArts.filter((a) => stamps[a.id]).length;
            return (
              <div key={h.id} className="passport-hall-chip">
                <span>{h.title}</span>
                <strong>
                  {done}/{hallArts.length}
                </strong>
              </div>
            );
          })}
        </div>

        <div className="passport-grid">
          {artifacts.map((art) => {
            const rec = stamps[art.id];
            return (
              <button
                key={art.id}
                type="button"
                className={`passport-slot ${rec ? 'is-stamped' : ''}`}
                onClick={() => {
                  onClose();
                  onSelectArtifact(art);
                }}
              >
                <SealStampSvg
                  text={art.sealText}
                  size={66}
                  variant={rec ? 'vermilion' : 'ghost'}
                />
                <span className="passport-slot-name">
                  {art.name.replace(/^[^·]+·/, '')}
                </span>
                <span className="passport-slot-status">
                  {rec ? `已钤印 · ${art.dynasty}` : '点击前往鉴赏'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="passport-footer">
          <button
            type="button"
            className="btn-gold-primary"
            onClick={handleDownloadSouvenir}
            disabled={exporting}
          >
            <Download size={16} />
            <span>{exporting ? '正在拓印纪念票...' : '导出观展纪念藏书票 (PNG)'}</span>
          </button>

          {stampedCount > 0 && (
            <button
              type="button"
              className="btn-ghost-subtle"
              onClick={onResetStamps}
              title="清空全部印章重新游览"
            >
              <RotateCcw size={14} />
              <span>重置印鉴记录</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

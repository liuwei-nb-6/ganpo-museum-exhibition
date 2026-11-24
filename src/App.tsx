import React, { useCallback, useEffect, useState } from 'react';
import { ARTIFACTS } from './data/artifacts';
import type { Artifact, HallId, Hotspot, LightingPreset, StampRecord } from './types/museum';
import { SanctuaryCanvas, type CameraStageMode } from './three/SanctuaryCanvas';
import { GameTitleHud, type TitleCommand } from './components/GameTitleHud';
import { HallStageHud } from './components/HallStageHud';
import { InspectHud } from './components/InspectHud';
import { TimelineHud } from './components/TimelineHud';
import { CodexOverlay } from './components/CodexOverlay';
import { BlindBoxModal } from './components/BlindBoxModal';
import { PassportModal } from './components/PassportModal';
import { soundEngine } from './audio/soundEngine';

const STAMPS_STORAGE_KEY = 'ganpo_museum_stamps_v1';
const LIGHTING_ORDER: LightingPreset[] = ['gallery', 'warm', 'daylight'];

function loadStamps(): Record<string, StampRecord> {
  try {
    const raw = localStorage.getItem(STAMPS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, StampRecord>;
  } catch {
    return {};
  }
}

export const App: React.FC = () => {
  const [stageMode, setStageMode] = useState<CameraStageMode>('title');
  const [returnMode, setReturnMode] = useState<CameraStageMode>('hall');
  const [activeHallId, setActiveHallId] = useState<HallId>('ritual');
  const [activeArtifact, setActiveArtifact] = useState<Artifact>(ARTIFACTS[0]);

  // 3D Inspection tool states
  const [lighting, setLighting] = useState<LightingPreset>('gallery');
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [scaleRefOn, setScaleRefOn] = useState(false);
  const [showHotspots, setShowHotspots] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [loreOpen, setLoreOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth > 900 : true
  );
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [pulseSignal, setPulseSignal] = useState(0);

  // Global Game HUD States
  const [stamps, setStamps] = useState<Record<string, StampRecord>>(() => loadStamps());
  const [ambientOn, setAmbientOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const [blindBoxArtifact, setBlindBoxArtifact] = useState<Artifact | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STAMPS_STORAGE_KEY, JSON.stringify(stamps));
    } catch {
      // ignore
    }
  }, [stamps]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      soundEngine.stopAmbient();
      soundEngine.stopMelody();
    };
  }, []);

  const handleStampArtifact = useCallback((artifactId: string, hotspotId?: string) => {
    setStamps((prev) => {
      const existing = prev[artifactId];
      const inspectedHotspots = existing ? [...existing.inspectedHotspots] : [];
      if (hotspotId && !inspectedHotspots.includes(hotspotId)) {
        inspectedHotspots.push(hotspotId);
      }
      return {
        ...prev,
        [artifactId]: {
          artifactId,
          stampedAt: existing?.stampedAt || new Date().toISOString(),
          inspectedHotspots,
        },
      };
    });
  }, []);

  const resetInspectTransients = useCallback(() => {
    setActiveHotspot(null);
    setFlashlightOn(false);
    setScaleRefOn(false);
  }, []);

  const handleSelectArtifact = useCallback(
    (art: Artifact) => {
      setActiveArtifact(art);
      setActiveHallId(art.hallId);
      resetInspectTransients();
    },
    [resetInspectTransients]
  );

  const handleSelectHall = useCallback(
    (hallId: HallId) => {
      setActiveHallId(hallId);
      const first = ARTIFACTS.find((a) => a.hallId === hallId);
      if (first) {
        setActiveArtifact(first);
        resetInspectTransients();
      }
    },
    [resetInspectTransients]
  );

  const handleEnterInspect = useCallback(
    (art?: Artifact) => {
      if (stageMode !== 'inspect') {
        setReturnMode(stageMode === 'codex' ? 'hall' : stageMode);
      }
      if (art) {
        setActiveArtifact(art);
        setActiveHallId(art.hallId);
      }
      resetInspectTransients();
      setStageMode('inspect');
    },
    [stageMode, resetInspectTransients]
  );

  const pickRandomArtifact = useCallback(
    (excludeId?: string): Artifact => {
      const unstamped = ARTIFACTS.filter((a) => !stamps[a.id] && a.id !== excludeId);
      const pool =
        unstamped.length > 0 ? unstamped : ARTIFACTS.filter((a) => a.id !== excludeId);
      return pool[Math.floor(Math.random() * pool.length)] || ARTIFACTS[0];
    },
    [stamps]
  );

  const handleOpenBlindBox = useCallback(() => {
    setBlindBoxArtifact(pickRandomArtifact());
  }, [pickRandomArtifact]);

  const handleTitleCommand = useCallback(
    (cmd: TitleCommand) => {
      if (cmd === 'hall') {
        setStageMode('hall');
      } else if (cmd === 'timeline') {
        setStageMode('timeline');
      } else if (cmd === 'codex') {
        setStageMode('codex');
      } else if (cmd === 'blindbox') {
        handleOpenBlindBox();
      } else if (cmd === 'passport') {
        setPassportOpen(true);
      }
    },
    [handleOpenBlindBox]
  );

  const handleToggleAmbient = useCallback(() => {
    const playing = soundEngine.toggleAmbient();
    setAmbientOn(playing);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const handleSelectHotspot = useCallback(
    (h: Hotspot | null) => {
      setActiveHotspot(h);
      if (h) {
        setAutoRotate(false);
        const already = Boolean(stamps[activeArtifact.id]);
        handleStampArtifact(activeArtifact.id, h.id);
        if (!already) soundEngine.playSealStamp();
      }
    },
    [activeArtifact.id, stamps, handleStampArtifact]
  );

  const stampedCount = Object.keys(stamps).length;

  return (
    <div className="game-viewport-root">
      {/* SINGLE PERSISTENT FULL-SCREEN 3D DARK-GOLD SANCTUARY WORLD */}
      <SanctuaryCanvas
        artifact={activeArtifact}
        stageMode={stageMode}
        lighting={lighting}
        flashlightOn={flashlightOn}
        scaleRefOn={scaleRefOn}
        showHotspots={showHotspots}
        autoRotate={autoRotate}
        loreDrawerOpen={loreOpen}
        activeHotspotId={activeHotspot?.id || null}
        resetSignal={resetSignal}
        pulseSignal={pulseSignal}
        onSelectHotspot={handleSelectHotspot}
      />

      {/* DIEGETIC GAME HUD OVERLAY LAYER */}
      {stageMode === 'title' && (
        <GameTitleHud
          activeArtifact={activeArtifact}
          stampedCount={stampedCount}
          totalCount={ARTIFACTS.length}
          ambientOn={ambientOn}
          isFullscreen={isFullscreen}
          onSelectCenterpiece={handleSelectArtifact}
          onCommand={handleTitleCommand}
          onInspectDirect={(art) => handleEnterInspect(art)}
          onToggleAmbient={handleToggleAmbient}
          onToggleFullscreen={handleToggleFullscreen}
        />
      )}

      {stageMode === 'hall' && (
        <HallStageHud
          activeHallId={activeHallId}
          activeArtifact={activeArtifact}
          artifacts={ARTIFACTS}
          stamps={stamps}
          ambientOn={ambientOn}
          isFullscreen={isFullscreen}
          onSelectHall={handleSelectHall}
          onSelectArtifact={handleSelectArtifact}
          onEnterInspect={() => handleEnterInspect()}
          onBackTitle={() => setStageMode('title')}
          onOpenTimeline={() => setStageMode('timeline')}
          onOpenCodex={() => setStageMode('codex')}
          onOpenBlindBox={handleOpenBlindBox}
          onOpenPassport={() => setPassportOpen(true)}
          onToggleAmbient={handleToggleAmbient}
          onToggleFullscreen={handleToggleFullscreen}
        />
      )}

      {stageMode === 'inspect' && (
        <InspectHud
          artifact={activeArtifact}
          allArtifacts={ARTIFACTS}
          stampRecord={stamps[activeArtifact.id]}
          lighting={lighting}
          flashlightOn={flashlightOn}
          scaleRefOn={scaleRefOn}
          showHotspots={showHotspots}
          autoRotate={autoRotate}
          loreOpen={loreOpen}
          activeHotspot={activeHotspot}
          onBack={() => {
            resetInspectTransients();
            setStageMode(returnMode);
          }}
          onSelectArtifact={handleSelectArtifact}
          onToggleHotspots={() => {
            setShowHotspots((v) => {
              if (v) setActiveHotspot(null);
              return !v;
            });
          }}
          onToggleFlashlight={() => {
            setFlashlightOn((v) => {
              if (!v) setAutoRotate(false);
              return !v;
            });
          }}
          onToggleScaleRef={() => setScaleRefOn((v) => !v)}
          onCycleLighting={() => {
            setLighting((cur) => LIGHTING_ORDER[(LIGHTING_ORDER.indexOf(cur) + 1) % LIGHTING_ORDER.length]);
          }}
          onToggleAutoRotate={() => setAutoRotate((v) => !v)}
          onResetCamera={() => {
            setActiveHotspot(null);
            setResetSignal((s) => s + 1);
          }}
          onToggleLore={() => setLoreOpen((v) => !v)}
          onSelectHotspot={handleSelectHotspot}
          onStampArtifact={handleStampArtifact}
          onTriggerPulse={() => setPulseSignal((s) => s + 1)}
        />
      )}

      {stageMode === 'timeline' && (
        <TimelineHud
          artifacts={ARTIFACTS}
          activeArtifact={activeArtifact}
          stamps={stamps}
          onSelectArtifact={handleSelectArtifact}
          onInspect={() => handleEnterInspect()}
          onBack={() => setStageMode('title')}
        />
      )}

      {stageMode === 'codex' && (
        <CodexOverlay
          artifacts={ARTIFACTS}
          stamps={stamps}
          onSelectInspect={(art) => handleEnterInspect(art)}
          onBack={() => setStageMode('title')}
        />
      )}

      {/* GAME MODALS: 天机奇珍匣 & 观展印鉴簿 */}
      {blindBoxArtifact && (
        <BlindBoxModal
          artifact={blindBoxArtifact}
          onClose={() => setBlindBoxArtifact(null)}
          onReroll={() => setBlindBoxArtifact((c) => pickRandomArtifact(c?.id))}
          onInspect={(art) => {
            setBlindBoxArtifact(null);
            handleEnterInspect(art);
          }}
        />
      )}

      {passportOpen && (
        <PassportModal
          artifacts={ARTIFACTS}
          stamps={stamps}
          onClose={() => setPassportOpen(false)}
          onSelectArtifact={(art) => {
            setPassportOpen(false);
            handleEnterInspect(art);
          }}
          onResetStamps={() => setStamps({})}
        />
      )}
    </div>
  );
};

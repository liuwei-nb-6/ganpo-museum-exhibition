export type HallId = 'ritual' | 'jade-gold' | 'han-life' | 'craft-porcelain';

export type MuseumName = '江西省博物馆' | '南昌汉代海昏侯国遗址博物馆';

export type MaterialCategory = '青铜' | '玉器' | '金银' | '漆器' | '陶瓷' | '竹木乐器';

export type LightingPreset = 'gallery' | 'warm' | 'daylight';

export type ViewMode = 'prologue' | 'halls' | 'timeline' | 'archive' | 'chamber';

export interface Hotspot {
  id: string;
  label: string;
  summary: string;
  /** Relative position in normalized bounding box: x in [-1, 1], y in [0, 1], z in [-1, 1] */
  relPos: [number, number, number];
  /** Preferred camera viewing offset direction [dx, dy, dz] when focusing this hotspot */
  camDir: [number, number, number];
}

export interface InstrumentNote {
  id: string;
  label: string;
  sublabel: string;
  freq: number;
  /** Optional secondary strike/harmonic frequency (e.g., 编钟侧鼓音) */
  altFreq?: number;
  chord?: number[];
}

export interface InstrumentConfig {
  type: 'bianzhong' | 'sheng' | 'paixiao';
  title: string;
  subtitle: string;
  dualTone?: boolean;
  notes: InstrumentNote[];
  melodyName: string;
  melodySequence: Array<{ noteIndex: number; delayMs: number; useAlt?: boolean }>;
}

export interface DimensionsCm {
  height: number;
  width: number;
  depth?: number;
  label: string;
  scaleCompareText: string;
}

export interface StorySection {
  title: string;
  content: string;
}

export interface RelatedLink {
  id: string;
  reason: string;
}

export interface Artifact {
  id: string;
  index: number;
  code: string;
  name: string;
  englishName: string;
  dynasty: string;
  dynastyGroup: '商周' | '两汉' | '宋元' | '明清民国';
  yearSort: number;
  eraSpan: string;
  museum: MuseumName;
  hallId: HallId;
  material: MaterialCategory;
  materialDetail: string;
  provenance: string;
  modelUrl: string;
  thumbUrl: string;
  /** Euler rotation [rx, ry, rz] in radians applied before bounding-box normalization */
  modelRotation?: [number, number, number];
  /** Initial OrbitControls spherical offsets [azimuthRad, polarRad, distanceMul] */
  cameraView?: [number, number, number];
  tagline: string;
  riddle: string;
  brief: string;
  origin: string;
  stories: StorySection[];
  craftHighlight: string;
  dimensions: DimensionsCm;
  hotspots: Hotspot[];
  instrument?: InstrumentConfig;
  sealText: string;
  sealMotif: 'bronze' | 'jade' | 'gold' | 'lacquer' | 'porcelain' | 'music';
  related: RelatedLink[];
  featuredInPrologue?: boolean;
}

export interface HallInfo {
  id: HallId;
  numberLabel: string;
  title: string;
  subtitle: string;
  englishTitle: string;
  accentColor: string;
  curatorialNote: string;
  eraRange: string;
}

export interface StampRecord {
  artifactId: string;
  stampedAt: string;
  inspectedHotspots: string[];
}

import type { HallInfo } from '../types/museum';

export const HALLS: HallInfo[] = [
  {
    id: 'ritual',
    numberLabel: '第一厅',
    title: '礼乐重器',
    subtitle: '青铜铸国魂，金石鸣千年',
    englishTitle: 'GALLERY I · RITUAL BRONZES & COURT MUSIC',
    accentColor: '#C9A465',
    eraRange: '商代晚期 — 西汉',
    curatorialNote:
      '国之大事，在祀与戎。从赣江之畔横空出世的商代新干大洋洲方鼎，到西汉海昏侯刘贺的「昌邑籍田」铜鼎、鎏金卧马形磬虡与地下宫廷乐团，青铜器承载着礼制威严，也敲响了华夏最早的金石交响。',
  },
  {
    id: 'jade-gold',
    numberLabel: '第二厅',
    title: '玉润金辉',
    subtitle: '通神佩瑞玉，赤金耀衣冠',
    englishTitle: 'GALLERY II · JADE SPIRIT & IMPERIAL GOLD',
    accentColor: '#D6B97D',
    eraRange: '商代 — 明代',
    curatorialNote:
      '古人以玉比德、以玉通灵，又以金银鎏彩彰显尊荣。商代神秘双面神徽、汉代飘逸长袖玉舞人、东汉鎏金神兽铜镜与明代藩王宝石金簪在此隔空相望，照见三千年东方审美的极致精微。',
  },
  {
    id: 'han-life',
    numberLabel: '第三厅',
    title: '汉风巧器',
    subtitle: '一灯照明灭，百巧见汉家',
    englishTitle: 'GALLERY III · HAN INGENUITY & REFINED LIVING',
    accentColor: '#C49A5E',
    eraRange: '西汉（海昏侯国）',
    curatorialNote:
      '走进两千年前海昏侯刘贺的私密生活现场：有能吸收油烟的雁鱼环保灯、刻着「南昌」二字的城市名片、燃香如蓬莱仙境的博山炉、一炉两用的青铜小火锅，还有仍可幻想清音的竹排箫。',
  },
  {
    id: 'craft-porcelain',
    numberLabel: '第四厅',
    title: '窑火丹青',
    subtitle: '百髹藏云气，瓷都入画图',
    englishTitle: 'GALLERY IV · LACQUER, SILVER & PORCELAIN',
    accentColor: '#D1A068',
    eraRange: '南宋 — 民国',
    curatorialNote:
      '当历史的目光步入宋元明清，江西凭借景德镇窑火名动天下。南宋錾刻双鱼银盘、元代雕漆宗师「张成造」剔犀云纹盒、清康熙青花分水与祭红釉色，直至民国「珠山八友」瓷上诗画，尽显文人雅趣。',
  },
];

export const HALL_MAP = Object.fromEntries(HALLS.map((h) => [h.id, h])) as Record<
  HallInfo['id'],
  HallInfo
>;

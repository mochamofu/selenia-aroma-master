"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import {
  Activity,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  FileImage,
  FlaskConical,
  ImagePlus,
  Leaf,
  ListTree,
  Lock,
  Maximize2,
  Plus,
  Save,
  Search,
  Unlock,
  Upload,
  Users,
  X,
} from "lucide-react";
import { BrainwaveIntakePanel } from "@/components/BrainwaveIntakePanel";
import { getBaseBlendGuide } from "@/data/baseBlendGuides";
import { demoAromas, demoBaseBlends } from "@/data/mockData";
import { usePrivateBaseRecipes } from "@/hooks/usePrivateBaseRecipes";
import { useViewerRole } from "@/hooks/useViewerRole";
import { canDisclose, disclosureLevelForRole, DISCLOSURE_DESCRIPTIONS } from "@/lib/disclosure";
import type { BrainwaveScreenshot, BrainwaveSession } from "@/types/brainwave";
import { essentialOils } from "@/data/essentialOils";
import type { AromaRecord, BaseBlend, EssentialOil } from "@/types/aroma";
import type { Profile } from "@/types/profile";

type AppTab = "karte" | "base" | "oils";
type VolumeUnit = "ul" | "ml";
type HistorySelection = { kind: "record" | "draft"; id: string };
type CreationPanel = "customer" | "base" | "oil" | null;
type SafetyFlagSeverity = "注意" | "要確認";
type SafetyFlag = {
  id: string;
  label: string;
  severity: SafetyFlagSeverity;
  guidance: string;
};
type HearingSheet = {
  id: string;
  source: "Googleフォーム" | "手動入力";
  submittedAt: string;
  responseId: string;
  nameKana: string;
  birthday: string;
  purposeTags: string[];
  desiredScent: string;
  preferenceNotes: string;
  healthNotes: string;
  medicationNotes: string;
  safetyFlags: SafetyFlag[];
  operatorSummary: string;
};
type HearingSheetSeed = {
  id: string;
  user_id: string;
  title: string;
  made_at: string;
};
type FormulaItem = {
  id: string;
  name: string;
  amountUl: string;
};

type OperatorRecord = AromaRecord & {
  brainwave_image_id: string;
  total_volume_ml: number;
  formula_items: FormulaItem[];
  maker_note: string;
  hearing_sheet: HearingSheet;
};

type BrainwaveImage = {
  id: string;
  customerId: string;
  title: string;
  measurementLabel: string;
  measuredAt: string;
  uploadedAt: string;
  src: string;
  note: string;
  source: "sample" | "upload";
};

type AddedOil = {
  id: string;
  name: string;
  amountUl: string;
};

type SavedDraft = {
  id: string;
  customerId: string;
  title: string;
  baseBlendName: string;
  imageTitle: string;
  madeAt: string;
  addedOilCount: number;
  recipeSummary: string;
  brainwaveImageId: string;
  baseBlendId: string;
  totalVolumeMl: number;
  formulaItems: FormulaItem[];
  makerNote: string;
  hearingSheet: HearingSheet;
};

type CustomerForm = {
  name: string;
  userId: string;
  favoriteTypes: string;
  frequentTimes: string;
};

type BaseBlendForm = {
  code: string;
  name: string;
  publicIngredients: string;
  benefits: string;
  ratio: string;
  note: string;
};

type EssentialOilForm = {
  name: string;
  botanicalName: string;
  family: string;
  scentNote: EssentialOil["scent_note"];
  scentProfile: string;
  overview: string;
  commonUses: string;
  moodSlug: string;
  blendsWellWith: string;
  safetyNote: string;
};

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const emptyCustomerForm: CustomerForm = {
  name: "",
  userId: "",
  favoriteTypes: "リラックス系",
  frequentTimes: "夜",
};

const emptyBaseBlendForm: BaseBlendForm = {
  code: "新規ブレンド",
  name: "",
  publicIngredients: "",
  benefits: "",
  ratio: "",
  note: "",
};

const emptyEssentialOilForm: EssentialOilForm = {
  name: "",
  botanicalName: "",
  family: "",
  scentNote: "ミドル",
  scentProfile: "",
  overview: "",
  commonUses: "",
  moodSlug: "relax",
  blendsWellWith: "",
  safetyNote: "",
};

const operatorCustomers: Profile[] = [
  customer("profile-sakura", "user-sakura", "田中 さくら", "2026-01-12T00:00:00.000Z", ["リラックス系", "ウッディ系"], ["夜", "就寝前"]),
  customer("profile-ren", "user-ren", "佐藤 蓮", "2026-01-28T00:00:00.000Z", ["集中系", "ミント系"], ["朝", "仕事前"]),
  customer("profile-mika", "user-mika", "鈴木 美香", "2026-02-08T00:00:00.000Z", ["フローラル系", "バランス系"], ["夕方", "入浴後"]),
  customer("profile-haruto", "user-haruto", "高橋 陽斗", "2026-02-19T00:00:00.000Z", ["シトラス系", "リフレッシュ系"], ["昼", "外出前"]),
  customer("profile-natsumi", "user-natsumi", "中村 夏美", "2026-03-02T00:00:00.000Z", ["ハーバル系", "睡眠系"], ["夜", "休日"]),
  customer("profile-naoto", "user-naoto", "小林 直人", "2026-03-14T00:00:00.000Z", ["森林系", "集中系"], ["朝", "作業前"]),
  customer("profile-eriko", "user-eriko", "伊藤 恵理子", "2026-03-27T00:00:00.000Z", ["樹脂系", "落ち着き系"], ["夕方", "瞑想前"]),
  customer("profile-daichi", "user-daichi", "森田 大地", "2026-04-05T00:00:00.000Z", ["スパイス系", "元気系"], ["午前", "運動前"]),
];

const hearingProfiles: Record<string, { kana: string; birthday: string }> = {
  "user-sakura": { kana: "たなか さくら", birthday: "1988-05-21" },
  "user-ren": { kana: "さとう れん", birthday: "1992-09-12" },
  "user-mika": { kana: "すずき みか", birthday: "1985-12-03" },
  "user-haruto": { kana: "たかはし はると", birthday: "1996-07-18" },
  "user-natsumi": { kana: "なかむら なつみ", birthday: "1990-02-26" },
  "user-naoto": { kana: "こばやし なおと", birthday: "1978-11-09" },
  "user-eriko": { kana: "いとう えりこ", birthday: "1982-03-14" },
  "user-daichi": { kana: "もりた だいち", birthday: "1994-08-30" },
};

const safetyFlagCatalog: Record<string, SafetyFlag> = {
  pregnancy: {
    id: "pregnancy",
    label: "妊娠中",
    severity: "要確認",
    guidance: "妊娠中は使用可否を専門家または医師に確認。高濃度、長時間使用、皮膚塗布は避ける前提で判断する。",
  },
  postpartum: {
    id: "postpartum",
    label: "出産直後",
    severity: "要確認",
    guidance: "出産直後は体調変化が大きいため、芳香浴も低濃度・短時間から。赤ちゃんの近くでの使用は慎重にする。",
  },
  tryingToConceive: {
    id: "trying-to-conceive",
    label: "妊活中",
    severity: "注意",
    guidance: "妊活中はホルモン様作用が語られる精油や刺激の強い精油を避ける候補に入れ、本人の希望と専門家確認を優先する。",
  },
  breastfeeding: {
    id: "breastfeeding",
    label: "授乳中",
    severity: "要確認",
    guidance: "授乳中は乳児への影響を考慮し、強い香り、皮膚塗布、乳房周辺での使用は避ける。使用前に専門家確認を推奨。",
  },
  hypertension: {
    id: "hypertension",
    label: "高血圧・循環器系の既往",
    severity: "注意",
    guidance: "ローズマリーなど刺激的に感じる精油は候補から外すか低濃度で検討。医療管理中は主治医確認を優先する。",
  },
  asthmaAllergy: {
    id: "asthma-allergy",
    label: "喘息・アレルギー傾向",
    severity: "注意",
    guidance: "ミント、ユーカリ、強い柑橘など刺激を感じやすい精油は少量から確認。違和感があれば使用を中止する。",
  },
  medication: {
    id: "medication",
    label: "服薬中",
    severity: "要確認",
    guidance: "服薬中は薬剤名と目的を確認し、精油との相互作用が懸念される場合は医師・薬剤師へ確認する。",
  },
  sensitiveSkin: {
    id: "sensitive-skin",
    label: "敏感肌・皮膚トラブル",
    severity: "注意",
    guidance: "皮膚塗布は避けるか低濃度でパッチ確認。柑橘やスパイス系など刺激が出やすい精油は慎重に扱う。",
  },
};

const operatorAromas: OperatorRecord[] = [
  cloneRecord(demoAromas[0], {
    id: "sakura-sleep-reset",
    user_id: "user-sakura",
    title: "Sleep Reset 5mL",
    subtitle: "夜の落ち着きへ戻すウッディブレンド",
    base_blend_id: "base-02",
    base_blend_name: "Woody Restore",
    brainwave_profile_id: "EEG-SAKURA-0508",
    brainwave_image_id: "eeg-sakura-0508",
    blend_lot_number: "AR-2026-0508-SK01",
    made_at: "2026-05-08",
    total_volume_ml: 5,
    formula_items: formula("②ブレンド Woody Restore", 2000, "パルマローザ", 1200, "ローズウッド", 1650, "ローマンカモミール", 150),
    maker_note: "測定後の緊張が抜けにくいため、ウッディを土台に花調を足して5mLで作成。",
  }),
  cloneRecord(demoAromas[1], {
    id: "sakura-morning-focus",
    user_id: "user-sakura",
    title: "Morning Focus 10mL",
    subtitle: "朝の集中を支える軽いシトラス",
    base_blend_id: "base-10",
    base_blend_name: "Citrus Sharp",
    brainwave_profile_id: "EEG-SAKURA-0418",
    brainwave_image_id: "eeg-sakura-0418",
    blend_lot_number: "AR-2026-0418-SK02",
    made_at: "2026-04-18",
    total_volume_ml: 10,
    formula_items: formula("⑩ブレンド Citrus Sharp", 5000, "レモン", 2000, "ローズマリー", 1800, "ペパーミント", 700, "ローズウッド", 500),
    maker_note: "前半の波形が大きかったため、シャープな柑橘と少量ミントで朝用に調整。",
  }),
  cloneRecord(demoAromas[2], {
    id: "ren-focus-clear",
    user_id: "user-ren",
    title: "Focus Clear 5mL",
    subtitle: "作業前の頭をすっきりさせる配合",
    base_blend_id: "base-09",
    base_blend_name: "Mind Boost",
    brainwave_profile_id: "EEG-REN-0402",
    brainwave_image_id: "eeg-ren-0402",
    blend_lot_number: "AR-2026-0402-RN01",
    made_at: "2026-04-02",
    total_volume_ml: 5,
    formula_items: formula("⑨ブレンド Mind Boost", 3000, "ローズマリー", 900, "ユーカリ", 700, "スペアミント", 400),
    maker_note: "集中系の反応が良いため、ミントを控えめにして5mLで再現。",
  }),
  cloneRecord(demoAromas[2], {
    id: "ren-deep-work",
    user_id: "user-ren",
    title: "Deep Work 10mL",
    subtitle: "長時間作業向けのハーバルブレンド",
    base_blend_id: "base-09",
    base_blend_name: "Mind Boost",
    brainwave_profile_id: "EEG-REN-0315",
    brainwave_image_id: "eeg-ren-0315",
    blend_lot_number: "AR-2026-0315-RN02",
    made_at: "2026-03-15",
    total_volume_ml: 10,
    formula_items: formula("⑨ブレンド Mind Boost", 6000, "レモン", 1600, "バジル", 1200, "ペパーミント", 800, "ジュニパーベリー", 400),
    maker_note: "昼の測定で眠気傾向が出たため、トップノートを増やして10mLで作成。",
  }),
  cloneRecord(demoAromas[4], {
    id: "mika-breath-deep",
    user_id: "user-mika",
    title: "Breath Deep 5mL",
    subtitle: "呼吸リセット用の森林調",
    base_blend_id: "base-07",
    base_blend_name: "Forest Harmony",
    brainwave_profile_id: "EEG-MIKA-0310",
    brainwave_image_id: "eeg-mika-0310",
    blend_lot_number: "AR-2026-0310-MK01",
    made_at: "2026-03-10",
    total_volume_ml: 5,
    formula_items: formula("⑦ブレンド Forest Harmony", 2500, "ヒノキ", 1000, "ユーカリ", 900, "フランキンセンス", 600),
    maker_note: "呼吸が浅くなりやすい傾向。森林感と樹脂で落ち着きを作る。",
  }),
  cloneRecord(demoAromas[5], {
    id: "mika-floral-balance",
    user_id: "user-mika",
    title: "Floral Balance 5mL",
    subtitle: "夕方の切り替え用フローラル",
    base_blend_id: "base-16",
    base_blend_name: "Feminine Balance",
    brainwave_profile_id: "EEG-MIKA-0226",
    brainwave_image_id: "eeg-mika-0226",
    blend_lot_number: "AR-2026-0226-MK02",
    made_at: "2026-02-26",
    total_volume_ml: 5,
    formula_items: formula("⑯ブレンド Feminine Balance", 2400, "ゼラニウム", 900, "パルマローザ", 1100, "クラリセージ", 600),
    maker_note: "夕方の気分変動に合わせ、花調を中心に5mLで作成。",
  }),
  cloneRecord(demoAromas[3], {
    id: "haruto-citrus-sharp",
    user_id: "user-haruto",
    title: "Citrus Sharp 10mL",
    subtitle: "外出前に使いやすい明るい柑橘",
    base_blend_id: "base-10",
    base_blend_name: "Citrus Sharp",
    brainwave_profile_id: "EEG-HARUTO-0329",
    brainwave_image_id: "eeg-haruto-0329",
    blend_lot_number: "AR-2026-0329-HT01",
    made_at: "2026-03-29",
    total_volume_ml: 10,
    formula_items: formula("⑩ブレンド Citrus Sharp", 5000, "グレープフルーツ", 1800, "ライム", 1400, "ローズマリー", 1000, "スペアミント", 800),
    maker_note: "外出前の切り替え用。柑橘を厚めにして10mLで作成。",
  }),
  cloneRecord(demoAromas[3], {
    id: "haruto-energy-switch",
    user_id: "user-haruto",
    title: "Energy Switch 5mL",
    subtitle: "午前の活動前ブレンド",
    base_blend_id: "base-15",
    base_blend_name: "Power Boost",
    brainwave_profile_id: "EEG-HARUTO-0218",
    brainwave_image_id: "eeg-haruto-0218",
    blend_lot_number: "AR-2026-0218-HT02",
    made_at: "2026-02-18",
    total_volume_ml: 5,
    formula_items: formula("⑮ブレンド Power Boost", 2700, "ジンジャー", 800, "スイートオレンジ", 1000, "ブラックペッパー", 500),
    maker_note: "朝の立ち上がりを意識し、温かみのあるスパイスを少量追加。",
  }),
  cloneRecord(demoAromas[5], {
    id: "natsumi-night-deep",
    user_id: "user-natsumi",
    title: "Night Deep 5mL",
    subtitle: "就寝前に使う深い睡眠向け",
    base_blend_id: "base-12",
    base_blend_name: "Night Deep",
    brainwave_profile_id: "EEG-NATSUMI-0220",
    brainwave_image_id: "eeg-natsumi-0220",
    blend_lot_number: "AR-2026-0220-NT01",
    made_at: "2026-02-20",
    total_volume_ml: 5,
    formula_items: formula("⑫ブレンド Night Deep", 3000, "ラベンダー", 900, "マジョラム", 700, "ローマンカモミール", 400),
    maker_note: "入眠前の緊張を想定。甘さを抑えた睡眠寄り配合。",
  }),
  cloneRecord(demoAromas[0], {
    id: "natsumi-calm-sleep",
    user_id: "user-natsumi",
    title: "Calm Sleep 10mL",
    subtitle: "夜のくつろぎを長く残す配合",
    base_blend_id: "base-05",
    base_blend_name: "Serene Dreams",
    brainwave_profile_id: "EEG-NATSUMI-0116",
    brainwave_image_id: "eeg-natsumi-0116",
    blend_lot_number: "AR-2026-0116-NT02",
    made_at: "2026-01-16",
    total_volume_ml: 10,
    formula_items: formula("⑤ブレンド Serene Dreams", 5500, "ベルガモット", 1500, "クラリセージ", 1300, "サンダルウッド", 1000, "ベチバー", 700),
    maker_note: "眠り前に長めに香りを残したい希望。ベースノートを追加。",
  }),
  cloneRecord(demoAromas[2], {
    id: "naoto-mind-boost",
    user_id: "user-naoto",
    title: "Mind Boost 10mL",
    subtitle: "朝の作業前に使う集中ブレンド",
    base_blend_id: "base-09",
    base_blend_name: "Mind Boost",
    brainwave_profile_id: "EEG-NAOTO-0214",
    brainwave_image_id: "eeg-naoto-0214",
    blend_lot_number: "AR-2026-0214-NA01",
    made_at: "2026-02-14",
    total_volume_ml: 10,
    formula_items: formula("⑨ブレンド Mind Boost", 6000, "ローズマリー", 1500, "ユーカリ", 1000, "レモン", 1000, "ペパーミント", 500),
    maker_note: "作業前の集中用途。刺激が強くなりすぎない範囲で10mL作成。",
  }),
  cloneRecord(demoAromas[4], {
    id: "naoto-forest-focus",
    user_id: "user-naoto",
    title: "Forest Focus 5mL",
    subtitle: "森林感のある落ち着いた集中",
    base_blend_id: "base-07",
    base_blend_name: "Forest Harmony",
    brainwave_profile_id: "EEG-NAOTO-0119",
    brainwave_image_id: "eeg-naoto-0119",
    blend_lot_number: "AR-2026-0119-NA02",
    made_at: "2026-01-19",
    total_volume_ml: 5,
    formula_items: formula("⑦ブレンド Forest Harmony", 2500, "シダーウッド", 1000, "ヒノキ", 800, "ジュニパーベリー", 700),
    maker_note: "集中しながら落ち着けるよう、ウッディを中心に5mLで作成。",
  }),
  cloneRecord(demoAromas[0], {
    id: "eriko-resin-calm",
    user_id: "user-eriko",
    title: "Resin Calm 5mL",
    subtitle: "静かな夜向けの樹脂系ブレンド",
    base_blend_id: "base-03",
    base_blend_name: "Golden Elixir",
    brainwave_profile_id: "EEG-ERIKO-0205",
    brainwave_image_id: "eeg-eriko-0205",
    blend_lot_number: "AR-2026-0205-ER01",
    made_at: "2026-02-05",
    total_volume_ml: 5,
    formula_items: formula("③ブレンド Golden Elixir", 3000, "フランキンセンス", 800, "サンダルウッド", 700, "ミルラ", 500),
    maker_note: "香りの余韻を好むため、樹脂とウッディを重ねる。",
  }),
  cloneRecord(demoAromas[0], {
    id: "eriko-evening-ground",
    user_id: "user-eriko",
    title: "Evening Ground 10mL",
    subtitle: "夕方の緊張を落とす重めの配合",
    base_blend_id: "base-03",
    base_blend_name: "Golden Elixir",
    brainwave_profile_id: "EEG-ERIKO-0112",
    brainwave_image_id: "eeg-eriko-0112",
    blend_lot_number: "AR-2026-0112-ER02",
    made_at: "2026-01-12",
    total_volume_ml: 10,
    formula_items: formula("③ブレンド Golden Elixir", 6000, "ベチバー", 1200, "パチュリ", 1000, "ベルガモット", 1000, "ラベンダー", 800),
    maker_note: "夕方の測定で浮き沈みが大きいため、重めの土台に柑橘を少し入れる。",
  }),
  cloneRecord(demoAromas[3], {
    id: "daichi-power-boost",
    user_id: "user-daichi",
    title: "Power Boost 10mL",
    subtitle: "午前の活動量を上げる配合",
    base_blend_id: "base-15",
    base_blend_name: "Power Boost",
    brainwave_profile_id: "EEG-DAICHI-0118",
    brainwave_image_id: "eeg-daichi-0118",
    blend_lot_number: "AR-2026-0118-DC01",
    made_at: "2026-01-18",
    total_volume_ml: 10,
    formula_items: formula("⑮ブレンド Power Boost", 6000, "ジュニパーベリー", 1400, "ローズマリー", 1200, "ジンジャー", 900, "ブラックペッパー", 500),
    maker_note: "午前の活動前。温かみとハーバルのバランスを取る。",
  }),
  cloneRecord(demoAromas[1], {
    id: "daichi-warm-reset",
    user_id: "user-daichi",
    title: "Warm Reset 5mL",
    subtitle: "運動前の温かい切り替え",
    base_blend_id: "base-02",
    base_blend_name: "Woody Restore",
    brainwave_profile_id: "EEG-DAICHI-0108",
    brainwave_image_id: "eeg-daichi-0108",
    blend_lot_number: "AR-2026-0108-DC02",
    made_at: "2026-01-08",
    total_volume_ml: 5,
    formula_items: formula("②ブレンド Woody Restore", 2500, "スイートオレンジ", 1000, "ジンジャー", 800, "シナモンリーフ", 400, "シダーウッド", 300),
    maker_note: "軽い温かみを足し、香りが強くなりすぎないよう5mLで作成。",
  }),
];


const moodFilters = [
  { slug: "all", label: "すべて" },
  { slug: "relax", label: "リラックス" },
  { slug: "sleep", label: "睡眠" },
  { slug: "focus", label: "集中" },
  { slug: "energy", label: "元気" },
  { slug: "happy", label: "気分" },
  { slug: "refresh", label: "リフレッシュ" },
];

const initialImages: BrainwaveImage[] = operatorAromas.map((record, index) => ({
  id: record.brainwave_image_id,
  customerId: record.user_id,
  title: `${record.title} / 1分測定`,
  measurementLabel: "1分測定",
  measuredAt: `${record.made_at} ${String(9 + (index % 8)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}`,
  uploadedAt: record.made_at,
  src: createWaveSvg(record.title.replace(/\s*\d+mL/i, ""), waveColor(index, "primary"), waveColor(index, "secondary"), 7 + index * 6),
  note: `${record.title} に紐づく脳波画像。${record.maker_note}`,
  source: "sample",
}));

const customOilNames = ["ローズウッド", "カモミール", "ローマンカモミール"];

const defaultAddedOils: AddedOil[] = operatorAromas[0].formula_items.map((item) => ({
  id: item.id,
  name: item.name,
  amountUl: item.amountUl,
}));
const initialOperatorRecord = operatorAromas[0];

export default function OperatorKartePage() {
  const localIdCounter = useRef(1);
  // 事業者向けデモURLを直接開けるよう、ここではログイン必須にしない。
  // 内部比率の可否はサーバー側で再判定される。
  const { role: viewerRole } = useViewerRole();
  const disclosureLevel = disclosureLevelForRole(viewerRole);
  const canSeeInternalRatios = canDisclose(disclosureLevel, "internal");
  const [customCustomers, setCustomCustomers] = useState<Profile[]>([]);
  const [customBaseBlends, setCustomBaseBlends] = useState<BaseBlend[]>([]);
  const [customBaseNotes, setCustomBaseNotes] = useState<Record<string, { ratio: string; note: string }>>({});
  const [customEssentialOils, setCustomEssentialOils] = useState<EssentialOil[]>([]);
  const [creationPanel, setCreationPanel] = useState<CreationPanel>(null);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm);
  const [baseBlendForm, setBaseBlendForm] = useState<BaseBlendForm>(emptyBaseBlendForm);
  const [essentialOilForm, setEssentialOilForm] = useState<EssentialOilForm>(emptyEssentialOilForm);
  const customers = useMemo(() => [...operatorCustomers, ...customCustomers], [customCustomers]);
  const allBaseBlends = useMemo(() => [...demoBaseBlends, ...customBaseBlends], [customBaseBlends]);
  const allEssentialOils = useMemo(() => [...essentialOils, ...customEssentialOils], [customEssentialOils]);
  const [activeTab, setActiveTab] = useState<AppTab>("karte");
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.user_id ?? "");
  const [brainwaveImages, setBrainwaveImages] = useState<BrainwaveImage[]>(initialImages);
  const [selectedImageId, setSelectedImageId] = useState(operatorAromas[0]?.brainwave_image_id ?? initialImages[0]?.id ?? "");
  const [newImageTitle, setNewImageTitle] = useState("1分測定グラフ");
  const [newImageNote, setNewImageNote] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedBaseId, setSelectedBaseId] = useState(initialOperatorRecord?.base_blend_id ?? "base-02");
  const [addedOils, setAddedOils] = useState<AddedOil[]>(defaultAddedOils);
  const [blendTitle, setBlendTitle] = useState(initialOperatorRecord?.title ?? "新規ブレンド");
  const [blendDate, setBlendDate] = useState(initialOperatorRecord?.made_at ?? formatDateInput(new Date()));
  const [makerNote, setMakerNote] = useState(initialOperatorRecord?.maker_note ?? "");
  const [sourceVolumeMl, setSourceVolumeMl] = useState(String(operatorAromas[0]?.total_volume_ml ?? 5));
  const [targetVolumeMl, setTargetVolumeMl] = useState(String(operatorAromas[0]?.total_volume_ml ?? 5));
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>("ul");
  const [oilQuery, setOilQuery] = useState("");
  const [oilMood, setOilMood] = useState("all");
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<HistorySelection | null>({ kind: "record", id: operatorAromas[0]?.id ?? "" });
  const [showInternalRatios, setShowInternalRatios] = useState(false);
  const {
    recipes: privateRecipes,
    loading: privateRecipesLoading,
    error: privateRecipesError,
  } = usePrivateBaseRecipes(canSeeInternalRatios && showInternalRatios);
  // 比率はサーバーから取得できたときだけ表示する。UIフラグだけでは開かない。
  const baseSecretsUnlocked = canSeeInternalRatios && showInternalRatios && !privateRecipesError;
  const allBaseNotes = useMemo(() => ({ ...privateRecipes, ...customBaseNotes }), [privateRecipes, customBaseNotes]);
  const [brainwaveSessions, setBrainwaveSessions] = useState<BrainwaveSession[]>([]);
  const [brainwaveScreenshots, setBrainwaveScreenshots] = useState<BrainwaveScreenshot[]>([]);
  const [toast, setToast] = useState("");

  const selectedCustomer = customers.find((customer) => customer.user_id === selectedCustomerId) ?? customers[0];
  const customerImages = brainwaveImages.filter((image) => image.customerId === selectedCustomerId);
  const activeImage = customerImages.find((image) => image.id === selectedImageId) ?? customerImages[0];
  const selectedBase = allBaseBlends.find((blend) => blend.id === selectedBaseId) ?? allBaseBlends[0];
  const selectedBaseNote = allBaseNotes[selectedBase.id];
  const customerRecords = operatorAromas.filter((record) => record.user_id === selectedCustomerId);
  const customerDrafts = savedDrafts.filter((draft) => draft.customerId === selectedCustomerId);
  const latestRecord = [...customerRecords].sort((a, b) => b.made_at.localeCompare(a.made_at))[0];
  const activeHistory = getActiveHistory(selectedHistory, customerRecords, customerDrafts);
  const activeHearingSheet = getActiveHearingSheet(activeHistory);
  const formulaTotalUl = useMemo(() => addedOils.reduce((total, oil) => total + parseVolumeUl(oil.amountUl), 0), [addedOils]);
  const sourceVolumeUl = parseVolumeMl(sourceVolumeMl) * 1000;
  const targetVolumeUl = parseVolumeMl(targetVolumeMl) * 1000;
  const displayScaleFactor = sourceVolumeUl > 0 ? targetVolumeUl / sourceVolumeUl : 1;
  const displayedTotalUl = formulaTotalUl * displayScaleFactor;
  const volumeDiffUl = targetVolumeUl - displayedTotalUl;
  const calculatedRecipe = useMemo(() => addedOils.map((oil) => {
    const amountUlValue = parseVolumeUl(oil.amountUl);
    const calculatedVolumeUl = amountUlValue * displayScaleFactor;
    return {
      ...oil,
      amountUlValue,
      calculatedVolumeUl,
      ratioPercent: formulaTotalUl > 0 ? (amountUlValue / formulaTotalUl) * 100 : 0,
    };
  }), [addedOils, displayScaleFactor, formulaTotalUl]);
  const ratioLabel = calculatedRecipe
    .map((oil) => formatRatioPart(oil.amountUlValue))
    .filter(Boolean)
    .join(" : ");
  const oilNameOptions = useMemo(() => Array.from(new Set([...allEssentialOils.map((oil) => oil.name), ...customOilNames])), [allEssentialOils]);
  const filteredOils = allEssentialOils.filter((oil) => {
    const matchesQuery = `${oil.name} ${oil.botanical_name} ${oil.scent_profile}`.toLowerCase().includes(oilQuery.toLowerCase());
    const matchesMood = oilMood === "all" || oil.mood_slugs.includes(oilMood);
    return matchesQuery && matchesMood;
  });

  function selectCustomer(customerId: string) {
    setSelectedCustomerId(customerId);
    const firstRecord = operatorAromas.find((record) => record.user_id === customerId);
    const firstDraft = savedDrafts.find((draft) => draft.customerId === customerId);
    if (firstRecord) {
      selectRecordHistory(firstRecord);
      return;
    }
    if (firstDraft) {
      selectDraftHistory(firstDraft);
      return;
    }
    const firstImage = brainwaveImages.find((image) => image.customerId === customerId);
    setSelectedImageId(firstImage?.id ?? "");
    setSelectedHistory(null);
  }

  function selectRecordHistory(record: OperatorRecord) {
    setSelectedHistory({ kind: "record", id: record.id });
    setSelectedImageId(record.brainwave_image_id);
    setBlendTitle(record.title);
    setBlendDate(record.made_at);
    setSourceVolumeMl(String(record.total_volume_ml));
    setTargetVolumeMl(String(record.total_volume_ml));
    setSelectedBaseId(record.base_blend_id ?? "base-02");
    setMakerNote(record.maker_note);
    setAddedOils(record.formula_items.map((item) => ({ ...item })));
  }

  function selectDraftHistory(draft: SavedDraft) {
    setSelectedHistory({ kind: "draft", id: draft.id });
    setSelectedImageId(draft.brainwaveImageId);
    setBlendTitle(draft.title);
    setBlendDate(draft.madeAt);
    setSourceVolumeMl(String(draft.totalVolumeMl));
    setTargetVolumeMl(String(draft.totalVolumeMl));
    setSelectedBaseId(draft.baseBlendId);
    setMakerNote(draft.makerNote);
    setAddedOils(draft.formulaItems.map((item) => ({ ...item })));
  }

  function selectBrainwaveImage(imageId: string) {
    setSelectedImageId(imageId);
    const relatedRecord = operatorAromas.find((record) => record.user_id === selectedCustomerId && record.brainwave_image_id === imageId);
    if (relatedRecord) {
      selectRecordHistory(relatedRecord);
    }
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setToast("画像は10MB以下でアップロードしてください。");
      event.target.value = "";
      return;
    }

    const imageTitle = newImageTitle.trim() || file.name.replace(/\.[^.]+$/, "");
    const uploadedImage: BrainwaveImage = {
      id: nextLocalId("upload"),
      customerId: selectedCustomerId,
      title: imageTitle,
      measurementLabel: "1分測定",
      measuredAt: formatDateTime(new Date()),
      uploadedAt: formatDate(new Date()),
      src: URL.createObjectURL(file),
      note: newImageNote.trim() || "アップロードされた脳波グラフ画像。",
      source: "upload",
    };

    setBrainwaveImages((images) => [uploadedImage, ...images]);
    setSelectedImageId(uploadedImage.id);
    setNewImageTitle("1分測定グラフ");
    setNewImageNote("");
    setToast("脳波画像をカルテに追加しました。");
    event.target.value = "";
  }

  function renameActiveImage(title: string) {
    if (!activeImage) return;
    setBrainwaveImages((images) => images.map((image) => (image.id === activeImage.id ? { ...image, title } : image)));
  }

  function updateActiveImageNote(note: string) {
    if (!activeImage) return;
    setBrainwaveImages((images) => images.map((image) => (image.id === activeImage.id ? { ...image, note } : image)));
  }

  function updateOil(rowId: string, patch: Partial<AddedOil>) {
    setAddedOils((rows) => rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  }

  function handleBaseBlendChange(baseBlendId: string) {
    const nextBase = allBaseBlends.find((blend) => blend.id === baseBlendId);
    setSelectedBaseId(baseBlendId);
    if (!nextBase) return;
    setAddedOils((rows) => {
      const baseLabel = `${nextBase.code} ${nextBase.name}`;
      if (rows.length === 0) return [{ id: "oil-row-base", name: baseLabel, amountUl: "2000" }];
      return rows.map((row, index) => (index === 0 ? { ...row, name: baseLabel } : row));
    });
  }

  function saveDraft() {
    const draftId = nextLocalId("draft");
    const madeAt = blendDate || formatDateInput(new Date());
    const draft: SavedDraft = {
      id: draftId,
      customerId: selectedCustomerId,
      title: blendTitle,
      baseBlendName: selectedBase.name,
      imageTitle: activeImage?.title ?? "脳波画像未選択",
      madeAt,
      addedOilCount: addedOils.filter((oil) => oil.name.trim() && oil.amountUl.trim()).length,
      recipeSummary: `${targetVolumeMl || "0"}mL / ${formatDisplayVolume(displayedTotalUl, volumeUnit)}`,
      brainwaveImageId: selectedImageId,
      baseBlendId: selectedBase.id,
      totalVolumeMl: parseVolumeMl(targetVolumeMl),
      formulaItems: calculatedRecipe.map((item) => ({
        id: item.id,
        name: item.name,
        amountUl: String(Math.round(item.calculatedVolumeUl * 10) / 10),
      })),
      makerNote,
      hearingSheet: activeHearingSheet
        ? { ...activeHearingSheet, id: `hearing-${draftId}` }
        : createManualHearingSheet({
          id: draftId,
          user_id: selectedCustomerId,
          title: blendTitle,
          made_at: madeAt,
        }, selectedCustomer?.name ?? "氏名未設定"),
    };
    setSavedDrafts((drafts) => [draft, ...drafts]);
    setSelectedHistory({ kind: "draft", id: draft.id });
    setToast(`${selectedCustomer?.name ?? "顧客"}の香り制作記録を保存しました。`);
  }

  function addCustomerKarte() {
    const name = customerForm.name.trim();
    if (!name) {
      setToast("顧客名を入力してください。");
      return;
    }

    const userId = customerForm.userId.trim() || `user-${nextLocalId("karte")}`;
    if (customers.some((customer) => customer.user_id === userId)) {
      setToast("同じ顧客IDがすでにあります。別のIDを指定してください。");
      return;
    }

    const profile = customer(
      `profile-${userId}`,
      userId,
      name,
      `${formatDateInput(new Date())}T00:00:00.000Z`,
      splitInputList(customerForm.favoriteTypes, ["好み未設定"]),
      splitInputList(customerForm.frequentTimes, ["測定前"]),
    );
    setCustomCustomers((items) => [...items, profile]);
    setSelectedCustomerId(userId);
    setSelectedImageId("");
    setSelectedHistory(null);
    setCustomerForm(emptyCustomerForm);
    setCreationPanel(null);
    setActiveTab("karte");
    setToast(`${name}のカルテを追加しました。`);
  }

  function addBaseBlend() {
    const name = baseBlendForm.name.trim();
    if (!name) {
      setToast("ベースブレンド名を入力してください。");
      return;
    }

    const id = nextLocalId("base-custom");
    const benefits = splitInputList(baseBlendForm.benefits, ["目的未設定"]);
    const blend: BaseBlend = {
      id,
      code: baseBlendForm.code.trim() || "新規ブレンド",
      name,
      public_ingredients: baseSecretsUnlocked
        ? splitInputList(baseBlendForm.publicIngredients, ["構成未設定"])
        : ["管理者設定待ち"],
      benefits,
      mood_slugs: ["relax"],
      color: "#a78bda",
      description: `${benefits.join("・")}をテーマにした追加ベースブレンド。`,
    };
    setCustomBaseBlends((items) => [...items, blend]);
    setCustomBaseNotes((notes) => ({
      ...notes,
      [id]: {
        ratio: baseSecretsUnlocked ? baseBlendForm.ratio.trim() || "未設定" : "管理者設定待ち",
        note: baseSecretsUnlocked ? baseBlendForm.note.trim() || "追加登録したベースブレンド。正式DB保存前のデモデータです。" : "管理者権限で編集してください。",
      },
    }));
    setSelectedBaseId(id);
    setBaseBlendForm(emptyBaseBlendForm);
    setCreationPanel(null);
    setActiveTab("base");
    setToast(`${name}をベースブレンド図鑑に追加しました。`);
  }

  function toggleInternalRatios() {
    setShowInternalRatios((open) => {
      const next = !open;
      setToast(next ? "内部比率の表示を要求しました。" : "内部比率の表示を閉じました。");
      return next;
    });
  }

  function addEssentialOil() {
    const name = essentialOilForm.name.trim();
    if (!name) {
      setToast("精油名を入力してください。");
      return;
    }

    const id = nextLocalId("oil-custom");
    const oil: EssentialOil = {
      id,
      slug: toSlug(name, id),
      name,
      botanical_name: essentialOilForm.botanicalName.trim() || "学名未設定",
      family: essentialOilForm.family.trim() || "科名未設定",
      scent_note: essentialOilForm.scentNote,
      scent_profile: essentialOilForm.scentProfile.trim() || "香りの印象未設定",
      overview: essentialOilForm.overview.trim() || "追加登録した精油。正式DB保存前のデモデータです。",
      common_uses: splitInputList(essentialOilForm.commonUses, ["用途未設定"]),
      mood_slugs: [essentialOilForm.moodSlug],
      blends_well_with: splitInputList(essentialOilForm.blendsWellWith, ["相性未設定"]),
      safety_note: essentialOilForm.safetyNote.trim() || "使用時は濃度と体調を確認してください。",
      color: "#a78bda",
    };
    setCustomEssentialOils((items) => [...items, oil]);
    setEssentialOilForm(emptyEssentialOilForm);
    setOilQuery("");
    setOilMood("all");
    setCreationPanel(null);
    setActiveTab("oils");
    setToast(`${name}を精油図鑑に追加しました。`);
  }

  function nextLocalId(prefix: string) {
    const id = `${prefix}-${localIdCounter.current}`;
    localIdCounter.current += 1;
    return id;
  }

  return (
    <div className="min-h-screen bg-[#f6f2fb] text-[#3b3152]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[236px] shrink-0 border-r border-[#e4dff0] bg-[#f8f5fd] px-4 py-5 lg:block">
          <div className="flex items-center gap-3 border-b border-[#e4dff0] pb-5">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#8d6fd1] text-white">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-[0.08em] text-[#3b3152]">SELENIA</p>
              <p className="text-xs text-[#817490]">Aroma Karte</p>
            </div>
          </div>
          <nav className="mt-5 space-y-1">
            <SideNavButton active={activeTab === "karte"} icon={<ClipboardList className="h-4 w-4" />} label="顧客カルテ" onClick={() => setActiveTab("karte")} />
            <SideNavButton active={activeTab === "base"} icon={<FlaskConical className="h-4 w-4" />} label="ベースブレンド" onClick={() => setActiveTab("base")} />
            <SideNavButton active={activeTab === "oils"} icon={<Leaf className="h-4 w-4" />} label="精油図鑑" onClick={() => setActiveTab("oils")} />
          </nav>
          <div className="mt-6 rounded-lg border border-[#e4dff0] bg-white p-3">
            <p className="text-xs font-bold text-[#665a78]">今日の運用</p>
            <div className="mt-3 space-y-2 text-xs text-[#7b7088]">
              <p className="flex items-center justify-between"><span>測定予定</span><span className="font-bold text-[#8d6fd1]">4件</span></p>
              <p className="flex items-center justify-between"><span>保存待ち</span><span className="font-bold text-[#c7893a]">{savedDrafts.length + 2}件</span></p>
              <p className="flex items-center justify-between"><span>図鑑データ</span><span className="font-bold text-[#8d6fd1]">{allBaseBlends.length + allEssentialOils.length}件</span></p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-[#e4dff0] bg-[#f8f5fd]/95 px-4 py-3 backdrop-blur lg:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-[#342a49]">脳波アロマ管理カルテ</h1>
                <p className="mt-1 text-xs text-[#827690]">1分測定画像、顧客ID、制作日、独自ブレンドを同じ履歴に紐づけます。</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="hidden h-9 items-center gap-2 rounded-lg border border-[#ded7ec] bg-white px-3 text-xs font-bold text-[#584d6b] sm:flex">
                  <CalendarDays className="h-4 w-4" />
                  2026/07/07
                </button>
                <button onClick={saveDraft} className="flex h-9 items-center gap-2 rounded-lg bg-[#8d6fd1] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#755bb4]">
                  <Save className="h-4 w-4" />
                  保存
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-[#e4dff0] bg-white p-1 lg:hidden">
              <TopTab active={activeTab === "karte"} label="カルテ" onClick={() => setActiveTab("karte")} />
              <TopTab active={activeTab === "base"} label="ベース" onClick={() => setActiveTab("base")} />
              <TopTab active={activeTab === "oils"} label="精油" onClick={() => setActiveTab("oils")} />
            </div>
          </header>

          {toast ? (
            <div className="mx-4 mt-4 flex items-center justify-between rounded-lg border border-[#ccbdec] bg-[#f3effb] px-4 py-3 text-sm font-bold text-[#8d6fd1] lg:mx-6">
              <span className="flex items-center gap-2"><Check className="h-4 w-4" />{toast}</span>
              <button onClick={() => setToast("")} aria-label="通知を閉じる"><X className="h-4 w-4" /></button>
            </div>
          ) : null}

          {activeTab === "karte" ? (
            <section className="grid gap-4 p-4 lg:grid-cols-[260px_minmax(0,1fr)_380px] lg:p-6">
              <ClientPanel
                customers={customers}
                selectedCustomerId={selectedCustomerId}
                savedDrafts={savedDrafts}
                onSelectCustomer={selectCustomer}
                onOpenAddCustomer={() => setCreationPanel("customer")}
              />

              <div className="min-w-0 space-y-4">
                <section className="rounded-lg border border-[#e4dff0] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[#7f738d]">選択中のカルテ</p>
                      <h2 className="mt-1 text-2xl font-bold text-[#342a49]">{selectedCustomer?.name ?? "顧客未選択"}</h2>
                      <p className="mt-1 text-sm text-[#786d87]">ID: {selectedCustomer?.user_id ?? "-"} / 登録日 {selectedCustomer?.created_at.slice(0, 10) ?? "-"}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <MiniMetric label="履歴" value={customerRecords.length + customerDrafts.length} />
                      <MiniMetric label="画像" value={customerImages.length} />
                      <MiniMetric label="最新" value={latestRecord?.made_at.slice(5) ?? "-"} />
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-[#e4dff0] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-bold text-[#342a49]"><Activity className="h-5 w-5 text-[#8d6fd1]" />脳波画像</h2>
                      <p className="mt-1 text-xs text-[#827690]">画像ごとにタイトルを付け、選択すると右側で大きく確認できます。</p>
                    </div>
                    <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#d98aa8] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#c87598]">
                      <Upload className="h-4 w-4" />
                      画像アップロード
                      <input className="sr-only" type="file" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  </div>
                  <p className="mt-2 text-xs font-bold text-[#8a6a35]">画像上限: 10MB / アップロード後も右側の画像タイトルから変更できます。</p>
                  <div className="mt-4 grid gap-3 2xl:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {customerImages.map((image) => (
                        <button
                          key={image.id}
                          type="button"
                          onClick={() => selectBrainwaveImage(image.id)}
                          className={`overflow-hidden rounded-lg border bg-white text-left transition ${activeImage?.id === image.id ? "border-[#8d6fd1] shadow-md shadow-[#8d6fd1]/12" : "border-[#e4dff0] hover:border-[#b7a5dd]"}`}
                        >
                          <img src={image.src} alt={image.title} className="h-28 w-full object-cover" />
                          <div className="space-y-1 p-3">
                            <p className="truncate text-sm font-bold text-[#3b3152]">{image.title}</p>
                            <p className="text-xs text-[#7b708d]">{image.measuredAt}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="rounded-lg border border-[#e4dff0] bg-[#f8f5fd] p-3">
                      <p className="text-xs font-bold text-[#665a78]">アップロード時のタイトル</p>
                      <input
                        value={newImageTitle}
                        onChange={(event) => setNewImageTitle(event.target.value)}
                        className="mt-2 h-10 w-full rounded-lg border border-[#ddd6ea] bg-white px-3 text-sm outline-none focus:border-[#8d6fd1]"
                        placeholder="例: 1分測定 / 睡眠前"
                      />
                      <textarea
                        value={newImageNote}
                        onChange={(event) => setNewImageNote(event.target.value)}
                        className="mt-2 min-h-24 w-full rounded-lg border border-[#ddd6ea] bg-white px-3 py-2 text-sm outline-none focus:border-[#8d6fd1]"
                        placeholder="画像メモ、測定条件、香り制作時の判断材料"
                      />
                    </div>
                  </div>
                </section>

                <BrainwaveIntakePanel
                  customerId={selectedCustomerId}
                  customerName={selectedCustomer?.name ?? "利用者"}
                  sessions={brainwaveSessions}
                  screenshots={brainwaveScreenshots}
                  onSessionsChange={setBrainwaveSessions}
                  onScreenshotsChange={setBrainwaveScreenshots}
                  onToast={setToast}
                />

                <section className="rounded-lg border border-[#e4dff0] bg-white p-4">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-[#342a49]"><ListTree className="h-5 w-5 text-[#8d6fd1]" />過去の診断・制作履歴</h2>
                  <div className="mt-4 space-y-2">
                    {customerDrafts.map((draft) => (
                      <HistoryRow
                        key={draft.id}
                        title={draft.title}
                        date={draft.madeAt}
                        meta={`${draft.baseBlendName} / ${draft.recipeSummary} / ${draft.imageTitle}`}
                        status="保存済み"
                        active={selectedHistory?.kind === "draft" && selectedHistory.id === draft.id}
                        onSelect={() => selectDraftHistory(draft)}
                      />
                    ))}
                    {customerRecords.map((record) => (
                      <HistoryRow
                        key={record.id}
                        title={record.title}
                        date={record.made_at}
                        meta={`${record.brainwave_profile_id ?? "脳波ID未設定"} / ${record.base_blend_name ?? "ベース未設定"}`}
                        status={record.status === "published" ? "公開" : "下書き"}
                        active={selectedHistory?.kind === "record" && selectedHistory.id === record.id}
                        onSelect={() => selectRecordHistory(record)}
                      />
                    ))}
                  </div>
                  <HistoryDetail history={activeHistory} />
                  <div className="mt-4">
                    <HearingSheetPanel sheet={activeHearingSheet} />
                  </div>
                </section>
              </div>

              <aside className="min-w-0 space-y-4">
                <section className="rounded-lg border border-[#e4dff0] bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-bold text-[#342a49]"><FileImage className="h-5 w-5 text-[#8d6fd1]" />画像プレビュー</h2>
                      <p className="mt-1 text-xs text-[#827690]">選択画像を大きく確認</p>
                    </div>
                    <button
                      disabled={!activeImage}
                      onClick={() => setViewerOpen(true)}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-[#ded7ec] text-[#584d6b] disabled:opacity-40"
                      aria-label="画像を拡大"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                  {activeImage ? (
                    <div className="mt-4">
                      <button type="button" onClick={() => setViewerOpen(true)} className="block w-full overflow-hidden rounded-lg border border-[#e4dff0] bg-[#f8f5fd]">
                        <img src={activeImage.src} alt={activeImage.title} className="h-[320px] w-full object-contain" />
                      </button>
                      <label className="mt-3 block text-xs font-bold text-[#665a78]">画像タイトル</label>
                      <input
                        value={activeImage.title}
                        onChange={(event) => renameActiveImage(event.target.value)}
                        className="mt-1 h-10 w-full rounded-lg border border-[#ddd6ea] bg-white px-3 text-sm outline-none focus:border-[#8d6fd1]"
                      />
                      <label className="mt-3 block text-xs font-bold text-[#665a78]">画像メモ</label>
                      <textarea
                        value={activeImage.note}
                        onChange={(event) => updateActiveImageNote(event.target.value)}
                        className="mt-1 min-h-20 w-full rounded-lg border border-[#ddd6ea] bg-white px-3 py-2 text-sm outline-none focus:border-[#8d6fd1]"
                      />
                    </div>
                  ) : (
                    <div className="mt-4 grid min-h-[320px] place-items-center rounded-lg border border-dashed border-[#d8d0e8] bg-[#f8f5fd] text-center text-sm text-[#7f738d]">
                      <div>
                        <ImagePlus className="mx-auto h-8 w-8" />
                        <p className="mt-2">画像をアップロードしてください</p>
                      </div>
                    </div>
                  )}
                </section>

                <section className="rounded-lg border border-[#e4dff0] bg-white p-4">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-[#342a49]"><FlaskConical className="h-5 w-5 text-[#d58a3a]" />香り制作記録</h2>
                  <div className="mt-4 space-y-3">
                    <Field label="制作名">
                      <input value={blendTitle} onChange={(event) => setBlendTitle(event.target.value)} className="field-input" />
                    </Field>
                    <Field label="制作日">
                      <input type="date" value={blendDate} onChange={(event) => setBlendDate(event.target.value)} className="field-input" />
                    </Field>
                    <Field label="ベースブレンド">
                      <select value={selectedBaseId} onChange={(event) => handleBaseBlendChange(event.target.value)} className="field-input">
                        {allBaseBlends.map((blend) => (
                          <option key={blend.id} value={blend.id}>{blend.code} {blend.name}</option>
                        ))}
                      </select>
                    </Field>
                    <div className="rounded-lg border border-[#e5e0d2] bg-[#fffaf0] p-3 text-xs leading-5 text-[#6d5a37]">
                      <p className="font-bold">{selectedBase.code} {selectedBase.name}</p>
                      <p className="mt-1">目的: {selectedBase.benefits.join(" / ")}</p>
                      {baseSecretsUnlocked ? (
                        <>
                          <p className="mt-1">構成: {selectedBase.public_ingredients.join(" / ")}</p>
                          <p className="mt-1">内部比率: {selectedBaseNote?.ratio ?? "未設定"}</p>
                          <p className="mt-1">{selectedBaseNote?.note}</p>
                        </>
                      ) : null}
                    </div>
                    <section className="rounded-lg border border-[#e4dff0] bg-[#f8f5fd] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-[#665a78]">完成レシピ</p>
                          <p className="mt-1 text-[11px] leading-4 text-[#7b708d]">選択中の履歴に保存された完成量と配合量を表示します。10mL表示は同じ比率の倍量確認用です。</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVolumeUnit((unit) => (unit === "ul" ? "ml" : "ul"))}
                          className="flex h-8 items-center gap-1 rounded-lg border border-[#ded7ec] px-2 text-xs font-bold text-[#8d6fd1]"
                        >
                          表示: {volumeUnit === "ul" ? "μL" : "mL"}
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
                        <input
                          value={targetVolumeMl}
                          onChange={(event) => setTargetVolumeMl(event.target.value)}
                          className="field-input h-10"
                          inputMode="decimal"
                          aria-label="完成量 mL"
                        />
                        <button type="button" onClick={() => setTargetVolumeMl("5")} className="rounded-lg border border-[#ded7ec] bg-white px-3 text-xs font-bold text-[#8d6fd1]">5mL</button>
                        <button type="button" onClick={() => setTargetVolumeMl("10")} className="rounded-lg border border-[#ded7ec] bg-white px-3 text-xs font-bold text-[#8d6fd1]">10mL</button>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <MiniMetric label="入力合計" value={formatDisplayVolume(displayedTotalUl, volumeUnit)} />
                        <MiniMetric label="完成量" value={formatDisplayVolume(targetVolumeUl, volumeUnit)} />
                        <MiniMetric label="材料数" value={calculatedRecipe.length} />
                      </div>
                      <p className={`mt-2 text-xs font-bold ${Math.abs(volumeDiffUl) < 0.1 ? "text-[#8d6fd1]" : "text-[#a86925]"}`}>
                        {Math.abs(volumeDiffUl) < 0.1 ? "配合量の合計は完成量と一致しています。" : `完成量との差分: ${formatDisplayVolume(volumeDiffUl, volumeUnit)}`}
                      </p>
                    </section>
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-[#665a78]">配合レシピ</label>
                          <p className="mt-1 text-[11px] text-[#7b708d]">構成比: {ratioLabel || "-"}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const id = nextLocalId("oil");
                            setAddedOils((rows) => [...rows, { id, name: "ローマンカモミール", amountUl: "1000" }]);
                          }}
                          className="flex h-8 items-center gap-1 rounded-lg border border-[#ded7ec] px-2 text-xs font-bold text-[#8d6fd1]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          追加
                        </button>
                      </div>
                      <div className="mt-2 space-y-2">
                        <div className="grid grid-cols-[minmax(0,1fr)_92px_92px_30px] gap-2 px-1 text-[11px] font-bold text-[#7b708d]">
                          <span>材料</span>
                          <span>配合量(μL)</span>
                          <span>{targetVolumeMl || "0"}mL時</span>
                          <span />
                        </div>
                        {calculatedRecipe.map((row) => (
                          <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_92px_92px_30px] gap-2">
                            <input list="operator-oil-names" value={row.name} onChange={(event) => updateOil(row.id, { name: event.target.value })} className="field-input h-10" />
                            <input
                              value={row.amountUl}
                              onChange={(event) => updateOil(row.id, { amountUl: event.target.value })}
                              className="field-input h-10 px-2"
                              inputMode="decimal"
                              aria-label={`${row.name} の配合量 μL`}
                            />
                            <output className="flex h-10 items-center rounded-lg border border-[#ddd6ea] bg-white px-2 text-sm font-bold text-[#3b3152]">
                              {formatDisplayVolume(row.calculatedVolumeUl, volumeUnit)}
                            </output>
                            <button type="button" onClick={() => setAddedOils((rows) => rows.filter((item) => item.id !== row.id))} className="rounded-lg bg-[#f3effb] text-[#7b7088]" aria-label="追加オイルを削除">×</button>
                            <p className="col-span-4 -mt-1 px-1 text-[11px] text-[#9a8caf]">構成比 {formatNumber(row.ratioPercent)}%</p>
                          </div>
                        ))}
                      </div>
                      <datalist id="operator-oil-names">
                        {allBaseBlends.map((blend) => <option key={blend.id} value={`${blend.code} ${blend.name}`} />)}
                        {oilNameOptions.map((name) => <option key={name} value={name} />)}
                      </datalist>
                    </div>
                    <Field label="作成者メモ">
                      <textarea value={makerNote} onChange={(event) => setMakerNote(event.target.value)} className="field-input min-h-24 py-2" />
                    </Field>
                    <button onClick={saveDraft} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#3b3152] text-sm font-bold text-white transition hover:bg-[#2d243f]">
                      <Save className="h-4 w-4" />
                      カルテに保存
                    </button>
                  </div>
                </section>
              </aside>
            </section>
          ) : null}

          {activeTab === "base" ? (
            <section className="p-4 lg:p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-[#342a49]">ベースブレンド図鑑</h2>
                  <p className="mt-1 text-sm text-[#7b7088]">{allBaseBlends.length}種類のベースブレンドを、目的カテゴリごとに確認できます。</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCreationPanel("base")}
                    className="flex h-10 items-center gap-2 rounded-lg bg-[#8d6fd1] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#755bb4]"
                  >
                    <Plus className="h-4 w-4" />
                    ベース追加
                  </button>
                  {canSeeInternalRatios ? (
                    <button
                      type="button"
                      onClick={toggleInternalRatios}
                      className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition ${showInternalRatios ? "border-[#d8c7ef] bg-[#f6f2fd] text-[#6b57a0]" : "border-[#ded7ec] bg-white text-[#7b7088] hover:border-[#b7a5dd]"}`}
                    >
                      {showInternalRatios ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      {showInternalRatios ? "内部比率を隠す" : "内部比率を表示"}
                    </button>
                  ) : (
                    <span className="flex h-10 items-center gap-2 rounded-lg border border-[#ded7ec] bg-white px-3 text-xs font-bold text-[#a79dba]">
                      <Lock className="h-3.5 w-3.5" />
                      内部比率は管理者のみ
                    </span>
                  )}
                </div>
              </div>
              {canSeeInternalRatios && showInternalRatios && privateRecipesError ? (
                <p className="mb-4 rounded-lg bg-[#fdeaef] p-3 text-xs font-bold text-[#a8506e]">
                  {privateRecipesError}
                </p>
              ) : null}
              {canSeeInternalRatios && showInternalRatios && privateRecipesLoading ? (
                <p className="mb-4 rounded-lg bg-[#f8f5fd] p-3 text-xs text-[#665a78]">内部比率を取得しています…</p>
              ) : null}
              <p className="mb-4 rounded-lg bg-[#f8f5fd] p-3 text-xs leading-5 text-[#665a78]">
                現在の表示範囲: {DISCLOSURE_DESCRIPTIONS[disclosureLevel]}
              </p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {allBaseBlends.map((blend) => {
                  const privateNote = allBaseNotes[blend.id];
                  const guide = getBaseBlendGuide(blend.id);
                  return (
                    <article key={blend.id} className="rounded-lg border border-[#e4dff0] bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-[#7b708d]">{blend.code}</p>
                          <h3 className="mt-1 text-lg font-bold text-[#3b3152]">{blend.name}</h3>
                        </div>
                        <span className="h-8 w-8 rounded-lg border border-white shadow-inner" style={{ background: blend.color }} />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#665a78]">{formatOperatorBaseDescription(blend.description)}</p>
                      <InfoLine label="目的カテゴリ" value={blend.benefits.join(" / ")} />
                      <InfoLine label="構成精油" value={blend.public_ingredients.join(" / ")} />
                      {guide && canDisclose(disclosureLevel, "instructor") ? (
                        <div className="mt-3 space-y-2 rounded-lg bg-[#faf7ff] p-3 text-xs leading-5 text-[#6f637f]">
                          <p><span className="font-bold text-[#3b3152]">使い分け:</span> {guide.instructor.selectionGuide}</p>
                          <p>
                            <span className="font-bold text-[#3b3152]">相性:</span>{" "}
                            {guide.instructor.pairingOils.map((oil) => oil.name).join(" / ")}
                          </p>
                          <p className="text-[#8a4a60]">
                            <span className="font-bold">事前確認:</span> {guide.instructor.contraindications[0]}
                          </p>
                        </div>
                      ) : null}
                      {baseSecretsUnlocked ? (
                        <div className="mt-3 rounded-lg bg-[#fdeaef] p-3 text-xs leading-5 text-[#6f637f]">
                          <p><span className="font-bold text-[#3b3152]">内部比率:</span> {privateNote?.ratio ?? "未設定"}</p>
                          <p className="mt-1">{privateNote?.note}</p>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {activeTab === "oils" ? (
            <section className="p-4 lg:p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-[#342a49]">追加オイル・精油図鑑</h2>
                  <p className="mt-1 text-sm text-[#7b7088]">{allEssentialOils.length}種類の精油を、香りの印象・相性・注意メモで確認できます。</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCreationPanel("oil")}
                    className="flex h-10 items-center gap-2 rounded-lg bg-[#8d6fd1] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#755bb4]"
                  >
                    <Plus className="h-4 w-4" />
                    精油追加
                  </button>
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-[#ded7ec] bg-white px-3">
                    <Search className="h-4 w-4 text-[#7b7088]" />
                    <input value={oilQuery} onChange={(event) => setOilQuery(event.target.value)} placeholder="精油名・学名で検索" className="w-44 bg-transparent text-sm outline-none" />
                  </div>
                  <select value={oilMood} onChange={(event) => setOilMood(event.target.value)} className="h-10 rounded-lg border border-[#ded7ec] bg-white px-3 text-sm outline-none">
                    {moodFilters.map((filter) => <option key={filter.slug} value={filter.slug}>{filter.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredOils.map((oil) => (
                  <article key={oil.slug} className="rounded-lg border border-[#e4dff0] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-[#3b3152]">{oil.name}</h3>
                        <p className="mt-1 text-xs italic text-[#7b708d]">{oil.botanical_name}</p>
                      </div>
                      <span className="rounded-lg px-2 py-1 text-xs font-bold text-white" style={{ background: oil.color }}>{oil.scent_note}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#665a78]">{oil.overview}</p>
                    <InfoLine label="香り" value={oil.scent_profile} />
                    <InfoLine label="よく使う場面" value={oil.common_uses.join(" / ")} />
                    <InfoLine label="相性" value={oil.blends_well_with.join(" / ")} />
                    <p className="mt-3 rounded-lg bg-[#fff8ef] p-3 text-xs leading-5 text-[#795f32]">{oil.safety_note}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>

      {creationPanel === "customer" ? (
        <ModalShell
          title="顧客カルテ追加"
          subtitle="新しい利用者カルテを作成します。正式DB保存前のデモでは、この画面内だけに反映されます。"
          onClose={() => setCreationPanel(null)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="氏名">
              <input value={customerForm.name} onChange={(event) => setCustomerForm((form) => ({ ...form, name: event.target.value }))} className="field-input" placeholder="例: 山田 太郎" />
            </Field>
            <Field label="顧客ID">
              <input value={customerForm.userId} onChange={(event) => setCustomerForm((form) => ({ ...form, userId: event.target.value }))} className="field-input" placeholder="空欄なら自動採番" />
            </Field>
            <Field label="好みカテゴリ">
              <input value={customerForm.favoriteTypes} onChange={(event) => setCustomerForm((form) => ({ ...form, favoriteTypes: event.target.value }))} className="field-input" placeholder="例: 睡眠系, 森林系" />
            </Field>
            <Field label="利用タイミング">
              <input value={customerForm.frequentTimes} onChange={(event) => setCustomerForm((form) => ({ ...form, frequentTimes: event.target.value }))} className="field-input" placeholder="例: 夜, 就寝前" />
            </Field>
          </div>
          <ModalActions onCancel={() => setCreationPanel(null)} onSave={addCustomerKarte} saveLabel="カルテを追加" />
        </ModalShell>
      ) : null}

      {creationPanel === "base" ? (
        <ModalShell
          title="ベースブレンド追加"
          subtitle="今後増えるベースブレンドを事業者図鑑へ追加します。"
          onClose={() => setCreationPanel(null)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="番号・表示コード">
              <input value={baseBlendForm.code} onChange={(event) => setBaseBlendForm((form) => ({ ...form, code: event.target.value }))} className="field-input" placeholder="例: ⑱ブレンド" />
            </Field>
            <Field label="ブレンド名">
              <input value={baseBlendForm.name} onChange={(event) => setBaseBlendForm((form) => ({ ...form, name: event.target.value }))} className="field-input" placeholder="例: Clear Ground" />
            </Field>
            <Field label="目的カテゴリ">
              <input value={baseBlendForm.benefits} onChange={(event) => setBaseBlendForm((form) => ({ ...form, benefits: event.target.value }))} className="field-input" placeholder="例: 集中, リラックス" />
            </Field>
            {baseSecretsUnlocked ? (
              <>
                <Field label="構成精油">
                  <input value={baseBlendForm.publicIngredients} onChange={(event) => setBaseBlendForm((form) => ({ ...form, publicIngredients: event.target.value }))} className="field-input" placeholder="例: ラベンダー, ヒノキ, ベルガモット" />
                </Field>
                <Field label="内部比率">
                  <input value={baseBlendForm.ratio} onChange={(event) => setBaseBlendForm((form) => ({ ...form, ratio: event.target.value }))} className="field-input" placeholder="例: 5 : 3 : 2" />
                </Field>
                <Field label="事業者メモ">
                  <input value={baseBlendForm.note} onChange={(event) => setBaseBlendForm((form) => ({ ...form, note: event.target.value }))} className="field-input" placeholder="運用時の注意や向いている測定傾向" />
                </Field>
              </>
            ) : null}
          </div>
          <ModalActions onCancel={() => setCreationPanel(null)} onSave={addBaseBlend} saveLabel="ベースを追加" />
        </ModalShell>
      ) : null}

      {creationPanel === "oil" ? (
        <ModalShell
          title="精油図鑑に追加"
          subtitle="追加オイル候補を精油図鑑へ登録します。制作記録の材料候補にも反映されます。"
          onClose={() => setCreationPanel(null)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="精油名">
              <input value={essentialOilForm.name} onChange={(event) => setEssentialOilForm((form) => ({ ...form, name: event.target.value }))} className="field-input" placeholder="例: ローズウッド" />
            </Field>
            <Field label="学名">
              <input value={essentialOilForm.botanicalName} onChange={(event) => setEssentialOilForm((form) => ({ ...form, botanicalName: event.target.value }))} className="field-input" placeholder="例: Aniba rosaeodora" />
            </Field>
            <Field label="科名">
              <input value={essentialOilForm.family} onChange={(event) => setEssentialOilForm((form) => ({ ...form, family: event.target.value }))} className="field-input" placeholder="例: クスノキ科" />
            </Field>
            <Field label="ノート">
              <select value={essentialOilForm.scentNote} onChange={(event) => setEssentialOilForm((form) => ({ ...form, scentNote: event.target.value as EssentialOil["scent_note"] }))} className="field-input">
                <option value="トップ">トップ</option>
                <option value="ミドル">ミドル</option>
                <option value="ベース">ベース</option>
              </select>
            </Field>
            <Field label="香りの印象">
              <input value={essentialOilForm.scentProfile} onChange={(event) => setEssentialOilForm((form) => ({ ...form, scentProfile: event.target.value }))} className="field-input" placeholder="例: ウッディ、フローラル、穏やか" />
            </Field>
            <Field label="気分カテゴリ">
              <select value={essentialOilForm.moodSlug} onChange={(event) => setEssentialOilForm((form) => ({ ...form, moodSlug: event.target.value }))} className="field-input">
                {moodFilters.filter((filter) => filter.slug !== "all").map((filter) => <option key={filter.slug} value={filter.slug}>{filter.label}</option>)}
              </select>
            </Field>
            <Field label="よく使う場面">
              <input value={essentialOilForm.commonUses} onChange={(event) => setEssentialOilForm((form) => ({ ...form, commonUses: event.target.value }))} className="field-input" placeholder="例: 夜の芳香浴, 緊張の切り替え" />
            </Field>
            <Field label="相性">
              <input value={essentialOilForm.blendsWellWith} onChange={(event) => setEssentialOilForm((form) => ({ ...form, blendsWellWith: event.target.value }))} className="field-input" placeholder="例: ラベンダー, ベルガモット" />
            </Field>
            <Field label="概要">
              <textarea value={essentialOilForm.overview} onChange={(event) => setEssentialOilForm((form) => ({ ...form, overview: event.target.value }))} className="field-input min-h-24 py-2 sm:col-span-2" />
            </Field>
            <Field label="注意メモ">
              <textarea value={essentialOilForm.safetyNote} onChange={(event) => setEssentialOilForm((form) => ({ ...form, safetyNote: event.target.value }))} className="field-input min-h-24 py-2 sm:col-span-2" />
            </Field>
          </div>
          <ModalActions onCancel={() => setCreationPanel(null)} onSave={addEssentialOil} saveLabel="精油を追加" />
        </ModalShell>
      ) : null}

      {viewerOpen && activeImage ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#211733]/78 p-4">
          <div className="w-full max-w-6xl rounded-lg bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#7b7088]">脳波画像 拡大表示</p>
                <h2 className="text-lg font-bold text-[#342a49]">{activeImage.title}</h2>
              </div>
              <button onClick={() => setViewerOpen(false)} className="grid h-10 w-10 place-items-center rounded-lg border border-[#ded7ec]" aria-label="拡大表示を閉じる">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[78vh] overflow-auto rounded-lg border border-[#e4dff0] bg-[#f8f5fd]">
              <img src={activeImage.src} alt={activeImage.title} className="mx-auto min-h-[520px] w-full object-contain" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ClientPanel({
  customers,
  selectedCustomerId,
  savedDrafts,
  onSelectCustomer,
  onOpenAddCustomer,
}: {
  customers: Profile[];
  selectedCustomerId: string;
  savedDrafts: SavedDraft[];
  onSelectCustomer: (customerId: string) => void;
  onOpenAddCustomer: () => void;
}) {
  return (
    <aside className="rounded-lg border border-[#e4dff0] bg-white p-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#3b3152]"><Users className="h-4 w-4 text-[#8d6fd1]" />顧客階層</h2>
          <span className="text-xs font-bold text-[#7f738d]">{customers.length}名</span>
        </div>
        <button
          type="button"
          onClick={onOpenAddCustomer}
          className="flex h-8 items-center gap-1 rounded-lg bg-[#8d6fd1] px-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#755bb4]"
        >
          <Plus className="h-3.5 w-3.5" />
          カルテ追加
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {customers.map((customer) => {
          const recordCount = operatorAromas.filter((record) => record.user_id === customer.user_id).length + savedDrafts.filter((draft) => draft.customerId === customer.user_id).length;
          const isActive = customer.user_id === selectedCustomerId;
          return (
            <button
              key={customer.id}
              type="button"
              onClick={() => onSelectCustomer(customer.user_id)}
              className={`w-full rounded-lg border p-3 text-left transition ${isActive ? "border-[#8d6fd1] bg-[#f3effb]" : "border-[#e6e0f0] bg-white hover:border-[#b7a5dd]"}`}
            >
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-lg text-sm font-bold ${isActive ? "bg-[#8d6fd1] text-white" : "bg-[#f1edf8] text-[#665a78]"}`}>{customer.name.slice(0, 1)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#3b3152]">{customer.name}</p>
                  <p className="truncate text-xs text-[#7b708d]">{customer.user_id}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#9a8caf]" />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-[#7b708d]">
                <span>履歴 {recordCount}件</span>
                <span>{customer.favorite_types?.[0] ?? "好み未設定"}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#665a78]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-16 rounded-lg border border-[#e4dff0] bg-[#f8f5fd] px-3 py-2">
      <p className="text-base font-bold text-[#8d6fd1]">{value}</p>
      <p className="text-[11px] font-bold text-[#7f738d]">{label}</p>
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#211733]/72 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-4 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#e4dff0] pb-3">
          <div>
            <h2 className="text-lg font-bold text-[#342a49]">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-[#7b708d]">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#ded7ec]" aria-label="追加フォームを閉じる">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onSave, saveLabel }: { onCancel: () => void; onSave: () => void; saveLabel: string }) {
  return (
    <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#e4dff0] pt-4">
      <button type="button" onClick={onCancel} className="h-10 rounded-lg border border-[#ded7ec] bg-white px-4 text-sm font-bold text-[#665a78]">
        キャンセル
      </button>
      <button type="button" onClick={onSave} className="flex h-10 items-center gap-2 rounded-lg bg-[#8d6fd1] px-4 text-sm font-bold text-white">
        <Plus className="h-4 w-4" />
        {saveLabel}
      </button>
    </div>
  );
}

function HistoryRow({
  title,
  date,
  meta,
  status,
  active,
  onSelect,
}: {
  title: string;
  date: string;
  meta: string;
  status: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid w-full gap-3 rounded-lg border p-3 text-left transition sm:grid-cols-[120px_minmax(0,1fr)_92px] sm:items-center ${active ? "border-[#8d6fd1] bg-[#f3effb]" : "border-[#e4deee] bg-[#fbf9ff] hover:border-[#b7a5dd]"}`}
    >
      <p className="text-xs font-bold text-[#7f738d]">{date}</p>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[#3b3152]">{title}</p>
        <p className="mt-1 truncate text-xs text-[#7b708d]">{meta}</p>
      </div>
      <span className="w-fit rounded-lg bg-white px-2 py-1 text-xs font-bold text-[#8d6fd1]">{status}</span>
    </button>
  );
}

function HistoryDetail({ history }: { history: ReturnType<typeof getActiveHistory> }) {
  if (!history) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-[#d8d0e8] bg-[#f8f5fd] p-4 text-sm text-[#7f738d]">
        閲覧できる制作履歴がまだありません。
      </div>
    );
  }

  if (history.kind === "draft") {
    return (
      <div className="mt-4 rounded-lg border border-[#e4dff0] bg-[#f8f5fd] p-4">
        <p className="text-xs font-bold text-[#7f738d]">選択中の制作履歴</p>
        <h3 className="mt-1 text-lg font-bold text-[#3b3152]">{history.draft.title}</h3>
        <div className="mt-3 grid gap-2 text-sm text-[#665a78] sm:grid-cols-2">
          <InfoLine label="制作日" value={history.draft.madeAt} />
          <InfoLine label="ベース" value={history.draft.baseBlendName} />
          <InfoLine label="完成量" value={`${history.draft.totalVolumeMl}mL`} />
          <InfoLine label="脳波画像" value={history.draft.imageTitle} />
        </div>
        <div className="mt-3 rounded-lg bg-white p-3">
          <p className="text-xs font-bold text-[#665a78]">配合材料</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {history.draft.formulaItems.map((item) => (
              <span key={item.id} className="rounded-lg border border-[#e4dff0] px-2 py-1 text-xs font-bold text-[#665a78]">
                {item.name} {formatDisplayVolume(parseVolumeUl(item.amountUl), "ul")} / {formatDisplayVolume(parseVolumeUl(item.amountUl), "ml")}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-[#e4dff0] bg-[#f8f5fd] p-4">
      <p className="text-xs font-bold text-[#7f738d]">選択中の制作履歴</p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#3b3152]">{history.record.title}</h3>
          <p className="mt-1 text-xs text-[#7b708d]">{history.record.subtitle}</p>
        </div>
        <span className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-[#8d6fd1]">{history.record.made_at}</span>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-[#665a78] sm:grid-cols-2">
        <InfoLine label="脳波ID" value={history.record.brainwave_profile_id ?? "未設定"} />
        <InfoLine label="ロット番号" value={history.record.blend_lot_number ?? "未設定"} />
        <InfoLine label="ベース" value={history.record.base_blend_name ?? "未設定"} />
        <InfoLine label="完成量" value={`${history.record.total_volume_ml}mL`} />
      </div>
      <div className="mt-3 rounded-lg bg-white p-3">
        <p className="text-xs font-bold text-[#665a78]">配合材料</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {history.record.formula_items.map((item) => (
            <span key={item.id} className="rounded-lg border border-[#e4dff0] px-2 py-1 text-xs font-bold text-[#665a78]">
              {item.name} {formatDisplayVolume(parseVolumeUl(item.amountUl), "ul")} / {formatDisplayVolume(parseVolumeUl(item.amountUl), "ml")}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-3 rounded-lg bg-white p-3 text-sm leading-6 text-[#665a78]">{history.record.maker_note}</p>
    </div>
  );
}

function HearingSheetPanel({ sheet }: { sheet: HearingSheet | null }) {
  if (!sheet) {
    return (
      <section className="rounded-lg border border-dashed border-[#d8d0e8] bg-white p-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#342a49]"><ClipboardList className="h-5 w-5 text-[#8d6fd1]" />ヒアリングシート回答履歴</h2>
        <p className="mt-3 text-sm leading-6 text-[#7f738d]">制作履歴を選択すると、Googleフォームまたは手動入力の回答がここに表示されます。</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-[#e4dff0] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#342a49]"><ClipboardList className="h-5 w-5 text-[#8d6fd1]" />ヒアリングシート回答履歴</h2>
          <p className="mt-1 text-xs leading-5 text-[#7b708d]">制作履歴ごとに紐づく回答を表示します。禁忌・注意は調香前の確認メモです。</p>
        </div>
        <span className="rounded-lg bg-[#f3effb] px-2 py-1 text-xs font-bold text-[#8d6fd1]">{sheet.source}</span>
      </div>

      <div className="mt-3 grid gap-2 rounded-lg border border-[#e8e2f2] bg-[#f8f5fd] p-3 text-sm text-[#665a78] sm:grid-cols-2">
        <InfoLine label="回答ID" value={sheet.responseId} />
        <InfoLine label="回答日" value={sheet.submittedAt} />
        <InfoLine label="ふりがな" value={sheet.nameKana} />
        <InfoLine label="年齢" value={`${sheet.birthday} 生 / ${calculateAge(sheet.birthday, sheet.submittedAt)}`} />
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold text-[#665a78]">今回の目的</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {sheet.purposeTags.map((tag) => (
            <span key={tag} className="rounded-lg border border-[#e4dff0] bg-[#fbf9ff] px-2 py-1 text-xs font-bold text-[#665a78]">{tag}</span>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <ResponseBlock label="欲しい香り" value={sheet.desiredScent} />
        <ResponseBlock label="香りの好み・避けたい印象" value={sheet.preferenceNotes} />
        <ResponseBlock label="持病・体調メモ" value={sheet.healthNotes} />
        <ResponseBlock label="服薬・医療確認メモ" value={sheet.medicationNotes} />
      </div>

      <div className="mt-4 rounded-lg border border-[#ead7bb] bg-[#fffaf0] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-[#795f32]">禁忌・注意事項</p>
          <span className="text-[11px] font-bold text-[#9a6d2d]">{sheet.safetyFlags.length}件</span>
        </div>
        {sheet.safetyFlags.length > 0 ? (
          <div className="mt-2 space-y-2">
            {sheet.safetyFlags.map((flag) => <SafetyFlagCard key={flag.id} flag={flag} />)}
          </div>
        ) : (
          <p className="mt-2 text-xs leading-5 text-[#795f32]">該当フラグなし。香りの強さ、既往歴、当日の体調を確認しながら低濃度から扱います。</p>
        )}
        <p className="mt-3 border-t border-[#ead7bb] pt-2 text-[11px] leading-5 text-[#806232]">
          医療判断ではなく、調香前の確認メモです。該当項目がある場合は専門家・医師・薬剤師の確認を優先します。
        </p>
      </div>

      <p className="mt-3 rounded-lg bg-[#f8f5fd] p-3 text-xs leading-5 text-[#665a78]">{sheet.operatorSummary}</p>
    </section>
  );
}

function ResponseBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e8e2f2] bg-[#fbf9ff] p-3">
      <p className="text-[11px] font-bold text-[#7b708d]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[#584d6b]">{value}</p>
    </div>
  );
}

function SafetyFlagCard({ flag }: { flag: SafetyFlag }) {
  const tone = flag.severity === "要確認"
    ? "border-[#e5c6aa] bg-white text-[#8c4f24]"
    : "border-[#ead7bb] bg-white text-[#795f32]";
  return (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-[#fff5e4] px-2 py-1 text-[11px] font-bold">{flag.severity}</span>
        <p className="text-sm font-bold">{flag.label}</p>
      </div>
      <p className="mt-2 text-xs leading-5">{flag.guidance}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="mt-3 text-xs leading-5 text-[#6f637f]">
      <span className="font-bold text-[#3b3152]">{label}: </span>
      {value}
    </p>
  );
}

function SideNavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-bold transition ${active ? "bg-[#8d6fd1] text-white" : "text-[#665a78] hover:bg-white"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function TopTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-md text-xs font-bold transition ${active ? "bg-[#8d6fd1] text-white" : "text-[#665a78]"}`}
    >
      {label}
    </button>
  );
}

function customer(
  id: string,
  userId: string,
  name: string,
  createdAt: string,
  favoriteTypes: string[],
  frequentTimes: string[],
): Profile {
  return {
    id,
    user_id: userId,
    name,
    avatar_url: null,
    role: "customer",
    created_at: createdAt,
    favorite_types: favoriteTypes,
    frequent_times: frequentTimes,
  };
}

function cloneRecord(source: AromaRecord, patch: Partial<OperatorRecord> & Pick<OperatorRecord, "id" | "user_id" | "title" | "brainwave_image_id" | "total_volume_ml" | "formula_items" | "maker_note">): OperatorRecord {
  const aromaRecordId = patch.id ?? source.id;
  const formulaItems = patch.formula_items;
  const madeAt = patch.made_at ?? source.made_at;
  return {
    ...source,
    ...patch,
    price: source.price,
    volume: `${patch.total_volume_ml}mL`,
    base_blend_volume_ml: patch.total_volume_ml,
    ingredients: formulaItems.map((item, index) => ({
      id: `${aromaRecordId}-formula-${index + 1}`,
      aroma_record_id: aromaRecordId,
      name: item.name,
      amount: formatNumber(parseVolumeUl(item.amountUl) / 1000, 3),
      unit: "ml",
      sort_order: index + 1,
    })),
    brainwave_image_id: patch.brainwave_image_id,
    total_volume_ml: patch.total_volume_ml,
    formula_items: formulaItems,
    maker_note: patch.maker_note,
    hearing_sheet: patch.hearing_sheet ?? createDefaultHearingSheet({
      id: aromaRecordId,
      user_id: patch.user_id,
      title: patch.title,
      made_at: madeAt,
    }),
  };
}

function createDefaultHearingSheet(record: HearingSheetSeed): HearingSheet {
  const profile = hearingProfiles[record.user_id] ?? { kana: "ふりがな未設定", birthday: "1990-01-01" };
  const purposeTags = getPurposeTags(record.title);
  return {
    id: `hearing-${record.id}`,
    source: "Googleフォーム",
    submittedAt: record.made_at,
    responseId: createResponseId(record.id),
    nameKana: profile.kana,
    birthday: profile.birthday,
    purposeTags,
    desiredScent: getDesiredScent(record.title),
    preferenceNotes: getPreferenceNotes(record.title),
    healthNotes: getHealthNotes(record.user_id, record.title),
    medicationNotes: getMedicationNotes(record.user_id),
    safetyFlags: getSafetyFlags(record.user_id, record.title),
    operatorSummary: `${purposeTags.join(" / ")}を主目的として回答。禁忌・注意フラグを確認したうえで、低濃度から香りを試作する。`,
  };
}

function createManualHearingSheet(record: HearingSheetSeed, customerName: string): HearingSheet {
  const purposeTags = getPurposeTags(record.title);
  return {
    id: `hearing-${record.id}`,
    source: "手動入力",
    submittedAt: record.made_at,
    responseId: `MANUAL-${record.id.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`,
    nameKana: `${customerName}（ふりがな未入力）`,
    birthday: "1990-01-01",
    purposeTags,
    desiredScent: getDesiredScent(record.title),
    preferenceNotes: "新規カルテのため、Googleフォーム回答は未連携。運用時はフォーム回答を取り込む想定。",
    healthNotes: "持病・体調メモ未入力。",
    medicationNotes: "服薬情報未入力。",
    safetyFlags: [],
    operatorSummary: "手動で作成した制作記録。正式運用ではGoogleフォーム回答またはヒアリング結果を保存してから制作履歴に紐づける。",
  };
}

function getActiveHistory(
  selection: HistorySelection | null,
  records: OperatorRecord[],
  drafts: SavedDraft[],
) {
  if (selection?.kind === "draft") {
    const draft = drafts.find((item) => item.id === selection.id);
    if (draft) return { kind: "draft" as const, draft };
  }

  if (selection?.kind === "record") {
    const record = records.find((item) => item.id === selection.id);
    if (record) return { kind: "record" as const, record };
  }

  const fallbackRecord = records[0];
  if (fallbackRecord) return { kind: "record" as const, record: fallbackRecord };

  const fallbackDraft = drafts[0];
  if (fallbackDraft) return { kind: "draft" as const, draft: fallbackDraft };

  return null;
}

function getActiveHearingSheet(history: ReturnType<typeof getActiveHistory>) {
  if (!history) return null;
  return history.kind === "draft" ? history.draft.hearingSheet : history.record.hearing_sheet;
}

function createResponseId(recordId: string) {
  return `GF-${recordId.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
}

function getPurposeTags(title: string) {
  const lowerTitle = title.toLowerCase();
  if (/sleep|night|calm/.test(lowerTitle)) return ["睡眠の質を上げたい", "就寝前に落ち着きたい"];
  if (/focus|work|mind/.test(lowerTitle)) return ["作業に集中したい", "頭をすっきりさせたい"];
  if (/breath|forest/.test(lowerTitle)) return ["呼吸を整えたい", "深く落ち着きたい"];
  if (/floral|balance|feminine/.test(lowerTitle)) return ["気分の波を整えたい", "やさしい香りが欲しい"];
  if (/citrus|energy|power|warm/.test(lowerTitle)) return ["活動前に切り替えたい", "明るく元気な香りが欲しい"];
  if (/resin|evening|ground/.test(lowerTitle)) return ["夕方の緊張をゆるめたい", "深く落ち着く香りが欲しい"];
  return ["目的未設定", "ヒアリングで確認"];
}

function getDesiredScent(title: string) {
  const lowerTitle = title.toLowerCase();
  if (/sleep|night|calm/.test(lowerTitle)) return "眠る前に香っても重すぎない、穏やかでやわらかい香り。";
  if (/focus|work|mind/.test(lowerTitle)) return "仕事や作業前に頭を切り替えられる、クリアで軽い香り。";
  if (/breath|forest/.test(lowerTitle)) return "深呼吸しやすい森林調。強すぎるミント感は避けたい。";
  if (/floral|balance|feminine/.test(lowerTitle)) return "花の印象は欲しいが甘すぎず、夕方にも使いやすい香り。";
  if (/citrus|energy|power|warm/.test(lowerTitle)) return "朝や外出前に使える、明るく温かみのある香り。";
  if (/resin|evening|ground/.test(lowerTitle)) return "静かで深い余韻があり、瞑想前にも使える香り。";
  return "ヒアリングで確認した目的に合わせた香り。";
}

function getPreferenceNotes(title: string) {
  const lowerTitle = title.toLowerCase();
  if (/sleep|night|calm/.test(lowerTitle)) return "甘すぎる香りと強いスパイスは苦手。ラベンダー、ウッディ、カモミールは許容。";
  if (/focus|work|mind/.test(lowerTitle)) return "鋭すぎるミントは控えめ希望。柑橘とハーバルは好印象。";
  if (/breath|forest/.test(lowerTitle)) return "森林浴のような印象を希望。薬品感のある強いユーカリは少量から。";
  if (/floral|balance|feminine/.test(lowerTitle)) return "ローズ系の濃い甘さは控えめ。ゼラニウムやパルマローザの軽い花調は好み。";
  if (/citrus|energy|power|warm/.test(lowerTitle)) return "柑橘は好み。辛みの強いスパイス、強いローズマリーは入れすぎない。";
  if (/resin|evening|ground/.test(lowerTitle)) return "重い樹脂系は好きだが、頭が重くなる場合があるため濃度を控えたい。";
  return "好み・苦手な香りはヒアリング時に追記。";
}

function getHealthNotes(userId: string, title: string) {
  if (userId === "user-sakura") return "大きな持病申告なし。香りに敏感な日があり、妊活中のため刺激の強い精油は避けたい。";
  if (userId === "user-ren") return "花粉時期に鼻の違和感が出やすい。強い清涼感は少量から確認。";
  if (userId === "user-mika") return title.toLowerCase().includes("breath")
    ? "出産直後の体調変化あり。睡眠不足が続いているため、芳香浴は短時間から確認。"
    : "授乳中。赤ちゃんの近くで強い香りを使わない前提で確認。";
  if (userId === "user-haruto") return "アレルギー性鼻炎あり。刺激の強いミントやユーカリは少量から確認。";
  if (userId === "user-natsumi") return "妊娠中。芳香浴も低濃度・短時間のみ検討し、皮膚塗布は避ける。";
  if (userId === "user-naoto") return "高血圧で通院中。刺激的なハーブやローズマリー量は慎重に確認。";
  if (userId === "user-eriko") return "持病申告なし。重い香りで頭重感が出る場合がある。";
  if (userId === "user-daichi") return "皮膚刺激が出やすい。運動前使用が中心で、塗布ではなく芳香浴想定。";
  return "持病・体調メモ未入力。";
}

function getMedicationNotes(userId: string) {
  if (userId === "user-naoto") return "降圧薬を服薬中。医師または薬剤師確認を優先する。";
  if (userId === "user-natsumi") return "妊婦健診中。服薬やサプリは来店ごとに確認する。";
  if (userId === "user-mika") return "授乳期のため、服薬がある場合は都度確認する。";
  return "常用薬なし、または申告なし。変更があれば制作前に再確認。";
}

function getSafetyFlags(userId: string, title: string) {
  const lowerTitle = title.toLowerCase();
  const flags: SafetyFlag[] = [];
  if (userId === "user-sakura") flags.push(safetyFlagCatalog.tryingToConceive, safetyFlagCatalog.sensitiveSkin);
  if (userId === "user-ren" || userId === "user-haruto") flags.push(safetyFlagCatalog.asthmaAllergy);
  if (userId === "user-mika") {
    flags.push(lowerTitle.includes("breath") ? safetyFlagCatalog.postpartum : safetyFlagCatalog.breastfeeding);
  }
  if (userId === "user-natsumi") flags.push(safetyFlagCatalog.pregnancy, safetyFlagCatalog.sensitiveSkin);
  if (userId === "user-naoto") flags.push(safetyFlagCatalog.hypertension, safetyFlagCatalog.medication);
  if (userId === "user-daichi") flags.push(safetyFlagCatalog.sensitiveSkin);
  return flags.filter(Boolean);
}

function calculateAge(birthday: string, atDate: string) {
  const birthdayDate = new Date(`${birthday}T00:00:00`);
  const baseDate = new Date(`${atDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birthdayDate.getTime()) || Number.isNaN(baseDate.getTime())) return "年齢未計算";

  let age = baseDate.getFullYear() - birthdayDate.getFullYear();
  const birthdayThisYear = new Date(baseDate.getFullYear(), birthdayDate.getMonth(), birthdayDate.getDate());
  if (baseDate < birthdayThisYear) age -= 1;
  return `${age}歳`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseVolumeUl(value: string) {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseVolumeMl(value: string) {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatDisplayVolume(valueUl: number, unit: VolumeUnit) {
  if (!Number.isFinite(valueUl) || valueUl === 0) return unit === "ul" ? "0μL" : "0mL";
  const sign = valueUl < 0 ? "-" : "";
  const absValue = Math.abs(valueUl);
  if (unit === "ml") return `${sign}${formatNumber(absValue / 1000, 3)}mL`;
  return `${sign}${formatNumber(absValue, 1)}μL`;
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatRatioPart(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return formatNumber(value / 1000, 3);
}

function formatOperatorBaseDescription(description: string) {
  return description
    .replace("公開画面では配合比率を表示しません。", "")
    .replace("公開画面では配合比率を表示しません", "")
    .trim();
}

function splitInputList(value: string, fallback: string[]) {
  const items = value
    .split(/[、,/\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
}

function toSlug(value: string, fallback: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function formula(...items: Array<string | number>): FormulaItem[] {
  const formulaItems: FormulaItem[] = [];
  for (let index = 0; index < items.length; index += 2) {
    const name = String(items[index] ?? "");
    const amountUl = String(items[index + 1] ?? "");
    if (!name || !amountUl) continue;
    formulaItems.push({
      id: `formula-${formulaItems.length + 1}-${name.replace(/\s+/g, "-")}`,
      name,
      amountUl,
    });
  }
  return formulaItems;
}

function waveColor(index: number, role: "primary" | "secondary") {
  const primaryColors = ["#8d6fd1", "#6f63c6", "#a78bda", "#806c46", "#9b82c8", "#78649b", "#875e4f", "#7d72bf"];
  const secondaryColors = ["#c7893a", "#d29a48", "#b75f48", "#8c6a44", "#b78657", "#9b7a45", "#c48a65", "#a56f3e"];
  return role === "primary" ? primaryColors[index % primaryColors.length] : secondaryColors[index % secondaryColors.length];
}

function createWaveSvg(label: string, primary: string, secondary: string, seed: number) {
  const primaryPoints = makeWavePoints(seed, 54, 0.24, 206);
  const secondaryPoints = makeWavePoints(seed + 11, 34, 0.31, 270);
  const thirdPoints = makeWavePoints(seed + 23, 24, 0.44, 332);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520">
      <rect width="900" height="520" fill="#f8f5fd"/>
      <g stroke="#e5dff1" stroke-width="1">
        ${Array.from({ length: 9 }, (_, index) => `<line x1="${100 + index * 90}" y1="72" x2="${100 + index * 90}" y2="438"/>`).join("")}
        ${Array.from({ length: 7 }, (_, index) => `<line x1="70" y1="${88 + index * 58}" x2="838" y2="${88 + index * 58}"/>`).join("")}
      </g>
      <rect x="58" y="54" width="794" height="402" rx="18" fill="none" stroke="#d5cce8" stroke-width="2"/>
      <polyline points="${primaryPoints}" fill="none" stroke="${primary}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="${secondaryPoints}" fill="none" stroke="${secondary}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
      <polyline points="${thirdPoints}" fill="none" stroke="#6f7f93" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.66"/>
      <g font-family="Arial, sans-serif">
        <text x="76" y="40" fill="#3b3152" font-size="22" font-weight="700">EEG 1 min / ${label}</text>
        <text x="76" y="488" fill="#827690" font-size="16">0s</text>
        <text x="800" y="488" fill="#827690" font-size="16">60s</text>
        <text x="720" y="40" fill="#827690" font-size="16">alpha / beta / theta</text>
      </g>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function makeWavePoints(seed: number, amplitude: number, frequency: number, baseline: number) {
  return Array.from({ length: 110 }, (_, index) => {
    const x = 76 + index * 7;
    const y = baseline
      + Math.sin((index + seed) * frequency) * amplitude
      + Math.sin((index + seed) * 0.08) * 16
      + Math.cos((index + seed) * 0.49) * 8;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

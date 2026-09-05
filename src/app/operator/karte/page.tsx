"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  FileImage,
  FileText,
  FlaskConical,
  ImagePlus,
  Leaf,
  ListTree,
  Lock,
  Maximize2,
  Plus,
  Redo2,
  Save,
  Search,
  Undo2,
  Unlock,
  Upload,
  Users,
  X,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { BrainwaveIntakePanel } from "@/components/BrainwaveIntakePanel";
import { saveAromaRecipe, useAromaRecipes } from "@/hooks/useAromaRecipes";
import { BrainwaveTrialGrid, groupIntoTrials } from "@/components/BrainwaveTrialGrid";
import {
  totalVolumeUl,
  type AromaRecipe,
} from "@/lib/aromaRecipes";
import {
  clearSession,
  loadSession,
  saveSession,
  SessionDraftTooLargeError,
  type SessionStorageKind,
} from "@/lib/sessionStore";
import { calculateAge as calculateClientAge, operatorClients } from "@/data/operatorClients";
import { getBaseBlendGuide } from "@/data/baseBlendGuides";
import { demoAromas, demoBaseBlends } from "@/data/mockData";
import { usePrivateBaseRecipes } from "@/hooks/usePrivateBaseRecipes";
import { useEditHistory } from "@/hooks/useEditHistory";
import { useViewerRole } from "@/hooks/useViewerRole";
import { canDisclose, disclosureLevelForRole, DISCLOSURE_DESCRIPTIONS } from "@/lib/disclosure";
import type { BrainwaveScreenshot, BrainwaveSession, ScreenshotScope } from "@/types/brainwave";
import { essentialOils } from "@/data/essentialOils";
import type { AromaRecord, BaseBlend, EssentialOil } from "@/types/aroma";
import type { Profile } from "@/types/profile";

/**
 * `location.search` を React の外部ストアとして読む。
 * popstate を購読しておくと、ブラウザの戻る・進むでも選択中の利用者が追従する。
 */
function subscribeToLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function readLocationSearch() {
  return window.location.search;
}

type KarteTab = "summary" | "measurements" | "blends" | "report" | "memo";

const KARTE_TABS: Array<{ value: KarteTab; label: string }> = [
  { value: "summary", label: "サマリー" },
  { value: "measurements", label: "脳波測定記録" },
  { value: "blends", label: "香り制作記録" },
  { value: "report", label: "レポート" },
  { value: "memo", label: "メモ" },
];
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

// カルテの利用者リストは operatorClients から作る。
// 利用者一覧ページと別々に持つと人数がずれるため、出典を1つに揃えている。
const operatorCustomers: Profile[] = operatorClients.map((client) =>
  customer(
    client.id,
    client.userId,
    client.name,
    `${client.firstVisitAt}T00:00:00.000Z`,
    client.preferenceTags,
    [],
  ),
);

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

/**
 * デモ用の脳波画像。
 *
 * FocusCalm の測定画面に出るグラフカードを再現した PNG を使う。
 * 1回の測定でリラックス度と集中度の2枚が出るので、必ず対で持たせる。
 * α〜θ の5帯域はカルテの画像としては持たない（CSVに保管する方針）。
 */
function makePair(options: {
  idPrefix: string;
  customerId: string;
  trialNo: number;
  trialLabel: string;
  variant: number;
  measuredAt: string;
  uploadedAt: string;
  scope: ScreenshotScope;
}): BrainwaveScreenshot[] {
  const base = {
    customerId: options.customerId,
    measuredAt: options.measuredAt,
    uploadedAt: options.uploadedAt,
    detectionReason: "デモデータ",
    note: "",
    source: "sample" as const,
    scope: options.scope,
    trialNo: options.trialNo,
    trialLabel: options.trialLabel,
  };
  return [
    {
      ...base,
      id: `${options.idPrefix}-relax`,
      title: `${options.trialLabel} / リラックス度`,
      src: `/demo/brainwave/relax-${options.variant}.png`,
      channels: ["relax"],
      contentHash: `sample-${options.idPrefix}-relax`,
    },
    {
      ...base,
      id: `${options.idPrefix}-focus`,
      title: `${options.trialLabel} / 集中度`,
      src: `/demo/brainwave/focus-${options.variant}.png`,
      channels: ["focus"],
      contentHash: `sample-${options.idPrefix}-focus`,
    },
  ];
}

/** 過去に決定した組み合わせの測定。カルテの記録として残るもの。 */
const decidedScreenshots: BrainwaveScreenshot[] = operatorAromas.flatMap((record, index) =>
  makePair({
    idPrefix: record.brainwave_image_id,
    customerId: record.user_id,
    trialNo: index + 1,
    trialLabel: record.title,
    variant: (index % 4) + 1,
    measuredAt: `${record.made_at} ${String(9 + (index % 8)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}`,
    uploadedAt: record.made_at,
    scope: "decided",
  }),
);

/**
 * 制作記録を持たない方にも、過去に決定した測定を持たせる。
 * 決定稿の枠が空のままだと、本日分との使い分けが画面から読み取れないため。
 */
const clientsWithoutRecords = operatorClients.filter(
  (client) => !operatorAromas.some((record) => record.user_id === client.userId),
);

const pastDecidedScreenshots: BrainwaveScreenshot[] = clientsWithoutRecords.flatMap(
  (client, index) =>
    makePair({
      idPrefix: `past-${client.userId}`,
      customerId: client.userId,
      trialNo: 1,
      trialLabel: `${client.lastVisitAt} にお渡しした香り`,
      variant: (index % 4) + 1,
      measuredAt: `${client.lastVisitAt} 15:${String((index * 13) % 60).padStart(2, "0")}`,
      uploadedAt: client.lastVisitAt,
      scope: "decided",
    }),
);

/**
 * 本日のセッションで試した測定のデモ。
 *
 * 1人あたり7回前後というのが実際の運用なので、その枚数で並びを確認できるようにする。
 * 前半はベース候補の比較、後半は追加精油の試作。
 */
const TODAY_TRIALS = [
  "測定のみ（香りなし）",
  "ベース候補① Elegant Harmony",
  "ベース候補② Woody Restore",
  "ベース候補③ Serene Dreams",
  "②＋ベルガモット 1滴",
  "②＋フランキンセンス 1滴",
  "②＋ベルガモット・フランキンセンス",
];

/**
 * カルテのヘッダーで足した注意事項を、ヒアリングシートの一覧に出せる形へ変換する。
 *
 * 定型文は `safetyFlagCatalog` の説明文を引き当て、自由入力はそのまま見出しにする。
 * 追加した内容が下の一覧に出ないと、その方の注意事項をまとめて確認できないため。
 */
function toSafetyFlag(note: string): SafetyFlag {
  const catalog = Object.values(safetyFlagCatalog);
  const matched =
    catalog.find((flag) => flag.label === note) ??
    catalog.find((flag) => note.includes(flag.label) || flag.label.includes(note));
  return {
    id: `karte-${note}`,
    label: note,
    severity: matched?.severity ?? "注意",
    guidance:
      matched?.guidance ??
      "カルテで追加した確認事項です。該当する場合は香りの強さと使い方を確認し、必要なら専門家へ相談してください。",
  };
}

/** 注意事項の入力を早くするための定型文。自由入力もできる。 */
const SAFETY_NOTE_PRESETS = [
  // 前半は safetyFlagCatalog と同じ見出しにしてある。こうしておくと、
  // 下の一覧に出したときに用意済みの説明文がそのまま引き当たる。
  "妊娠中",
  "出産直後",
  "妊活中",
  "授乳中",
  "高血圧・循環器系の既往",
  "喘息・アレルギー傾向",
  "服薬中",
  "敏感肌・皮膚トラブル",
  // ここから下は説明文を持たない。汎用の文面が付く。
  "低血圧",
  "てんかんの既往",
  "柑橘系の香りが苦手",
];

const todaySessionDate = "2026-05-26";

const trialScreenshots: BrainwaveScreenshot[] = operatorCustomers.flatMap((customer) =>
  TODAY_TRIALS.flatMap((label, index) =>
    makePair({
      idPrefix: `trial-${customer.user_id}-${index + 1}`,
      customerId: customer.user_id,
      trialNo: index + 1,
      trialLabel: label,
      variant: (index % 4) + 1,
      measuredAt: `${todaySessionDate} ${String(13 + Math.floor(index / 3)).padStart(2, "0")}:${String((index * 11) % 60).padStart(2, "0")}`,
      uploadedAt: todaySessionDate,
      scope: "trial",
    }),
  ),
);

const initialScreenshots: BrainwaveScreenshot[] = [
  ...trialScreenshots,
  ...decidedScreenshots,
  ...pastDecidedScreenshots,
];

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
  const [karteTab, setKarteTab] = useState<KarteTab>("measurements");
  // 問診中は画面に他の利用者の氏名が出ないよう、初期状態では誰も選択しない。
  // 「利用者を選ぶ」を押したときだけ一覧（ClientPicker）を開く。
  const [manualCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);

  // 利用者一覧から /operator/karte?client=... で来たときは、その人をそのまま開く。
  // ここで拾わないと、一覧で選んだのにもう一度選び直す二度手間になる。
  // URL はレンダー中に読めない外部の値なので useSyncExternalStore で取り込む。
  // サーバー側は空文字を返し、ハイドレーション後に実際のクエリで再描画される。
  const searchString = useSyncExternalStore(subscribeToLocation, readLocationSearch, () => "");
  const customerIdFromUrl = useMemo(() => {
    const requested = new URLSearchParams(searchString).get("client");
    if (!requested) return "";
    const target = operatorClients.find(
      (client) => client.id === requested || client.userId === requested,
    );
    return target?.userId ?? "";
  }, [searchString]);
  // 画面で選び直したらそちらが優先。まだ触っていなければ URL の指定を使う。
  const selectedCustomerId = manualCustomerId ?? customerIdFromUrl;
  const [selectedImageId, setSelectedImageId] = useState("");
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
  const [brainwaveScreenshots, setBrainwaveScreenshots] = useState<BrainwaveScreenshot[]>(initialScreenshots);
  const [toast, setToast] = useState("");
  // 本日のセッションの一時保存。再読み込みで測定が消えないようにする。
  // 読み込んだアロマレシピ。制作記録に「どの型から作ったか」を残すために持つ。
  const [appliedRecipeId, setAppliedRecipeId] = useState("");
  const [sessionSavedAt, setSessionSavedAt] = useState("");
  // どこに保存されたか。端末内だけの保存はその旨を伝える必要がある。
  const [sessionStorageKind, setSessionStorageKind] = useState<SessionStorageKind>("device");
  const [sessionSaving, setSessionSaving] = useState(false);
  const restoredForCustomer = useRef("");
  // 利用者ごとの禁忌・注意事項。カルテから足したり外したりできるようにする。
  const [safetyNoteOverrides, setSafetyNoteOverrides] = useState<Record<string, string[]>>({});
  const [safetyNoteDraft, setSafetyNoteDraft] = useState("");
  const [safetyNoteFormOpen, setSafetyNoteFormOpen] = useState(false);
  // ヒアリングシートの編集内容。元の回答は残し、上書き分だけを持つ。
  const [hearingSheetOverrides, setHearingSheetOverrides] = useState<Record<string, HearingSheet>>({});
  // アロマレシピとの行き来。読み込むと配合欄に流し込み、保存すると型として残す。
  const [recipePickerOpen, setRecipePickerOpen] = useState(false);

  const selectedCustomer = customers.find((customer) => customer.user_id === selectedCustomerId) ?? null;
  // 業務用の利用者情報（利用者番号・生年月日・禁忌）。利用者向けの Profile とは別データ。
  const selectedClient = operatorClients.find((client) => client.userId === selectedCustomerId) ?? null;
  const selectedClientAge = selectedClient ? calculateClientAge(selectedClient.birthday) : null;
  // 脳波画像とスクショ取り込みは同じ入れ物を見る。取り込むと即座にここへ反映される。
  // カルテに出すのはリラックス度と集中度だけ。α〜θ のグラフはここには並べない
  // （数値は CSV に保管してあり、必要なときはそちらから描き直す）。
  // 取り込み直後でまだ種類が決まっていないものは、取りこぼさないよう表示する。
  const customerImages = brainwaveScreenshots.filter((image) => {
    if (image.customerId !== selectedCustomerId) return false;
    if (image.channels.length === 0) return true;
    return image.channels.some((channel) => channel === "relax" || channel === "focus");
  });
  const activeImage = customerImages.find((image) => image.id === selectedImageId) ?? customerImages[0];
  // 本日試した測定と、決定した組み合わせの測定を分けて並べる。
  const trialImages = customerImages.filter((image) => image.scope === "trial");
  const decidedImages = customerImages.filter((image) => image.scope === "decided");
  const trialRows = groupIntoTrials(trialImages);
  const decidedRows = groupIntoTrials(decidedImages);

  // 保存済みの本日のセッションがあれば、その利用者を開いたときに戻す。
  // 保存先はサーバー優先で、使えない環境ではこの端末に置いたものを見に行く。
  useEffect(() => {
    if (!selectedCustomerId) return;
    if (restoredForCustomer.current === selectedCustomerId) return;
    restoredForCustomer.current = selectedCustomerId;
    let cancelled = false;
    void loadSession(selectedCustomerId).then((saved) => {
      if (cancelled || !saved || saved.screenshots.length === 0) return;
      setBrainwaveScreenshots((current) => [
        ...saved.screenshots,
        ...current.filter(
          (shot) => !(shot.customerId === selectedCustomerId && shot.scope === "trial"),
        ),
      ]);
      setSessionSavedAt(saved.savedAt);
      setSessionStorageKind(saved.storage);
      setToast(
        saved.storage === "server"
          ? "保存していた本日のセッションを読み込みました。"
          : "この端末に保存していた本日のセッションを読み込みました。",
      );
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCustomerId]);

  const selectedBase = allBaseBlends.find((blend) => blend.id === selectedBaseId) ?? allBaseBlends[0];
  const selectedBaseNote = allBaseNotes[selectedBase.id];
  const customerRecords = operatorAromas.filter((record) => record.user_id === selectedCustomerId);
  const customerDrafts = savedDrafts.filter((draft) => draft.customerId === selectedCustomerId);
  const latestRecord = [...customerRecords].sort((a, b) => b.made_at.localeCompare(a.made_at))[0];
  const activeHistory = getActiveHistory(selectedHistory, customerRecords, customerDrafts);
  const baseSafetyNotes = selectedClient?.safetyNotes ?? [];
  const safetyNotes = safetyNoteOverrides[selectedCustomerId] ?? baseSafetyNotes;
  // ヒアリングシートの一覧にも同じ内容を出す。カルテで足した分が見えないと確認漏れになる。
  const karteSafetyFlags = safetyNotes.map(toSafetyFlag);
  const storedHearingSheet = getActiveHearingSheet(activeHistory);
  const activeHearingSheet = storedHearingSheet
    ? hearingSheetOverrides[storedHearingSheet.id] ?? storedHearingSheet
    : null;
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
  // 配合レシピのセレクターに出す名前。ベースブレンドと追加精油の両方を選べる。
  const recipeMaterialOptions = useMemo(
    () => [...allBaseBlends.map((blend) => `${blend.code} ${blend.name}`), ...oilNameOptions],
    [allBaseBlends, oilNameOptions],
  );
  const filteredOils = allEssentialOils.filter((oil) => {
    const matchesQuery = `${oil.name} ${oil.botanical_name} ${oil.scent_profile}`.toLowerCase().includes(oilQuery.toLowerCase());
    const matchesMood = oilMood === "all" || oil.mood_slugs.includes(oilMood);
    return matchesQuery && matchesMood;
  });

  function selectCustomer(customerId: string) {
    setSelectedCustomerId(customerId);
    setClientPickerOpen(false);
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
    const firstImage = brainwaveScreenshots.find((image) => image.customerId === customerId);
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

  /** 本日のセッションを保存する。サーバーが使えない環境ではこの端末に保存する。 */
  async function saveTodaySession() {
    if (!selectedCustomerId || sessionSaving) return;
    setSessionSaving(true);
    try {
      const saved = await saveSession(selectedCustomerId, trialImages);
      setSessionSavedAt(saved.savedAt);
      setSessionStorageKind(saved.storage);
      // サーバーに入った場合は、画像の参照先が入れ替わっている。
      if (saved.storage === "server") {
        setBrainwaveScreenshots((current) => [
          ...saved.screenshots,
          ...current.filter(
            (shot) => !(shot.customerId === selectedCustomerId && shot.scope === "trial"),
          ),
        ]);
      }
      setToast(
        saved.storage === "server"
          ? `本日のセッション ${trialImages.length}枚を保存しました。`
          : `本日のセッション ${trialImages.length}枚をこの端末に保存しました。`,
      );
    } catch (error) {
      setToast(
        error instanceof SessionDraftTooLargeError
          ? error.message
          : "保存に失敗しました。もう一度お試しください。",
      );
    } finally {
      setSessionSaving(false);
    }
  }

  /** 保存した内容を破棄して、取り込み直しから始める。 */
  async function discardTodaySession() {
    if (!selectedCustomerId) return;
    await clearSession(selectedCustomerId);
    setSessionSavedAt("");
    setToast("保存した本日のセッションを削除しました。");
  }

  // 「戻る・進む」で元に戻せる範囲。1回で完結する操作だけを記録する。
  const snapshotKarte = useCallback(
    () => ({
      screenshots: brainwaveScreenshots,
      addedOils,
      safetyNoteOverrides,
      hearingSheetOverrides,
      blendTitle,
      makerNote,
      selectedBaseId,
    }),
    [
      brainwaveScreenshots,
      addedOils,
      safetyNoteOverrides,
      hearingSheetOverrides,
      blendTitle,
      makerNote,
      selectedBaseId,
    ],
  );

  const restoreKarte = useCallback((value: ReturnType<typeof snapshotKarte>) => {
    setBrainwaveScreenshots(value.screenshots);
    setAddedOils(value.addedOils);
    setSafetyNoteOverrides(value.safetyNoteOverrides);
    setHearingSheetOverrides(value.hearingSheetOverrides);
    setBlendTitle(value.blendTitle);
    setMakerNote(value.makerNote);
    setSelectedBaseId(value.selectedBaseId);
  }, []);

  const history = useEditHistory(snapshotKarte, restoreKarte);

  function undoEdit() {
    const label = history.undo();
    if (label) setToast(`「${label}」を元に戻しました。`);
  }

  function redoEdit() {
    const label = history.redo();
    if (label) setToast(`「${label}」をやり直しました。`);
  }

  /**
   * 禁忌・注意事項を足す。
   *
   * 施術の可否に直結する内容なので、画面の中だけに置かず必ずサーバーへ残す。
   * サーバーが使えない環境では画面内の保持だけで続け、その旨を伝える。
   */
  function addSafetyNote() {
    const value = safetyNoteDraft.trim();
    if (!value || !selectedCustomerId) return;
    if (safetyNotes.includes(value)) {
      setToast("同じ注意事項がすでに登録されています。");
      return;
    }
    history.commit("注意事項の追加");
    setSafetyNoteOverrides((current) => ({
      ...current,
      [selectedCustomerId]: [...safetyNotes, value],
    }));
    setSafetyNoteDraft("");
    setSafetyNoteFormOpen(false);

    const flag = toSafetyFlag(value);
    void fetch("/api/safety-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: selectedCustomerId,
        label: value,
        severity: flag.severity,
        guidance: flag.guidance,
      }),
    })
      .then((response) => {
        setToast(
          response.ok
            ? "注意事項を追加しました。"
            : "注意事項を追加しました（この画面でのみ保持しています）。",
        );
      })
      .catch(() => {
        setToast("注意事項を追加しました（この画面でのみ保持しています）。");
      });
  }

  /** 禁忌・注意事項を外す。 */
  function removeSafetyNote(note: string) {
    if (!selectedCustomerId) return;
    history.commit("注意事項の削除");
    setSafetyNoteOverrides((current) => ({
      ...current,
      [selectedCustomerId]: safetyNotes.filter((item) => item !== note),
    }));

    const query = `clientId=${encodeURIComponent(selectedCustomerId)}&label=${encodeURIComponent(note)}`;
    void fetch(`/api/safety-notes?${query}`, { method: "DELETE" })
      .then((response) => {
        setToast(
          response.ok
            ? "注意事項を外しました。"
            : "注意事項を外しました（この画面でのみ反映しています）。",
        );
      })
      .catch(() => {
        setToast("注意事項を外しました（この画面でのみ反映しています）。");
      });
  }

  /** ヒアリングシートの回答を書き換える。元の回答は残し、上書き分だけ持つ。 */
  function updateHearingSheet(patch: Partial<HearingSheet>, label: string) {
    if (!activeHearingSheet) return;
    history.commit(label);
    const next = { ...activeHearingSheet, ...patch };
    setHearingSheetOverrides((current) => ({ ...current, [next.id]: next }));
  }

  // 拡大表示は Esc でも閉じられるようにする。
  useEffect(() => {
    if (!viewerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewerOpen]);

  /** グラフをダブルクリックしたとき。選択したうえで拡大表示を開く。 */
  function expandBrainwaveImage(imageId: string) {
    selectBrainwaveImage(imageId);
    setViewerOpen(true);
  }

  /** 登録済みのレシピを配合欄へ流し込む。 */
  function applyRecipe(recipe: AromaRecipe) {
    history.commit("レシピの読み込み");
    // どの型から作ったかを制作記録に残す。レシピの「実績」はここから数える。
    setAppliedRecipeId(recipe.id);
    setSelectedBaseId(recipe.baseBlendId);
    setAddedOils(
      recipe.oils.map((oil, index) => ({
        id: `recipe-oil-${Date.now()}-${index}`,
        name: oil.name,
        amountUl: String(oil.amountUl),
      })),
    );
    setRecipePickerOpen(false);
    setToast(`レシピ「${recipe.name}」を読み込みました。`);
  }

  /** いまの配合をレシピとして残す。 */
  function saveCurrentAsRecipe() {
    const oils = addedOils
      .map((oil) => ({ name: oil.name, amountUl: parseVolumeUl(oil.amountUl) }))
      .filter((oil) => oil.name && oil.amountUl > 0);
    // 1行目はベースブレンドなので、追加精油からは外す。
    const baseLabel = `${selectedBase.code} ${selectedBase.name}`;
    const baseRow = oils.find((oil) => oil.name === baseLabel);
    const recipe: AromaRecipe = {
      id: `recipe-${Date.now()}`,
      name: blendTitle || `${selectedBase.name} の型`,
      baseBlendId: selectedBase.id,
      baseAmountUl: baseRow?.amountUl ?? 3000,
      oils: oils.filter((oil) => oil.name !== baseLabel),
      purposeTags: selectedBase.benefits.slice(0, 2),
      note: makerNote,
      createdAt: new Date().toISOString().slice(0, 10),
      outcome: { useCount: 0 },
    };
    void saveAromaRecipe(recipe).then((storage) => {
      setToast(
        storage === "database"
          ? `「${recipe.name}」をアロマレシピに保存しました。`
          : `「${recipe.name}」をこの端末のアロマレシピに保存しました。`,
      );
    });
  }

  /** 試した内容の書き換え。その回の2枚をまとめて更新する。 */
  function relabelTrial(trialNo: number, label: string) {
    setBrainwaveScreenshots((current) =>
      current.map((shot) =>
        shot.customerId === selectedCustomerId && shot.scope === "trial" && shot.trialNo === trialNo
          ? { ...shot, trialLabel: label }
          : shot,
      ),
    );
  }

  /** 実機の並びが逆だったとき用。その回のリラックス度と集中度を入れ替える。 */
  function swapTrialChannels(trialNo: number) {
    history.commit("リラックス度と集中度の入れ替え");
    setBrainwaveScreenshots((current) =>
      current.map((shot) => {
        if (shot.customerId !== selectedCustomerId || shot.scope !== "trial" || shot.trialNo !== trialNo) {
          return shot;
        }
        const swapped = shot.channels.map((channel) =>
          channel === "relax" ? "focus" : channel === "focus" ? "relax" : channel,
        );
        return { ...shot, channels: swapped, detectionReason: "手動で左右を入れ替え" };
      }),
    );
    setToast(`第${trialNo}回のリラックス度と集中度を入れ替えました。`);
  }

  function selectBrainwaveImage(imageId: string) {
    setSelectedImageId(imageId);
    const relatedRecord = operatorAromas.find((record) => record.user_id === selectedCustomerId && record.brainwave_image_id === imageId);
    if (relatedRecord) {
      selectRecordHistory(relatedRecord);
    }
  }

  function renameActiveImage(title: string) {
    if (!activeImage) return;
    setBrainwaveScreenshots((images) => images.map((image) => (image.id === activeImage.id ? { ...image, title } : image)));
  }

  function updateActiveImageNote(note: string) {
    if (!activeImage) return;
    setBrainwaveScreenshots((images) => images.map((image) => (image.id === activeImage.id ? { ...image, note } : image)));
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
    setToast(`${selectedCustomer?.name ?? "利用者"}の香り制作記録を保存しました。`);

    // 保存先（D1）があればそちらにも残す。未接続なら画面内の保持だけで従来どおり。
    void persistBlendRecord(draft, madeAt);
  }

  /**
   * 制作記録をサーバー側へ保存する。
   * これまで画面の中だけに持っていたため、再読み込みで消えていた。
   */
  async function persistBlendRecord(draft: SavedDraft, madeAt: string) {
    if (!selectedClient) return;
    try {
      const response = await fetch("/api/blend-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.id,
          title: draft.title,
          madeOn: madeAt,
          baseBlendId: draft.baseBlendId,
          // 識別子がベースの原簿に無い場合に備えて、名前も送る。
          baseBlendName: allBaseBlends.find((blend) => blend.id === draft.baseBlendId)?.name ?? "",
          totalVolumeMl: draft.totalVolumeMl,
          lotNumber: "",
          makerNote: draft.makerNote,
          recipeId: appliedRecipeId,
          items: draft.formulaItems.map((item) => ({
            name: item.name,
            amountUl: parseVolumeUl(item.amountUl),
          })),
        }),
      });
      if (response.ok) {
        setToast(`${selectedCustomer?.name ?? "利用者"}の香り制作記録を保存しました（サーバーに記録）。`);
      }
      // 503（未接続）と 401（未ログイン）は想定内。画面内の保持だけで続ける。
    } catch {
      // 通信できなくても、画面の操作は止めない。
    }
  }

  function addCustomerKarte() {
    const name = customerForm.name.trim();
    if (!name) {
      setToast("利用者名を入力してください。");
      return;
    }

    const userId = customerForm.userId.trim() || `user-${nextLocalId("karte")}`;
    if (customers.some((customer) => customer.user_id === userId)) {
      setToast("同じ利用者IDがすでにあります。別のIDを指定してください。");
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
    setToast(`${name}を精油図鑑に追加しました。`);
  }

  function nextLocalId(prefix: string) {
    const id = `${prefix}-${localIdCounter.current}`;
    localIdCounter.current += 1;
    return id;
  }

  return (
    <AdminShell
      title="利用者カルテ"
      subtitle="測定・制作・レポートを1人分まとめて扱います"
      actions={
        <div className="flex shrink-0 items-center gap-2">
          {/* 消してしまった画像や文言を戻すためのボタン。文字入力1文字ずつではなく、
              追加・削除・入れ替えといった操作の単位で戻る。 */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={undoEdit}
              disabled={!history.canUndo}
              aria-label="元に戻す"
              title={history.canUndo ? `元に戻す（${history.lastLabel}）` : "元に戻せる操作はありません"}
              className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--admin-border)] text-[var(--admin-text-muted)] transition hover:border-[var(--admin-primary)] hover:text-[var(--admin-primary-strong)] disabled:opacity-40 disabled:hover:border-[var(--admin-border)]"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={redoEdit}
              disabled={!history.canRedo}
              aria-label="やり直す"
              title={history.canRedo ? "やり直す" : "やり直せる操作はありません"}
              className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--admin-border)] text-[var(--admin-text-muted)] transition hover:border-[var(--admin-primary)] hover:text-[var(--admin-primary-strong)] disabled:opacity-40 disabled:hover:border-[var(--admin-border)]"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={saveDraft}
            className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[var(--admin-primary)] px-3 text-xs font-bold text-white transition hover:bg-[var(--admin-primary-strong)]"
          >
            <Save className="h-4 w-4" />
            カルテを保存
          </button>
        </div>
      }
    >
      <div>
        <div>
          {/* 選択中の利用者の身元情報。どのタブにいても常に見えるようにする。 */}
          <section className="border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-3 lg:px-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="text-xl font-bold text-[var(--admin-text)]">
                {selectedClient?.name ?? selectedCustomer?.name ?? "利用者未選択"}
              </h2>
              <button
                type="button"
                onClick={() => setClientPickerOpen(true)}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--admin-border)] px-2.5 text-xs font-bold text-[var(--admin-text-muted)] transition hover:border-[var(--admin-primary)] hover:text-[var(--admin-primary-strong)]"
              >
                <Search className="h-3.5 w-3.5" />
                {selectedCustomer ? "利用者を切り替える" : "利用者を選ぶ"}
              </button>
              {selectedCustomer ? (
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId("")}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--admin-border)] px-2.5 text-xs font-bold text-[var(--admin-text-muted)] transition hover:border-[var(--admin-danger)] hover:text-[var(--admin-danger)]"
                >
                  <X className="h-3.5 w-3.5" />
                  カルテを閉じる
                </button>
              ) : null}
              {selectedClient ? (
                <>
                  <span className="rounded-lg bg-[var(--admin-primary-soft)] px-2.5 py-1 text-xs font-bold text-[var(--admin-primary-strong)]">
                    ID: {selectedClient.clientNumber}
                  </span>
                  <span className="text-sm text-[var(--admin-text-muted)]">
                    {selectedClient.gender}
                    {selectedClientAge !== null ? ` ${selectedClientAge}歳` : ""}
                    （{selectedClient.birthday.replace(/-/g, "/")}）
                  </span>
                  <span className="text-sm text-[var(--admin-text-muted)]">職業: {selectedClient.occupation}</span>
                  <span className="ml-auto text-sm text-[var(--admin-text-muted)]">
                    最終来店: {selectedClient.lastVisitAt}
                  </span>
                </>
              ) : (
                <span className="text-sm text-[var(--admin-text-muted)]">
                  ID: {selectedCustomer?.user_id ?? "-"}
                </span>
              )}
            </div>

            {selectedCustomer ? (
              <div className="mt-2 rounded-lg bg-[var(--admin-warning-soft)] px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--admin-warning)]">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    禁忌・注意事項
                  </span>
                  {safetyNotes.length === 0 ? (
                    <span className="text-xs text-[var(--admin-text-muted)]">申告なし</span>
                  ) : (
                    safetyNotes.map((note) => (
                      <span
                        key={note}
                        className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[var(--admin-warning)]"
                      >
                        {note}
                        <button
                          type="button"
                          onClick={() => removeSafetyNote(note)}
                          aria-label={`${note} を外す`}
                          className="text-[var(--admin-text-muted)] transition hover:text-[var(--admin-danger)]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() => setSafetyNoteFormOpen((open) => !open)}
                    className="flex h-7 items-center gap-1 rounded-lg border border-[var(--admin-warning)]/40 bg-white px-2 text-xs font-bold text-[var(--admin-warning)] transition hover:bg-[var(--admin-warning-soft)]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    注意事項を追加
                  </button>
                </div>

                {safetyNoteFormOpen ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {SAFETY_NOTE_PRESETS.filter((preset) => !safetyNotes.includes(preset)).map(
                        (preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setSafetyNoteDraft(preset)}
                            className="rounded-full border border-[var(--admin-border)] bg-white px-2.5 py-1 text-xs transition hover:border-[var(--admin-warning)]"
                          >
                            {preset}
                          </button>
                        ),
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={safetyNoteDraft}
                        onChange={(event) => setSafetyNoteDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") addSafetyNote();
                        }}
                        placeholder="例: 高血圧の既往あり（ローズマリーは要確認）"
                        className="h-10 min-w-56 flex-1 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-base outline-none focus:border-[var(--admin-primary)]"
                      />
                      <button
                        type="button"
                        onClick={addSafetyNote}
                        disabled={!safetyNoteDraft.trim()}
                        className="h-10 shrink-0 rounded-lg bg-[var(--admin-primary)] px-4 text-xs font-bold text-white transition hover:bg-[var(--admin-primary-strong)] disabled:opacity-40"
                      >
                        追加する
                      </button>
                    </div>
                    <p className="text-[11px] leading-4 text-[var(--admin-text-muted)]">
                      医療判断ではなく、調香前の確認メモです。該当がある場合は専門家・医師・薬剤師の確認を優先します。
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-3 flex gap-1 overflow-x-auto border-b border-[var(--admin-border)]">
              {KARTE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setKarteTab(tab.value)}
                  aria-current={karteTab === tab.value ? "page" : undefined}
                  className={`shrink-0 border-b-2 px-4 py-2.5 text-sm transition ${
                    karteTab === tab.value
                      ? "border-[var(--admin-primary)] font-bold text-[var(--admin-primary-strong)]"
                      : "border-transparent font-semibold text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          {toast ? (
            <div className="mx-4 mt-4 flex items-center justify-between rounded-lg border border-[#ccbdec] bg-[#f3effb] px-4 py-3 text-sm font-bold text-[#8d6fd1] lg:mx-6">
              <span className="flex items-center gap-2"><Check className="h-4 w-4" />{toast}</span>
              <button onClick={() => setToast("")} aria-label="通知を閉じる"><X className="h-4 w-4" /></button>
            </div>
          ) : null}

          {!selectedCustomer ? (
            <section className="p-4 lg:p-6">
              <div className="mx-auto max-w-md rounded-lg border border-dashed border-[#ddd6ea] bg-white p-10 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#f3effb] text-[#8d6fd1]">
                  <Users className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-lg font-bold text-[#3b3152]">氏名を入力してください</h2>
                <p className="mt-2 text-sm leading-6 text-[#7b7088]">
                  問診中に他の利用者の氏名が画面に出ないよう、カルテは呼び出すまで表示しません。
                </p>
                <button
                  type="button"
                  onClick={() => setClientPickerOpen(true)}
                  className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-[#8d6fd1] px-5 text-sm font-bold text-white transition hover:bg-[#755bb4]"
                >
                  <Search className="h-4 w-4" />
                  利用者を選ぶ
                </button>
              </div>
            </section>
          ) : (
            <section className="grid gap-4 p-4 lg:p-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="min-w-0 space-y-4">
                {karteTab === "measurements" ? (
                  <>
                <section className="rounded-lg border border-[#e4dff0] bg-white p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-bold text-[#342a49]"><Activity className="h-5 w-5 text-[#8d6fd1]" />本日のセッション</h2>
                      <p className="mt-1 text-xs text-[#827690]">
                        ベース候補の比較と追加精油の試作。1回の測定につき、左にリラックス度、右に集中度を並べます。
                        グラフをダブルクリックすると拡大表示します。
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#f3effb] px-3 py-1 text-xs font-bold text-[#8d6fd1]">
                        {trialRows.length} 回 / {trialImages.length} 枚
                      </span>
                      <button
                        type="button"
                        onClick={saveTodaySession}
                        disabled={sessionSaving || trialImages.length === 0}
                        className="flex h-9 items-center gap-1.5 rounded-lg bg-[#8d6fd1] px-3 text-xs font-bold text-white transition hover:bg-[#7a5cc0] disabled:opacity-40"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {sessionSaving ? "保存中…" : "本日のセッションを保存"}
                      </button>
                    </div>
                  </div>

                  {sessionSavedAt ? (
                    <p className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-[#f3effb] px-3 py-2 text-xs text-[#665a78]">
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#8d6fd1]" />
                      {sessionStorageKind === "server"
                        ? "保存済み"
                        : "この端末に保存済み"}
                      （{new Date(sessionSavedAt).toLocaleString("ja-JP")}）。
                      {sessionStorageKind === "server"
                        ? "別の端末で開いても戻ります。"
                        : "再読み込みしても、この利用者を開くと戻ります。"}
                      <button
                        type="button"
                        onClick={discardTodaySession}
                        className="underline underline-offset-2 hover:text-[#8d6fd1]"
                      >
                        保存を削除
                      </button>
                    </p>
                  ) : null}
                  <div className="mt-4">
                    <BrainwaveTrialGrid
                      rows={trialRows}
                      activeImageId={activeImage?.id ?? ""}
                      onSelect={selectBrainwaveImage}
                      onExpand={expandBrainwaveImage}
                      onRelabel={relabelTrial}
                      onSwap={swapTrialChannels}
                      emptyMessage="本日の測定はまだありません。下の「脳波データ取り込み」からiPadのスクリーンショットを読み込むと、1枚につき1回の測定として、リラックス度と集中度に切り分けて並びます。"
                    />
                  </div>
                </section>

                <section className="rounded-lg border border-[#e4dff0] bg-white p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-bold text-[#342a49]"><ListTree className="h-5 w-5 text-[#8d6fd1]" />決定した組み合わせの測定</h2>
                      <p className="mt-1 text-xs text-[#827690]">
                        過去にお渡しした香りを決めたときの測定です。カルテの記録として残ります。
                      </p>
                    </div>
                    <span className="rounded-full bg-[#f3effb] px-3 py-1 text-xs font-bold text-[#8d6fd1]">
                      {decidedRows.length} 件
                    </span>
                  </div>
                  <div className="mt-4">
                    <BrainwaveTrialGrid
                      rows={decidedRows}
                      activeImageId={activeImage?.id ?? ""}
                      onSelect={selectBrainwaveImage}
                      onExpand={expandBrainwaveImage}
                      emptyMessage="決定した組み合わせの測定はまだありません。本日のセッションから採用する回を決めると、ここに残ります。"
                    />
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
                  onCommitHistory={history.commit}
                />
                  </>
                ) : null}

                {karteTab === "summary" || karteTab === "blends" ? (
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
                    <HearingSheetPanel
                      sheet={activeHearingSheet}
                      onChange={updateHearingSheet}
                      karteFlags={karteSafetyFlags}
                      onRemoveKarteFlag={removeSafetyNote}
                    />
                  </div>
                </section>
                ) : null}

                {karteTab === "report" ? (
                  <section className="rounded-lg border border-[#e4dff0] bg-white p-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-[#342a49]">
                      <FileText className="h-5 w-5 text-[#8d6fd1]" />レポート
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-[#665a78]">
                      利用者へ渡すレポートの書き出しはまだ作っていません。載せてよい項目
                      （測定はリラックス・集中のみ、内部比率と5帯域は載せない）を確定してから実装します。
                    </p>
                    <Link
                      href="/operator/reports"
                      className="mt-4 inline-flex h-9 items-center rounded-lg border border-[#ded7ec] px-3 text-xs font-bold text-[#584d6b]"
                    >
                      実装予定の内容を見る
                    </Link>
                  </section>
                ) : null}

                {karteTab === "memo" ? (
                  <section className="rounded-lg border border-[#e4dff0] bg-white p-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-[#342a49]">
                      <ClipboardList className="h-5 w-5 text-[#8d6fd1]" />施術メモ
                    </h2>
                    <p className="mt-1 text-xs text-[#827690]">
                      制作時の判断や利用者の反応など、内部向けの記録です。利用者には表示しません。
                    </p>
                    <textarea
                      value={makerNote}
                      onChange={(event) => setMakerNote(event.target.value)}
                      className="mt-3 min-h-40 w-full rounded-lg border border-[#ddd6ea] bg-white px-3 py-2 text-sm outline-none focus:border-[#8d6fd1]"
                      placeholder="例: 前回より甘さを控えめに。ベルガモットで締めた。"
                    />
                    {selectedClient ? (
                      <p className="mt-3 rounded-lg bg-[#f8f5fd] p-3 text-xs leading-5 text-[#665a78]">
                        <span className="font-bold">カウンセリング記録:</span> {selectedClient.note}
                      </p>
                    ) : null}
                  </section>
                ) : null}
              </div>

              <aside className="min-w-0 space-y-4">
                <section className="rounded-lg border border-[#e4dff0] bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-bold text-[#342a49]"><FileImage className="h-5 w-5 text-[#8d6fd1]" />画像プレビュー</h2>
                      <p className="mt-1 text-xs text-[#827690]">グラフをダブルクリックしても拡大できます</p>
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
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setRecipePickerOpen(true)}
                            className="flex h-8 items-center gap-1 rounded-lg border border-[#ded7ec] px-2 text-xs font-bold text-[#8d6fd1]"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            レシピから
                          </button>
                          <button
                            type="button"
                            onClick={saveCurrentAsRecipe}
                            className="flex h-8 items-center gap-1 rounded-lg border border-[#ded7ec] px-2 text-xs font-bold text-[#8d6fd1]"
                          >
                            <Save className="h-3.5 w-3.5" />
                            レシピへ保存
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const id = nextLocalId("oil");
                              history.commit("材料の追加");
                              setAddedOils((rows) => [...rows, { id, name: "ローマンカモミール", amountUl: "1000" }]);
                            }}
                            className="flex h-8 items-center gap-1 rounded-lg border border-[#ded7ec] px-2 text-xs font-bold text-[#8d6fd1]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            追加
                          </button>
                        </div>
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
                            <select
                              value={row.name}
                              onChange={(event) => updateOil(row.id, { name: event.target.value })}
                              aria-label="材料"
                              className="field-input h-10"
                            >
                              {/* 登録済みの名前でないものが入っていても選択が消えないよう、先頭に残す */}
                              {!recipeMaterialOptions.includes(row.name) ? (
                                <option value={row.name}>{row.name}</option>
                              ) : null}
                              <optgroup label="ベースブレンド">
                                {allBaseBlends.map((blend) => (
                                  <option key={blend.id} value={`${blend.code} ${blend.name}`}>
                                    {blend.code} {blend.name}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="エッセンシャルオイル">
                                {oilNameOptions.map((name) => (
                                  <option key={name} value={name}>
                                    {name}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
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
                            <button type="button" onClick={() => { history.commit("材料の削除"); setAddedOils((rows) => rows.filter((item) => item.id !== row.id)); }} className="rounded-lg bg-[#f3effb] text-[#7b7088]" aria-label="追加オイルを削除">×</button>
                            <p className="col-span-4 -mt-1 px-1 text-[11px] text-[#9a8caf]">構成比 {formatNumber(row.ratioPercent)}%</p>
                          </div>
                        ))}
                      </div>
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
          )}
        </div>
      </div>

      <ClientPicker
        open={clientPickerOpen}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        savedDrafts={savedDrafts}
        onSelectCustomer={selectCustomer}
        onOpenAddCustomer={() => {
          setClientPickerOpen(false);
          setCreationPanel("customer");
        }}
        onClose={() => setClientPickerOpen(false)}
      />

      {creationPanel === "customer" ? (
        <ModalShell
          title="利用者カルテ追加"
          subtitle="新しい利用者カルテを作成します。正式DB保存前のデモでは、この画面内だけに反映されます。"
          onClose={() => setCreationPanel(null)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="氏名">
              <input value={customerForm.name} onChange={(event) => setCustomerForm((form) => ({ ...form, name: event.target.value }))} className="field-input" placeholder="例: 山田 太郎" />
            </Field>
            <Field label="利用者ID">
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

      {recipePickerOpen ? (
        <RecipePicker
          onSelect={applyRecipe}
          onClose={() => setRecipePickerOpen(false)}
        />
      ) : null}

      {viewerOpen && activeImage ? (
        // 画像の外側をクリックしても閉じる。拡大したまま操作が止まるのを避ける。
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#211733]/78 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="脳波画像 拡大表示"
          onClick={() => setViewerOpen(false)}
        >
          <div
            className="w-full max-w-6xl rounded-lg bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
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
    </AdminShell>
  );
}

/**
 * 登録済みのアロマレシピから選ぶ。
 * カルテの配合欄へそのまま流し込むための入口。
 */
function RecipePicker({
  onSelect,
  onClose,
}: {
  onSelect: (recipe: AromaRecipe) => void;
  onClose: () => void;
}) {
  const { recipes } = useAromaRecipes();
  const [query, setQuery] = useState("");

  const visible = recipes.filter((recipe) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [recipe.name, recipe.note, ...recipe.purposeTags, ...recipe.oils.map((oil) => oil.name)]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#211733]/78 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="アロマレシピから選ぶ"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e4dff0] p-4">
          <div>
            <h2 className="text-lg font-bold text-[#342a49]">アロマレシピから読み込む</h2>
            <p className="mt-1 text-xs text-[#7b708d]">
              選ぶと、ベースブレンドと追加精油が配合欄に入ります。
            </p>
          </div>
          <button onClick={onClose} aria-label="閉じる" className="grid h-9 w-9 place-items-center rounded-lg border border-[#ded7ec]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-[#e4dff0] p-4">
          <div className="flex h-11 items-center gap-2 rounded-lg border border-[#ddd6ea] px-3">
            <Search className="h-4 w-4 shrink-0 text-[#827690]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="レシピ名・精油名・場面で探す"
              className="min-w-0 flex-1 bg-transparent text-base outline-none"
            />
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {visible.length === 0 ? (
            <p className="p-6 text-center text-sm text-[#7f738d]">
              {recipes.length === 0
                ? "登録済みのレシピがありません。アロマレシピの画面から登録してください。"
                : "条件に合うレシピがありません。"}
            </p>
          ) : (
            visible.map((recipe) => {
              const blend = demoBaseBlends.find((item) => item.id === recipe.baseBlendId);
              return (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => onSelect(recipe)}
                  className="w-full rounded-lg border border-[#e4dff0] p-3 text-left transition hover:border-[#8d6fd1]"
                >
                  <p className="text-sm font-bold text-[#3b3152]">{recipe.name}</p>
                  <p className="mt-1 text-xs text-[#7b708d]">
                    {blend ? `${blend.code} ${blend.name}` : "ベース未設定"}
                    {recipe.oils.length > 0 ? ` ＋ ${recipe.oils.map((oil) => oil.name).join(" / ")}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-[#9a8caf]">
                    合計 {(totalVolumeUl(recipe) / 1000).toFixed(1)}mL
                    {recipe.outcome.useCount > 0 ? ` / 実績 ${recipe.outcome.useCount}回` : ""}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function ClientPicker({
  open,
  customers,
  selectedCustomerId,
  savedDrafts,
  onSelectCustomer,
  onOpenAddCustomer,
  onClose,
}: {
  open: boolean;
  customers: Profile[];
  selectedCustomerId: string;
  savedDrafts: SavedDraft[];
  onSelectCustomer: (customerId: string) => void;
  onOpenAddCustomer: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  // 閉じている間は一覧を描画しない。問診中に他の利用者の氏名が
  // 画面へ残らないようにするため、DOM ごと消す。
  if (!open) return null;

  const q = query.trim().toLowerCase();
  // 個人情報保護の観点から、開いた時点では一覧を出さない。
  // 利用者が画面を見ている場面で他の人の氏名が並ぶのを避けるため、
  // 氏名を入力して該当した人だけを表示する。
  // 利用者番号(CLT-00058)は他の画面に表示されるため、検索の対象に含める。
  // 番号を見て打ったのに0件、という行き止まりを作らないようにするため。
  const filtered = q
    ? customers.filter((customer) =>
        `${customer.name} ${customer.id} ${customer.user_id}`.toLowerCase().includes(q),
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="利用者の選択を閉じる"
        onClick={onClose}
        className="absolute inset-0 bg-[#2b2340]/45"
      />
      <div
        role="dialog"
        aria-label="利用者を選ぶ"
        className="safe-top relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="border-b border-[#e4dff0] px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-bold text-[#3b3152]">
              <Users className="h-4 w-4 text-[#8d6fd1]" />
              利用者を選ぶ
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className="grid h-8 w-8 place-items-center rounded-lg border border-[#e4dff0]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex h-10 items-center gap-2 rounded-lg border border-[#ddd6ea] px-3">
            <Search className="h-4 w-4 shrink-0 text-[#827690]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="氏名・利用者IDで検索"
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="検索条件を消す">
                <X className="h-4 w-4 text-[#827690]" />
              </button>
            ) : null}
          </div>

          <p className="mt-2 text-xs text-[#827690]">
            {q ? `${filtered.length}名が一致しました` : "氏名の一部を入力すると候補が出ます"}
          </p>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {!q ? (
            <p className="rounded-lg border border-dashed border-[#ddd6ea] p-8 text-center text-sm leading-6 text-[#827690]">
              氏名を入力してください。
              <br />
              入力するまで一覧は表示しません。
            </p>
          ) : filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#ddd6ea] p-8 text-center text-sm text-[#827690]">
              該当する方がいません。
            </p>
          ) : (
            filtered.map((customer) => {
              const recordCount =
                operatorAromas.filter((record) => record.user_id === customer.user_id).length +
                savedDrafts.filter((draft) => draft.customerId === customer.user_id).length;
              const isActive = customer.user_id === selectedCustomerId;
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => onSelectCustomer(customer.user_id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    isActive
                      ? "border-[#8d6fd1] bg-[#f3effb]"
                      : "border-[#e6e0f0] bg-white hover:border-[#b7a5dd]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid h-10 w-10 place-items-center rounded-lg text-sm font-bold ${
                        isActive ? "bg-[#8d6fd1] text-white" : "bg-[#f1edf8] text-[#665a78]"
                      }`}
                    >
                      {customer.name.slice(0, 1)}
                    </div>
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
            })
          )}
        </div>

        <div className="border-t border-[#e4dff0] px-5 py-4">
          <button
            type="button"
            onClick={onOpenAddCustomer}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#8d6fd1] text-xs font-bold text-white transition hover:bg-[#755bb4]"
          >
            <Plus className="h-4 w-4" />
            カルテを新規追加
          </button>
        </div>
      </div>
    </div>
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

function HearingSheetPanel({
  sheet,
  onChange,
  karteFlags,
  onRemoveKarteFlag,
}: {
  sheet: HearingSheet | null;
  onChange: (patch: Partial<HearingSheet>, label: string) => void;
  /** カルテのヘッダーで足した注意事項。 */
  karteFlags: SafetyFlag[];
  onRemoveKarteFlag: (note: string) => void;
}) {
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
        <ResponseBlock
          label="欲しい香り"
          value={sheet.desiredScent}
          onCommit={(value) => onChange({ desiredScent: value }, "欲しい香りの編集")}
        />
        <ResponseBlock
          label="香りの好み・避けたい印象"
          value={sheet.preferenceNotes}
          onCommit={(value) => onChange({ preferenceNotes: value }, "香りの好みの編集")}
        />
        <ResponseBlock
          label="持病・体調メモ"
          value={sheet.healthNotes}
          onCommit={(value) => onChange({ healthNotes: value }, "持病・体調メモの編集")}
        />
        <ResponseBlock
          label="服薬・医療確認メモ"
          value={sheet.medicationNotes}
          onCommit={(value) => onChange({ medicationNotes: value }, "服薬メモの編集")}
        />
      </div>

      <div className="mt-4 rounded-lg border border-[#ead7bb] bg-[#fffaf0] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-[#795f32]">禁忌・注意事項</p>
          <span className="text-[11px] font-bold text-[#9a6d2d]">
            {sheet.safetyFlags.length + karteFlags.length}件
          </span>
        </div>
        {sheet.safetyFlags.length + karteFlags.length > 0 ? (
          <div className="mt-2 space-y-2">
            {sheet.safetyFlags.map((flag) => <SafetyFlagCard key={flag.id} flag={flag} />)}
            {karteFlags.map((flag) => (
              <SafetyFlagCard
                key={flag.id}
                flag={flag}
                origin="カルテで追加"
                onRemove={() => onRemoveKarteFlag(flag.label)}
              />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs leading-5 text-[#795f32]">該当フラグなし。香りの強さ、既往歴、当日の体調を確認しながら低濃度から扱います。</p>
        )}
        <p className="mt-3 border-t border-[#ead7bb] pt-2 text-[11px] leading-5 text-[#806232]">
          医療判断ではなく、調香前の確認メモです。該当項目がある場合は専門家・医師・薬剤師の確認を優先します。
        </p>
      </div>

      <div className="mt-3">
        <ResponseBlock
          label="施術者のまとめ"
          value={sheet.operatorSummary}
          onCommit={(value) => onChange({ operatorSummary: value }, "施術者のまとめの編集")}
        />
      </div>
    </section>
  );
}

/**
 * ヒアリングシートの1項目。
 *
 * Googleフォームの回答をそのまま出しつつ、その場で直せるようにする。
 * 入力中は記録せず、離れたときに変わっていれば1回の操作として記録する
 * （1文字ずつ「戻る」で消えていくのを避けるため）。
 */
function ResponseBlock({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit?: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  // 履歴を切り替えるなどで元の値が変わったら、表示している下書きも入れ替える。
  const [committed, setCommitted] = useState(value);
  if (committed !== value) {
    setCommitted(value);
    setDraft(value);
  }

  if (!onCommit) {
    return (
      <div className="rounded-lg border border-[#e8e2f2] bg-[#fbf9ff] p-3">
        <p className="text-[11px] font-bold text-[#7b708d]">{label}</p>
        <p className="mt-1 text-sm leading-6 text-[#584d6b]">{value}</p>
      </div>
    );
  }

  return (
    <label className="block rounded-lg border border-[#e8e2f2] bg-[#fbf9ff] p-3">
      <span className="text-[11px] font-bold text-[#7b708d]">{label}</span>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== committed) {
            setCommitted(draft);
            onCommit(draft);
          }
        }}
        rows={2}
        className="mt-1 w-full resize-y rounded-lg border border-transparent bg-transparent text-sm leading-6 text-[#584d6b] outline-none transition focus:border-[#8d6fd1] focus:bg-white focus:px-2 focus:py-1"
      />
    </label>
  );
}

function SafetyFlagCard({
  flag,
  origin,
  onRemove,
}: {
  flag: SafetyFlag;
  /** 回答由来か、カルテで足したものかを見分けるための表示。 */
  origin?: string;
  onRemove?: () => void;
}) {
  const tone = flag.severity === "要確認"
    ? "border-[#e5c6aa] bg-white text-[#8c4f24]"
    : "border-[#ead7bb] bg-white text-[#795f32]";
  return (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-[#fff5e4] px-2 py-1 text-[11px] font-bold">{flag.severity}</span>
        <p className="text-sm font-bold">{flag.label}</p>
        {origin ? (
          <span className="rounded-md border border-current px-1.5 py-0.5 text-[10px] font-bold opacity-70">
            {origin}
          </span>
        ) : null}
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`${flag.label} を外す`}
            className="ml-auto opacity-60 transition hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
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


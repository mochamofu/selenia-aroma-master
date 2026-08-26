/**
 * 利用者へ渡すレポートのデモデータ。
 *
 * Supabase 接続後は測定セッションと制作記録から組み立てる。ここに実在の
 * 利用者データを書かないこと。
 *
 * 載せてよい範囲は開示ポリシーの「一般公開」に合わせる。
 * 内部配合比率と α〜θ の5帯域はレポートに含めない。
 */

import { essentialOils } from "@/data/essentialOils";
import { demoBaseBlends } from "@/data/mockData";
import { operatorClients } from "@/data/operatorClients";

export type ReportEntry = {
  id: string;
  clientId: string;
  measuredAt: string;
  /** 測定画面から切り出したグラフ。リラックス度と集中度の2枚だけ。 */
  relaxImage: string;
  focusImage: string;
  relaxAverage: number;
  focusAverage: number;
  baseBlendId: string;
  /** 追加した精油名。分量は載せない。 */
  addedOils: string[];
  blendName: string;
  volumeMl: number;
  /** 施術者が利用者へ伝えた内容。効能を断定しない表現で書く。 */
  comment: string;
  /** 使い方の案内。 */
  usage: string;
};

const BLEND_NAMES = [
  "Sleep Reset",
  "Morning Focus",
  "Evening Calm",
  "Day Switch",
  "Quiet Hours",
];

const COMMENTS = [
  "測定では、はじめの30秒で緊張の傾向がみられ、後半にかけてゆるやかに落ち着いていきました。夜の切り替えに向く構成でお作りしています。",
  "集中の値が中盤から上がっていく形でした。作業前の切り替えに使いやすい、軽さのある構成にしています。",
  "全体を通して大きな振れ幅がなく、安定した測定結果でした。日常づかいしやすい穏やかな構成です。",
];

const USAGES = [
  "ティッシュやコットンに1〜2滴たらし、枕元に置いてお使いください。",
  "ディフューザーに2〜3滴。作業をはじめる10分ほど前からお使いください。",
  "マグカップにお湯を張り、1滴たらして香りを立ててお使いください。",
];

/** 生年月日やIDに依存しない決定的な採番。デモ表示が毎回変わらないようにする。 */
function pick<T>(items: T[], seed: number): T {
  return items[seed % items.length];
}

export const operatorReports: ReportEntry[] = operatorClients.flatMap((client, clientIndex) => {
  // 来店回数が多い方は2回分、それ以外は1回分のレポートを持たせる。
  const count = client.measurementCount >= 4 ? 2 : 1;
  return Array.from({ length: count }, (_, index) => {
    const seed = clientIndex * 3 + index;
    const variant = (seed % 4) + 1;
    const blend = demoBaseBlends[seed % demoBaseBlends.length];
    return {
      id: `${client.id}-report-${index + 1}`,
      clientId: client.id,
      measuredAt: index === 0 ? client.lastVisitAt : client.firstVisitAt,
      relaxImage: `/demo/brainwave/relax-${variant}.png`,
      focusImage: `/demo/brainwave/focus-${variant}.png`,
      relaxAverage: 48 + ((seed * 7) % 34),
      focusAverage: 42 + ((seed * 11) % 38),
      baseBlendId: blend.id,
      // ベースの構成精油と重ならないよう、追加分は別のリストから選ぶ。
      addedOils: essentialOils
        .filter((oil) => !blend.public_ingredients.includes(oil.name))
        .slice(seed % 12, (seed % 12) + 2)
        .map((oil) => oil.name),
      blendName: `${pick(BLEND_NAMES, seed)} ${index === 0 ? "" : "II"}`.trim(),
      volumeMl: seed % 2 === 0 ? 5 : 10,
      comment: pick(COMMENTS, seed),
      usage: pick(USAGES, seed),
    };
  });
});

export function reportsForClient(clientId: string): ReportEntry[] {
  return operatorReports
    .filter((report) => report.clientId === clientId)
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
}

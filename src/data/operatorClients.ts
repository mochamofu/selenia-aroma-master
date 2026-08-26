/**
 * 管理者・施術者向けアプリの顧客デモデータ。
 *
 * 利用者向けアプリの `demoCustomers` とは別物。こちらは業務用カルテなので
 * 顧客番号・生年月日・職業・来店履歴など、施術者が必要とする項目を持つ。
 *
 * Supabase 接続後は `profiles` と関連テーブルに置き換える。
 * 本番の実顧客データをこのファイルへ書かないこと。
 */

export type ClientGender = "女性" | "男性" | "回答なし";

export type OperatorClient = {
  id: string;
  /** 業務上の顧客番号。カルテの見出しに出す。 */
  clientNumber: string;
  /** 認証ユーザーとの紐づけ。 */
  userId: string;
  name: string;
  nameKana: string;
  gender: ClientGender;
  birthday: string;
  occupation: string;
  firstVisitAt: string;
  lastVisitAt: string;
  /** 香りの好み傾向。カウンセリングの起点にする。 */
  preferenceTags: string[];
  /** 事前確認が必要な事項。空配列なら申告なし。 */
  safetyNotes: string[];
  measurementCount: number;
  blendCount: number;
  orderCount: number;
  note: string;
};

/** 生年月日から現在年齢を出す。カルテ見出しの「34歳」表示用。 */
export function calculateAge(birthday: string, today = new Date()): number | null {
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

export const operatorClients: OperatorClient[] = [
  {
    id: "clt-00058",
    clientNumber: "CLT-00058",
    userId: "user-sakura",
    name: "田中 さくら",
    nameKana: "タナカ サクラ",
    gender: "女性",
    birthday: "1991-04-12",
    occupation: "会社員",
    firstVisitAt: "2026-01-12",
    lastVisitAt: "2026-05-18",
    preferenceTags: ["リラックス系", "ウッディ系"],
    safetyNotes: [],
    measurementCount: 5,
    blendCount: 3,
    orderCount: 4,
    note: "睡眠の質改善が主訴。寝つきの悪さと夢が多いとのこと。",
  },
  {
    id: "clt-00057",
    clientNumber: "CLT-00057",
    userId: "user-ren",
    name: "佐藤 蓮",
    nameKana: "サトウ レン",
    gender: "男性",
    birthday: "1988-09-03",
    occupation: "エンジニア",
    firstVisitAt: "2026-01-28",
    lastVisitAt: "2026-05-12",
    preferenceTags: ["集中系", "ミント系"],
    safetyNotes: ["高血圧の既往あり（ローズマリー・ペパーミントは要確認）"],
    measurementCount: 4,
    blendCount: 2,
    orderCount: 2,
    note: "在宅勤務。午後の集中が続かないという相談。",
  },
  {
    id: "clt-00056",
    clientNumber: "CLT-00056",
    userId: "user-mika",
    name: "鈴木 美香",
    nameKana: "スズキ ミカ",
    gender: "女性",
    birthday: "1995-12-20",
    occupation: "看護師",
    firstVisitAt: "2026-02-08",
    lastVisitAt: "2026-05-05",
    preferenceTags: ["フローラル系", "バランス系"],
    safetyNotes: ["妊活中（クラリセージ・ジュニパーベリーは避ける）"],
    measurementCount: 4,
    blendCount: 3,
    orderCount: 3,
    note: "夜勤明けの切り替えに使いたいとのこと。",
  },
  {
    id: "clt-00055",
    clientNumber: "CLT-00055",
    userId: "user-haruto",
    name: "高橋 陽斗",
    nameKana: "タカハシ ハルト",
    gender: "男性",
    birthday: "1999-06-30",
    occupation: "大学院生",
    firstVisitAt: "2026-02-19",
    lastVisitAt: "2026-04-28",
    preferenceTags: ["シトラス系", "リフレッシュ系"],
    safetyNotes: [],
    measurementCount: 3,
    blendCount: 2,
    orderCount: 2,
    note: "研究の追い込み時期。朝の立ち上がりを整えたい。",
  },
  {
    id: "clt-00054",
    clientNumber: "CLT-00054",
    userId: "user-mayumi",
    name: "伊藤 真由美",
    nameKana: "イトウ マユミ",
    gender: "女性",
    birthday: "1979-02-17",
    occupation: "自営業",
    firstVisitAt: "2026-01-05",
    lastVisitAt: "2026-04-21",
    preferenceTags: ["樹脂系", "ウッディ系"],
    safetyNotes: [],
    measurementCount: 6,
    blendCount: 4,
    orderCount: 5,
    note: "香りの好みが明確。重めの余韻を好む。",
  },
  {
    id: "clt-00053",
    clientNumber: "CLT-00053",
    userId: "user-daisuke",
    name: "渡辺 大輔",
    nameKana: "ワタナベ ダイスケ",
    gender: "男性",
    birthday: "1984-11-08",
    occupation: "営業職",
    firstVisitAt: "2026-02-02",
    lastVisitAt: "2026-04-15",
    preferenceTags: ["森林系", "スパイス系"],
    safetyNotes: [],
    measurementCount: 3,
    blendCount: 2,
    orderCount: 1,
    note: "外出前の切り替え用。甘い香りは苦手。",
  },
  {
    id: "clt-00052",
    clientNumber: "CLT-00052",
    userId: "user-hiromi",
    name: "中村 裕美",
    nameKana: "ナカムラ ヒロミ",
    gender: "女性",
    birthday: "1992-07-25",
    occupation: "デザイナー",
    firstVisitAt: "2026-03-02",
    lastVisitAt: "2026-04-08",
    preferenceTags: ["ハーバル系", "睡眠系"],
    safetyNotes: ["授乳中"],
    measurementCount: 2,
    blendCount: 1,
    orderCount: 1,
    note: "産後の睡眠リズムを整えたいとの相談。",
  },
  {
    id: "clt-00051",
    clientNumber: "CLT-00051",
    userId: "user-mai",
    name: "小林 麻衣",
    nameKana: "コバヤシ マイ",
    gender: "女性",
    birthday: "2001-03-14",
    occupation: "販売職",
    firstVisitAt: "2026-03-10",
    lastVisitAt: "2026-03-30",
    preferenceTags: ["柑橘系", "フローラル系"],
    safetyNotes: [],
    measurementCount: 2,
    blendCount: 1,
    orderCount: 1,
    note: "初回。香りに慣れていないため分かりやすい構成から。",
  },
  {
    id: "clt-00050",
    clientNumber: "CLT-00050",
    userId: "user-shota",
    name: "山本 翔太",
    nameKana: "ヤマモト ショウタ",
    gender: "男性",
    birthday: "1996-08-19",
    occupation: "トレーナー",
    firstVisitAt: "2026-01-20",
    lastVisitAt: "2026-03-22",
    preferenceTags: ["リフレッシュ系", "森林系"],
    safetyNotes: [],
    measurementCount: 4,
    blendCount: 3,
    orderCount: 3,
    note: "運動前の切り替え。ドライな香りを好む。",
  },
  {
    id: "clt-00049",
    clientNumber: "CLT-00049",
    userId: "user-eriko",
    name: "伊藤 恵理子",
    nameKana: "イトウ エリコ",
    gender: "女性",
    birthday: "1975-05-06",
    occupation: "教員",
    firstVisitAt: "2025-12-08",
    lastVisitAt: "2026-03-15",
    preferenceTags: ["樹脂系", "リラックス系"],
    safetyNotes: ["低血圧"],
    measurementCount: 5,
    blendCount: 4,
    orderCount: 4,
    note: "静かな時間に使う想定。余韻の長い香りを希望。",
  },
  {
    id: "clt-00048",
    clientNumber: "CLT-00048",
    userId: "user-natsumi",
    name: "中村 夏美",
    nameKana: "ナカムラ ナツミ",
    gender: "女性",
    birthday: "1990-10-11",
    occupation: "会社員",
    firstVisitAt: "2026-01-16",
    lastVisitAt: "2026-03-08",
    preferenceTags: ["ハーバル系", "バランス系"],
    safetyNotes: [],
    measurementCount: 3,
    blendCount: 2,
    orderCount: 2,
    note: "測定日ごとに測定値の振れ幅が大きい。",
  },
  {
    id: "clt-00047",
    clientNumber: "CLT-00047",
    userId: "user-naoto",
    name: "小林 直人",
    nameKana: "コバヤシ ナオト",
    gender: "男性",
    birthday: "1982-01-29",
    occupation: "研究職",
    firstVisitAt: "2025-11-22",
    lastVisitAt: "2026-02-28",
    preferenceTags: ["森林系", "集中系"],
    safetyNotes: [],
    measurementCount: 6,
    blendCount: 5,
    orderCount: 5,
    note: "長時間の作業向け。刺激が強すぎない集中系を希望。",
  },
  {
    id: "clt-00046",
    clientNumber: "CLT-00046",
    userId: "user-daichi",
    name: "森田 大地",
    nameKana: "モリタ ダイチ",
    gender: "男性",
    birthday: "1987-04-02",
    occupation: "調理師",
    firstVisitAt: "2025-11-10",
    lastVisitAt: "2026-02-18",
    preferenceTags: ["スパイス系", "元気系"],
    safetyNotes: [],
    measurementCount: 4,
    blendCount: 3,
    orderCount: 3,
    note: "午前の活動前に使う想定。温かみのある香りを好む。",
  },
];

export function findClientById(id: string): OperatorClient | undefined {
  return operatorClients.find((client) => client.id === id);
}

/**
 * 管理者・施術者向けアプリのサイドナビ定義。
 *
 * このリポジトリは管理者・施術者向けアプリ専用。利用者（購入者）向けアプリは
 * 別リポジトリ（selenia-aroma-user）にあり、ここには含めない。
 * 画面はPC・タブレットでの業務利用を前提に作る。
 */

export type AdminNavItem = {
  href: string;
  label: string;
  /** lucide-react のアイコン名 */
  icon: string;
  description: string;
  /** 未実装の画面には印を付け、動くものと区別できるようにする。 */
  status?: "ready" | "preparing";
};

export const adminNavItems: AdminNavItem[] = [
  {
    href: "/operator/dashboard",
    label: "ダッシュボード",
    icon: "LayoutDashboard",
    description: "サロン全体の状況をまとめて確認する",
    status: "ready",
  },
  {
    href: "/operator",
    label: "顧客カルテ",
    icon: "ClipboardList",
    description: "1人の利用者の測定・制作・レポートをまとめて見る",
    status: "ready",
  },
  {
    href: "/operator/customers",
    label: "顧客一覧",
    icon: "Users",
    description: "登録済みの利用者を検索・絞り込みする",
    status: "ready",
  },
  {
    href: "/operator/measurements",
    label: "脳波測定記録",
    icon: "Activity",
    description: "全利用者の測定セッションを横断で見る",
    status: "preparing",
  },
  {
    href: "/operator/blend-records",
    label: "香り制作記録",
    icon: "FlaskConical",
    description: "作成したブレンドの履歴とロット番号",
    status: "ready",
  },
  {
    href: "/operator/base-blends",
    label: "ベースブレンド一覧",
    icon: "Layers",
    description: "12種のベースブレンドと使い分け",
    status: "ready",
  },
  {
    href: "/operator/oils",
    label: "エッセンシャルオイル一覧",
    icon: "Droplet",
    description: "36種の追加精油と相性・注意事項",
    status: "ready",
  },
  {
    href: "/operator/recipes",
    label: "アロマレシピ",
    icon: "BookOpen",
    description: "ベース＋追加オイルの組み合わせ例",
    status: "preparing",
  },
  {
    href: "/operator/reports",
    label: "レポート出力",
    icon: "FileText",
    description: "利用者へ渡すレポートを書き出す",
    status: "preparing",
  },
  {
    href: "/operator/settings",
    label: "設定",
    icon: "Settings",
    description: "表示範囲・アカウント・データ連携",
    status: "preparing",
  },
];

/** パスから現在のナビ項目を判定する。より長い href を優先して一致させる。 */
export function findActiveNavItem(pathname: string): AdminNavItem | undefined {
  return [...adminNavItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

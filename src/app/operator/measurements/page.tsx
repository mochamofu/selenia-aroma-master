"use client";

import { PreparingPage } from "@/components/admin/PreparingPage";

export default function OperatorMeasurementsPage() {
  return (
    <PreparingPage
      title="脳波測定記録"
      summary="全利用者の測定セッションを横断して見る画面です。個々の測定の取り込みとグラフ表示は顧客カルテ側で動いていますが、一覧・比較はこれからです。"
      plannedFeatures={[
        "全利用者の測定を日付順に一覧表示し、利用者・期間で絞り込む",
        "同一利用者の複数回の測定を重ねて比較する（1回目と3回目の差を見る）",
        "リラックス値・集中値の推移をサマリーグラフで表示する",
        "CSVの一括取り込みと、取り込み漏れの検出",
      ]}
      dependsOn={[
        "brainwave_sessions テーブルへの保存処理（現在はブラウザ内に保持しているだけ）",
      ]}
    />
  );
}

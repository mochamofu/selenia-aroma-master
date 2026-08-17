"use client";

import { PreparingPage } from "@/components/admin/PreparingPage";

export default function OperatorBlendRecordsPage() {
  return (
    <PreparingPage
      title="香り制作記録"
      summary="作成したブレンドを横断して見る画面です。1件ずつの制作は顧客カルテ側で行えますが、全体の履歴管理はこれからです。"
      plannedFeatures={[
        "ロット番号・制作日・担当者で検索する",
        "同じベースブレンドを使った制作をまとめて見る",
        "再作成のために過去のレシピを複製する",
        "使用した精油の消費量を集計する",
      ]}
      dependsOn={["aroma_records への保存処理と、ロット番号の採番ルール確定"]}
    />
  );
}

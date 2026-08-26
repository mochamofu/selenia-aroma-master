"use client";

import { PreparingPage } from "@/components/admin/PreparingPage";

export default function OperatorRecipesPage() {
  return (
    <PreparingPage
      title="アロマレシピ"
      summary="ベースブレンドと追加精油の組み合わせ例を、定型レシピとして登録・再利用する画面です。"
      plannedFeatures={[
        "よく使う組み合わせを定型レシピとして保存する",
        "測定傾向（リラックス値が低い等）からレシピ候補を絞り込む",
        "レシピから制作カルテを起こす",
        "認定インストラクター向けに共有するレシピを選ぶ",
      ]}
      dependsOn={[
        "定型レシピを置くテーブルの設計",
        "インストラクターへ共有する範囲の決定（開示ポリシーに追記が必要）",
      ]}
    />
  );
}

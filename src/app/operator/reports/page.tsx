"use client";

import { PreparingPage } from "@/components/admin/PreparingPage";

export default function OperatorReportsPage() {
  return (
    <PreparingPage
      title="レポート出力"
      summary="利用者へ渡すレポートを書き出す画面です。表示内容は開示ポリシーの「利用者向け」範囲に合わせる必要があります。"
      plannedFeatures={[
        "測定結果（リラックス・集中）と提供したブレンドをまとめたPDFを出力する",
        "複数回の測定を並べた推移レポートを作る",
        "サロン名・担当者名を差し込む",
      ]}
      dependsOn={[
        "レポートに載せてよい項目の確定（内部比率と5帯域は載せない）",
        "芳香用の雑貨として、効能を断定しない文言テンプレートの用意",
      ]}
    />
  );
}

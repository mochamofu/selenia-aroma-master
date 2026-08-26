"use client";

import { PreparingPage } from "@/components/admin/PreparingPage";

export default function OperatorSettingsPage() {
  return (
    <PreparingPage
      title="設定"
      summary="アカウントと表示範囲の設定画面です。現在、開示範囲はログイン中のロールから自動で決まります。"
      plannedFeatures={[
        "認定インストラクターの招待と権限付与",
        "サロン情報（名称・担当者）の登録",
        "Googleフォームのヒアリング連携設定",
        "測定機器（FocusCalm）のCSV書式プリセット管理",
      ]}
      dependsOn={["Supabase の profiles.role を管理画面から変更する仕組み"]}
    />
  );
}

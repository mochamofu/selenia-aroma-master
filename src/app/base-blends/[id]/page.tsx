"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AromaCard } from "@/components/AromaCard";
import { DisclosureBadge } from "@/components/DisclosureBadge";
import { Icon } from "@/components/Icon";
import { ErrorState, EmptyState } from "@/components/States";
import { getBaseBlendGuide } from "@/data/baseBlendGuides";
import { demoBaseBlends } from "@/data/mockData";
import { useAromaRecords } from "@/hooks/useAromaRecords";
import { useAuth } from "@/hooks/useAuth";
import { canDisclose, disclosureLevelForRole } from "@/lib/disclosure";
import { BRAINWAVE_CHANNEL_META } from "@/types/brainwave";

function Section({
  title,
  level,
  children,
}: {
  title: string;
  level?: "public" | "instructor" | "internal";
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-lg shadow-stone-300/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-stone-900">{title}</h2>
        {level && level !== "public" ? <DisclosureBadge level={level} /> : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Chips({ items, tone }: { items: string[]; tone: "purple" | "green" | "amber" }) {
  const styles = {
    purple: "bg-[#efe8fb] text-[#755aa8]",
    green: "bg-[#eef4e9] text-[#5e7d56]",
    amber: "bg-[#fdf3e3] text-[#8a6a35]",
  } as const;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`rounded-full px-3 py-1.5 text-xs font-bold ${styles[tone]}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-6 text-stone-600">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c7b5df]" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function BaseBlendDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session, profile } = useAuth();
  const { records } = useAromaRecords(session?.userId);
  const blend = demoBaseBlends.find((item) => item.id === params.id);
  const guide = blend ? getBaseBlendGuide(blend.id) : null;
  const relatedRecords = records.filter((record) => record.base_blend_id === params.id);

  const level = disclosureLevelForRole(session?.role ?? profile?.role);
  const showInstructorContent = canDisclose(level, "instructor");

  return (
    <AppShell>
      {!blend ? (
        <div className="p-5">
          <ErrorState message="ベースブレンドが見つかりません" />
        </div>
      ) : (
        <div className="space-y-5 px-5 py-6">
          <header className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-md"
              aria-label="戻る"
            >
              <Icon name="ArrowLeft" className="h-5 w-5" />
            </button>
            <Link href="/base-blends" className="text-sm font-bold text-[#755aa8]">
              一覧
            </Link>
          </header>

          <section className="overflow-hidden rounded-[34px] bg-white shadow-xl shadow-stone-300/25">
            <div
              className="grid h-44 place-items-center text-white"
              style={{
                background: `radial-gradient(circle at 28% 22%, #ffffff66, transparent 7rem), linear-gradient(135deg, ${blend.color}, #d7c58e)`,
              }}
            >
              <div className="text-center">
                <p className="text-sm font-bold">{blend.code}</p>
                <h1 className="mt-2 text-3xl font-bold">{blend.name}</h1>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm leading-7 text-stone-600">
                {guide?.public.scentImpression ?? blend.description}
              </p>
              {guide ? (
                <p className="mt-3 text-sm leading-7 text-stone-500">{guide.public.scentJourney}</p>
              ) : null}
            </div>
          </section>

          <Section title="含まれる精油">
            <Chips items={blend.public_ingredients} tone="purple" />
            <p className="mt-3 rounded-2xl bg-[#fff8ef] p-3 text-xs leading-5 text-stone-500">
              配合比率は非公開です。使われている精油の種類はすべて掲載しています。
            </p>
          </Section>

          <Section title="目的">
            <Chips items={blend.benefits} tone="green" />
          </Section>

          {guide ? (
            <>
              <Section title="こんな方に選ばれています">
                <BulletList items={guide.public.recommendedFor} />
              </Section>

              <Section title="使うシーン">
                <Chips items={guide.public.scenes} tone="amber" />
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  使いやすい時間帯: {guide.public.timeOfDay}
                </p>
              </Section>

              <Section title="脳波測定との関係">
                <p className="text-sm leading-7 text-stone-600">{guide.public.brainwaveContext}</p>
              </Section>

              {showInstructorContent ? (
                <>
                  <Section title="他のブレンドとの使い分け" level="instructor">
                    <p className="text-sm leading-7 text-stone-600">
                      {guide.instructor.selectionGuide}
                    </p>
                  </Section>

                  <Section title="相性のよい追加精油" level="instructor">
                    <ul className="space-y-3">
                      {guide.instructor.pairingOils.map((oil) => (
                        <li key={oil.name} className="rounded-2xl bg-[#faf7ff] p-3">
                          <p className="text-sm font-bold text-[#5b4b7d]">{oil.name}</p>
                          <p className="mt-1 text-sm leading-6 text-stone-600">{oil.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </Section>

                  <Section title="調合時の注意" level="instructor">
                    <BulletList items={guide.instructor.cautions} />
                  </Section>

                  <Section title="事前確認が必要な方" level="instructor">
                    <BulletList items={guide.instructor.contraindications} />
                    <p className="mt-3 rounded-2xl bg-[#fdeaef] p-3 text-xs leading-5 text-[#8a4a60]">
                      本製品は芳香用の雑貨です。効能・効果をうたう説明は行わず、体調に関する相談は
                      医療機関へ案内してください。
                    </p>
                  </Section>

                  <Section title="測定値からの提案目安" level="instructor">
                    <Chips
                      items={guide.instructor.brainwaveIndication.channels.map(
                        (channel) => BRAINWAVE_CHANNEL_META[channel].label,
                      )}
                      tone="purple"
                    />
                    <p className="mt-3 text-sm leading-7 text-stone-600">
                      {guide.instructor.brainwaveIndication.note}
                    </p>
                  </Section>
                </>
              ) : (
                <section className="rounded-[28px] border border-dashed border-[#d9cff0] bg-[#faf7ff] p-5">
                  <p className="text-sm font-bold text-[#5b4b7d]">
                    使い分け指針・注意事項は認定インストラクター向けの内容です
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    他のブレンドとの使い分け、相性のよい追加精油、事前確認が必要な方の情報は、
                    認定インストラクターとしてログインすると表示されます。
                  </p>
                </section>
              )}
            </>
          ) : null}

          <section>
            <h2 className="mb-3 text-lg font-bold text-stone-900">このブレンドを使った記録</h2>
            {relatedRecords.length ? (
              <div className="grid grid-cols-2 gap-3">
                {relatedRecords.map((record) => (
                  <AromaCard key={record.id} record={record} userId={session?.userId} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="まだ関連記録がありません"
                description="このベースブレンドの制作記録が追加されるとここに表示されます"
              />
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}

import type { AiProvider, ProjectContextForAi, ProjectSummary, TaskSuggestion } from "./ai-provider";

/**
 * ルールベースの候補生成 (外部 API 不要)。
 * 案件の状態・タスク・対応履歴から「よくある次の一手」を提案する。
 * デモ環境で AI 連携の UX (候補 → 確認 → 承認) を体験するための実装。
 */
export class RuleBasedAiProvider implements AiProvider {
  readonly name = "rule-based";

  async suggestTasks(ctx: ProjectContextForAi): Promise<TaskSuggestion[]> {
    const suggestions: TaskSuggestion[] = [];
    const openTasks = ctx.tasks.filter((t) => t.status !== "完了");
    const titles = new Set(ctx.tasks.map((t) => t.title));
    const lastActivity = ctx.activities[0];
    const has = (kw: string) => [...titles].some((t) => t.includes(kw));
    const activityMentions = (kw: string) =>
      ctx.activities.some((a) => a.title.includes(kw) || (a.content ?? "").includes(kw));

    if (ctx.status === "未着手") {
      if (!has("キックオフ"))
        suggestions.push({
          title: "キックオフミーティングの日程調整",
          description: `${ctx.customerName} と案件開始にあたっての体制・スケジュールを確認する`,
          priority: "HIGH",
          dueInDays: 5,
          reason: "案件が未着手のため、開始に必要な打ち合わせが未設定です",
        });
      if (!has("要件"))
        suggestions.push({
          title: "要件整理・スコープ確認",
          description: "案件概要をもとに要件を整理し、対応範囲を顧客と合意する",
          priority: "HIGH",
          dueInDays: 10,
          reason: "スコープを確定させないと工数・期限の見積もりができません",
        });
    }

    if (ctx.status === "確認待ち") {
      suggestions.push({
        title: `${ctx.customerName} へ確認状況のフォロー連絡`,
        description: "確認待ちの内容について、回答予定日を確認する",
        priority: "MEDIUM",
        dueInDays: 2,
        reason: "ステータスが「確認待ち」のまま停滞しないよう、フォローの期限を設けます",
      });
    }

    if (ctx.status === "保留") {
      suggestions.push({
        title: "保留理由の確認と再開条件の整理",
        description: "保留になっている理由を整理し、再開のトリガーと担当を明確にする",
        priority: "MEDIUM",
        dueInDays: 7,
        reason: "保留案件は再開条件が曖昧なまま放置されやすいためです",
      });
    }

    if (activityMentions("見積") && !has("見積")) {
      suggestions.push({
        title: "見積書の作成・提出",
        description: "対応履歴で見積の話が出ているため、見積書を作成して提出する",
        priority: "HIGH",
        dueInDays: 5,
        reason: "対応履歴に「見積」に関する記録がありますが、対応するタスクがありません",
      });
    }
    if (activityMentions("契約") && !has("契約")) {
      suggestions.push({
        title: "契約書の準備・締結手続き",
        description: "契約に向けて契約書の草案を作成し、法務確認を依頼する",
        priority: "HIGH",
        dueInDays: 7,
        reason: "対応履歴に「契約」に関する記録がありますが、対応するタスクがありません",
      });
    }

    const overdue = openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());
    if (overdue.length > 0) {
      suggestions.push({
        title: "期限超過タスクのリスケジュール",
        description: `期限超過中のタスク (${overdue.map((t) => t.title).slice(0, 3).join("、")}) の期限を見直し、関係者へ共有する`,
        priority: "HIGH",
        dueInDays: 1,
        reason: `期限を過ぎた未完了タスクが ${overdue.length} 件あります`,
      });
    }

    if (ctx.progress >= 80 && ctx.status !== "完了" && !has("検収") && !has("納品")) {
      suggestions.push({
        title: "納品物の最終確認と検収依頼",
        description: "成果物をレビューし、顧客へ検収を依頼する",
        priority: "MEDIUM",
        dueInDays: 7,
        reason: `進捗率が ${ctx.progress}% に達しているため、完了に向けた検収工程を準備します`,
      });
    }

    const daysSinceLast = lastActivity
      ? Math.floor((Date.now() - new Date(lastActivity.occurredAt).getTime()) / 86400000)
      : null;
    if ((daysSinceLast === null || daysSinceLast >= 14) && ctx.status !== "完了") {
      suggestions.push({
        title: `${ctx.customerName} への定期連絡`,
        description: "進捗共有と課題ヒアリングのため、定期連絡を行う",
        priority: "LOW",
        dueInDays: 3,
        reason: daysSinceLast === null ? "対応履歴がまだ登録されていません" : `最後の対応から ${daysSinceLast} 日経過しています`,
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        title: "次回打ち合わせの議題整理",
        description: "現在の進捗と課題を整理し、次回打ち合わせの議題をまとめる",
        priority: "LOW",
        dueInDays: 7,
        reason: "目立った課題はありません。定期的な状況整理を提案します",
      });
    }
    return suggestions.slice(0, 5);
  }

  async summarizeProject(ctx: ProjectContextForAi): Promise<ProjectSummary> {
    const open = ctx.tasks.filter((t) => t.status !== "完了");
    const done = ctx.tasks.length - open.length;
    const overdue = open.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());
    const last = ctx.activities[0];

    const summary = [
      `${ctx.customerName} 向けの案件「${ctx.name}」は現在「${ctx.status}」で、進捗率は ${ctx.progress}% です。`,
      ctx.assigneeName ? `担当者は ${ctx.assigneeName} です。` : "担当者が未設定です。",
      `タスクは全 ${ctx.tasks.length} 件のうち ${done} 件が完了、${open.length} 件が未完了です。`,
      last
        ? `直近の対応は ${last.occurredAt} の「${last.title}」(${last.type} / ${last.userName})です。`
        : "対応履歴はまだ登録されていません。",
    ].join("");

    const risks: string[] = [];
    if (overdue.length) risks.push(`期限超過の未完了タスクが ${overdue.length} 件あります`);
    if (!ctx.assigneeName) risks.push("担当者が未設定のため、対応が滞る可能性があります");
    if (ctx.dueDate && new Date(ctx.dueDate) < new Date() && ctx.status !== "完了")
      risks.push(`案件の期限 (${ctx.dueDate}) を過ぎています`);
    if (ctx.status === "確認待ち") risks.push("顧客確認待ちの状態です。回答期限を確認してください");
    if (ctx.status === "保留") risks.push("保留中のため、再開条件を明確にしておく必要があります");
    if (last && Date.now() - new Date(last.occurredAt).getTime() > 21 * 86400000)
      risks.push("最後の対応から3週間以上経過しています");

    const nextActions = open
      .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
      .slice(0, 3)
      .map((t) => `${t.title}${t.dueDate ? ` (期限: ${t.dueDate})` : ""}${t.assigneeName ? ` — ${t.assigneeName}` : ""}`);

    return { summary, risks, nextActions, source: this.name };
  }
}

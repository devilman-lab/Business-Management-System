/**
 * デモ用サンプルデータ。
 * 日付は「今日」を基準とした相対日数で生成するため、いつ起動しても
 * 期限超過・本日期限・期限間近の状態が再現される。
 */
import type { Db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { getStorageProvider } from "@/server/storage";
import { makeMinimalPdf } from "./minimal-pdf";

export const DEMO_PASSWORD = "password123";

const base = new Date();
const today = new Date(base.getFullYear(), base.getMonth(), base.getDate());
/** 今日から offset 日後 (負数は過去) の hh:mm */
const d = (offset: number, hour = 10, minute = 0) => {
  const x = new Date(today);
  x.setDate(x.getDate() + offset);
  x.setHours(hour, minute, 0, 0);
  return x;
};

export async function seedDatabase(prisma: Db, options: { log?: (msg: string) => void } = {}) {
  const log = options.log ?? (() => undefined);

  // ---------- 既存データを削除 (順序は外部キー制約に従う) ----------
  const storage = getStorageProvider();
  const oldFiles = await prisma.projectFile.findMany({ select: { storageKey: true } });
  for (const f of oldFiles) await storage.delete(f.storageKey);
  await prisma.auditLog.deleteMany();
  await prisma.projectFile.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSetting.deleteMany();
  log("既存データを削除しました");

  // ---------- システム設定 ----------
  await prisma.systemSetting.createMany({
    data: [
      { key: "organizationName", value: "株式会社サンプル" },
      { key: "dueSoonDays", value: "3" },
    ],
  });

  // ---------- ユーザー ----------
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const userDefs = [
    { key: "yamada", name: "山田 太郎", email: "admin@example.com", department: "経営企画部", role: "ADMIN", status: "ACTIVE", lastLoginAt: d(0, 9, 2) },
    { key: "kobayashi", name: "小林 誠", email: "kobayashi@example.com", department: "情報システム部", role: "ADMIN", status: "ACTIVE", lastLoginAt: d(-1, 17, 40) },
    { key: "tanaka", name: "田中 花子", email: "tanaka@example.com", department: "営業部", role: "MEMBER", status: "ACTIVE", lastLoginAt: d(0, 8, 45) },
    { key: "sato", name: "佐藤 健一", email: "sato@example.com", department: "営業部", role: "MEMBER", status: "ACTIVE", lastLoginAt: d(-1, 18, 10) },
    { key: "suzuki", name: "鈴木 美咲", email: "suzuki@example.com", department: "開発部", role: "MEMBER", status: "ACTIVE", lastLoginAt: d(0, 9, 30) },
    { key: "takahashi", name: "高橋 大輔", email: "takahashi@example.com", department: "開発部", role: "MEMBER", status: "ACTIVE", lastLoginAt: d(-2, 13, 5) },
    { key: "ito", name: "伊藤 さくら", email: "ito@example.com", department: "カスタマーサポート部", role: "MEMBER", status: "ACTIVE", lastLoginAt: d(-3, 10, 20) },
    { key: "watanabe", name: "渡辺 翔", email: "watanabe@example.com", department: "営業部", role: "MEMBER", status: "INACTIVE", lastLoginAt: d(-80, 18, 0) },
  ] as const;

  const U: Record<(typeof userDefs)[number]["key"], string> = {} as never;
  for (const u of userDefs) {
    const created = await prisma.user.create({
      data: { name: u.name, email: u.email, department: u.department, role: u.role, status: u.status, lastLoginAt: u.lastLoginAt, passwordHash },
    });
    U[u.key] = created.id;
  }
  log(`ユーザー ${userDefs.length} 件`);

  // ---------- 顧客 ----------
  const customerDefs = [
    { key: "sample_kensetsu", code: "C-0001", name: "株式会社サンプル建設", nameKana: "サンプルケンセツ", contactName: "大森 一郎", contactTitle: "工事部 部長", phone: "03-1234-5678", email: "omori@sample-kensetsu.example.jp", address: "東京都新宿区西新宿1-1-1 サンプルビル8F", industry: "建設業", status: "ACTIVE", assignee: "tanaka", notes: "創業50年の中堅ゼネコン。Web・社内システム両面で継続取引。", createdAt: d(-400) },
    { key: "sakura_fudosan", code: "C-0002", name: "株式会社さくら不動産", nameKana: "サクラフドウサン", contactName: "松本 由紀", contactTitle: "企画部 課長", phone: "03-2345-6789", email: "matsumoto@sakura-re.example.jp", address: "東京都港区赤坂2-2-2", industry: "不動産業", status: "ACTIVE", assignee: "sato", notes: "賃貸管理業務のシステム化を推進中。", createdAt: d(-300) },
    { key: "takayama", code: "C-0003", name: "高山製作所株式会社", nameKana: "タカヤマセイサクショ", contactName: "高山 誠", contactTitle: "代表取締役", phone: "052-345-6789", email: "takayama@takayama-mfg.example.jp", address: "愛知県名古屋市中区栄3-3-3", industry: "製造業", status: "ACTIVE", assignee: "tanaka", notes: "老朽化した基幹システムの刷新を検討。社長直轄案件。", createdAt: d(-250) },
    { key: "sample_shoji", code: "C-0004", name: "株式会社サンプル商事", nameKana: "サンプルショウジ", contactName: "岡田 亮", contactTitle: "情報システム部 マネージャー", phone: "06-4567-8901", email: "okada@sample-shoji.example.jp", address: "大阪府大阪市北区梅田4-4-4", industry: "卸売業", status: "ACTIVE", assignee: "sato", notes: "給与計算システム移行が完了し、営業管理の改善に着手。", createdAt: d(-500) },
    { key: "midori", code: "C-0005", name: "みどり食品株式会社", nameKana: "ミドリショクヒン", contactName: "木村 春香", contactTitle: "総務部 主任", phone: "045-567-8901", email: "kimura@midori-foods.example.jp", address: "神奈川県横浜市西区みなとみらい5-5-5", industry: "食品製造業", status: "PROSPECT", assignee: "tanaka", notes: "自社ECサイト立ち上げを検討中。展示会で名刺交換。", createdAt: d(-60) },
    { key: "tozai", code: "C-0006", name: "東西物流株式会社", nameKana: "トウザイブツリュウ", contactName: "石井 健", contactTitle: "営業企画部 係長", phone: "048-678-9012", email: "ishii@tozai-logi.example.jp", address: "埼玉県さいたま市大宮区桜木町6-6-6", industry: "運輸・物流業", status: "ACTIVE", assignee: "sato", notes: "倉庫の在庫管理アプリを開発中。追加機能の要望が多い。", createdAt: d(-200) },
    { key: "aoba", code: "C-0007", name: "医療法人あおば会", nameKana: "アオバカイ", contactName: "青葉 由美", contactTitle: "事務長", phone: "043-789-0123", email: "aoba@aoba-med.example.jp", address: "千葉県千葉市中央区中央7-7-7", industry: "医療・福祉", status: "PROSPECT", assignee: "ito", notes: "予約管理システムの提案中。決裁は理事会。", createdAt: d(-40) },
    { key: "hikari", code: "C-0008", name: "株式会社ひかり教育", nameKana: "ヒカリキョウイク", contactName: "森 拓也", contactTitle: "教務部 部長", phone: "03-8901-2345", email: "mori@hikari-edu.example.jp", address: "東京都文京区本郷8-8-8", industry: "教育・学習支援業", status: "ACTIVE", assignee: "sato", notes: "前任 渡辺 (退職) から佐藤へ引き継ぎ済み。採用サイト案件は予算見直しのため保留中。", createdAt: d(-350) },
    { key: "hokuriku", code: "C-0009", name: "北陸精密工業株式会社", nameKana: "ホクリクセイミツコウギョウ", contactName: "山下 浩", contactTitle: "生産管理部 課長", phone: "076-901-2345", email: "yamashita@hokuriku-pi.example.jp", address: "石川県金沢市広坂9-9-9", industry: "製造業", status: "DORMANT", assignee: "tanaka", notes: "生産管理システム改修は先方の設備投資計画待ち。", createdAt: d(-280) },
    { key: "blueocean", code: "C-0010", name: "株式会社ブルーオーシャン", nameKana: "ブルーオーシャン", contactName: "藤田 玲奈", contactTitle: "マーケティング部 部長", phone: "092-012-3456", email: "fujita@blueocean.example.jp", address: "福岡県福岡市博多区博多駅前10-10-10", industry: "情報通信業", status: "ACTIVE", assignee: "sato", notes: "急成長中のSaaS企業。スピード感を重視。", createdAt: d(-120) },
    { key: "yamato", code: "C-0011", name: "やまと税理士法人", nameKana: "ヤマトゼイリシホウジン", contactName: "大和 清", contactTitle: "代表社員", phone: "03-1122-3344", email: "yamato@yamato-tax.example.jp", address: "東京都千代田区丸の内11-11-11", industry: "専門サービス業", status: "CLOSED", assignee: "tanaka", notes: "会計ソフト連携案件は完了。保守契約は締結せず取引終了。", createdAt: d(-330) },
    { key: "green", code: "C-0012", name: "株式会社グリーンエナジー", nameKana: "グリーンエナジー", contactName: "川口 直樹", contactTitle: "事業開発部", phone: "011-223-3445", email: "kawaguchi@green-energy.example.jp", address: "北海道札幌市中央区北一条12-12-12", industry: "電気・ガス・エネルギー", status: "PROSPECT", assignee: "tanaka", notes: "太陽光発電のモニタリングシステムに関心あり。紹介経由。", createdAt: d(-20) },
  ] as const;

  const C: Record<(typeof customerDefs)[number]["key"], string> = {} as never;
  for (const c of customerDefs) {
    const created = await prisma.customer.create({
      data: {
        code: c.code, name: c.name, nameKana: c.nameKana, contactName: c.contactName, contactTitle: c.contactTitle,
        phone: c.phone, email: c.email, address: c.address, industry: c.industry, status: c.status, notes: c.notes,
        assigneeId: U[c.assignee], createdById: U.yamada, createdAt: c.createdAt, updatedAt: c.createdAt,
      },
    });
    C[c.key] = created.id;
  }
  log(`顧客 ${customerDefs.length} 件`);

  // ---------- 案件 ----------
  type PKey = string;
  const projectDefs: {
    key: PKey; code: string; name: string; customer: keyof typeof C; assignee: keyof typeof U | null;
    status: "NOT_STARTED" | "IN_PROGRESS" | "WAITING_REVIEW" | "ON_HOLD" | "COMPLETED"; priority: "HIGH" | "MEDIUM" | "LOW";
    progress: number; start: number | null; due: number | null; completed?: number; budget: number | null; description: string; updated: number;
  }[] = [
    { key: "p1", code: "PJ-2026-001", name: "新社屋Webサイト構築", customer: "sample_kensetsu", assignee: "suzuki", status: "IN_PROGRESS", priority: "HIGH", progress: 60, start: -108, due: 44, budget: 4800000, description: "新社屋移転に合わせたコーポレートサイトの全面リニューアル。施工実績・採用情報・お問い合わせフォームを含む。CMSはヘッドレス構成とし、将来の多言語対応を考慮する。", updated: 0 },
    { key: "p2", code: "PJ-2026-002", name: "業務システム導入支援", customer: "sakura_fudosan", assignee: "takahashi", status: "IN_PROGRESS", priority: "HIGH", progress: 45, start: -125, due: 94, budget: 12000000, description: "賃貸管理業務 (契約・入居者対応・請求) を Excel から業務システムへ移行するための要件定義〜導入支援。マスタデータ移行と操作研修を含む。", updated: -1 },
    { key: "p3", code: "PJ-2026-003", name: "営業管理改善プロジェクト", customer: "sample_shoji", assignee: "tanaka", status: "WAITING_REVIEW", priority: "MEDIUM", progress: 70, start: -169, due: 13, budget: 3500000, description: "営業担当ごとにバラバラな案件管理 (スプレッドシート) を統一し、進捗の見える化と引き継ぎの効率化を図る。改善提案書を提出済みで、顧客の承認待ち。", updated: -2 },
    { key: "p4", code: "PJ-2026-004", name: "既存システム刷新", customer: "takayama", assignee: "takahashi", status: "IN_PROGRESS", priority: "HIGH", progress: 30, start: -78, due: 195, budget: 25000000, description: "20年以上稼働している受注・生産管理システムをクラウド基盤へ刷新する。現行システムの調査、新アーキテクチャ設計、段階移行計画の策定を行う。", updated: -1 },
    { key: "p5", code: "PJ-2026-005", name: "在庫管理アプリ開発", customer: "tozai", assignee: "suzuki", status: "IN_PROGRESS", priority: "MEDIUM", progress: 55, start: -94, due: -7, budget: 6500000, description: "倉庫内でのバーコード読取による入出庫記録アプリ。ハンディ端末とタブレットの両対応。期限を超過しており、リスケジュールの調整中。", updated: -3 },
    { key: "p6", code: "PJ-2026-006", name: "採用サイトリニューアル", customer: "hikari", assignee: "sato", status: "ON_HOLD", priority: "LOW", progress: 20, start: -200, due: 74, budget: 2200000, description: "新卒・中途採用向けサイトのリニューアル。顧客側の予算見直しにより保留中。前任担当者 (渡辺) の退職に伴い佐藤へ引き継ぎ。", updated: -30 },
    { key: "p7", code: "PJ-2026-007", name: "顧客管理システム導入", customer: "blueocean", assignee: "tanaka", status: "IN_PROGRESS", priority: "MEDIUM", progress: 40, start: -47, due: 59, budget: 5400000, description: "複数のスプレッドシートで管理している顧客情報・商談履歴を一元化する。既存データのCSV移行と権限設計を含む。", updated: 0 },
    { key: "p8", code: "PJ-2026-008", name: "給与計算システム移行", customer: "sample_shoji", assignee: "takahashi", status: "COMPLETED", priority: "MEDIUM", progress: 100, start: -250, due: -140, completed: -142, budget: 4000000, description: "旧給与計算パッケージからクラウド型サービスへの移行。並行稼働テストを経て本稼働済み。", updated: -142 },
    { key: "p9", code: "PJ-2026-009", name: "ECサイト構築", customer: "midori", assignee: "suzuki", status: "NOT_STARTED", priority: "MEDIUM", progress: 0, start: 14, due: 164, budget: 7800000, description: "自社商品 (加工食品) のオンライン販売サイト構築。決済・配送連携・定期購入機能を検討中。", updated: -5 },
    { key: "p10", code: "PJ-2026-010", name: "予約管理システム提案", customer: "aoba", assignee: "ito", status: "WAITING_REVIEW", priority: "HIGH", progress: 15, start: -28, due: 28, budget: null, description: "外来予約・リマインド通知のシステム化提案。提案書を提出し、理事会での審議待ち。", updated: -1 },
    { key: "p11", code: "PJ-2026-011", name: "社内ポータル構築", customer: "sample_kensetsu", assignee: "takahashi", status: "COMPLETED", priority: "LOW", progress: 100, start: -228, due: -79, completed: -81, budget: 1800000, description: "社内向けの掲示板・規程集・申請フォームを集約したポータルサイト。稼働後の保守は別契約。", updated: -81 },
    { key: "p12", code: "PJ-2026-012", name: "生産管理システム改修", customer: "hokuriku", assignee: "tanaka", status: "ON_HOLD", priority: "MEDIUM", progress: 10, start: -139, due: 105, budget: 9000000, description: "工程進捗の可視化と原価集計機能の追加。顧客の設備投資計画が固まるまで保留。", updated: -45 },
    { key: "p13", code: "PJ-2026-013", name: "セキュリティ診断・対策", customer: "sakura_fudosan", assignee: "takahashi", status: "NOT_STARTED", priority: "HIGH", progress: 0, start: 3, due: 74, budget: 2600000, description: "業務システム導入に先立つ既存環境の脆弱性診断と対策の実施。", updated: -4 },
    { key: "p14", code: "PJ-2026-014", name: "物流トラッキング機能追加", customer: "tozai", assignee: "suzuki", status: "WAITING_REVIEW", priority: "MEDIUM", progress: 85, start: -64, due: 8, budget: 3200000, description: "配送車両のGPS情報を在庫管理アプリと連携し、顧客が配送状況を確認できる機能。顧客デモ実施済みでフィードバック待ち。", updated: -1 },
    { key: "p15", code: "PJ-2026-015", name: "会計ソフト連携", customer: "yamato", assignee: "tanaka", status: "COMPLETED", priority: "LOW", progress: 100, start: -320, due: -201, completed: -205, budget: 1500000, description: "顧問先データを会計ソフトへ自動連携する仕組みの構築。納品・検収完了。", updated: -205 },
    { key: "p16", code: "PJ-2026-016", name: "太陽光発電モニタリング提案", customer: "green", assignee: "sato", status: "NOT_STARTED", priority: "MEDIUM", progress: 0, start: null, due: 44, budget: null, description: "発電所ごとの発電量・稼働状況を一元監視するダッシュボードの提案。初回ヒアリング予定。", updated: -6 },
    { key: "p17", code: "PJ-2026-017", name: "保守運用契約更新", customer: "takayama", assignee: "tanaka", status: "IN_PROGRESS", priority: "LOW", progress: 50, start: -16, due: 13, budget: 3600000, description: "年次の保守運用契約の更新手続き。契約条件 (対応時間・SLA) の見直しを含む。", updated: 0 },
    { key: "p18", code: "PJ-2026-018", name: "マーケティング分析ダッシュボード", customer: "blueocean", assignee: null, status: "NOT_STARTED", priority: "MEDIUM", progress: 0, start: 14, due: 89, budget: 4200000, description: "広告・Web解析・CRMデータを統合した分析ダッシュボード。担当者のアサインが未定。", updated: -2 },
  ];

  const P: Record<PKey, { id: string; customerId: string }> = {};
  for (const p of projectDefs) {
    const created = await prisma.project.create({
      data: {
        code: p.code, name: p.name, description: p.description, customerId: C[p.customer],
        assigneeId: p.assignee ? U[p.assignee] : null, status: p.status, priority: p.priority, progress: p.progress,
        startDate: p.start !== null ? d(p.start) : null, dueDate: p.due !== null ? d(p.due) : null,
        completedAt: p.completed !== undefined ? d(p.completed) : null, budget: p.budget, createdById: U.yamada,
        createdAt: d(p.start !== null ? Math.min(p.start, -1) - 3 : -10), updatedAt: d(p.updated, 15, 30),
      },
    });
    P[p.key] = { id: created.id, customerId: created.customerId };
  }
  log(`案件 ${projectDefs.length} 件`);

  // ---------- タスク ----------
  const taskDefs: {
    p: PKey; title: string; assignee: keyof typeof U | null; status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    priority: "HIGH" | "MEDIUM" | "LOW"; due: number | null; completed?: number; description?: string; creator?: keyof typeof U;
  }[] = [
    { p: "p1", title: "要件定義書の作成", assignee: "suzuki", status: "COMPLETED", priority: "HIGH", due: -89, completed: -91 },
    { p: "p1", title: "デザインカンプ作成", assignee: "suzuki", status: "COMPLETED", priority: "MEDIUM", due: -48, completed: -46 },
    { p: "p1", title: "トップページ実装", assignee: "suzuki", status: "IN_PROGRESS", priority: "HIGH", due: -2, description: "メインビジュアルのアニメーション調整に時間がかかっている" },
    { p: "p1", title: "施工実績ページのコンテンツ収集", assignee: "tanaka", status: "IN_PROGRESS", priority: "MEDIUM", due: 0, description: "顧客から写真・実績データを受領する" },
    { p: "p1", title: "お問い合わせフォーム実装", assignee: "takahashi", status: "NOT_STARTED", priority: "MEDIUM", due: 13 },
    { p: "p1", title: "サーバー・ドメイン設定", assignee: "takahashi", status: "NOT_STARTED", priority: "LOW", due: 23 },
    { p: "p2", title: "現行業務フローのヒアリング", assignee: "takahashi", status: "COMPLETED", priority: "HIGH", due: -99, completed: -100 },
    { p: "p2", title: "要件定義書レビュー", assignee: "sato", status: "COMPLETED", priority: "HIGH", due: -64, completed: -59 },
    { p: "p2", title: "マスタデータ移行計画の作成", assignee: "takahashi", status: "IN_PROGRESS", priority: "HIGH", due: -5, description: "物件マスタ・入居者マスタの移行順序とクレンジング方針を決める" },
    { p: "p2", title: "操作研修の日程調整", assignee: "sato", status: "NOT_STARTED", priority: "MEDIUM", due: 2 },
    { p: "p2", title: "テスト環境構築", assignee: "takahashi", status: "NOT_STARTED", priority: "MEDIUM", due: 18 },
    { p: "p3", title: "現状課題の整理", assignee: "tanaka", status: "COMPLETED", priority: "HIGH", due: -140, completed: -142 },
    { p: "p3", title: "改善案の提案書作成", assignee: "tanaka", status: "COMPLETED", priority: "HIGH", due: -17, completed: -19 },
    { p: "p3", title: "提案内容の顧客確認", assignee: "tanaka", status: "IN_PROGRESS", priority: "HIGH", due: 0, description: "岡田様より回答予定。未回答の場合は電話でフォローする" },
    { p: "p3", title: "導入スケジュール策定", assignee: "tanaka", status: "NOT_STARTED", priority: "MEDIUM", due: 13 },
    { p: "p4", title: "現行システムの調査・棚卸し", assignee: "takahashi", status: "IN_PROGRESS", priority: "HIGH", due: 13 },
    { p: "p4", title: "新システムのアーキテクチャ設計", assignee: "suzuki", status: "NOT_STARTED", priority: "HIGH", due: 44 },
    { p: "p4", title: "見積書の作成", assignee: "tanaka", status: "IN_PROGRESS", priority: "HIGH", due: -7, description: "段階移行の各フェーズごとに見積を分ける" },
    { p: "p5", title: "バーコード読取機能の実装", assignee: "suzuki", status: "IN_PROGRESS", priority: "HIGH", due: -12, description: "ハンディ端末の機種差異による読取精度の問題を調査中" },
    { p: "p5", title: "在庫一覧画面の実装", assignee: "suzuki", status: "COMPLETED", priority: "MEDIUM", due: -28, completed: -29 },
    { p: "p5", title: "受入テスト実施", assignee: "sato", status: "NOT_STARTED", priority: "HIGH", due: -9 },
    { p: "p6", title: "コンセプト再確認", assignee: "sato", status: "NOT_STARTED", priority: "LOW", due: null },
    { p: "p6", title: "競合サイト調査", assignee: null, status: "NOT_STARTED", priority: "LOW", due: -17, description: "前任 渡辺 の退職により担当者未設定", creator: "watanabe" },
    { p: "p7", title: "導入キックオフ", assignee: "tanaka", status: "COMPLETED", priority: "HIGH", due: -43, completed: -43 },
    { p: "p7", title: "既存Excelデータの整理", assignee: "ito", status: "IN_PROGRESS", priority: "MEDIUM", due: 3, description: "重複顧客の名寄せと表記ゆれの統一" },
    { p: "p7", title: "データ移行(CSV取込)の検証", assignee: "suzuki", status: "NOT_STARTED", priority: "MEDIUM", due: 14 },
    { p: "p7", title: "権限設計の確認", assignee: "tanaka", status: "NOT_STARTED", priority: "MEDIUM", due: 8 },
    { p: "p8", title: "データ移行", assignee: "takahashi", status: "COMPLETED", priority: "HIGH", due: -170, completed: -172 },
    { p: "p8", title: "並行稼働テスト", assignee: "takahashi", status: "COMPLETED", priority: "HIGH", due: -150, completed: -148 },
    { p: "p9", title: "キックオフミーティング", assignee: "suzuki", status: "NOT_STARTED", priority: "HIGH", due: 16 },
    { p: "p10", title: "提案書ドラフト作成", assignee: "ito", status: "COMPLETED", priority: "HIGH", due: -12, completed: -13 },
    { p: "p10", title: "提案書の社内レビュー", assignee: "yamada", status: "IN_PROGRESS", priority: "HIGH", due: 1 },
    { p: "p10", title: "デモ環境の準備", assignee: "suzuki", status: "NOT_STARTED", priority: "MEDIUM", due: 9 },
    { p: "p11", title: "リリース作業", assignee: "takahashi", status: "COMPLETED", priority: "HIGH", due: -81, completed: -81 },
    { p: "p12", title: "保留理由の整理と再開条件の確認", assignee: "tanaka", status: "NOT_STARTED", priority: "LOW", due: 28 },
    { p: "p13", title: "診断範囲の確認", assignee: "takahashi", status: "NOT_STARTED", priority: "HIGH", due: 7 },
    { p: "p14", title: "GPS連携APIの実装", assignee: "suzuki", status: "COMPLETED", priority: "HIGH", due: -17, completed: -18 },
    { p: "p14", title: "顧客向けデモの実施", assignee: "sato", status: "COMPLETED", priority: "MEDIUM", due: -7, completed: -7 },
    { p: "p14", title: "顧客フィードバックの反映", assignee: "suzuki", status: "IN_PROGRESS", priority: "MEDIUM", due: 5 },
    { p: "p15", title: "連携仕様の確認", assignee: "tanaka", status: "COMPLETED", priority: "MEDIUM", due: -276, completed: -278 },
    { p: "p16", title: "初回訪問・ヒアリング", assignee: "sato", status: "NOT_STARTED", priority: "MEDIUM", due: 13 },
    { p: "p17", title: "契約書ドラフト送付", assignee: "tanaka", status: "COMPLETED", priority: "HIGH", due: -9, completed: -9 },
    { p: "p17", title: "契約条件の最終確認", assignee: "tanaka", status: "IN_PROGRESS", priority: "HIGH", due: 0, description: "SLA の対応時間について先方法務の確認待ち" },
    { p: "p17", title: "契約締結・押印", assignee: "tanaka", status: "NOT_STARTED", priority: "HIGH", due: 12 },
    { p: "p18", title: "要件ヒアリング", assignee: null, status: "NOT_STARTED", priority: "MEDIUM", due: 18, description: "担当者アサイン後に日程調整" },
  ];

  // リモート DB (Vercel + PostgreSQL) でも短時間で完了するよう、ID を参照しない行は一括登録する
  await prisma.task.createMany({
    data: taskDefs.map((t) => {
      const createdAt = d((t.due ?? 0) - 20);
      return {
        projectId: P[t.p].id, title: t.title, description: t.description ?? null,
        assigneeId: t.assignee ? U[t.assignee] : null, status: t.status, priority: t.priority,
        dueDate: t.due !== null ? d(t.due) : null, completedAt: t.completed !== undefined ? d(t.completed, 17) : null,
        createdById: U[t.creator ?? t.assignee ?? "yamada"], createdAt, updatedAt: t.completed !== undefined ? d(t.completed, 17) : createdAt,
      };
    }),
  });
  log(`タスク ${taskDefs.length} 件`);

  // ---------- 対応履歴 ----------
  const A = (p: PKey, user: keyof typeof U, type: "PHONE" | "EMAIL" | "VISIT" | "ONLINE_MEETING" | "INTERNAL" | "OTHER", at: [number, number, number], title: string, content: string) =>
    ({ p, user, type, at, title, content });
  const activityDefs = [
    A("p1", "tanaka", "VISIT", [-110, 14, 0], "新社屋Webサイトのキックオフ", "大森部長・広報担当2名と打ち合わせ。移転日 (来春) に合わせた公開を目標とすることで合意。施工実績は過去10年分を掲載予定。"),
    A("p1", "suzuki", "ONLINE_MEETING", [-50, 11, 0], "デザインカンプのレビュー", "2案提示。A案 (信頼感重視) をベースに、B案の写真の使い方を取り入れる方向で決定。"),
    A("p1", "tanaka", "EMAIL", [-6, 9, 30], "施工実績の写真データ送付依頼", "掲載予定の実績20件分の写真と概要文の送付を依頼。先方の広報担当が整理中とのこと。"),
    A("p1", "suzuki", "INTERNAL", [-2, 18, 0], "トップページ実装の遅延について", "メインビジュアルのアニメーション調整に想定以上の工数。期限を1週間延長する方向で田中と相談。"),
    A("p1", "tanaka", "PHONE", [0, 9, 15], "写真データの受領状況確認", "大森部長へ電話。写真は本日中に共有フォルダへアップロードいただける見込み。"),
    A("p2", "sato", "VISIT", [-120, 10, 0], "業務システム導入の初回打ち合わせ", "松本課長と現行の賃貸管理業務 (Excel 12ファイル) の運用状況をヒアリング。担当者ごとに管理方法が異なり、引き継ぎに時間がかかっている点が最大の課題。"),
    A("p2", "takahashi", "VISIT", [-100, 13, 30], "業務フローの詳細ヒアリング", "契約更新・退去精算・請求のフローを確認。月末の請求業務に3日かかっているため優先的に改善。"),
    A("p2", "sato", "EMAIL", [-60, 16, 0], "要件定義書の承認連絡", "松本課長より要件定義書の承認をいただいた。次フェーズ (データ移行計画) に着手。"),
    A("p2", "takahashi", "ONLINE_MEETING", [-8, 15, 0], "マスタデータ移行の方針確認", "物件マスタの重複 (約200件) のクレンジング方針を協議。先方で名寄せルールを決めていただくことに。"),
    A("p2", "sato", "PHONE", [-1, 11, 20], "操作研修の日程について", "10月上旬で2日間の研修を実施したい旨を伝達。候補日を来週までにいただく。"),
    A("p3", "tanaka", "VISIT", [-165, 10, 0], "営業管理の現状ヒアリング", "営業6名がそれぞれ別のスプレッドシートで案件管理。マネージャーが週次で手作業集計している。"),
    A("p3", "tanaka", "ONLINE_MEETING", [-90, 14, 0], "中間報告", "課題整理の結果を報告。「進捗の見える化」「担当変更時の引き継ぎ」「対応履歴の一元化」を改善の柱とすることで合意。"),
    A("p3", "tanaka", "EMAIL", [-19, 17, 30], "改善提案書の提出", "岡田様へ提案書 (v2) を送付。社内稟議に回していただく。回答予定は今週末。"),
    A("p3", "tanaka", "PHONE", [-3, 10, 0], "稟議状況の確認", "岡田様へ電話。部長承認済みで、役員承認待ちとのこと。今週中には回答見込み。"),
    A("p4", "tanaka", "VISIT", [-80, 10, 0], "既存システム刷新のキックオフ", "高山社長・情報システム担当と打ち合わせ。20年前のシステムで保守要員が退職済み。段階的な移行を提案。"),
    A("p4", "takahashi", "VISIT", [-30, 13, 0], "現行システムの調査 (現地)", "サーバー室にてシステム構成・データ量を確認。受注データ約150万件。夜間バッチの依存関係が複雑。"),
    A("p4", "tanaka", "EMAIL", [-10, 9, 0], "見積作成に向けた前提条件の確認", "段階移行のフェーズ分けについて社長へ確認メール送付。フェーズ1 (受注管理) から着手する前提で見積作成中。"),
    A("p4", "takahashi", "INTERNAL", [-1, 16, 0], "調査結果の社内共有", "夜間バッチの依存関係を整理した資料を開発部内で共有。設計に着手するための前提が整った。"),
    A("p5", "sato", "VISIT", [-60, 10, 0], "在庫管理アプリの中間デモ", "石井様に在庫一覧画面をデモ。表示項目の追加要望あり (ロット番号・入庫日)。"),
    A("p5", "suzuki", "INTERNAL", [-14, 15, 0], "バーコード読取精度の問題", "ハンディ端末の一部機種で読取精度が低い。メーカーへ問い合わせ中。期限に影響する見込み。"),
    A("p5", "sato", "PHONE", [-4, 14, 0], "納期遅延のご説明", "石井様へ読取精度の問題と対応状況を説明。10月中旬までの延長で了承いただいた。正式なリスケジュールは来週提示。"),
    A("p6", "watanabe", "VISIT", [-190, 11, 0], "採用サイトリニューアルの打ち合わせ", "森部長と打ち合わせ。新卒採用の応募数増加が目的。動画コンテンツの要望あり。"),
    A("p6", "watanabe", "EMAIL", [-120, 10, 0], "概算見積の送付", "森部長へ概算見積を送付。動画制作費を含めると予算超過のため、先方で予算見直しを行うとのこと。"),
    A("p6", "yamada", "INTERNAL", [-79, 9, 0], "担当者変更の引き継ぎ", "渡辺の退職に伴い、ひかり教育の担当を佐藤へ変更。過去の対応履歴・見積資料を共有済み。"),
    A("p6", "sato", "PHONE", [-75, 11, 0], "担当変更のご挨拶と状況確認", "森部長へ担当変更の挨拶。予算見直しは秋の理事会で決定予定のため、案件は保留とすることで合意。"),
    A("p7", "tanaka", "VISIT", [-43, 10, 0], "顧客管理システム導入のキックオフ", "藤田部長と打ち合わせ。スプレッドシート8本に分散している顧客情報を統合。10月末までに移行完了を目標。"),
    A("p7", "ito", "ONLINE_MEETING", [-15, 14, 0], "既存データの整理方針", "重複顧客の名寄せ基準 (会社名 + 電話番号) を確認。表記ゆれの統一ルールを共有。"),
    A("p7", "tanaka", "EMAIL", [0, 10, 40], "権限設計の確認依頼", "部署ごとの閲覧範囲について確認メールを送付。マーケ部と営業部で共有範囲が異なる可能性あり。"),
    A("p8", "takahashi", "VISIT", [-148, 10, 0], "並行稼働テストの結果報告", "3か月分の給与計算結果が旧システムと一致。本稼働の承認をいただいた。"),
    A("p8", "sato", "EMAIL", [-142, 15, 0], "本稼働完了のご連絡", "本稼働を完了。運用マニュアルと問い合わせ窓口を案内。"),
    A("p9", "tanaka", "VISIT", [-25, 13, 0], "ECサイト構築の初回ヒアリング", "木村様と打ち合わせ。定期購入機能と贈答用ラッピング対応が必須要件。10月からの着手で合意。"),
    A("p10", "ito", "VISIT", [-28, 10, 0], "予約管理システムのヒアリング", "青葉事務長と打ち合わせ。電話予約の対応で受付業務が圧迫されている。Web予約とリマインドSMSを提案予定。"),
    A("p10", "ito", "EMAIL", [-13, 17, 0], "提案書の送付", "提案書ドラフトを送付。理事会 (今月末) で審議いただく。"),
    A("p10", "ito", "PHONE", [-1, 15, 30], "理事会に向けた補足資料の依頼", "事務長より、他院の導入事例と費用対効果の資料を追加してほしいと依頼あり。社内レビュー後に送付予定。"),
    A("p12", "tanaka", "PHONE", [-45, 11, 0], "改修案件の状況確認", "山下課長へ電話。設備投資計画の決定が年末まで延期。案件は保留とし、年明けに再度連絡する。"),
    A("p13", "sato", "EMAIL", [-4, 9, 0], "セキュリティ診断の実施スケジュール", "業務システム導入前に診断を実施したい旨を松本課長へ連絡。来週から着手予定。"),
    A("p14", "sato", "VISIT", [-7, 14, 0], "トラッキング機能のデモ", "石井様および配送部門の責任者にデモを実施。地図表示の更新間隔を短くしてほしいとの要望。"),
    A("p14", "suzuki", "INTERNAL", [-1, 10, 0], "フィードバックの対応方針", "更新間隔を5分→1分へ変更。サーバー負荷の検証を行ってから反映する。"),
    A("p15", "tanaka", "EMAIL", [-205, 10, 0], "検収完了のご連絡", "大和代表より検収書を受領。保守契約は不要とのことで、本案件をもって取引終了。"),
    A("p16", "sato", "PHONE", [-6, 16, 0], "初回訪問の日程調整", "川口様へ電話。月末に札幌で訪問打ち合わせを実施することで調整中。"),
    A("p17", "tanaka", "EMAIL", [-9, 11, 0], "保守契約更新のご案内", "高山社長へ更新契約書のドラフトを送付。SLA (対応時間) の見直し案を含む。"),
    A("p17", "tanaka", "PHONE", [-2, 15, 0], "契約条件についての確認", "先方法務より対応時間の定義について質問。平日9-18時を基本とし、緊急時の連絡経路を明記することで調整。"),
    A("p18", "sato", "ONLINE_MEETING", [-2, 11, 0], "分析ダッシュボードの要望ヒアリング", "藤田部長より広告データ・Web解析・CRMの統合分析の要望。担当者のアサインを社内で調整する。"),
  ];

  await prisma.activity.createMany({
    data: activityDefs.map((a) => ({
      customerId: P[a.p].customerId, projectId: P[a.p].id, userId: U[a.user], type: a.type,
      occurredAt: d(a.at[0], a.at[1], a.at[2]), title: a.title, content: a.content,
      createdAt: d(a.at[0], a.at[1] + 1, a.at[2]), updatedAt: d(a.at[0], a.at[1] + 1, a.at[2]),
    })),
  });
  // 案件に紐づかない顧客対応
  await prisma.activity.create({
    data: {
      customerId: C.green, userId: U.tanaka, type: "OTHER", occurredAt: d(-20, 13, 0),
      title: "展示会での名刺交換", content: "再生可能エネルギー展にて川口様と名刺交換。モニタリングシステムに関心あり。佐藤へ担当を依頼。",
    },
  });
  await prisma.activity.create({
    data: {
      customerId: C.midori, userId: U.tanaka, type: "EMAIL", occurredAt: d(-55, 10, 0),
      title: "資料送付", content: "EC構築の事例資料と概算費用の目安を送付。",
    },
  });
  log(`対応履歴 ${activityDefs.length + 2} 件`);

  // ---------- ファイル (実体はストレージプロバイダへ保存) ----------
  const fileDefs: { p: PKey; name: string; category: "ESTIMATE" | "CONTRACT" | "PROPOSAL" | "OTHER"; user: keyof typeof U; days: number; description: string }[] = [
    { p: "p1", name: "見積書_新社屋Webサイト構築_v2.pdf", category: "ESTIMATE", user: "tanaka", days: -100, description: "初回見積の改訂版 (CMS費用を追加)" },
    { p: "p1", name: "要件定義書_新社屋Webサイト.pdf", category: "OTHER", user: "suzuki", days: -91, description: "" },
    { p: "p1", name: "業務委託契約書_サンプル建設.pdf", category: "CONTRACT", user: "tanaka", days: -95, description: "締結済み (先方押印あり)" },
    { p: "p2", name: "提案書_業務システム導入支援.pdf", category: "PROPOSAL", user: "sato", days: -130, description: "" },
    { p: "p2", name: "見積書_業務システム導入支援.pdf", category: "ESTIMATE", user: "sato", days: -126, description: "" },
    { p: "p3", name: "営業管理改善提案書_v2.pdf", category: "PROPOSAL", user: "tanaka", days: -19, description: "顧客へ提出した最新版" },
    { p: "p4", name: "現行システム調査報告書.pdf", category: "OTHER", user: "takahashi", days: -1, description: "夜間バッチ依存関係の整理を含む" },
    { p: "p5", name: "見積書_在庫管理アプリ.pdf", category: "ESTIMATE", user: "sato", days: -95, description: "" },
    { p: "p7", name: "提案書_顧客管理システム導入.pdf", category: "PROPOSAL", user: "tanaka", days: -50, description: "" },
    { p: "p10", name: "提案書_予約管理システム_draft.pdf", category: "PROPOSAL", user: "ito", days: -13, description: "理事会審議用ドラフト" },
    { p: "p17", name: "保守運用契約書_更新案.pdf", category: "CONTRACT", user: "tanaka", days: -9, description: "SLA見直し案を反映" },
    { p: "p14", name: "デモ議事録.pdf", category: "OTHER", user: "sato", days: -7, description: "顧客デモでの要望一覧" },
  ];
  for (const f of fileDefs) {
    const proj = projectDefs.find((p) => p.key === f.p)!;
    const data = makeMinimalPdf(["DEMO DOCUMENT", f.name, `Project: ${proj.code}`, "This is a sample file generated for the demo."]);
    const stored = await storage.put({ data, fileName: f.name, mimeType: "application/pdf" });
    await prisma.projectFile.create({
      data: {
        projectId: P[f.p].id, name: f.name, category: f.category, mimeType: "application/pdf", size: data.length,
        storageProvider: stored.provider, storageKey: stored.key, description: f.description || null,
        uploadedById: U[f.user], createdAt: d(f.days, 12),
      },
    });
  }
  log(`ファイル ${fileDefs.length} 件`);

  // ---------- 監査ログ (過去の変更履歴を再現) ----------
  const L = (
    days: number, hour: number, minute: number, user: keyof typeof U, action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "IMPORT" | "EXPORT",
    entityType: string, p: PKey | null, label: string, summary: string,
    changes?: { field: string; label: string; before: string | null; after: string | null }[],
  ) => ({ days, hour, minute, user, action, entityType, p, label, summary, changes });

  const auditDefs = [
    L(-110, 15, 0, "yamada", "CREATE", "project", "p1", "新社屋Webサイト構築", "案件「新社屋Webサイト構築」を登録"),
    L(-108, 9, 0, "tanaka", "UPDATE", "project", "p1", "新社屋Webサイト構築", "ステータス「未着手」→「進行中」", [{ field: "status", label: "ステータス", before: "未着手", after: "進行中" }]),
    L(-46, 10, 0, "suzuki", "UPDATE", "project", "p1", "新社屋Webサイト構築", "進捗率「20%」→「40%」", [{ field: "progress", label: "進捗率", before: "20%", after: "40%" }]),
    L(0, 9, 35, "suzuki", "UPDATE", "project", "p1", "新社屋Webサイト構築", "進捗率「50%」→「60%」", [{ field: "progress", label: "進捗率", before: "50%", after: "60%" }]),
    L(-60, 16, 5, "sato", "UPDATE", "project", "p2", "業務システム導入支援", "進捗率「25%」→「35%」", [{ field: "progress", label: "進捗率", before: "25%", after: "35%" }]),
    L(-1, 11, 30, "takahashi", "UPDATE", "project", "p2", "業務システム導入支援", "進捗率「40%」→「45%」", [{ field: "progress", label: "進捗率", before: "40%", after: "45%" }]),
    L(-19, 17, 35, "tanaka", "UPDATE", "project", "p3", "営業管理改善プロジェクト", "ステータス「進行中」→「確認待ち」、進捗率「60%」→「70%」", [
      { field: "status", label: "ステータス", before: "進行中", after: "確認待ち" },
      { field: "progress", label: "進捗率", before: "60%", after: "70%" },
    ]),
    L(-14, 15, 10, "suzuki", "UPDATE", "task", "p5", "バーコード読取機能の実装", "期限「(9日前)」→「(12日前)」、内容を更新", [{ field: "description", label: "内容", before: null, after: "ハンディ端末の機種差異による読取精度の問題を調査中" }]),
    L(-4, 14, 30, "sato", "UPDATE", "project", "p5", "在庫管理アプリ開発", "概要を更新", [{ field: "description", label: "概要", before: "倉庫内でのバーコード読取による入出庫記録アプリ。", after: "倉庫内でのバーコード読取による入出庫記録アプリ。ハンディ端末とタブレットの両対応。期限を超過しており、リスケジュールの調整中。" }]),
    L(-79, 9, 5, "yamada", "UPDATE", "user", null, "渡辺 翔", "ステータス「有効」→「無効」", [{ field: "status", label: "ステータス", before: "有効", after: "無効" }]),
    L(-79, 9, 10, "yamada", "UPDATE", "project", "p6", "採用サイトリニューアル", "担当者「渡辺 翔」→「佐藤 健一」", [{ field: "assigneeId", label: "担当者", before: "渡辺 翔", after: "佐藤 健一" }]),
    L(-79, 9, 12, "yamada", "UPDATE", "customer", "p6", "株式会社ひかり教育", "社内担当「渡辺 翔」→「佐藤 健一」", [{ field: "assigneeId", label: "社内担当", before: "渡辺 翔", after: "佐藤 健一" }]),
    L(-75, 11, 30, "sato", "UPDATE", "project", "p6", "採用サイトリニューアル", "ステータス「進行中」→「保留」", [{ field: "status", label: "ステータス", before: "進行中", after: "保留" }]),
    L(-45, 11, 20, "tanaka", "UPDATE", "project", "p12", "生産管理システム改修", "ステータス「進行中」→「保留」", [{ field: "status", label: "ステータス", before: "進行中", after: "保留" }]),
    L(-142, 15, 30, "takahashi", "UPDATE", "project", "p8", "給与計算システム移行", "ステータス「進行中」→「完了」、進捗率「95%」→「100%」", [
      { field: "status", label: "ステータス", before: "進行中", after: "完了" },
      { field: "progress", label: "進捗率", before: "95%", after: "100%" },
    ]),
    L(-81, 18, 0, "takahashi", "UPDATE", "project", "p11", "社内ポータル構築", "ステータス「確認待ち」→「完了」", [{ field: "status", label: "ステータス", before: "確認待ち", after: "完了" }]),
    L(-43, 10, 30, "yamada", "CREATE", "project", "p7", "顧客管理システム導入", "案件「顧客管理システム導入」を登録"),
    L(-43, 10, 32, "tanaka", "CREATE", "task", "p7", "導入キックオフ", "タスク「導入キックオフ」を登録 (案件: 顧客管理システム導入)"),
    L(-28, 10, 0, "yamada", "CREATE", "project", "p10", "予約管理システム提案", "案件「予約管理システム提案」を登録"),
    L(-13, 17, 5, "ito", "UPDATE", "project", "p10", "予約管理システム提案", "ステータス「進行中」→「確認待ち」", [{ field: "status", label: "ステータス", before: "進行中", after: "確認待ち" }]),
    L(-7, 16, 0, "sato", "UPDATE", "project", "p14", "物流トラッキング機能追加", "ステータス「進行中」→「確認待ち」、進捗率「80%」→「85%」", [
      { field: "status", label: "ステータス", before: "進行中", after: "確認待ち" },
      { field: "progress", label: "進捗率", before: "80%", after: "85%" },
    ]),
    L(-9, 11, 5, "tanaka", "UPDATE", "task", "p17", "契約書ドラフト送付", "ステータス「進行中」→「完了」", [{ field: "status", label: "ステータス", before: "進行中", after: "完了" }]),
    L(-6, 9, 0, "yamada", "CREATE", "project", "p16", "太陽光発電モニタリング提案", "案件「太陽光発電モニタリング提案」を登録"),
    L(-4, 9, 30, "yamada", "CREATE", "project", "p13", "セキュリティ診断・対策", "案件「セキュリティ診断・対策」を登録"),
    L(-2, 12, 0, "sato", "CREATE", "project", "p18", "マーケティング分析ダッシュボード", "案件「マーケティング分析ダッシュボード」を登録"),
    L(-20, 13, 30, "tanaka", "CREATE", "customer", null, "株式会社グリーンエナジー", "顧客「株式会社グリーンエナジー」を登録"),
    L(-12, 14, 0, "kobayashi", "IMPORT", "customer", null, "", "CSVインポート: 3件登録、1件スキップ"),
    L(-5, 16, 45, "tanaka", "EXPORT", "project", null, "", "CSVエクスポート (12件)"),
    L(-1, 17, 40, "kobayashi", "LOGIN", "session", null, "小林 誠", "ログイン"),
    L(-1, 18, 10, "sato", "LOGIN", "session", null, "佐藤 健一", "ログイン"),
    L(0, 8, 45, "tanaka", "LOGIN", "session", null, "田中 花子", "ログイン"),
    L(0, 9, 2, "yamada", "LOGIN", "session", null, "山田 太郎", "ログイン"),
    L(0, 9, 30, "suzuki", "LOGIN", "session", null, "鈴木 美咲", "ログイン"),
  ];

  await prisma.auditLog.createMany({
    data: auditDefs.map((a) => {
      const proj = a.p ? P[a.p] : null;
      return {
        userId: U[a.user], action: a.action, entityType: a.entityType,
        entityId: a.entityType === "project" && proj ? proj.id : null,
        entityLabel: a.label || null, summary: a.summary,
        changes: a.changes ? JSON.stringify(a.changes) : null,
        projectId: proj?.id ?? null, customerId: proj?.customerId ?? null,
        createdAt: d(a.days, a.hour, a.minute),
      };
    }),
  });
  log(`監査ログ ${auditDefs.length} 件`);

  return {
    users: userDefs.length,
    customers: customerDefs.length,
    projects: projectDefs.length,
    tasks: taskDefs.length,
    activities: activityDefs.length + 2,
    files: fileDefs.length,
    auditLogs: auditDefs.length,
  };
}

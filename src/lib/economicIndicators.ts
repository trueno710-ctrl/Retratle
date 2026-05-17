export type Importance = "高" | "中" | "低"
export type Country = "JP" | "US" | "EU" | "CN"
export type Category = "金融政策" | "物価" | "雇用" | "成長" | "消費" | "生産" | "貿易" | "景況感"

export interface IndicatorDefinition {
  id: string
  name: string
  nameEn: string
  country: Country
  category: Category
  importance: Importance
  frequency: "月次" | "四半期" | "年次" | "隔週" | "不定期"
  description: string           // 指標の意味・背景
  whyItMatters: string          // 株式市場・日本株への影響理由
  readingGuide: string          // 数値の読み方・ポイント
  affectedSectors: Array<{ sector: string; direction: "positive" | "negative" | "neutral"; note: string }>
  historicalContext: string     // 直近のトレンド・文脈
}

export interface ScheduledRelease {
  id: string
  indicatorId: string
  releaseDate: string           // YYYY-MM-DD
  releaseTime: string           // HH:MM JST
  period: string                // "2026年4月" など
  forecast: number | null       // コンセンサス予想
  forecastUnit: string          // "%", "万人", "兆円" など
  previous: number | null       // 前回値
  actual: number | null         // 実績値（null=未発表）
  revised: number | null        // 改定値
  importance: Importance
  preAnalysis: string           // 発表前解説・予想の背景
  postAnalysis: string | null   // 発表後解説・結果分析（null=未発表）
  outlook: string | null        // 今後の見通し（null=未発表）
  marketReaction: string | null // 市場反応サマリー（null=未発表）
  surprise: "大幅上回り" | "上回り" | "一致" | "下回り" | "大幅下回り" | null
  affectedTickers: Array<{ ticker: string; name: string; expectedMove: string }>
}

// ===== 指標マスター定義 =====
export const INDICATOR_DEFINITIONS: Record<string, IndicatorDefinition> = {
  "boj-rate": {
    id: "boj-rate",
    name: "日銀金融政策決定会合",
    nameEn: "Bank of Japan Monetary Policy Meeting",
    country: "JP",
    category: "金融政策",
    importance: "高",
    frequency: "隔週",
    description: "日本銀行の政策委員会が政策金利（無担保コール翌日物金利の誘導目標）を決定する会合。年8回開催。短期政策金利の水準や長短金利操作（YCC）の方針が発表される。黒田緩和の終焉後、植田総裁のもとで正常化路線が継続。",
    whyItMatters: "国内金融株・不動産株・輸出株に直接影響。利上げは銀行の利ざや改善でメガバンク上昇要因、円高でトヨタ等輸出株には下押し。REIT・不動産株は金利上昇で逆風。長期国債利回り上昇で割引率が上がりグロース株（高PER株）には逆風。",
    readingGuide: "金利据え置き/利上げ/利下げに加え、植田総裁の記者会見でのフォワードガイダンス（次回以降の方針）が市場を大きく動かす。特に「急がない」「慎重に」「一定の確信」などの表現の変化に注意。",
    affectedSectors: [
      { sector: "銀行・金融", direction: "positive", note: "利上げで利ざや改善、NIM拡大" },
      { sector: "保険", direction: "positive", note: "長期金利上昇で運用環境改善" },
      { sector: "輸出・自動車", direction: "negative", note: "円高進行で海外利益が目減り" },
      { sector: "不動産・REIT", direction: "negative", note: "借入コスト上昇・Cap rate上昇" },
      { sector: "グロース株・高PER", direction: "negative", note: "割引率上昇でバリュエーション圧縮" },
    ],
    historicalContext: "2024年3月にYCC撤廃・マイナス金利解除。2024年7月に0.25%、2025年1月に0.5%へ利上げ。植田総裁は「経済・物価が見通し通りなら追加利上げ」を示唆。2026年は0.75%〜1.0%への段階的利上げが市場のメインシナリオ。",
  },
  "fomc": {
    id: "fomc",
    name: "米国FOMC金利決定",
    nameEn: "Federal Open Market Committee",
    country: "US",
    category: "金融政策",
    importance: "高",
    frequency: "隔週",
    description: "米連邦準備制度理事会（FRB）の公開市場委員会が政策金利（FFレート誘導目標）を決定。年8回開催。パウエル議長の記者会見とドットチャート（金利見通し）も発表。グローバル金融市場の方向性を決定づける最重要イベント。",
    whyItMatters: "米金利は日本の長期金利・為替（ドル円）・グローバルリスク選好度を規定。FRBの利下げ→円高→輸出株逆風・内需株追い風。米金利低下でグロース株に資金回帰。日米金利差が縮小すると円高が進みやすい。",
    readingGuide: "金利決定本体より「点予測（ドットチャート）」「記者会見のトーン」が重要。データ次第（data-dependent）を強調するか、先行きへの自信を示すかで市場反応が変わる。インフレ（PCE）との比較で利下げペースを判断。",
    affectedSectors: [
      { sector: "輸出・自動車", direction: "negative", note: "利下げ→円高で逆風" },
      { sector: "テック・グロース", direction: "positive", note: "金利低下でバリュエーション改善" },
      { sector: "銀行", direction: "negative", note: "利下げで預貸金利差縮小" },
      { sector: "内需・小売", direction: "positive", note: "円高で輸入コスト低下" },
    ],
    historicalContext: "2023〜2024年に5.25-5.5%でピーク。2024年9月から利下げ開始。2026年は3.75-4.0%水準まで低下の見通し。インフレの粘着性と雇用の強さが利下げペースを左右。",
  },
  "jp-cpi": {
    id: "jp-cpi",
    name: "日本CPI（消費者物価指数）",
    nameEn: "Japan Consumer Price Index",
    country: "JP",
    category: "物価",
    importance: "高",
    frequency: "月次",
    description: "総務省が毎月発表する消費者が購入する財・サービスの価格変動指数。コアCPI（生鮮食品を除く）とコアコアCPI（生鮮食品・エネルギーを除く）が日銀の政策判断の中心指標。2%の物価安定目標が達成されているかの判断基準。",
    whyItMatters: "日銀の利上げ判断の最重要指標。コアCPIが2%超で推移すれば追加利上げの根拠になり銀行株に追い風・グロース株に逆風。エネルギー補助金の影響や「第2の力」（賃金上昇による物価上昇）の確認がポイント。",
    readingGuide: "ヘッドライン・コア・コアコアの3本を確認。コアコアCPIが最も日銀重視。前年比・前月比の両方を確認。1月・4月・10月は価格改定が多く変動しやすい。エネルギー補助金の終了タイミングも重要。",
    affectedSectors: [
      { sector: "銀行・金融", direction: "positive", note: "高インフレ→利上げ→利ざや改善" },
      { sector: "小売・消費", direction: "negative", note: "物価上昇で実質購買力低下" },
      { sector: "不動産", direction: "neutral", note: "インフレで資産価値上昇、金利上昇で逆風" },
      { sector: "食品・日用品", direction: "positive", note: "価格転嫁が進めば利益率改善" },
    ],
    historicalContext: "2022〜2023年に41年ぶりの高インフレ（最大4.3%）。2025年はコアCPIが2.5〜3%で高止まり。2026年も生鮮食品・エネルギーの価格高止まりで2%超継続見込み。春闘賃上げ率5%超が「賃金と物価の好循環」を支持。",
  },
  "us-cpi": {
    id: "us-cpi",
    name: "米国CPI（消費者物価指数）",
    nameEn: "US Consumer Price Index",
    country: "US",
    category: "物価",
    importance: "高",
    frequency: "月次",
    description: "米労働統計局（BLS）が発表する物価指標。FRBの目標は2%だが、実際の政策判断にはPCEデフレーターを重視。ただし市場の反応はCPIの方が大きい。コアCPI（食品・エネルギー除く）が特に注目される。",
    whyItMatters: "FRBの利下げペースを左右し、ドル円・米国長期金利を通じて日本市場に波及。インフレ鈍化→利下げ期待→ドル安円高→輸出株逆風・グロース株追い風。",
    readingGuide: "前年比3.0%未満かつ前月比0.2%以下が「インフレ鈍化」の目安。住居費（シェルター）の粘着性に注意。コアサービス（super core）の動向がFRBの最重要視ポイント。",
    affectedSectors: [
      { sector: "輸出・製造業", direction: "negative", note: "インフレ鈍化→円高進行" },
      { sector: "グロース・IT", direction: "positive", note: "金利低下でバリュエーション改善" },
      { sector: "素材・エネルギー", direction: "negative", note: "コモディティ価格下落連動" },
    ],
    historicalContext: "2022年6月に9.1%のピーク後、利上げ効果で鈍化。2024年末に3%台まで低下も粘着性あり。関税政策の影響で2026年は再上昇リスク。",
  },
  "us-nfp": {
    id: "us-nfp",
    name: "米国雇用統計（非農業部門雇用者数）",
    nameEn: "US Non-Farm Payrolls",
    country: "US",
    category: "雇用",
    importance: "高",
    frequency: "月次",
    description: "米労働統計局が毎月第1金曜日に発表。非農業部門の雇用者数変化・失業率・平均時給の3点セット。FRBの「雇用最大化」マンデートの観点から最重要指標。市場予想との乖離が大きいと相場が急変動する。",
    whyItMatters: "強い雇用→インフレ懸念→利下げ遠のく→ドル高円安→輸出株追い風。弱い雇用→景気後退懸念・利下げ期待→ドル安円高→輸出株逆風・リスクオフ。雇用と株価の関係が逆転することもある。",
    readingGuide: "非農業部門雇用者数：±5万人が「予想通り」の目安。失業率：4.5%超で警戒。平均時給：前年比+3.5%超でインフレ懸念。過去2か月の改定値にも注意。",
    affectedSectors: [
      { sector: "輸出・自動車", direction: "positive", note: "強い雇用→ドル高円安で追い風" },
      { sector: "内需・小売", direction: "negative", note: "円安で輸入コスト上昇" },
      { sector: "景気敏感株全般", direction: "positive", note: "強い雇用→景気拡大期待" },
    ],
    historicalContext: "2024年は月平均20万人超の強い雇用。2026年は関税・移民政策の影響で月10〜15万人ペースに減速見通し。失業率は4.5%程度で推移。",
  },
  "jp-gdp": {
    id: "jp-gdp",
    name: "日本GDP（国内総生産）",
    nameEn: "Japan GDP",
    country: "JP",
    category: "成長",
    importance: "高",
    frequency: "四半期",
    description: "内閣府が四半期ごとに発表する日本経済の総合的な成長指標。速報値・改定値・確報値の順で発表。前期比年率で表示。個人消費・設備投資・輸出入の内訳が日本経済の構造を示す。",
    whyItMatters: "景気全体の体温計。GDP成長率が高ければ企業業績改善期待で株高。消費の柱、設備投資の動向が投資判断の材料に。内需株と輸出株で異なる読み方が必要。",
    readingGuide: "前期比年率+1%以上で「良好」。個人消費が全体の約55%を占めるため最重要。設備投資の伸びは企業の将来見通しを反映。輸出の寄与度は円相場で変動。",
    affectedSectors: [
      { sector: "内需・小売全般", direction: "positive", note: "個人消費の伸びで恩恵" },
      { sector: "設備投資関連", direction: "positive", note: "設備投資増で機械・建設株追い風" },
      { sector: "不動産", direction: "positive", note: "景気拡大で需要増" },
    ],
    historicalContext: "2024年は消費増税後の反動減と円安インフレで実質成長が鈍化。2025年は名目成長率3%超も実質は1%台。2026年は賃上げ効果で実質個人消費が回復、1.5%程度の成長率を予想。",
  },
  "boj-tankan": {
    id: "boj-tankan",
    name: "日銀短観",
    nameEn: "Bank of Japan Tankan Survey",
    country: "JP",
    category: "景況感",
    importance: "高",
    frequency: "四半期",
    description: "日本銀行が四半期ごと（3月・6月・9月・12月）に実施する企業短期経済観測調査。大企業製造業の業況判断DI（良い−悪い）が最注目。設備投資計画・雇用判断・価格判断も重要。",
    whyItMatters: "日本企業の景況感を直接把握できる唯一の公式指標。DI改善→業績期待上昇→株高。特に大企業製造業DIは輸出関連株の先行指標。設備投資計画は機械・建設株の先行指標。",
    readingGuide: "大企業製造業DI：+10以上「良好」、0前後「中立」、マイナス「悪化」。非製造業DIは内需の強さを反映。先行き判断と現状の乖離もチェック。",
    affectedSectors: [
      { sector: "製造業・輸出", direction: "positive", note: "製造業DI改善で業績期待上昇" },
      { sector: "機械・設備投資", direction: "positive", note: "設備投資計画が強ければ追い風" },
      { sector: "内需・サービス", direction: "positive", note: "非製造業DI改善で追い風" },
    ],
    historicalContext: "2024年6月短観：大企業製造業DI+13（円安効果）。2025年3月：+14。2026年は円高と中国経済減速で製造業DIが10前後に低下懸念。非製造業DIは内需回復で高水準維持。",
  },
  "jp-trade": {
    id: "jp-trade",
    name: "日本貿易統計（貿易収支）",
    nameEn: "Japan Trade Balance",
    country: "JP",
    category: "貿易",
    importance: "中",
    frequency: "月次",
    description: "財務省が月次発表する輸出・輸入・貿易収支のデータ。日本の貿易構造と円相場の関係を示す重要指標。輸出の伸びは製造業の業績と直結。",
    whyItMatters: "輸出の伸び率は輸出企業の売上予測に使用。貿易赤字の拡大は円安要因。輸入価格の動向は国内インフレにも影響。",
    readingGuide: "前年比輸出増加率が+5%超なら輸出企業に追い風。輸入額の増加は国内需要の強さを示す場合もあるが、エネルギー価格が主因の場合はコスト増で逆風。",
    affectedSectors: [
      { sector: "輸出・製造業", direction: "positive", note: "輸出伸び率が直接の業績指標" },
      { sector: "海運・物流", direction: "positive", note: "貿易量増加で運賃上昇" },
    ],
    historicalContext: "2023〜2024年はエネルギー輸入増で慢性的な貿易赤字。2025年は輸出回復で赤字縮小。2026年は円高傾向で輸出額が目減りするリスク。",
  },
  "us-pce": {
    id: "us-pce",
    name: "米国PCEデフレーター",
    nameEn: "US PCE Price Index",
    country: "US",
    category: "物価",
    importance: "高",
    frequency: "月次",
    description: "FRBが最も重視するインフレ指標。個人消費支出（PCE）に基づく物価指数で、CPIより品目のウェイト修正が柔軟。コアPCE（食品・エネルギー除く）が政策目標2%の基準。",
    whyItMatters: "FRBの利下げ判断の直接的な基準。コアPCEが2%に向けて低下すれば利下げ加速→円高→輸出株逆風。インフレ粘着なら利下げ先送り→ドル高継続。",
    readingGuide: "コアPCE前年比：2.5%未満で「利下げ路線維持」。前月比+0.2%以下が目安。スーパーコアPCE（住居費・エネルギー除くサービス）の粘着性がFRBの懸念点。",
    affectedSectors: [
      { sector: "輸出・製造業", direction: "negative", note: "低インフレ→利下げ→円高で逆風" },
      { sector: "グロース・IT", direction: "positive", note: "金利低下でバリュエーション改善" },
    ],
    historicalContext: "2024年末にコアPCE2.8%で高止まり。FRBが慎重姿勢を維持。2026年は2.3〜2.5%に低下見通しだが、関税の二次効果で再上昇リスク。",
  },
  "jp-cpi-tokyo": {
    id: "jp-cpi-tokyo",
    name: "東京都区部CPI（先行指標）",
    nameEn: "Tokyo CPI",
    country: "JP",
    category: "物価",
    importance: "中",
    frequency: "月次",
    description: "全国CPIの約3〜4週間前に発表される東京都区部の消費者物価指数。全国CPIの先行指標として活用。速報性が高く、サプライズが出ると市場が反応する。",
    whyItMatters: "全国CPI発表前に物価トレンドを把握できる先行指標。日銀の追加利上げタイミングの事前判断に使用。",
    readingGuide: "コア（生鮮除く）が全国コアCPIの先行指標。前年比2.5%超なら日銀利上げ圧力。季節調整後の前月比変化もチェック。",
    affectedSectors: [
      { sector: "銀行", direction: "positive", note: "高インフレ継続→利上げ観測強化" },
    ],
    historicalContext: "2025年は2.2〜2.8%の範囲で推移。エネルギー補助金縮小で変動しやすい状況。",
  },
  "ism-mfg": {
    id: "ism-mfg",
    name: "米国ISM製造業景況感指数",
    nameEn: "US ISM Manufacturing PMI",
    country: "US",
    category: "景況感",
    importance: "中",
    frequency: "月次",
    description: "全米供給管理協会（ISM）が毎月第1営業日に発表。製造業のPMI（購買担当者指数）で50超が拡大、50未満が縮小を示す。新規受注・生産・雇用・在庫の4サブ指数も重要。",
    whyItMatters: "米国製造業の景況感は日本の輸出企業の受注先の状況を示す。ISM好調→米国景気強い→輸出需要旺盛→日本製造業株に追い風。",
    readingGuide: "50超が拡大。55超で「強い拡大」。新規受注サブ指数が先行指標として特に重要。在庫が高いと将来の生産が鈍化する可能性。",
    affectedSectors: [
      { sector: "製造業・輸出", direction: "positive", note: "米国製造業好調で輸出受注増" },
      { sector: "素材・化学", direction: "positive", note: "生産拡大で素材需要増" },
    ],
    historicalContext: "2024年は49〜50の縮小圏で推移。2026年は関税の影響で製造業が不安定。設備投資・AI関連は別途好調。",
  },
}

// ===== スケジュール済みリリース（2026年5〜6月の実際のスケジュール） =====
export function getScheduledReleases(): ScheduledRelease[] {
  const today = new Date("2026-05-17")
  const todayStr = today.toISOString().slice(0, 10)
  void todayStr

  return ([
    // ===== 発表済み（過去） =====
    {
      id: "boj-rate-2026-04",
      indicatorId: "boj-rate",
      releaseDate: "2026-04-25",
      releaseTime: "12:00",
      period: "2026年4月会合",
      forecast: 0.5,
      forecastUnit: "%",
      previous: 0.5,
      actual: 0.5,
      revised: null,
      importance: "高",
      preAnalysis: "前回（1月）から0.5%で据え置きが大方の予想。植田総裁は「経済・物価が見通し通りなら引き続き政策金利を引き上げていく」と発言しており、追加利上げは6月以降が有力視される。",
      postAnalysis: "予想通り0.5%で据え置き。植田総裁会見では「賃金と物価の好循環を引き続き確認」と発言。次回6月の利上げ可能性を示唆するも「急がない」姿勢を維持。",
      outlook: "次回6月26日の会合での0.75%への利上げが市場のメインシナリオ（確率60%）。春闘5.3%の賃上げ率が「第2の力」を裏付けており、コアCPIが2.5%超を維持すれば利上げの条件は整う。銀行株のアウトパフォームが継続見込み。",
      marketReaction: "為替は発表直後に144.5円から145.2円へ小幅円安。メガバンク株は「利上げ確認」で小反発、グロース株は金利据え置きで安堵のやや上昇。",
      surprise: "一致",
      affectedTickers: [
        { ticker: "8306", name: "三菱UFJ", expectedMove: "+0.5〜1.5%" },
        { ticker: "8316", name: "三井住友FG", expectedMove: "+0.5〜1.5%" },
        { ticker: "3697", name: "SHIFT", expectedMove: "-0.5〜+0.5%" },
      ],
    },
    {
      id: "jp-cpi-2026-04",
      indicatorId: "jp-cpi",
      releaseDate: "2026-05-22",
      releaseTime: "08:30",
      period: "2026年4月",
      forecast: 2.8,
      forecastUnit: "%（コアCPI前年比）",
      previous: 3.0,
      actual: null,
      revised: null,
      importance: "高",
      preAnalysis: "3月の3.0%から小幅低下の2.8%がコンセンサス。エネルギー補助金の縮小効果が一部剥落する一方、4月は価格改定シーズンで食料品・サービス価格の再上昇が見込まれる。コアコアCPI（食品・エネルギー除く）の動向が日銀の利上げ判断に直結。予想を上回れば6月利上げ確率が上昇し銀行株上昇要因。",
      postAnalysis: null,
      outlook: null,
      marketReaction: null,
      surprise: null,
      affectedTickers: [
        { ticker: "8306", name: "三菱UFJ", expectedMove: "+1〜3%（予想上回り時）" },
        { ticker: "8316", name: "三井住友FG", expectedMove: "+1〜3%（予想上回り時）" },
        { ticker: "8411", name: "みずほFG", expectedMove: "+1〜3%（予想上回り時）" },
        { ticker: "3697", name: "SHIFT", expectedMove: "-1〜2%（利上げ懸念）" },
      ],
    },
    {
      id: "us-nfp-2026-05",
      indicatorId: "us-nfp",
      releaseDate: "2026-05-01",
      releaseTime: "21:30",
      period: "2026年4月",
      forecast: 165000,
      forecastUnit: "人",
      previous: 228000,
      actual: 177000,
      revised: null,
      importance: "高",
      preAnalysis: "前月（3月）の22.8万人から減速し16.5万人程度のコンセンサス。関税政策の不確実性で企業が採用を慎重化との見方。平均時給の前年比+3.8%が注目ポイント。強い結果→ドル高円安→輸出株追い風。",
      postAnalysis: "17.7万人と予想を若干上回る結果。失業率は4.2%で前月から横ばい。平均時給前年比+3.9%（予想+3.8%）。全体として「雇用は底堅い」と評価され市場はリスクオンへ。",
      outlook: "雇用が底堅いことで米国景気後退懸念が後退。ただし平均時給の高止まりはFRBの利下げ慎重姿勢を支持。次回FOMC（6月）での利下げ確率は30%台に低下。ドル円は145〜148円のレンジを想定。日本輸出株には円安が追い風。",
      marketReaction: "発表後ドル円は144.2円→145.8円へ1.6円のドル高。日経先物は+150円の反応。輸出株（トヨタ・ソニー）が上昇、グロース株は長期金利上昇で小幅下落。",
      surprise: "上回り",
      affectedTickers: [
        { ticker: "7203", name: "トヨタ自動車", expectedMove: "+1〜2%（ドル高）" },
        { ticker: "6758", name: "ソニーグループ", expectedMove: "+0.5〜1.5%" },
        { ticker: "4478", name: "フリー", expectedMove: "-0.5〜1%（金利上昇）" },
      ],
    },
    {
      id: "us-cpi-2026-05",
      indicatorId: "us-cpi",
      releaseDate: "2026-05-13",
      releaseTime: "21:30",
      period: "2026年4月",
      forecast: 3.4,
      forecastUnit: "%（コアCPI前年比）",
      previous: 3.6,
      actual: 3.2,
      revised: null,
      importance: "高",
      preAnalysis: "3月の3.6%から鈍化の3.4%が予想。関税の影響が4月から輸入物価に転嫁されはじめる可能性があり、上振れリスクあり。コアCPI鈍化なら利下げ期待→グロース株上昇・ドル安円高。",
      postAnalysis: "3.2%と予想を下回る結果。住居費（シェルター）の鈍化が寄与。スーパーコアは前月比+0.2%に落ち着く。FRBの利下げ期待が再燃し市場はリスクオン。",
      outlook: "想定より早いインフレ鈍化で、6月FOMC利下げの確率が50%超に上昇。ドル安円高が進む可能性があり、輸出株には逆風。一方、グロース株・テック株への資金流入が期待される。米国株高→日本株のリスク選好改善で全体は底堅い。",
      marketReaction: "発表後ドル円が146.5円→144.8円へ1.7円の急速な円高。日経先物は輸出株安・グロース株高で小動き。東エレク・ブレインパッドなどグロース株が上昇。",
      surprise: "大幅下回り",
      affectedTickers: [
        { ticker: "7203", name: "トヨタ自動車", expectedMove: "-1〜2%（円高）" },
        { ticker: "8035", name: "東京エレクトロン", expectedMove: "+1〜3%（グロース恩恵）" },
        { ticker: "3655", name: "ブレインパッド", expectedMove: "+2〜4%（成長株恩恵）" },
      ],
    },
    // ===== 今後の予定 =====
    {
      id: "jp-cpi-tokyo-2026-05",
      indicatorId: "jp-cpi-tokyo",
      releaseDate: "2026-05-29",
      releaseTime: "08:30",
      period: "2026年5月（東京都区部）",
      forecast: 2.5,
      forecastUnit: "%（コアCPI前年比）",
      previous: 2.8,
      actual: null,
      revised: null,
      importance: "中",
      preAnalysis: "4月の東京コアCPIは2.8%だったが、5月はエネルギー補助金の一部復活効果と食料品の落ち着きで2.5%への低下が予想される。ただし外食・サービス価格は賃上げ効果で下がりにくい。6月全国CPI・日銀利上げ判断の先行指標として注目。下振れ（2.2%以下）なら利上げ懸念後退でグロース株に追い風。",
      postAnalysis: null,
      outlook: null,
      marketReaction: null,
      surprise: null,
      affectedTickers: [
        { ticker: "8306", name: "三菱UFJ", expectedMove: "+0.5〜2%（予想上回り時）" },
        { ticker: "4478", name: "フリー", expectedMove: "+1〜3%（予想下回り時）" },
      ],
    },
    {
      id: "boj-rate-2026-06",
      indicatorId: "boj-rate",
      releaseDate: "2026-06-26",
      releaseTime: "12:00",
      period: "2026年6月会合",
      forecast: 0.75,
      forecastUnit: "%",
      previous: 0.5,
      actual: null,
      revised: null,
      importance: "高",
      preAnalysis: "市場のコンセンサスは0.75%への利上げ（確率60〜65%）。5月の春闘最終集計で5.2%超の賃上げが確認された場合、利上げの環境が整うとの見方が優勢。植田総裁の最近の発言「経済・物価が見通し通りなら適切に対応」が利上げに向けた布石と市場は解釈。据え置きなら「サプライズ据え置き」で円安・グロース株高となる可能性。",
      postAnalysis: null,
      outlook: null,
      marketReaction: null,
      surprise: null,
      affectedTickers: [
        { ticker: "8306", name: "三菱UFJ", expectedMove: "+2〜4%（利上げ時）" },
        { ticker: "8316", name: "三井住友FG", expectedMove: "+2〜4%（利上げ時）" },
        { ticker: "8411", name: "みずほFG", expectedMove: "+2〜4%（利上げ時）" },
        { ticker: "7203", name: "トヨタ自動車", expectedMove: "-1〜3%（円高進行）" },
        { ticker: "3697", name: "SHIFT", expectedMove: "-2〜4%（金利上昇）" },
        { ticker: "6506", name: "安川電機", expectedMove: "-1〜2%（グロース逆風）" },
      ],
    },
    {
      id: "fomc-2026-06",
      indicatorId: "fomc",
      releaseDate: "2026-06-18",
      releaseTime: "03:00",
      period: "2026年6月FOMC",
      forecast: 3.75,
      forecastUnit: "% (FFレート上限)",
      previous: 4.0,
      actual: null,
      revised: null,
      importance: "高",
      preAnalysis: "4月CPIの想定外の鈍化を受け、6月利下げ（0.25pt）の確率が50%超に上昇。パウエル議長は「インフレに確信が持てれば利下げ」との姿勢。据え置きも十分ありえるが、ドットチャートの2026年利下げ回数予想（現在2回）が焦点。利下げならドル安円高で輸出株逆風・グロース株追い風。",
      postAnalysis: null,
      outlook: null,
      marketReaction: null,
      surprise: null,
      affectedTickers: [
        { ticker: "8035", name: "東京エレクトロン", expectedMove: "+2〜4%（利下げ・グロース恩恵）" },
        { ticker: "7203", name: "トヨタ自動車", expectedMove: "-1〜3%（円高）" },
        { ticker: "6140", name: "旭ダイヤモンド工業", expectedMove: "+1〜3%（小型グロース恩恵）" },
      ],
    },
    {
      id: "boj-tankan-2026-06",
      indicatorId: "boj-tankan",
      releaseDate: "2026-07-01",
      releaseTime: "08:50",
      period: "2026年6月短観",
      forecast: 10,
      forecastUnit: "（大企業製造業DI）",
      previous: 12,
      actual: null,
      revised: null,
      importance: "高",
      preAnalysis: "円高進行と中国経済の減速で大企業製造業DIは3月短観（+12）から小幅低下の+10が予想。一方、非製造業DIはインバウンド消費拡大・国内賃上げ効果で+35超の高水準維持が見込まれる。設備投資計画の強さ（前年比+10%超）が注目点。下振れた場合は輸出株に売り、非製造業の強さは内需株に追い風。",
      postAnalysis: null,
      outlook: null,
      marketReaction: null,
      surprise: null,
      affectedTickers: [
        { ticker: "7203", name: "トヨタ自動車", expectedMove: "−製造業DIに連動" },
        { ticker: "6902", name: "デンソー", expectedMove: "−製造業DIに連動" },
        { ticker: "9020", name: "東日本旅客鉄道", expectedMove: "+非製造業DI高水準" },
      ],
    },
    {
      id: "us-nfp-2026-06",
      indicatorId: "us-nfp",
      releaseDate: "2026-06-05",
      releaseTime: "21:30",
      period: "2026年5月",
      forecast: 155000,
      forecastUnit: "人",
      previous: 177000,
      actual: null,
      revised: null,
      importance: "高",
      preAnalysis: "4月（17.7万人）から減速し15.5万人が予想。関税・政府雇用削減（DOGE）の影響が本格化する可能性。失業率は4.3%に上昇見通し。弱い結果→6月FOMC利下げ確率上昇→ドル安円高→日本輸出株に逆風・グロース株に追い風。",
      postAnalysis: null,
      outlook: null,
      marketReaction: null,
      surprise: null,
      affectedTickers: [
        { ticker: "7203", name: "トヨタ自動車", expectedMove: "−ドル高/円安に連動" },
        { ticker: "4478", name: "フリー", expectedMove: "+利下げ期待・グロース株" },
      ],
    },
    {
      id: "jp-gdp-2026-q1",
      indicatorId: "jp-gdp",
      releaseDate: "2026-05-20",
      releaseTime: "08:50",
      period: "2026年1〜3月期（速報）",
      forecast: 0.4,
      forecastUnit: "% (前期比）",
      previous: 0.7,
      actual: null,
      revised: null,
      importance: "高",
      preAnalysis: "2025年10〜12月期の+0.7%から減速し+0.4%（前期比年率+1.6%）が予想。個人消費は実質賃金プラス転換で持ち直しが見込まれるが、輸出は円高・関税の影響で鈍化。内需の強さと外需の弱さが綱引き。プラス成長を維持できるかが焦点。マイナス成長（テクニカルリセッション）となれば日本株に全面的な逆風。",
      postAnalysis: null,
      outlook: null,
      marketReaction: null,
      surprise: null,
      affectedTickers: [
        { ticker: "8267", name: "イオン", expectedMove: "+消費回復時" },
        { ticker: "9983", name: "ファーストリテイリング", expectedMove: "+消費回復時" },
        { ticker: "7203", name: "トヨタ自動車", expectedMove: "−輸出鈍化懸念" },
      ],
    },
    {
      id: "us-pce-2026-04",
      indicatorId: "us-pce",
      releaseDate: "2026-05-30",
      releaseTime: "21:30",
      period: "2026年4月",
      forecast: 2.5,
      forecastUnit: "%（コアPCE前年比）",
      previous: 2.6,
      actual: null,
      revised: null,
      importance: "高",
      preAnalysis: "コアCPIが予想を下回ったことから、コアPCEも2.5%への低下が見込まれる。FRBの目標2%まではまだ距離があるが、方向性は正しい。市場は「利下げ環境が整いつつある」と解釈する可能性。予想を下回れば（2.3%以下）円高・グロース株高。予想を上回れば（2.7%以上）ドル高円安継続。",
      postAnalysis: null,
      outlook: null,
      marketReaction: null,
      surprise: null,
      affectedTickers: [
        { ticker: "3655", name: "ブレインパッド", expectedMove: "+2〜4%（利下げ・グロース恩恵）" },
        { ticker: "4478", name: "フリー", expectedMove: "+2〜5%（利下げ・小型グロース）" },
        { ticker: "7203", name: "トヨタ自動車", expectedMove: "−1〜3%（円高）" },
      ],
    },
  ] as ScheduledRelease[]).sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
}

export function categorizeReleases(releases: ScheduledRelease[], todayStr: string) {
  const upcoming = releases.filter(r => r.releaseDate > todayStr || (r.releaseDate === todayStr && !r.actual))
  const past = releases.filter(r => r.actual !== null || r.releaseDate < todayStr)
  const today = releases.filter(r => r.releaseDate === todayStr)
  return { upcoming, past, today }
}

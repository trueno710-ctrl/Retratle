export interface Ministry {
  name: string
  handle: string
  userId: string
  sector: string
  description: string
  color: string
  policyThemes2026: string[]
  keyPolicies: string[]
}

export const MINISTRIES: Ministry[] = [
  {
    name: "経済産業省",
    handle: "meti_NIPPON",
    userId: "136029444",
    sector: "産業・エネルギー・半導体",
    description: "産業政策、エネルギー、通商、半導体・AI支援",
    color: "#3b82f6",
    policyThemes2026: ["半導体国産化", "フィジカルAI", "GX推進", "データセンター", "経済安全保障"],
    keyPolicies: ["AI・半導体産業基盤強化フレーム（10兆円超）", "DX銘柄選定", "洋上風力45GW目標", "TSMC熊本第2工場支援"],
  },
  {
    name: "金融庁",
    handle: "JFSA_FSA",
    userId: "182892665",
    sector: "金融規制・資産形成",
    description: "金融規制、証券市場、保険、NISA拡充",
    color: "#8b5cf6",
    policyThemes2026: ["新NISA普及", "資産運用立国", "フィンテック規制整備", "暗号資産制度化"],
    keyPolicies: ["新NISA恒久化・上限拡大", "資産運用業改革", "ステーブルコイン法整備", "GX関連投資促進"],
  },
  {
    name: "国土交通省",
    handle: "MLIT_JAPAN",
    userId: "256340025",
    sector: "建設・インフラ・防災",
    description: "インフラ整備、都市計画、交通、防災",
    color: "#f59e0b",
    policyThemes2026: ["防災DX", "インフラ老朽化対策", "物流2024年問題対応", "空飛ぶクルマ解禁", "港湾デジタル化"],
    keyPolicies: ["能登復興加速", "物流効率化法整備", "eVTOL実装", "スマートシティ推進"],
  },
  {
    name: "厚生労働省",
    handle: "MHLWitter",
    userId: "270315643",
    sector: "医療DX・労働改革",
    description: "医療制度、労働政策、社会保障、医療DX",
    color: "#10b981",
    policyThemes2026: ["医療DX", "電子カルテ標準化", "マイナ保険証統合", "介護ロボット普及", "外国人労働者受入拡大"],
    keyPolicies: ["電子カルテ情報共有サービス全国展開", "医療費適正化計画", "介護AI活用推進", "健康保険証廃止"],
  },
  {
    name: "農林水産省",
    handle: "MAFF_JAPAN",
    userId: "283839937",
    sector: "農業DX・食品安全",
    description: "農業振興、食品安全、林業・水産業、スマート農業",
    color: "#84cc16",
    policyThemes2026: ["スマート農業加速", "農業AI・ドローン普及", "食料安全保障", "都市鉱山・レアメタル"],
    keyPolicies: ["みどりの食料システム戦略", "スマート農業技術活用促進法", "農産物輸出5兆円目標"],
  },
  {
    name: "環境省",
    handle: "Kankyo_Jpn",
    userId: "217564213",
    sector: "GX・再エネ・カーボンニュートラル",
    description: "GX推進、再生可能エネルギー、気候変動対策、排出量取引",
    color: "#06b6d4",
    policyThemes2026: ["GX排出量取引市場開設", "ペロブスカイト太陽電池", "水素・アンモニア", "洋上風力", "カーボンクレジット"],
    keyPolicies: ["GX推進法施行・炭素税段階導入", "2030年46%削減目標", "EV普及補助金延長", "蓄電池国産化支援"],
  },
  {
    name: "デジタル庁",
    handle: "digital_jpn",
    userId: "1392754599447756800",
    sector: "行政DX・マイナンバー",
    description: "デジタル化推進、マイナンバー、行政DX、データ連携基盤",
    color: "#ec4899",
    policyThemes2026: ["行政DX完全実装", "マイナンバー活用拡大", "政府クラウド", "AI行政", "デジタル田園都市"],
    keyPolicies: ["ガバメントクラウド全府省展開", "マイナンバーカード普及90%目標", "AI・データ行政活用方針", "デジタル社会重点計画"],
  },
  {
    name: "防衛省",
    handle: "ModJapan_jp",
    userId: "340042873",
    sector: "防衛DX・宇宙・サイバー",
    description: "防衛力整備、防衛DX、宇宙・サイバー安全保障",
    color: "#6366f1",
    policyThemes2026: ["防衛費GDP2%目標", "防衛DX", "宇宙・サイバー・電磁波", "無人機・ドローン", "装備品国産化"],
    keyPolicies: ["防衛力整備計画5年43兆円", "スタンドオフ防衛能力整備", "宇宙作戦能力強化", "サイバー防衛強化"],
  },
]

// 2026年の主要国策テーマと関連銘柄マッピング
export const POLICY_THEME_STOCKS: Record<string, Array<{ ticker: string; name: string; reason: string }>> = {
  "半導体国産化": [
    { ticker: "8035", name: "東京エレクトロン", reason: "国内最大手の半導体製造装置メーカー" },
    { ticker: "6857", name: "アドバンテスト", reason: "半導体テスト装置の世界的リーダー" },
    { ticker: "4063", name: "信越化学工業", reason: "半導体シリコンウェーハの世界シェアトップ" },
    { ticker: "6140", name: "旭ダイヤモンド工業", reason: "合成ダイヤモンド・次世代半導体素材" },
  ],
  "フィジカルAI": [
    { ticker: "6506", name: "安川電機", reason: "産業用ロボット・モーション制御で国内首位" },
    { ticker: "6954", name: "ファナック", reason: "CNC・産業ロボットの世界的リーダー" },
    { ticker: "6861", name: "キーエンス", reason: "工場センサー・AI外観検査で圧倒的シェア" },
    { ticker: "4307", name: "野村総合研究所", reason: "AIシステム構築・DXコンサルティング" },
  ],
  "GX推進": [
    { ticker: "6988", name: "日東電工", reason: "洋上風力・太陽電池向け高機能フィルム" },
    { ticker: "6723", name: "ルネサスエレクトロニクス", reason: "EV・再エネ向けパワー半導体" },
    { ticker: "4183", name: "三井化学", reason: "ペロブスカイト太陽電池材料を開発中" },
    { ticker: "6674", name: "GSユアサ", reason: "EV・定置用蓄電池の国内最大手" },
  ],
  "医療DX": [
    { ticker: "4320", name: "CEホールディングス", reason: "電子カルテ・医療DXの中堅専門企業" },
    { ticker: "3655", name: "ブレインパッド", reason: "医療データ分析AIで成長中" },
    { ticker: "4543", name: "テルモ", reason: "医療機器のデジタル化・IoT化対応" },
    { ticker: "9020", name: "東日本旅客鉄道", reason: "医療ツーリズム・インフラ整備" },
  ],
  "防衛DX": [
    { ticker: "7011", name: "三菱重工業", reason: "国産防衛装備品の中核企業" },
    { ticker: "6502", name: "東芝", reason: "防衛・サイバーセキュリティシステム" },
    { ticker: "9613", name: "NTTデータグループ", reason: "政府・防衛向けITシステム構築" },
    { ticker: "2362", name: "夢テクノロジー", reason: "防衛関連IT人材派遣・DX支援" },
  ],
  "スマート農業": [
    { ticker: "7744", name: "ノーリツ鋼機", reason: "農業IoTプラットフォーム展開中" },
    { ticker: "1301", name: "極洋", reason: "水産業DX・スマート養殖推進" },
    { ticker: "4188", name: "三菱ケミカルグループ", reason: "農業用フィルム・スマート農業素材" },
  ],
}

export const SECTOR_STOCK_MAP: Record<string, string[]> = {
  "産業・エネルギー・半導体": ["8035", "6857", "4063", "6501", "9501", "8001"],
  "金融規制・資産形成": ["8306", "8316", "8411", "8604", "8601", "8628"],
  "建設・インフラ・防災": ["1801", "1802", "1803", "1721", "9020", "9022"],
  "医療DX・労働改革": ["4568", "4523", "4519", "4543", "4320", "3655"],
  "農業DX・食品安全": ["2801", "2802", "2503", "2502", "1301", "7744"],
  "GX・再エネ・カーボンニュートラル": ["6988", "6506", "6674", "4183", "6723", "9531"],
  "行政DX・マイナンバー": ["4307", "3659", "4661", "9432", "9433", "4320"],
  "防衛DX・宇宙・サイバー": ["7011", "6502", "9613", "6832", "7012"],
}

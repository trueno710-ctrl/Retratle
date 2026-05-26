import axios from "axios"

const BASE_URL = "https://api.twitter.com/2"

interface Tweet {
  id: string
  text: string
  created_at: string
  author_id: string
  public_metrics?: {
    like_count: number
    retweet_count: number
    reply_count: number
    impression_count: number
  }
}

interface TweetsResponse {
  data: Tweet[]
  meta: { newest_id: string; oldest_id: string; result_count: number }
}

function getHeaders() {
  const bearerToken = process.env.X_BEARER_TOKEN
  if (!bearerToken) throw new Error("X_BEARER_TOKEN not configured")
  return { Authorization: `Bearer ${bearerToken}` }
}

export async function getLatestTweets(userId: string, count = 10): Promise<Tweet[]> {
  try {
    const res = await axios.get<TweetsResponse>(`${BASE_URL}/users/${userId}/tweets`, {
      headers: getHeaders(),
      params: {
        max_results: count,
        "tweet.fields": "created_at,public_metrics",
        expansions: "author_id",
      },
    })
    return res.data.data || []
  } catch {
    return []
  }
}

export async function postTweet(text: string): Promise<{ id: string; text: string } | null> {
  try {
    const res = await axios.post<{ data: { id: string; text: string } }>(
      `${BASE_URL}/tweets`,
      { text },
      {
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
      }
    )
    return res.data.data
  } catch {
    return null
  }
}

export async function searchRecentTweets(query: string, count = 10): Promise<Tweet[]> {
  try {
    const res = await axios.get<TweetsResponse>(`${BASE_URL}/tweets/search/recent`, {
      headers: getHeaders(),
      params: {
        query,
        max_results: count,
        "tweet.fields": "created_at,public_metrics",
      },
    })
    return res.data.data || []
  } catch {
    return []
  }
}

// 2026年実際の政策に基づくモックデータ
export function getMockMinistryPosts() {
  const now = Date.now()
  return [
    {
      ministry: "経済産業省",
      handle: "meti_NIPPON",
      posts: [
        {
          id: "meti_1",
          text: "【半導体・AI産業基盤強化】本日、ラピダスへの追加支援として2,000億円規模の補助金交付を決定。2027年の2nmチップ量産に向けた国内半導体エコシステム構築を加速します。関連サプライヤーとの連携体制も強化。#半導体 #AI #経済安全保障",
          created_at: new Date(now - 2 * 3600000).toISOString(),
          public_metrics: { like_count: 2840, retweet_count: 1230, reply_count: 187, impression_count: 145000 },
        },
        {
          id: "meti_2",
          text: "【DX銘柄2026】経済産業省・東証が共同選定する「DX銘柄2026」を発表。DXプラチナ企業2社、DX銘柄30社を選定。デジタル技術を活用した事業変革を推進する企業を積極的に支援します。#DX銘柄 #DX",
          created_at: new Date(now - 6 * 3600000).toISOString(),
          public_metrics: { like_count: 1560, retweet_count: 678, reply_count: 95, impression_count: 89000 },
        },
        {
          id: "meti_3",
          text: "【フィジカルAI推進】政府の「AI・ロボット産業振興計画」に基づき、製造現場でのAI・ロボット活用に3,873億円を投資。自動化・省人化技術の開発・実装を支援します。2030年までに製造業の生産性30%向上を目指します。#フィジカルAI #産業ロボット",
          created_at: new Date(now - 10 * 3600000).toISOString(),
          public_metrics: { like_count: 1890, retweet_count: 823, reply_count: 134, impression_count: 112000 },
        },
      ],
    },
    {
      ministry: "デジタル庁",
      handle: "digital_jpn",
      posts: [
        {
          id: "digital_1",
          text: "【医療DX】全国の病院・診療所での電子カルテ情報共有サービス（EHRS）の本格稼働を開始。マイナ保険証と連携し、患者の医療情報を安全に共有。医療の質向上と効率化に貢献します。参加医療機関数 12,000施設突破。#医療DX #マイナ保険証",
          created_at: new Date(now - 1 * 3600000).toISOString(),
          public_metrics: { like_count: 3450, retweet_count: 1560, reply_count: 289, impression_count: 198000 },
        },
        {
          id: "digital_2",
          text: "【ガバメントクラウド】政府情報システムのクラウド移行が80%完了。2026年度末までに全府省のシステムをガバメントクラウドへ移行完了予定。行政コストの大幅削減と住民サービス向上を実現します。#行政DX #ガバメントクラウド",
          created_at: new Date(now - 5 * 3600000).toISOString(),
          public_metrics: { like_count: 1230, retweet_count: 445, reply_count: 67, impression_count: 56000 },
        },
      ],
    },
    {
      ministry: "環境省",
      handle: "Kankyo_Jpn",
      posts: [
        {
          id: "env_1",
          text: "【GX排出量取引市場】本年4月から本格稼働した国内排出量取引市場（GX-ETS）の取引量が順調に拡大。炭素価格は1トンあたり3,200円に上昇。再エネ・省エネ投資を後押しする炭素価格メカニズムが機能し始めています。#GX #カーボンプライシング #脱炭素",
          created_at: new Date(now - 3 * 3600000).toISOString(),
          public_metrics: { like_count: 892, retweet_count: 334, reply_count: 78, impression_count: 48000 },
        },
        {
          id: "env_2",
          text: "【ペロブスカイト太陽電池】国内メーカーと連携し、ペロブスカイト太陽電池の実証事業を全国10カ所で開始。軽量・フレキシブルな次世代太陽電池の早期実用化を目指します。2030年の太陽光発電コスト目標7円/kWh達成に貢献。#ペロブスカイト #再エネ",
          created_at: new Date(now - 8 * 3600000).toISOString(),
          public_metrics: { like_count: 1450, retweet_count: 612, reply_count: 89, impression_count: 72000 },
        },
      ],
    },
    {
      ministry: "防衛省",
      handle: "ModJapan_jp",
      posts: [
        {
          id: "mod_1",
          text: "【防衛DX推進】令和8年度防衛予算において防衛DX関連に3,200億円を配分。AI・ドローン・サイバー・宇宙領域の防衛能力強化を加速します。国内防衛産業の育成と技術基盤強化にも重点投資します。#防衛 #防衛DX #安全保障",
          created_at: new Date(now - 4 * 3600000).toISOString(),
          public_metrics: { like_count: 4200, retweet_count: 1890, reply_count: 356, impression_count: 245000 },
        },
      ],
    },
    {
      ministry: "国土交通省",
      handle: "MLIT_JAPAN",
      posts: [
        {
          id: "mlit_1",
          text: "【物流DX・2024年問題対応】自動配送ロボット・ドローン配送の社会実装に向けた規制緩和を実施。2030年までに物流自動化率50%を目標とした「物流革新加速化計画」を策定しました。宅配ロッカー設置補助金も拡充。#物流DX #ドローン配送",
          created_at: new Date(now - 7 * 3600000).toISOString(),
          public_metrics: { like_count: 2100, retweet_count: 876, reply_count: 145, impression_count: 128000 },
        },
      ],
    },
    {
      ministry: "厚生労働省",
      handle: "MHLWitter",
      posts: [
        {
          id: "mhlw_1",
          text: "【介護ロボット普及促進】介護ロボット・ICT導入支援補助金の予算を前年比2倍の500億円に拡充。移乗・見守り・排泄支援ロボットの普及を加速し、介護従事者の負担軽減と業務効率化を推進します。#介護ロボット #介護DX",
          created_at: new Date(now - 9 * 3600000).toISOString(),
          public_metrics: { like_count: 1340, retweet_count: 567, reply_count: 89, impression_count: 67000 },
        },
      ],
    },
  ]
}

export interface TrendingTopic {
  rank: number
  topic: string
  tweetVolume: number
  category: "エンタメ" | "テクノロジー" | "ライフスタイル" | "食品・グルメ" | "ファッション" | "スポーツ" | "ニュース" | "季節イベント"
  affiliateOpportunity: boolean
}

export async function getTrendingTopics(): Promise<TrendingTopic[]> {
  try {
    const headers = getHeaders()
    const res = await axios.get("https://api.twitter.com/1.1/trends/place.json", {
      headers,
      params: { id: 23424856 }, // Japan WOEID
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (res.data[0]?.trends ?? []).slice(0, 20).map((t: any, i: number) => ({
      rank: i + 1,
      topic: t.name,
      tweetVolume: t.tweet_volume ?? 0,
      category: "ニュース",
      affiliateOpportunity: false,
    }))
  } catch {
    return getMockTrendingTopics()
  }
}

export function getMockTrendingTopics(): TrendingTopic[] {
  return [
    { rank: 1,  topic: "#楽天スーパーSALE",    tweetVolume: 284000, category: "ライフスタイル",   affiliateOpportunity: true  },
    { rank: 2,  topic: "#母の日",              tweetVolume: 198000, category: "季節イベント",     affiliateOpportunity: true  },
    { rank: 3,  topic: "ダイソン掃除機",        tweetVolume: 142000, category: "テクノロジー",     affiliateOpportunity: true  },
    { rank: 4,  topic: "#iPad新型",            tweetVolume: 118000, category: "テクノロジー",     affiliateOpportunity: true  },
    { rank: 5,  topic: "ふるさと納税",          tweetVolume: 97000,  category: "ライフスタイル",   affiliateOpportunity: true  },
    { rank: 6,  topic: "#梅雨対策",            tweetVolume: 86000,  category: "季節イベント",     affiliateOpportunity: true  },
    { rank: 7,  topic: "熱中症対策グッズ",      tweetVolume: 74000,  category: "ライフスタイル",   affiliateOpportunity: true  },
    { rank: 8,  topic: "#夏コスメ2026",        tweetVolume: 68000,  category: "ファッション",     affiliateOpportunity: true  },
    { rank: 9,  topic: "ポータブル冷風機",      tweetVolume: 61000,  category: "テクノロジー",     affiliateOpportunity: true  },
    { rank: 10, topic: "#ワールドカップ予選",   tweetVolume: 54000,  category: "スポーツ",         affiliateOpportunity: false },
    { rank: 11, topic: "Nintendo Switch 2",    tweetVolume: 48000,  category: "テクノロジー",     affiliateOpportunity: true  },
    { rank: 12, topic: "#健康診断",            tweetVolume: 43000,  category: "ライフスタイル",   affiliateOpportunity: true  },
    { rank: 13, topic: "山崎実業 収納",         tweetVolume: 38000,  category: "ライフスタイル",   affiliateOpportunity: true  },
    { rank: 14, topic: "#読書の習慣",          tweetVolume: 34000,  category: "ライフスタイル",   affiliateOpportunity: false },
    { rank: 15, topic: "プロテイン おすすめ",   tweetVolume: 31000,  category: "食品・グルメ",     affiliateOpportunity: true  },
  ]
}

export interface SeasonalEvent {
  month: number
  events: Array<{ name: string; peakWeek: string; categories: string[]; demandLevel: "高" | "中" | "低" }>
}

export function getSeasonalCalendar(): SeasonalEvent[] {
  return [
    { month: 5, events: [
      { name: "母の日",          peakWeek: "第2週",  categories: ["花・ギフト", "美容・コスメ", "食品"],  demandLevel: "高" },
      { name: "楽天スーパーSALE", peakWeek: "第3週",  categories: ["全ジャンル"],                          demandLevel: "高" },
      { name: "梅雨前対策",       peakWeek: "第4週",  categories: ["傘・レインウェア", "除湿グッズ"],       demandLevel: "中" },
    ]},
    { month: 6, events: [
      { name: "父の日",           peakWeek: "第3週",  categories: ["グルメ", "ファッション", "酒"],         demandLevel: "高" },
      { name: "梅雨対策",         peakWeek: "第1週",  categories: ["傘・カッパ", "除湿機", "防水スプレー"], demandLevel: "中" },
      { name: "ボーナスシーズン",  peakWeek: "第4週",  categories: ["家電", "旅行", "ファッション"],         demandLevel: "高" },
    ]},
    { month: 7, events: [
      { name: "夏のボーナス",     peakWeek: "第1週",  categories: ["家電", "ゲーム", "旅行"],               demandLevel: "高" },
      { name: "熱中症対策",       peakWeek: "第2週",  categories: ["冷感グッズ", "扇風機", "飲料"],          demandLevel: "高" },
      { name: "お中元",          peakWeek: "第3週",  categories: ["食品・グルメ", "飲料"],                  demandLevel: "高" },
    ]},
  ]
}

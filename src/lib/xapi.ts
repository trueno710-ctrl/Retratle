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

export function getMockMinistryPosts() {
  return [
    {
      ministry: "経済産業省",
      handle: "meti_NIPPON",
      posts: [
        { id: "1", text: "【重要】半導体産業への支援強化策を発表。国内製造拠点の整備に向け、2024年度補正予算で2兆円規模の補助金を措置。TSMC熊本工場第2棟建設を含む戦略的半導体産業基盤強化プログラムを推進します。#経済産業省 #半導体", created_at: new Date(Date.now() - 3600000).toISOString(), public_metrics: { like_count: 1234, retweet_count: 567, reply_count: 89 } },
        { id: "2", text: "再生可能エネルギーの導入促進に向け、洋上風力発電の公募条件を見直し。2030年までに45GW達成に向けた新たなロードマップを策定。関連事業者との連携を強化します。#再エネ #GX", created_at: new Date(Date.now() - 7200000).toISOString(), public_metrics: { like_count: 892, retweet_count: 312, reply_count: 45 } },
      ],
    },
    {
      ministry: "デジタル庁",
      handle: "digital_jpn",
      posts: [
        { id: "3", text: "マイナンバーカードと健康保険証の一体化について、2024年12月から本格運用を開始。全国の医療機関・薬局でのオンライン資格確認を義務化。デジタル行政推進の重要なマイルストーンです。#マイナ保険証 #デジタル庁", created_at: new Date(Date.now() - 1800000).toISOString(), public_metrics: { like_count: 2100, retweet_count: 890, reply_count: 234 } },
      ],
    },
    {
      ministry: "環境省",
      handle: "Kankyo_Jpn",
      posts: [
        { id: "4", text: "カーボンニュートラル2050実現に向けたGX（グリーントランスフォーメーション）推進法が施行。炭素税導入の段階的スケジュールと排出量取引市場の整備計画を公表しました。#GX #カーボンニュートラル", created_at: new Date(Date.now() - 5400000).toISOString(), public_metrics: { like_count: 756, retweet_count: 289, reply_count: 67 } },
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

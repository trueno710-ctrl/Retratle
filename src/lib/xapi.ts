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

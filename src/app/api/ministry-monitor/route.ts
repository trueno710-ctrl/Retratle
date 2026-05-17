import { NextResponse } from "next/server"
import { getMockMinistryPosts } from "@/lib/xapi"
import { analyzeMinistryPost } from "@/lib/claude"
import { MINISTRIES } from "@/lib/ministries"

export async function GET() {
  try {
    const ministryPosts = getMockMinistryPosts()
    const results = []

    for (const mp of ministryPosts) {
      const ministry = MINISTRIES.find((m) => m.handle === mp.handle)
      if (!ministry) continue

      const postsWithRecommendations = []
      for (const post of mp.posts.slice(0, 2)) {
        let recommendations = []

        if (process.env.ANTHROPIC_API_KEY) {
          try {
            recommendations = await analyzeMinistryPost(post.text, ministry.name, ministry.sector)
          } catch {
            recommendations = getMockRecommendations(ministry.sector)
          }
        } else {
          recommendations = getMockRecommendations(ministry.sector)
        }

        postsWithRecommendations.push({ ...post, recommendations })
      }

      results.push({
        ministry: ministry.name,
        handle: mp.handle,
        sector: ministry.sector,
        color: ministry.color,
        posts: postsWithRecommendations,
      })
    }

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json()
    if (!text) return NextResponse.json({ success: false, error: "text required" }, { status: 400 })

    if (!process.env.X_BEARER_TOKEN) {
      return NextResponse.json({ success: true, mock: true, message: "X API未設定 - 投稿をシミュレート", text })
    }

    const { postTweet } = await import("@/lib/xapi")
    const result = await postTweet(text)
    return NextResponse.json({ success: !!result, data: result })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

function getMockRecommendations(sector: string) {
  const sectorRecommendations: Record<string, Array<{ ticker: string; name: string; reason: string; confidence: string; sector: string; expectedImpact: string }>> = {
    "産業・エネルギー": [
      { ticker: "8035", name: "東京エレクトロン", reason: "半導体製造装置の国内需要増加で直接的な恩恵", confidence: "高", sector: "半導体製造装置", expectedImpact: "+3〜5%" },
      { ticker: "6857", name: "アドバンテスト", reason: "半導体テスト装置の需要拡大が期待される", confidence: "高", sector: "半導体テスト", expectedImpact: "+2〜4%" },
      { ticker: "6501", name: "日立製作所", reason: "インフラ整備関連事業での受注拡大見込み", confidence: "中", sector: "電機", expectedImpact: "+1〜3%" },
    ],
    "IT・DX": [
      { ticker: "4307", name: "野村総合研究所", reason: "行政DX推進による政府向けシステム需要拡大", confidence: "高", sector: "ITサービス", expectedImpact: "+2〜4%" },
      { ticker: "9432", name: "NTT", reason: "マイナンバー連携基盤の整備で通信インフラ需要増", confidence: "中", sector: "通信", expectedImpact: "+1〜2%" },
      { ticker: "4661", name: "デジタルガレージ", reason: "電子決済・デジタル認証分野での事業拡大期待", confidence: "中", sector: "IT", expectedImpact: "+2〜5%" },
    ],
    "環境・再エネ": [
      { ticker: "6988", name: "日東電工", reason: "洋上風力発電向け素材需要の増加が見込まれる", confidence: "高", sector: "素材", expectedImpact: "+3〜6%" },
      { ticker: "6506", name: "安川電機", reason: "再エネ設備向けパワーエレクトロニクス需要増", confidence: "高", sector: "産業機器", expectedImpact: "+2〜4%" },
      { ticker: "9531", name: "東京瓦斯", reason: "水素エネルギー事業での先行者優位が期待", confidence: "中", sector: "ガス", expectedImpact: "+1〜3%" },
    ],
    "金融規制": [
      { ticker: "8306", name: "三菱UFJフィナンシャルグループ", reason: "規制整備による金融市場の安定化で恩恵", confidence: "中", sector: "銀行", expectedImpact: "+1〜2%" },
      { ticker: "8604", name: "野村ホールディングス", reason: "証券市場整備で証券業務の拡大期待", confidence: "中", sector: "証券", expectedImpact: "+1〜3%" },
    ],
    "建設・インフラ": [
      { ticker: "1801", name: "大成建設", reason: "インフラ整備予算増額で大型案件受注期待", confidence: "高", sector: "建設", expectedImpact: "+3〜5%" },
      { ticker: "1802", name: "大林組", reason: "公共工事受注増が業績を押し上げる見込み", confidence: "高", sector: "建設", expectedImpact: "+2〜4%" },
      { ticker: "9020", name: "東日本旅客鉄道", reason: "交通インフラ整備政策の恩恵を受ける", confidence: "中", sector: "鉄道", expectedImpact: "+1〜2%" },
    ],
    "医療・労働": [
      { ticker: "4568", name: "第一三共", reason: "医療政策整備による医薬品需要の安定成長", confidence: "中", sector: "製薬", expectedImpact: "+1〜3%" },
      { ticker: "4543", name: "テルモ", reason: "医療機器整備推進で国内販売拡大期待", confidence: "中", sector: "医療機器", expectedImpact: "+1〜2%" },
    ],
    "農業・食品": [
      { ticker: "2801", name: "キッコーマン", reason: "農業政策整備による国内食品産業の競争力強化", confidence: "低", sector: "食品", expectedImpact: "+1〜2%" },
      { ticker: "1301", name: "極洋", reason: "水産業支援政策の恩恵が見込まれる", confidence: "中", sector: "水産", expectedImpact: "+2〜4%" },
    ],
    "財政・税制": [
      { ticker: "8306", name: "三菱UFJフィナンシャルグループ", reason: "財政政策の安定化が金融システム全体に好影響", confidence: "低", sector: "銀行", expectedImpact: "+0〜1%" },
    ],
  }
  return sectorRecommendations[sector] || sectorRecommendations["IT・DX"]
}

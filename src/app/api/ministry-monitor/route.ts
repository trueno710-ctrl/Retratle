import { NextResponse } from "next/server"
import { getMockMinistryPosts } from "@/lib/xapi"
import { analyzeMinistryPost, type ShikihoRecommendation } from "@/lib/claude"
import { MINISTRIES } from "@/lib/ministries"

// shikiho_10スタイルのモック推薦銘柄（実際の2026年国策テーマに基づく）
function getMockRecommendations(sector: string, postText: string): ShikihoRecommendation[] {
  const sectorMap: Record<string, ShikihoRecommendation[]> = {
    "産業・エネルギー・半導体": [
      {
        ticker: "8035", name: "東京エレクトロン",
        marketCapBillion: 18500, per: 28.4, pbr: 8.2, roe: 28.9, roa: 18.2, equityRatio: 63.1,
        dividendYield: 1.52, mixCoefficient: 23.29, hasZeroDebt: true,
        themes: ["半導体製造装置", "国策半導体", "経済安全保障"], reason: "国内最大手の半導体製造装置メーカー。METI補助金でサプライヤー需要増が直接恩恵。",
        confidence: "高", catalysts: ["国内ファウンドリ設備投資増", "AI向け装置需要拡大", "ラピダス向け受注"], tenbaggerScore: 62,
      },
      {
        ticker: "6140", name: "旭ダイヤモンド工業",
        marketCapBillion: 437, per: 11.53, pbr: 0.69, roe: 4.6, roa: 3.9, equityRatio: 84.2,
        dividendYield: 4.26, mixCoefficient: 7.96, hasZeroDebt: true,
        themes: ["合成ダイヤモンド", "次世代半導体関連", "グローバルニッチ◎"], reason: "合成ダイヤモンドで次世代半導体素材をニッチ独占。自己資本比率84%の超健全財務。ミックス係数7.96と割安。",
        confidence: "高", catalysts: ["次世代半導体需要拡大", "合成ダイヤ研磨材需要増", "有利子負債ゼロ"], tenbaggerScore: 78,
      },
      {
        ticker: "4125", name: "三和油化工業",
        marketCapBillion: 85, per: 8.52, pbr: 0.67, roe: 6.1, roa: 3.7, equityRatio: 60.0,
        dividendYield: 2.17, mixCoefficient: 5.71, hasZeroDebt: false,
        themes: ["レアメタル関連", "半導体関連", "産業廃棄物処理◎"], reason: "時価総額85億円の超小型。ミックス係数5.71と圧倒的割安。半導体廃液からのレアメタル回収事業が国策追い風。",
        confidence: "高", catalysts: ["レアメタル価格上昇", "半導体廃液処理需要増", "都市鉱山政策恩恵"], tenbaggerScore: 85,
      },
    ],
    "行政DX・マイナンバー": [
      {
        ticker: "4320", name: "CEホールディングス",
        marketCapBillion: 102, per: 8.55, pbr: 1.63, roe: 13.5, roa: 7.3, equityRatio: 54.2,
        dividendYield: 3.33, mixCoefficient: 13.94, hasZeroDebt: false,
        themes: ["医療DX関連", "電子カルテ関連", "上方修正狙い◎"], reason: "電子カルテDXの中堅専門企業。時価総額102億円の小型株でデジタル庁政策の直接恩恵。ROE13.5%と高収益。",
        confidence: "高", catalysts: ["電子カルテ全国展開", "マイナ保険証連携", "上方修正期待"], tenbaggerScore: 82,
      },
      {
        ticker: "3655", name: "ブレインパッド",
        marketCapBillion: 247, per: 21.61, pbr: 3.90, roe: 18.1, roa: 14.0, equityRatio: 77.5,
        dividendYield: 0.72, mixCoefficient: 84.28, hasZeroDebt: true,
        themes: ["AI関連", "医療データ分析", "20期連続増収◎"], reason: "AI・ビッグデータ分析で20期連続増収の優良株。医療データ分析AIが政府DX推進で需要急増中。",
        confidence: "中", catalysts: ["医療AI需要拡大", "政府DXシステム受注", "連続増収継続"], tenbaggerScore: 71,
      },
      {
        ticker: "9613", name: "NTTデータグループ",
        marketCapBillion: 28000, per: 32.1, pbr: 4.2, roe: 13.2, roa: 4.8, equityRatio: 36.5,
        dividendYield: 0.95, mixCoefficient: 134.82, hasZeroDebt: false,
        themes: ["行政DX関連", "ガバメントクラウド", "政府システム受注◎"], reason: "政府・自治体向けITシステムで圧倒的実績。ガバメントクラウド移行で大型案件継続獲得。",
        confidence: "中", catalysts: ["ガバメントクラウド移行加速", "医療データ基盤構築", "防衛DXシステム"], tenbaggerScore: 45,
      },
    ],
    "GX・再エネ・カーボンニュートラル": [
      {
        ticker: "6674", name: "GSユアサ",
        marketCapBillion: 4800, per: 18.5, pbr: 2.1, roe: 11.4, roa: 5.2, equityRatio: 45.8,
        dividendYield: 1.85, mixCoefficient: 38.85, hasZeroDebt: false,
        themes: ["蓄電池関連◎", "EV関連", "GX排出量取引恩恵"], reason: "EV・定置用蓄電池の国内最大手。GX-ETS開始で再エネ蓄電需要が急増。国内製造で安全保障面でも優位。",
        confidence: "高", catalysts: ["GX政策加速", "EV補助金延長", "電力貯蔵需要拡大"], tenbaggerScore: 65,
      },
      {
        ticker: "4183", name: "三井化学",
        marketCapBillion: 3200, per: 12.8, pbr: 0.95, roe: 7.5, roa: 3.8, equityRatio: 42.3,
        dividendYield: 3.12, mixCoefficient: 12.16, hasZeroDebt: false,
        themes: ["ペロブスカイト太陽電池◎", "GX関連", "化学素材"], reason: "ペロブスカイト太陽電池材料の国内リーダー。環境省実証事業への参画でブランド確立中。PBR0.95倍と割安。",
        confidence: "高", catalysts: ["ペロブスカイト実用化", "GX投資拡大", "炭素税導入恩恵"], tenbaggerScore: 73,
      },
      {
        ticker: "5821", name: "平河ヒューテック",
        marketCapBillion: 488, per: 12.43, pbr: 1.00, roe: 7.0, roa: 5.2, equityRatio: 74.4,
        dividendYield: 1.69, mixCoefficient: 12.43, hasZeroDebt: true,
        themes: ["再エネ配線関連", "データセンター関連", "5G・6G◎"], reason: "再エネ設備・データセンター向け特殊ケーブルに強み。有利子負債ゼロ・自己資本比率74%の超健全財務。",
        confidence: "中", catalysts: ["再エネ設備拡大", "データセンター建設急増", "5G整備加速"], tenbaggerScore: 68,
      },
    ],
    "防衛DX・宇宙・サイバー": [
      {
        ticker: "7011", name: "三菱重工業",
        marketCapBillion: 58000, per: 22.4, pbr: 3.1, roe: 14.2, roa: 5.8, equityRatio: 41.2,
        dividendYield: 0.82, mixCoefficient: 69.44, hasZeroDebt: false,
        themes: ["防衛装備品◎", "宇宙関連", "防衛DX"], reason: "国産防衛装備品の中核企業。防衛費GDP2%目標で長期的な受注拡大が確実視される。",
        confidence: "高", catalysts: ["防衛予算5年43兆円", "国産防衛装備品優先調達", "スタンドオフ能力整備"], tenbaggerScore: 55,
      },
      {
        ticker: "6832", name: "アオイ電子",
        marketCapBillion: 134, per: 12.8, pbr: 1.45, roe: 11.8, roa: 6.9, equityRatio: 58.3,
        dividendYield: 2.35, mixCoefficient: 18.56, hasZeroDebt: true,
        themes: ["防衛電子部品関連◎", "半導体パッケージ", "小型株◎"], reason: "時価総額134億円の小型防衛電子部品メーカー。防衛DX予算増で搭載電子部品需要が急増。有利子負債ゼロ。",
        confidence: "高", catalysts: ["防衛DX予算3,200億円", "電子部品国産化政策", "サイバー防衛需要増"], tenbaggerScore: 80,
      },
    ],
    "医療DX・労働改革": [
      {
        ticker: "4320", name: "CEホールディングス",
        marketCapBillion: 102, per: 8.55, pbr: 1.63, roe: 13.5, roa: 7.3, equityRatio: 54.2,
        dividendYield: 3.33, mixCoefficient: 13.94, hasZeroDebt: false,
        themes: ["電子カルテ◎", "医療DX", "上方修正狙い"], reason: "電子カルテ・医療DXの専門企業。EHRS全国展開の直接受益者。時価総額102億円の小型成長株。",
        confidence: "高", catalysts: ["電子カルテ全国展開12,000施設突破", "マイナ保険証連携義務化", "上方修正期待"], tenbaggerScore: 82,
      },
      {
        ticker: "4543", name: "テルモ",
        marketCapBillion: 39000, per: 28.6, pbr: 4.8, roe: 17.2, roa: 8.9, equityRatio: 52.3,
        dividendYield: 0.68, mixCoefficient: 137.28, hasZeroDebt: false,
        themes: ["医療機器IoT化", "医療DX対応", "グローバル展開◎"], reason: "医療機器のデジタル化・IoT化で先行。医療DX政策でデジタル対応医療機器の需要増加が見込まれる。",
        confidence: "中", catalysts: ["医療機器IoT義務化", "医療費適正化政策", "アジア新興国需要"], tenbaggerScore: 48,
      },
    ],
    "建設・インフラ・防災": [
      {
        ticker: "1801", name: "大成建設",
        marketCapBillion: 8200, per: 14.2, pbr: 1.35, roe: 9.8, roa: 4.2, equityRatio: 43.1,
        dividendYield: 2.45, mixCoefficient: 19.17, hasZeroDebt: false,
        themes: ["防災インフラ関連", "物流施設建設◎", "能登復興"], reason: "インフラ・防災関連の大型案件受注で業績拡大中。防災DX関連のデータセンター建設にも参入。",
        confidence: "中", catalysts: ["能登復興加速", "物流DXセンター建設", "防災インフラ整備"], tenbaggerScore: 42,
      },
      {
        ticker: "9022", name: "東海旅客鉄道",
        marketCapBillion: 59000, per: 18.4, pbr: 2.2, roe: 12.1, roa: 4.8, equityRatio: 39.8,
        dividendYield: 0.85, mixCoefficient: 40.48, hasZeroDebt: false,
        themes: ["インバウンド消費◎", "物流DX", "交通インフラ"], reason: "訪日外客急増でインバウンド需要が過去最高を更新中。リニア開業で長期的な収益力向上期待。",
        confidence: "中", catalysts: ["訪日外客400万人突破", "リニア開業前倒し期待", "東海道新幹線値上げ"], tenbaggerScore: 35,
      },
    ],
    "農業DX・食品安全": [
      {
        ticker: "1301", name: "極洋",
        marketCapBillion: 498, per: 9.8, pbr: 0.72, roe: 7.4, roa: 3.1, equityRatio: 44.8,
        dividendYield: 3.15, mixCoefficient: 7.06, hasZeroDebt: false,
        themes: ["水産業DX◎", "スマート養殖", "食料安全保障"], reason: "水産業DX・スマート養殖に先進的取り組み。時価総額498億円・ミックス係数7.06の割安成長株。",
        confidence: "中", catalysts: ["スマート養殖普及", "水産物輸出拡大", "食料安全保障政策"], tenbaggerScore: 65,
      },
    ],
    "金融規制・資産形成": [
      {
        ticker: "8628", name: "松井証券",
        marketCapBillion: 2800, per: 14.5, pbr: 1.89, roe: 13.2, roa: 3.8, equityRatio: 29.5,
        dividendYield: 4.12, mixCoefficient: 27.41, hasZeroDebt: false,
        themes: ["新NISA関連◎", "資産運用立国", "フィンテック"], reason: "新NISA恒久化・上限拡大で個人投資家の証券口座開設が急増。ネット証券として最大の恩恵。",
        confidence: "高", catalysts: ["新NISA口座急増", "資産運用業改革", "個人株式投資促進税制"], tenbaggerScore: 58,
      },
    ],
  }

  // 投稿テキストでキーワード検索して追加マッチ
  const postLower = postText.toLowerCase()
  const extraRecs: ShikihoRecommendation[] = []

  if (postLower.includes("ロボット") || postLower.includes("ai") || postLower.includes("フィジカル")) {
    extraRecs.push({
      ticker: "6506", name: "安川電機",
      marketCapBillion: 12800, per: 31.5, pbr: 4.8, roe: 15.2, roa: 9.8, equityRatio: 64.2,
      dividendYield: 0.98, mixCoefficient: 151.2, hasZeroDebt: true,
      themes: ["産業ロボット◎", "フィジカルAI", "モーション制御世界首位"], reason: "産業ロボット・サーボモーターで国内首位。フィジカルAI政策の最大受益者の一つ。有利子負債ゼロ。",
      confidence: "高", catalysts: ["フィジカルAI政府3,873億円投資", "EV工場向けロボット急増", "人手不足で自動化需要拡大"], tenbaggerScore: 68,
    })
  }

  const baseSectorRecs = sectorMap[sector] || sectorMap["産業・エネルギー・半導体"]
  const combined = [...baseSectorRecs, ...extraRecs]
  return combined.slice(0, 4)
}

export async function GET() {
  try {
    const ministryPosts = getMockMinistryPosts()
    const results = []

    for (const mp of ministryPosts) {
      const ministry = MINISTRIES.find((m) => m.handle === mp.handle)
      if (!ministry) continue

      const postsWithRecommendations = []
      for (const post of mp.posts.slice(0, 2)) {
        let recommendations: ShikihoRecommendation[] = []

        if (process.env.ANTHROPIC_API_KEY) {
          try {
            recommendations = await analyzeMinistryPost(post.text, ministry.name, ministry.sector) as unknown as ShikihoRecommendation[]
          } catch {
            recommendations = getMockRecommendations(ministry.sector, post.text)
          }
        } else {
          recommendations = getMockRecommendations(ministry.sector, post.text)
        }

        postsWithRecommendations.push({ ...post, recommendations })
      }

      results.push({
        ministry: ministry.name,
        handle: mp.handle,
        sector: ministry.sector,
        color: ministry.color,
        policyThemes: ministry.policyThemes2026,
        keyPolicies: ministry.keyPolicies,
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

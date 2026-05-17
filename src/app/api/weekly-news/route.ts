import { NextResponse } from "next/server"
import { summarizeWeeklyNews } from "@/lib/claude"

const MOCK_NEWS = [
  "日銀、政策金利を0.5%に引き上げ。円相場は一時145円台まで円高進行。金融株は上昇、輸出株は下落。",
  "トヨタ自動車、2024年度通期業績予想を上方修正。売上高45兆円、営業利益5兆円見込み。EV投資も継続加速。",
  "半導体大手TSMC、熊本第2工場建設を正式決定。2027年稼働予定で日本の半導体産業に追い風。",
  "インバウンド消費が過去最高を更新。訪日外国人数が月間400万人突破。百貨店・ホテル株が堅調。",
  "政府、GX推進に向けた追加対策を閣議決定。再エネ関連株が全面高となる展開。",
  "米国CPI低下でFRBの利下げ期待が再燃。日本の長期金利も低下し、グロース株が反発。",
  "決算シーズン本格化。IT・精密機器セクターを中心に好決算相次ぐ。日経平均は4万円台を維持。",
  "中国経済の回復鈍化懸念。中国向け輸出比率の高い素材・機械株に売り圧力。",
]

export async function GET() {
  try {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    let summary = ""
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        summary = await summarizeWeeklyNews(MOCK_NEWS)
      } catch {
        summary = getMockSummary()
      }
    } else {
      summary = getMockSummary()
    }

    return NextResponse.json({
      success: true,
      data: {
        weekRange: {
          start: weekStart.toISOString().slice(0, 10),
          end: weekEnd.toISOString().slice(0, 10),
        },
        newsItems: MOCK_NEWS.map((text, i) => ({
          id: String(i + 1),
          text,
          date: new Date(weekStart.getTime() + i * 86400000).toISOString().slice(0, 10),
          category: getCategory(text),
        })),
        summary,
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

function getCategory(text: string): string {
  if (text.includes("日銀") || text.includes("金融")) return "金融・金利"
  if (text.includes("半導体") || text.includes("IT")) return "テクノロジー"
  if (text.includes("トヨタ") || text.includes("EV")) return "自動車"
  if (text.includes("インバウンド") || text.includes("訪日")) return "消費・観光"
  if (text.includes("GX") || text.includes("再エネ")) return "環境・エネルギー"
  if (text.includes("米国") || text.includes("FRB")) return "グローバル"
  if (text.includes("中国")) return "中国・アジア"
  return "市場全般"
}

function getMockSummary(): string {
  return `【今週の市場総括】
今週の日本株市場は、日銀の追加利上げ決定を受けた円高進行により輸出株が軟調となる一方、好決算を背景にIT・精密機器セクターは底堅く推移。日経平均は週間ベースでほぼ横ばいとなった。

【セクター別注目ポイント】
• 半導体・電子部品: TSMC熊本第2工場決定で関連サプライヤーに強い追い風。東京エレクトロン・アドバンテストが高値更新。
• 金融: 日銀利上げで銀行の利ざや改善期待が高まる。三菱UFJ・三井住友が年初来高値圏。
• インバウンド消費: 訪日外客が過去最高更新。百貨店・ホテル・航空セクターが堅調に推移。

【来週への注目トピック】
1. 米国FOMC議事要旨公表（水曜）: ドル円の方向感を左右する重要イベント
2. 主要企業の決算発表ラッシュ: ソニー・キーエンス・日立の決算に注目

【注目銘柄】
• 8035 東京エレクトロン: 半導体装置需要増で業績上振れ期待
• 8306 三菱UFJ: 利上げ環境での利ざや拡大が追い風
• 9022 東海旅客鉄道: インバウンド需要急増でリニア工事費用を吸収`
}

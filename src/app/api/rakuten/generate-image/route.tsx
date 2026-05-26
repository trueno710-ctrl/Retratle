import { ImageResponse } from "@vercel/og"
import { NextRequest } from "next/server"

export const runtime = "edge"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const itemName = searchParams.get("itemName") || "おすすめ商品"
  const price = searchParams.get("price") || "0"
  const imageUrl = searchParams.get("imageUrl") || ""
  const reviewAverage = searchParams.get("reviewAverage") || "0"
  const reviewCount = searchParams.get("reviewCount") || "0"
  const shopName = searchParams.get("shopName") || ""
  const account = searchParams.get("account") || "@otoku_ai_life"

  const stars = "★".repeat(Math.round(Number(reviewAverage))) + "☆".repeat(5 - Math.round(Number(reviewAverage)))

  return new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1080,
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Background decoration */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "radial-gradient(circle at 20% 80%, rgba(255,107,107,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(78,205,196,0.15) 0%, transparent 50%)",
          display: "flex",
        }} />

        {/* Account badge */}
        <div style={{
          position: "absolute",
          top: 40, left: 40,
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 50,
          padding: "8px 20px",
          color: "white",
          fontSize: 28,
          display: "flex",
        }}>
          {account}
        </div>

        {/* PR badge */}
        <div style={{
          position: "absolute",
          top: 40, right: 40,
          background: "rgba(255,107,107,0.8)",
          borderRadius: 8,
          padding: "8px 20px",
          color: "white",
          fontSize: 28,
          fontWeight: "bold",
          display: "flex",
        }}>
          #PR
        </div>

        {/* Product image */}
        {imageUrl && (
          <div style={{
            width: 420,
            height: 420,
            borderRadius: 24,
            overflow: "hidden",
            border: "3px solid rgba(255,255,255,0.2)",
            marginBottom: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "white",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={itemName}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        )}

        {/* Product name */}
        <div style={{
          color: "white",
          fontSize: 36,
          fontWeight: "bold",
          textAlign: "center",
          maxWidth: 900,
          marginBottom: 20,
          lineHeight: 1.4,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          {itemName.length > 40 ? itemName.slice(0, 40) + "..." : itemName}
        </div>

        {/* Review */}
        <div style={{
          color: "#ffd700",
          fontSize: 32,
          marginBottom: 16,
          display: "flex",
        }}>
          {stars} <span style={{ color: "#aaa", marginLeft: 12, fontSize: 28 }}>({reviewCount}件)</span>
        </div>

        {/* Price */}
        <div style={{
          background: "linear-gradient(135deg, #ff6b6b, #ff8e53)",
          borderRadius: 16,
          padding: "16px 48px",
          marginBottom: 24,
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          boxShadow: "0 8px 24px rgba(255,107,107,0.4)",
        }}>
          <span style={{ color: "white", fontSize: 28 }}>楽天価格</span>
          <span style={{ color: "white", fontSize: 56, fontWeight: "bold" }}>
            ¥{Number(price).toLocaleString()}
          </span>
        </div>

        {/* Shop name */}
        {shopName && (
          <div style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 26,
            marginBottom: 16,
            display: "flex",
          }}>
            🏪 {shopName}
          </div>
        )}

        {/* CTA */}
        <div style={{
          color: "rgba(255,255,255,0.8)",
          fontSize: 28,
          marginTop: 8,
          display: "flex",
        }}>
          🔗 プロフのリンクから購入できます
        </div>

        {/* Rakuten badge */}
        <div style={{
          position: "absolute",
          bottom: 40,
          right: 40,
          background: "#BF0000",
          borderRadius: 12,
          padding: "10px 24px",
          color: "white",
          fontSize: 28,
          fontWeight: "bold",
          display: "flex",
        }}>
          Rakuten 楽天
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    }
  )
}

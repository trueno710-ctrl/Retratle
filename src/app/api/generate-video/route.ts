import { NextResponse } from "next/server"
import { GoogleAuth } from "google-auth-library"

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || "my-project-481100"
const LOCATION = "us-central1"
const MODEL = "veo-3.0-generate-preview"

async function getAccessToken(): Promise<string> {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set")

  const credentials = JSON.parse(serviceAccountJson)
  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  })
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  if (!token.token) throw new Error("Failed to get access token")
  return token.token
}

// POST /api/generate-video → start job, return operationName
export async function POST(req: Request) {
  try {
    const { prompt, aspectRatio = "16:9", durationSeconds = 8 } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 })
    }

    const accessToken = await getAccessToken()

    const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predictLongRunning`

    const body = {
      instances: [{ prompt }],
      parameters: {
        aspectRatio,
        sampleCount: 1,
        durationSeconds,
      },
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ operationName: data.name })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/generate-video?op=<operationName> → poll status
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const operationName = searchParams.get("op")
    if (!operationName) {
      return NextResponse.json({ error: "op is required" }, { status: 400 })
    }

    const accessToken = await getAccessToken()

    const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/${operationName}`

    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error }, { status: response.status })
    }

    const data = await response.json()

    if (!data.done) {
      return NextResponse.json({ done: false })
    }

    if (data.error) {
      return NextResponse.json({ done: true, error: data.error.message }, { status: 500 })
    }

    const videos =
      data.response?.predictions?.map(
        (p: { bytesBase64Encoded: string; mimeType: string }) => ({
          base64: p.bytesBase64Encoded,
          mimeType: p.mimeType || "video/mp4",
        })
      ) ?? []

    return NextResponse.json({ done: true, videos })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

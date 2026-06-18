import { NextResponse } from "next/server"
import { GoogleAuth } from "google-auth-library"

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || "my-project-481100"
const LOCATION = "us-central1"
const MODEL = "imagen-3.0-generate-001"

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

export async function POST(req: Request) {
  try {
    const { prompt, aspectRatio = "1:1", sampleCount = 1 } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 })
    }

    const accessToken = await getAccessToken()

    const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`

    const body = {
      instances: [{ prompt }],
      parameters: {
        sampleCount,
        aspectRatio,
        safetySetting: "block_some",
        personGeneration: "allow_adult",
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
    const images = data.predictions?.map((p: { bytesBase64Encoded: string; mimeType: string }) => ({
      base64: p.bytesBase64Encoded,
      mimeType: p.mimeType || "image/png",
    })) ?? []

    return NextResponse.json({ images })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

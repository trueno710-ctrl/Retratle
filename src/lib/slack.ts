import axios from "axios"

export async function sendSlackMessage(text: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) throw new Error("SLACK_WEBHOOK_URL not set")
  await axios.post(webhookUrl, { text })
}

export async function sendSlackBlocks(blocks: unknown[]): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) throw new Error("SLACK_WEBHOOK_URL not set")
  await axios.post(webhookUrl, { blocks })
}

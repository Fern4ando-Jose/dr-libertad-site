import { NextResponse } from 'next/server'

const TOKEN = process.env.META_ACCESS_TOKEN
const ACCOUNT_ID = process.env.META_INSTAGRAM_ACCOUNT_ID

export async function GET() {
  console.log('TOKEN length:', TOKEN?.length)
  console.log('TOKEN first 20 chars:', TOKEN?.substring(0, 20))
  console.log('TOKEN last 20 chars:', TOKEN?.substring((TOKEN?.length ?? 0) - 20))

  const res = await fetch(
  `https://graph.facebook.com/v25.0/${ACCOUNT_ID}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&access_token=${TOKEN}`
)

  const data = await res.json()

  console.log('STATUS:', res.status)
  console.log('RESPOSTA:', JSON.stringify(data, null, 2))

  if (!res.ok) {
    return NextResponse.json({ error: data }, { status: 500 })
  }

  return NextResponse.json(data)
}

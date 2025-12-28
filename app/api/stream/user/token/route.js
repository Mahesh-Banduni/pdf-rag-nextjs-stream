import { NextResponse } from 'next/server'
import { StreamChat } from 'stream-chat'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required query param: userId' },
        { status: 400 }
      )
    }

    const apiKey = process.env.STREAM_API_KEY
    const apiSecret = process.env.STREAM_API_SECRET

    const serverClient = StreamChat.getInstance(apiKey, apiSecret)

    // Generate a token for this user
    const token = serverClient.createToken(userId)

    return NextResponse.json({
      token,
      apiKey,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to retrieve user' },
      { status: 500 }
    )
  }
}

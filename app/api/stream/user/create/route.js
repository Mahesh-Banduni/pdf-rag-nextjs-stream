import { NextResponse } from 'next/server'
import { StreamChat } from 'stream-chat'

export async function POST(req) {
  try {
    const { userId, name } = await req.json()

    if (!userId || !name) {
      return NextResponse.json(
        { error: 'userId and name are required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.STREAM_API_KEY
    const apiSecret = process.env.STREAM_API_SECRET

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Missing Stream API credentials' },
        { status: 500 }
      )
    }

    const serverClient = StreamChat.getInstance(apiKey, apiSecret)

    // Create or update the user in Stream Chat
    await serverClient.upsertUser({ id: userId, name })

    // Generate a token for the client to connect
    const token = serverClient.createToken(userId)

    return NextResponse.json({
      message: 'User created successfully',
      user: { id: userId, name },
      token,
      apiKey
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}

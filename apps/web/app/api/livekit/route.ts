import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const room = req.nextUrl.searchParams.get("roomName");
    const username = req.nextUrl.searchParams.get("username");

    if (!room || typeof room !== 'string' || room.trim() === '') {
        return NextResponse.json(
            { error: 'Missing or invalid "roomName" query parameter' },
            { status: 400 }
        );
    }

    if (!username || typeof username !== 'string' || username.trim() === '') {
        return NextResponse.json(
            { error: 'Missing or invalid "username" query parameter' },
            { status: 400 }
        );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
        console.error("Server misconfigured: missing environment variables.");
        return NextResponse.json(
            { error: "Server misconfigured" },
            { status: 500 }
        );
    }

    try {
        const at = new AccessToken(apiKey, apiSecret, { identity: username });
        at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true, roomRecord: true });
        const token = await at.toJwt();
        return NextResponse.json({ token: token });
    } catch (error) {
        console.error("Failed to generate token:", error);
        return NextResponse.json(
            { error: "Failed to generate token" },
            { status: 500 }
        );
    }
}

import { NextResponse } from "next/server";
import { lineClient } from "@/lib/line-bot";
import { 
  handleUserMessage, 
  getOrCreateConversation, 
  getResponseMessages,
  getWelcomeMessage,
  getFeatureMenuMessage,
  ConversationStatus 
} from "@/lib/conversation-state";
import { WebhookEvent, validateSignature } from "@line/bot-sdk";

export async function POST(req: Request) {
  // Debug Log: Check Environment Variables
  console.log("Webhook received. Environment Check:");
  console.log("- LINE_CHANNEL_ACCESS_TOKEN:", process.env.LINE_CHANNEL_ACCESS_TOKEN ? "Set" : "Missing");
  console.log("- GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? `Set (starts with ${process.env.GEMINI_API_KEY.substring(0, 4)}...)` : "Missing");

  // 檢查 LINE Bot 環境變數是否設定
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN || !process.env.LINE_CHANNEL_SECRET) {
    return NextResponse.json(
      { message: "LINE Bot is not configured. Please set LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET." },
      { status: 503 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!signature) {
    return NextResponse.json({ message: "Missing signature" }, { status: 400 });
  }

  if (!validateSignature(body, process.env.LINE_CHANNEL_SECRET, signature)) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  const events: WebhookEvent[] = JSON.parse(body).events;

  for (const event of events) {
    try {
      if (event.type === "message" && event.message.type === "text") {
        const userId = event.source.userId;
        if (userId) {
          const messages = await handleUserMessage(userId, event.message.text, event.timestamp);
          if (messages.length > 0 && lineClient) {
            await lineClient.replyMessage({
              replyToken: event.replyToken,
              messages: messages,
            });
          }
        }
      } else if (event.type === "follow") {
        const userId = event.source.userId;
        if (userId) {
          // Initialize conversation (but don't start the flow yet)
          await getOrCreateConversation(userId);
          // Send welcome message with feature introduction and Quick Reply menu
          // TODO: 未來可整合 Gemini API 來生成更個人化的歡迎訊息
          const messages = getWelcomeMessage();
          if (messages.length > 0 && lineClient) {
            await lineClient.replyMessage({
              replyToken: event.replyToken,
              messages: messages,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error processing event:", error);
    }
  }

  return NextResponse.json({ message: "OK" });
}


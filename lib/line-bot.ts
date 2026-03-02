import { messagingApi } from "@line/bot-sdk";

const { MessagingApiClient } = messagingApi;

// 只有在有 LINE 環境變數時才初始化 client
// 這樣可以讓後台功能在沒有 LINE Bot 設定的情況下也能正常運作
export const lineClient = process.env.LINE_CHANNEL_ACCESS_TOKEN
  ? new MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    })
  : null;


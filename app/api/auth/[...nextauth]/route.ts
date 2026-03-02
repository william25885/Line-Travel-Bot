import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// 驗證必要的環境變數
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error("❌ 錯誤: GOOGLE_CLIENT_ID 或 GOOGLE_CLIENT_SECRET 未設定");
  console.error("請確認 .env 檔案中包含以下變數:");
  console.error("  GOOGLE_CLIENT_ID=你的 Google Client ID");
  console.error("  GOOGLE_CLIENT_SECRET=你的 Google Client Secret");
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
  // 關閉 debug 模式，避免在 callback route 中輸出 console.log
  // 這些日誌可能會中斷 OAuth 流程，特別是在開發者工具開啟時
  debug: false,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };


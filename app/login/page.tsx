"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 頁面載入時重置錯誤狀態
    setError(null);

    // 檢查 URL 參數中的錯誤訊息
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");
      if (errorParam === "google") {
        setError("Google 登入失敗。請檢查環境變數設定（GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET）或 Google OAuth 配置（Redirect URI）。");
      } else if (errorParam) {
        setError(`登入錯誤: ${errorParam}`);
      }
    }
  }, []); // 只在組件掛載時執行一次

  const handleLogin = () => {
    // 在同步的 click 事件中立即調用 signIn，確保瀏覽器能識別這是用戶直接點擊
    // signIn 函數內部會處理跳轉，並且會確保 NextAuth 正確初始化
    // 不要使用 await，讓 signIn 在背景執行跳轉
    signIn("google", {
      callbackUrl: "/admin",
      redirect: true,
    });
    // 注意：這裡不使用 await，因為 signIn 會立即觸發跳轉
    // 如果跳轉成功，頁面會立即離開，後續代碼不會執行
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">LINE Travel Bot Admin</h1>
          <p className="text-gray-600 mt-2">請登入以管理旅遊推薦系統</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          onClick={handleLogin}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          使用 Google 帳號登入
        </button>
      </div>
    </div>
  );
}


import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              LINE Travel Bot
            </h1>
            <p className="text-xl text-gray-600">
              智能旅遊規劃助手
            </p>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              專案簡介
            </h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              LINE Travel Bot 是一個智能旅遊規劃助手，透過 LINE 對話介面收集使用者的旅遊偏好（目的地、天數、預算、主題、月份），並提供個人化的旅遊推薦。同時提供完整的後台管理系統，讓管理員可以查看對話紀錄、分析數據，並管理所有使用者的互動。
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  🤖 LINE Bot 功能
                </h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• 對話式資料收集</li>
                  <li>• 狀態管理與追蹤</li>
                  <li>• 智能推薦系統</li>
                  <li>• 完整對話紀錄</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  📊 後台管理系統
                </h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Google OAuth 登入</li>
                  <li>• 對話列表與詳情</li>
                  <li>• 搜尋與篩選功能</li>
                  <li>• 數據分析與統計</li>
                </ul>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex justify-center">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                進入後台管理
              </Link>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              技術堆疊
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-1">Next.js 16</div>
                <div className="text-sm text-gray-600">前端框架</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-1">PostgreSQL</div>
                <div className="text-sm text-gray-600">資料庫</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-1">Prisma</div>
                <div className="text-sm text-gray-600">ORM</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-1">NextAuth.js</div>
                <div className="text-sm text-gray-600">認證</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

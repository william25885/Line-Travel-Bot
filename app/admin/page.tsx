import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  // Fetch quick stats in parallel for better performance
  try {
    const [totalUsers, totalConversations, completedConversations, recentConversations] = await Promise.all([
      prisma.lineUser.count(),
      prisma.conversation.count(),
      prisma.conversation.count({
        where: { status: "READY" },
      }),
      prisma.conversation.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { preference: true },
      }),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">儀表板</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">總使用者數</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalUsers}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">總對話數</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalConversations}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">已完成規劃</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{completedConversations}</dd>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">最近活動</h3>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200">
            {recentConversations.map((conv) => (
              <li key={conv.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-blue-600 truncate">
                    {conv.lineUserId}
                  </div>
                  <div className="ml-2 flex-shrink-0 flex">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      conv.status === 'READY' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {conv.status}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      {conv.preference?.country ? `目的地: ${conv.preference.country}` : '尚未選擇目的地'}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <p>
                      更新於 {new Date(conv.updatedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
                    </p>
                  </div>
                </div>
              </li>
            ))}
            {recentConversations.length === 0 && (
              <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                尚無對話紀錄
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
  } catch (error) {
    console.error("載入儀表板資料時發生錯誤:", error);
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">儀表板</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">無法載入資料，請檢查資料庫連線。</p>
          <p className="text-red-600 text-sm mt-2">
            {error instanceof Error ? error.message : "未知錯誤"}
          </p>
        </div>
      </div>
    );
  }
}


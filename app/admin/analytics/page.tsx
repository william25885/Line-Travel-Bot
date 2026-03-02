import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  // 1. 統計熱門目的地
  // Prisma 不支援原生的 GROUP BY + COUNT 排序，所以我們先分組再在應用層排序，
  // 或者如果資料量大時應該用 raw query。這裡示範用 groupBy。
  const countryStats = await prisma.travelPreference.groupBy({
    by: ['country'],
    _count: {
      country: true,
    },
    where: {
      country: {
        not: null,
      },
    },
  });

  // 整理並排序
  const popularDestinations = countryStats
    .map(item => ({
      country: item.country || '未指定',
      count: item._count.country,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // 取前 5 名

  // 2. 統計對話狀態分佈
  const statusStats = await prisma.conversation.groupBy({
    by: ['status'],
    _count: {
      status: true,
    },
  });
  
  // 轉換狀態代碼為中文
  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      'READY': '已完成規劃',
      'ASK_COUNTRY': '詢問國家',
      'ASK_DAYS': '詢問天數',
      'ASK_BUDGET': '詢問預算',
      'ASK_THEMES': '詢問主題',
      'ASK_MONTH': '詢問月份',
    };
    return map[status] || status;
  };

  const conversationStatus = statusStats
    .map(item => ({
      status: item.status,
      label: getStatusLabel(item.status),
      count: item._count.status,
    }))
    .sort((a, b) => b.count - a.count);

  // 總對話數
  const totalConversations = statusStats.reduce((acc, curr) => acc + curr._count.status, 0);
  
  // 計算完成率
  const completedCount = statusStats.find(s => s.status === 'READY')?._count.status || 0;
  const completionRate = totalConversations > 0 
    ? Math.round((completedCount / totalConversations) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">數據分析</h1>
          <p className="mt-2 text-sm text-gray-700">
            目的地熱門程度與對話狀態統計。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* 關鍵指標卡片 */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-base font-normal text-gray-900">規劃完成率</dt>
            <dd className="mt-1 flex justify-between items-baseline md:block lg:flex">
              <div className="flex items-baseline text-2xl font-semibold text-blue-600">
                {completionRate}%
                <span className="ml-2 text-sm font-medium text-gray-500">
                  ({completedCount} / {totalConversations})
                </span>
              </div>
            </dd>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 熱門目的地 */}
        <div className="bg-white shadow rounded-lg p-8">
          <h3 className="text-lg font-medium text-gray-900 mb-6">熱門目的地 Top 5</h3>
          <div className="flow-root">
            <ul className="divide-y divide-gray-200">
              {popularDestinations.length > 0 ? (
                popularDestinations.map((dest, index) => (
                  <li key={dest.country} className="py-5 px-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-bold text-gray-900">
                          {index + 1}.
                        </span>
                        <p className="text-sm font-medium text-gray-900">
                          {dest.country}
                        </p>
                      </div>
                      <div className="inline-flex items-center text-base font-semibold text-gray-900">
                        {dest.count} 次
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li className="py-5 px-2 text-center text-gray-500">尚無數據</li>
              )}
            </ul>
          </div>
        </div>

        {/* 對話狀態分佈 */}
        <div className="bg-white shadow rounded-lg p-8">
          <h3 className="text-lg font-medium text-gray-900 mb-6">對話狀態分佈</h3>
          <div className="flow-root">
            <ul className="divide-y divide-gray-200">
              {conversationStatus.length > 0 ? (
                conversationStatus.map((status) => (
                  <li key={status.status} className="py-5 px-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{status.label}</span>
                      <span className="text-sm font-medium text-gray-900">{status.count} ({totalConversations > 0 ? Math.round((status.count / totalConversations) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          status.status === 'READY' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${totalConversations > 0 ? (status.count / totalConversations) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </li>
                ))
              ) : (
                <li className="py-5 px-2 text-center text-gray-500">尚無數據</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


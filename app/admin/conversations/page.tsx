import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ConversationFilters } from "./_components/ConversationFilters";
import { Prisma } from "@prisma/client";

export const dynamic = 'force-dynamic'; // 確保每次請求都重新抓取資料

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
}

export default async function ConversationsPage({ searchParams }: PageProps) {
  const { search, status } = await searchParams;

  // 建構查詢條件
  const where: Prisma.ConversationWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.lineUser = {
      OR: [
        { lineUserId: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  const conversations = await prisma.conversation.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      lineUser: true,
      preference: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">對話紀錄</h1>
          <p className="mt-2 text-sm text-gray-700">
            所有與 LINE Bot 的互動紀錄與旅遊規劃狀態。
          </p>
        </div>
      </div>

      <ConversationFilters />
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <Link href={`/admin/conversations/${conv.id}`} className="block hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-blue-600 truncate mr-4">
                        {conv.lineUserId}
                        {conv.lineUser?.displayName && (
                          <span className="text-gray-500 ml-2">({conv.lineUser.displayName})</span>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          conv.status === 'READY' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {conv.status}
                        </span>
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                       <p className="text-xs text-gray-500">
                        {new Date(conv.updatedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        {conv.preference?.country ? `目的地: ${conv.preference.country}` : '尚未選擇目的地'}
                        {conv.preference?.themes && <span className="ml-2 text-gray-400">| {conv.preference.themes}</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
          {conversations.length === 0 && (
            <li className="px-4 py-10 text-center text-gray-500">
              {search || status ? '沒有符合搜尋條件的對話紀錄' : '目前沒有任何對話紀錄'}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}


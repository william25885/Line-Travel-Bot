import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConversationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      lineUser: true,
      preference: true,
      messages: {
        orderBy: { createdAt: "asc" },
      },
      recommendations: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!conversation) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            對話詳情
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            User ID: {conversation.lineUserId}
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <Link
            href="/admin/conversations"
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            返回列表
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Info & Preferences */}
        <div className="space-y-6 lg:col-span-1">
          {/* Status Card */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900">狀態資訊</h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>目前狀態: <span className="font-medium text-gray-900">{conversation.status}</span></p>
                <p>建立時間: {new Date(conversation.createdAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
                <p>最後更新: {new Date(conversation.updatedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
              </div>
            </div>
          </div>

          {/* Preferences Card */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900">旅遊偏好</h3>
              {conversation.preference ? (
                <dl className="mt-4 divide-y divide-gray-100">
                  <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">國家</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{conversation.preference.country || '-'}</dd>
                  </div>
                  <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">天數</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{conversation.preference.days || '-'}</dd>
                  </div>
                  <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">預算</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{conversation.preference.budget || '-'}</dd>
                  </div>
                  <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">主題</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{conversation.preference.themes || '-'}</dd>
                  </div>
                  <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">月份</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{conversation.preference.month || '-'}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-2 text-sm text-gray-500">尚無偏好資料</p>
              )}
            </div>
          </div>

          {/* Recommendations Card */}
          {conversation.recommendations.length > 0 && (
             <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-base font-semibold leading-6 text-gray-900">推薦結果</h3>
                <div className="mt-4 text-sm text-gray-500 space-y-4 overflow-x-auto">
                  {conversation.recommendations.map(rec => (
                    <div key={rec.id} className="border-l-4 border-green-400 pl-4">
                      <p className="whitespace-pre-wrap break-words min-w-0">{rec.content}</p>
                      <p className="mt-1 text-xs text-gray-400">{new Date(rec.createdAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Chat History */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow sm:rounded-lg h-[800px] flex flex-col">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-base font-semibold leading-6 text-gray-900">對話紀錄</h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
              {conversation.messages.length > 0 ? (
                conversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-2 shadow-sm break-words ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-10">尚無訊息紀錄</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


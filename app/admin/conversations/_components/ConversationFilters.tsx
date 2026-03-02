"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function ConversationFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");

  const applyFilters = (nextSearch: string, nextStatus: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (nextSearch) {
        params.set("search", nextSearch);
      } else {
        params.delete("search");
      }

      if (nextStatus) {
        params.set("status", nextStatus);
      } else {
        params.delete("status");
      }

      params.delete("page");

      router.push(`/admin/conversations?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(search, status);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    applyFilters(search, newStatus);
  };

  return (
    <div className="bg-white p-8 shadow-sm rounded-lg border border-gray-200 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="md:col-span-5">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-4">
            搜尋使用者
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              name="search"
              id="search"
              className="block w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors sm:text-sm"
              placeholder="輸入 User ID 或顯示名稱..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </form>

        {/* Status Select */}
        <div className="md:col-span-4">
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-4">
            狀態篩選
          </label>
          <div className="relative">
            <select
              id="status"
              name="status"
              className="block w-full py-2.5 pl-4 pr-10 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors sm:text-sm cursor-pointer appearance-none"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isPending}
            >
              <option value="">全部狀態</option>
              <option value="READY">已完成 (READY)</option>
              <option value="ASK_COUNTRY">詢問國家</option>
              <option value="ASK_DAYS">詢問天數</option>
              <option value="ASK_BUDGET">詢問預算</option>
              <option value="ASK_THEMES">詢問主題</option>
              <option value="ASK_MONTH">詢問月份</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Search Button */}
        <div className="md:col-span-3">
          <button
            type="button"
            onClick={() => applyFilters(search, status)}
            disabled={isPending}
            className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                搜尋中
              </>
            ) : "搜尋"}
          </button>
        </div>
      </div>
    </div>
  );
}

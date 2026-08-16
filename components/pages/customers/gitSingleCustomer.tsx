import { formatPhoneForDisplay } from "@/lib/utils";
import { Phone } from "lucide-react";
import React from "react";
import ViewOrderCustomer from "./viewOrder";

export default function GetCustomerSingle({ data, getdatas }: { data: any, getdatas: any }) {
  const [activeTab, setActiveTab] = React.useState<"details" | "orders">("details");

  React.useEffect(() => {
    setActiveTab("details");
  }, [data?.id]);

  return (
    <div className="text-slate-800 dark:text-slate-50">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
        <div className="w-full flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
            {data.name?.charAt(0) || "U"}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{data.name}</h3>
            <div className="border border-slate-500 mt-2 mb-4"></div>
            <p className="text-xs text-slate-500">تم الانشاء في: {new Date(data.createdAt).toLocaleDateString('ar-EG')}</p>
          </div>
        </div>
      </div>

      <div className="px-6 pt-5">
        <div className="inline-flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800">
          {[
            { id: "details", label: "بيانات العميل" },
            { id: "orders", label: `طلبات العميل (${Array.isArray(data?.orders) ? data.orders.length : 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as "details" | "orders")}
              className={`rounded-xl px-4 py-2 text-sm font-black transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {activeTab === "details" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <Phone size={18} className="text-blue-500" />
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">الهاتف</p>
                <p className="text-sm font-bold dark:text-white">
                  <span dir="ltr" className="inline-block text-left">
                    {(Array.isArray(data.phone) ? data.phone : []).map((phone: string) => formatPhoneForDisplay(phone)).join(" - ")}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <ViewOrderCustomer orders={Array.isArray(data?.orders) ? data.orders : []} />
          </div>
        )}
      </div>
    </div>
  )
}

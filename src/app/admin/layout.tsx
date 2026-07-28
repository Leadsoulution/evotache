import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminTabs } from "@/components/admin/AdminTabs";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="mx-auto flex w-full max-w-[95%] flex-col gap-4 px-4 pt-6 sm:px-6 lg:px-8">
        <AdminTabs />
      </div>
      {children}
    </AdminGuard>
  );
}

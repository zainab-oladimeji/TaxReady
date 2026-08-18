import { DataProvider } from "@/components/providers/data-provider";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <div className="flex min-h-screen bg-paper">
        <Sidebar />
        <div className="flex-1">{children}</div>
      </div>
    </DataProvider>
  );
}

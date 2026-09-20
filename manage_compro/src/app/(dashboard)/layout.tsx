import { Sidebar } from "../../components/layout/sidebar";
import { Topbar } from "../../components/layout/topbar";
export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <div className="admin-shell"><Sidebar /><div className="admin-main"><Topbar /><div className="admin-content">{children}</div></div></div>; }

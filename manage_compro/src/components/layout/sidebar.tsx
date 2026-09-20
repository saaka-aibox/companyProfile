import Link from "next/link";
export function Sidebar() { return <aside className="sidebar"><h1>AIBOX Manager</h1><nav><Link href="/pages">Pages</Link><Link href="/navigation">Navigation</Link><Link href="/media">Media</Link><Link href="/settings">Settings</Link><Link href="/settings/allowed-ips">Access Control</Link></nav></aside>; }

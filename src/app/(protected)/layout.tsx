// Import components
import { Sidebar } from "@/components/sidebar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", height: "100dvh", width: "100dvw" }}>
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}

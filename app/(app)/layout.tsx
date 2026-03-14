import { AppLayout } from "@/components/layout/app-layout";
import { AssistantProvider } from "@/context/assistant-context";

export default function AppRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AssistantProvider>
      <AppLayout>{children}</AppLayout>
    </AssistantProvider>
  );
}

import { AppLayout } from "@/components/layout/app-layout";
import { AssistantProvider } from "@/context/assistant-context";
import { LanguageProvider } from "@/context/language-context";

export default function AppRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <AssistantProvider>
        <AppLayout>{children}</AppLayout>
      </AssistantProvider>
    </LanguageProvider>
  );
}

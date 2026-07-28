import { ContentTabs } from "@/components/socialmedia/content/ContentTabs";

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[95%] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <ContentTabs />
      {children}
    </div>
  );
}

import { SocialTabs } from "@/components/socialmedia/SocialTabs";

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto flex w-full max-w-[95%] flex-col gap-4 px-4 pt-6 sm:px-6 lg:px-8">
        <SocialTabs />
      </div>
      {children}
    </>
  );
}

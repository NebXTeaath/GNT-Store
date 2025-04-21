// src/pages/Profile/components/ProfileIndex.tsx
import { useIsMobile } from "@/components/global/Mobile/use-mobile.tsx";
import { DesktopModalProfileView } from "./DesktopModalProfileView";
import { MobileDrawerProfileView } from "./MobileDrawerProfileView";

interface ProfileViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileIndex({ open, onOpenChange }: ProfileViewProps) {
  const isMobile = useIsMobile();

  return isMobile ? (
    <MobileDrawerProfileView open={open} onOpenChange={onOpenChange} />
  ) : (
    <DesktopModalProfileView open={open} onOpenChange={onOpenChange} />
  );
}

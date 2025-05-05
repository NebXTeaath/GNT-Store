//src\components\global\layout.tsx
import { Outlet } from "react-router-dom";
import Header from "@/components/global/desktop/header";
import { MobileNavigation } from "@/components/global/Mobile/mobile-navigation";
import { useState } from "react";
import { SearchDrawer } from "@/components/global/Mobile/search-drawer";
import Footer from "@/components/global/Footer";

export function GlobalLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  
  return (
    <div className="flex min-h-screen flex-col bg-[#0f1115] text-white">
      <Header />
      <main className="flex-grow pb-16 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileNavigation />
      <SearchDrawer open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

export default GlobalLayout;

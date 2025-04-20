// src/components/providers/AuthenticatedProviders.tsx
import React from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { UserProfileProvider } from "../../context/UserProfileContext"; // Adjust path if needed
import { WishlistProvider } from "../../context/WishlistContext"; // Adjust path if needed
import { AuthAwareDiscountProvider } from "../../context/AuthAwareDiscountProvider"; // Adjust path if needed
import { CartProvider } from "../../context/CartContext"; // Adjust path if needed
import GlobalLayout from "../global/layout"; // Adjust path if needed
import AuthGuard from '../../context/AuthGuard'; // <-- Ensure this path is correct

// Import your page components (ensure paths are correct)
import NotFound from "../../pages/NotFound";
import GNTStore from "../../pages/HomePage/GNTStore";
import RepairServices from "../../pages/repairPage/index";
import TrackRepairHistory from "@/pages/repairPage/history/TrackRepairHistory";
import Support from "../../pages/support";
import ProductDetails from "../../pages/ProductDetails/ProductDetails";
import CartDetails from "../../pages/order/checkout/cart-details";
import OrderSummary from "../../pages/order/checkout/order-summary";
import OrderHistory from "../../pages/order/orderHistory/order-history";
import SearchPage from "../../pages/searchPage/searchPage";
import ProductsPage from "../../pages/productsPage/productsListPage";
import WishlistPage from "../../pages/Wishlist/WishlistPage";
import ResetPassword from "../../context/ResetPassword";
import ProfileRouteHandler from "@/pages/Profile/ProfileRouteHandler";
import NewRequestWrapper from "@/pages/repairPage/NewRequestWrapper";

const AuthenticatedProviders: React.FC = () => {
  return (
    <UserProfileProvider>
      <WishlistProvider>
        <AuthAwareDiscountProvider>
          <CartProvider>
            <Routes>
              {/* --- Public Routes --- */}
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* Add other public routes here */}

              {/* --- Protected Routes --- */}
              <Route element={<AuthGuard />}>
                 <Route path="/" element={<GlobalLayout />}>
                    <Route index element={<GNTStore />} />
                    <Route path="repair-home/*" element={<RepairServices />} />
                    <Route path="repair/new-request" element={<NewRequestWrapper />} />
                    <Route path="repair/history" element={<TrackRepairHistory />} />
                    <Route path="wishlist" element={<WishlistPage />} />
                    <Route path="support" element={<Support />} />
                    <Route path="product/details/:id" element={<ProductDetails />} />
                    <Route path="product/:slug" element={<ProductDetails />} />
                    <Route path="checkout/cart-details" element={<CartDetails />} />
                    <Route path="checkout/order-summary" element={<OrderSummary />} />
                    <Route path="order-history" element={<OrderHistory />} />
                    <Route path="profile" element={<ProfileRouteHandler />} />
                    <Route path="search" element={<SearchPage />} />
                    <Route path=":category" element={<ProductsPage />} />
                    <Route path=":category/:subcategory" element={<ProductsPage />} />
                 </Route>
               </Route>

              {/* --- Catch-all 404 Route --- */}
              <Route path="*" element={<NotFound />} />

             </Routes>
          </CartProvider>
        </AuthAwareDiscountProvider>
      </WishlistProvider>
    </UserProfileProvider>
  );
};

export default AuthenticatedProviders;
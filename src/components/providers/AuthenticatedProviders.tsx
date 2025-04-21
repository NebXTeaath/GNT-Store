// src/components/providers/AuthenticatedProviders.tsx
import React from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { UserProfileProvider } from "../../context/UserProfileContext"; // Adjust path if needed
import { WishlistProvider } from "../../context/WishlistContext"; // Adjust path if needed
import { AuthAwareDiscountProvider } from "../../context/AuthAwareDiscountProvider"; // Adjust path if needed
import { CartProvider } from "../../context/CartContext"; // Adjust path if needed
import GlobalLayout from "../global/layout"; // Adjust path if needed
// REMOVED: import AuthGuard from '../../context/AuthGuard';

// Import your page components (ensure paths are correct)
import NotFound from "../../pages/not-found";
import GNTStore from "../../pages/HomePage/HomePage";
import RepairServices from "../../pages/repairPage/index";
import TrackRepairHistory from "@/pages/repairPage/history/repairHistory";
import Support from "../../pages/support";
import ProductDetails from "../../pages/ProductDetails/ProductDetails";
import CartDetails from "../../pages/order/checkout/cartDetails";
import OrderSummary from "../../pages/order/checkout/orderSummary";
import OrderHistory from "../../pages/order/orderHistory/orderHistory";
import SearchPage from "@/components/pages/searchPage/searchPage";
import ProductsPage from "@/components/global/productsPage/productsListPage";
import WishlistPage from "../../pages/Wishlist/WishlistPage";
import ResetPassword from "../../context/ResetPassword";
import ProfileRouteHandler from "@/components/global/Profile/ProfileRouteHandler";
import NewRequestWrapper from "@/components/pages/repairPage/NewRequestWrapper";

const AuthenticatedProviders: React.FC = () => {
  return (
    // Context Providers wrap everything
    <UserProfileProvider>
      <WishlistProvider>
        <AuthAwareDiscountProvider>
          <CartProvider>
            <Routes>
              {/* Public route handled separately */}
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* All other routes use GlobalLayout */}
              <Route path="/" element={<GlobalLayout />}>
                {/* Publicly viewable routes */}
                <Route index element={<GNTStore />} />
                <Route path="support" element={<Support />} />
                <Route path="product/details/:id" element={<ProductDetails />} />
                <Route path="product/:slug" element={<ProductDetails />} />
                <Route path="search" element={<SearchPage />} />
                <Route path=":category" element={<ProductsPage />} />
                <Route path=":category/:subcategory" element={<ProductsPage />} />

                {/* Routes requiring authentication (will check internally) */}
                <Route path="repair-home/*" element={<RepairServices />} /> {/* Parent might be public, sub-routes check */}
                <Route path="repair/new-request" element={<NewRequestWrapper />} />
                <Route path="repair/history" element={<TrackRepairHistory />} />
                <Route path="wishlist" element={<WishlistPage />} />
                <Route path="checkout/cart-details" element={<CartDetails />} />
                <Route path="checkout/order-summary" element={<OrderSummary />} />
                <Route path="order-history" element={<OrderHistory />} />
                <Route path="profile" element={<ProfileRouteHandler />} /> {/* This component handles its own logic */}

                {/* Catch-all 404 - Rendered within GlobalLayout */}
                <Route path="*" element={<NotFound />} />
              </Route>

            </Routes>
          </CartProvider>
        </AuthAwareDiscountProvider>
      </WishlistProvider>
    </UserProfileProvider>
  );
};

export default AuthenticatedProviders;
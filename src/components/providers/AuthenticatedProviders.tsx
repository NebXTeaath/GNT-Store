// src/components/providers/AuthenticatedProviders.tsx
import React from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { UserProfileProvider } from "../../context/UserProfileContext";
import { WishlistProvider } from "../../context/WishlistContext";
import { AuthAwareDiscountProvider } from "../../context/AuthAwareDiscountProvider";
import { CartProvider } from "../../context/CartContext";
import GlobalLayout from "../global/layout";
// Import your pages
import NotFound from "../../pages/NotFound";
import GNTStore from "../../pages/HomePage/GNTStore";
import RepairServices from "../../pages/repairPage/index";
import TrackRepairHistory from "@/pages/repairPage/history/TrackRepairHistory.tsx";
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
import LoadingRouteListener from "@/components/global/Loading/LoadingRouteListener";

const AuthenticatedProviders: React.FC = () => {
  return (
    <UserProfileProvider>
      <WishlistProvider>
        <AuthAwareDiscountProvider>
          <CartProvider>
            <Routes>
            
              <Route path="*" element={<NotFound />} />
              <Route path="/" element={<GlobalLayout />}>
                <Route path="repair-home/*" element={<RepairServices />} />
                <Route path="repair/new-request" element={<NewRequestWrapper />} />
                <Route path="/repair/history" element={<TrackRepairHistory />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/:category" element={<ProductsPage />} />
                <Route path="/:category/:subcategory" element={<ProductsPage />} />
                <Route index element={<GNTStore />} />
                <Route path="support" element={<Support />} />
                {/* Keep the original product/details/:id route for backward compatibility */}
                <Route path="product/details/:id" element={<ProductDetails />} />
                {/* Add the new SEO-friendly slug-based route */}
                <Route path="product/:slug" element={<ProductDetails />} />
                <Route path="checkout/cart-details" element={<CartDetails />} />
                <Route path="checkout/order-summary" element={<OrderSummary />} />
                <Route path="order-history" element={<OrderHistory />} />
                <Route path="/profile" element={<ProfileRouteHandler />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Route>
            </Routes>
          </CartProvider>
        </AuthAwareDiscountProvider>
      </WishlistProvider>
    </UserProfileProvider>
  );
};

export default AuthenticatedProviders;
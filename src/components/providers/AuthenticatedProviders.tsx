// src/components/providers/AuthenticatedProviders.tsx
import React from 'react';
import { Routes, Route } from "react-router-dom";
import { UserProfileProvider } from "../../context/UserProfileContext";
import { WishlistProvider } from "../../context/WishlistContext";
import { AuthAwareDiscountProvider } from "../../context/AuthAwareDiscountProvider";
import { CartProvider } from "../../context/CartContext";
import GlobalLayout from "../global/layout";
import NotFound from "../../pages/not-found";
import GNTStore from "../../pages/HomePage/HomePage";
import RepairServices from "../../pages/repairPage/index";
import TrackRepairHistory from "@/pages/repairPage/history/repairHistory";
import Support from "../../pages/support";
import ProductDetails from "@/pages/ProductDetails/ProductDetails";
import CartDetails from "../../pages/order/checkout/cartDetails";
import OrderSummary from "../../pages/order/checkout/orderSummary";
import OrderHistory from "../../pages/order/orderHistory/orderHistory";
import SearchPage from "@/components/pages/searchPage/searchPage";
import ProductsPage from "@/components/global/productsPage/productsListPage";
import WishlistPage from "@/pages/Wishlist/WishlistPage";
import ResetPassword from "../../context/ResetPassword";
import ProfileRouteHandler from "@/components/global/Profile/ProfileRouteHandler";
import NewRequestWrapper from "@/components/pages/repairPage/NewRequestWrapper";
// Removed WriteReviewPage import as it's not directly routed, OrderReviewPage is
import OrderReviewPage from '@/pages/reviews/OrderReviewPage'; // Import the new OrderReviewPage

const AuthenticatedProviders: React.FC = () => {
  return (
    <UserProfileProvider>
      <WishlistProvider>
        <AuthAwareDiscountProvider>
          <CartProvider>
            <Routes>
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<GlobalLayout />}>
                <Route index element={<GNTStore />} />
                <Route path="support" element={<Support />} />
                <Route path="product/details/:id" element={<ProductDetails />} />
                <Route path="product/:slug" element={<ProductDetails />} />
                <Route path="search" element={<SearchPage />} />
                <Route path=":category" element={<ProductsPage />} />
                <Route path=":category/:subcategory" element={<ProductsPage />} />
                <Route path="repair-home/*" element={<RepairServices />} />
                <Route path="repair/new-request" element={<NewRequestWrapper />} />
                <Route path="repair/history" element={<TrackRepairHistory />} />
                <Route path="wishlist" element={<WishlistPage />} />
                <Route path="checkout/cart-details" element={<CartDetails />} />
                <Route path="checkout/order-summary" element={<OrderSummary />} />
                <Route path="order-history" element={<OrderHistory />} />
                <Route path="profile" element={<ProfileRouteHandler />} />
                {/* Updated Review Route */}
                <Route path="review/order/:orderId" element={<OrderReviewPage />} />
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
// --- File: /src/components/providers/AuthenticatedProviders.tsx ---
import React from 'react';
import { Routes, Route } from "react-router-dom"; // Removed Navigate
import { UserProfileProvider } from "../../context/UserProfileContext"; // Ensure path is correct
import { WishlistProvider } from "../../context/WishlistContext";
import { AuthAwareDiscountProvider } from "../../context/AuthAwareDiscountProvider";
import { CartProvider } from "../../context/CartContext";
import GlobalLayout from "../global/layout";
import AuthGuard from '../../context/AuthGuard'; // Import the guard

// Import page components
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
    // Context Providers wrap everything
    <UserProfileProvider>
      <WishlistProvider>
        <AuthAwareDiscountProvider>
          <CartProvider>
            <Routes>
              {/* --- Main Layout Routes --- */}
              <Route path="/" element={<GlobalLayout />}>

                {/* --- Publicly Viewable Routes --- */}
                <Route index element={<GNTStore />} />
                <Route path="support" element={<Support />} />
                <Route path="product/details/:id" element={<ProductDetails />} /> {/* Legacy ID route */}
                <Route path="product/:slug" element={<ProductDetails />} /> {/* Preferred Slug route */}
                <Route path="search" element={<SearchPage />} />
                {/* Category/Subcategory listing pages */}
                <Route path=":category" element={<ProductsPage />} />
                <Route path=":category/:subcategory" element={<ProductsPage />} />

                {/* --- Authentication Related Routes --- */}
                {/* Reset Password - Can be accessed publicly OR during recovery flow.
                    AuthGuard will redirect *away* if fully authenticated */}
                <Route path="reset-password" element={<ResetPassword />} />

                {/* --- Protected Routes (Require Full Authentication) --- */}
                {/* Wrap these routes with the AuthGuard */}
                <Route element={<AuthGuard />}>
                   <Route path="repair-home" element={<RepairServices />} /> {/* Entry point for repair */}
                   <Route path="repair/new-request" element={<NewRequestWrapper />} />
                   <Route path="repair/history" element={<TrackRepairHistory />} />
                   <Route path="wishlist" element={<WishlistPage />} />
                   <Route path="checkout/cart-details" element={<CartDetails />} />
                   <Route path="checkout/order-summary" element={<OrderSummary />} />
                   <Route path="order-history" element={<OrderHistory />} />
                   {/* ProfileRouteHandler opens the profile modal/drawer */}
                   {/* It needs full auth to be reached, ensured by AuthGuard */}
                   <Route path="profile" element={<ProfileRouteHandler />} />
                </Route>

                {/* --- Catch-all 404 --- */}
                {/* Rendered within GlobalLayout */}
                <Route path="*" element={<NotFound />} />

              </Route> {/* End of GlobalLayout routes */}

            </Routes>
          </CartProvider>
        </AuthAwareDiscountProvider>
      </WishlistProvider>
    </UserProfileProvider>
  );
};

export default AuthenticatedProviders;
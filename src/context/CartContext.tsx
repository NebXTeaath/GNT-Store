// src\context\CartContext.tsx
import React, { createContext, useContext, ReactNode, useMemo } from 'react'; // Removed useEffect import
import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { databases, APPWRITE_DATABASE_ID } from "@/lib/appwrite";
import { ID, Query, Models } from "appwrite"; // Import Models
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from './AuthContext';
import { useDiscount } from './DiscountContext';

// Interfaces
export interface CartItemBasic {
  id: string; // product UUID
  quantity: number;
}

export interface CartItem {
  id: string; // product UUID
  title: string;
  price: number;
  discount_price: number;
  quantity: number;
  image: string;
  slug: string;
}

interface ProductDetail {
  cart_product_id: string;
  cart_slug: string;
  cart_product_name: string;
  cart_price: string | number;
  cart_discount_price: string | number;
  cart_primary_image?: string;
}

// Appwrite Cart Document Type (extending Models.Document)
interface AppwriteCartDoc extends Models.Document {
  userId: string;
  productDetails: string; // JSON string of CartItemBasic[]
  productUUID: string; // Comma-separated string of product IDs
  creationDate: string; // Or your relevant date field
}


interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity: number) => boolean;
  updateQuantity: (id: string, quantity: number) => boolean;
  removeItem: (id: string) => boolean;
  clearCart: () => boolean;
  cartTotal: number;
  cartSubtotal: number;
  cartDiscountAmount: number;
  isLoading: boolean; // Combined loading state
  isAuthenticated: boolean; // From AuthContext
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// --- Helper Function to Fetch Full Cart Data ---
async function fetchFullCartData(userId: string | null): Promise<{ items: CartItem[], cartDocId: string | null }> {
  if (!userId) return { items: [], cartDocId: null };
  console.log(`[CartContext] Fetching full cart for user: ${userId}`);
  try {
    let basicItems: CartItemBasic[] = [];
    let cartDocId: string | null = null;

    // Apply generic type constraint satisfying Models.Document
    const { documents } = await databases.listDocuments<AppwriteCartDoc>(
      APPWRITE_DATABASE_ID,
      'cart',
      [Query.equal('userId', userId), Query.limit(1)]
    );

    if (documents.length > 0) {
      const userCart = documents[0];
      cartDocId = userCart.$id;
      if (userCart.productDetails) {
        try {
          basicItems = JSON.parse(userCart.productDetails) as CartItemBasic[];
        } catch (e) {
          console.error('Failed to parse cart productDetails from Appwrite:', e);
          return { items: [], cartDocId }; // Return empty on parse error
        }
      }
    }

    if (basicItems.length === 0) {
      return { items: [], cartDocId };
    }

    const productIds = basicItems.map(item => item.id);
    const { data: productDetails, error: supabaseError } = await supabase.rpc('get_cart_product_info', {
      product_uuids: productIds
    });

    if (supabaseError) {
      console.error('Error fetching product details from Supabase:', supabaseError);
      toast.error("Failed to fetch cart product details", { id: "fetch-cart-details-error" });
      return { items: [], cartDocId };
    }

    // Add explicit type ': ProductDetail' to map parameter
    const fullCartItems = (productDetails || []).map((product: ProductDetail) => {
      const basicItem = basicItems.find(item => item.id === product.cart_product_id);
      const quantity = basicItem ? basicItem.quantity : 0;
      return {
        id: product.cart_product_id,
        title: product.cart_product_name,
        price: parseFloat(typeof product.cart_price === 'string' ? product.cart_price : product.cart_price.toString()),
        discount_price: parseFloat(typeof product.cart_discount_price === 'string' ? product.cart_discount_price : product.cart_discount_price.toString()),
        quantity,
        image: product.cart_primary_image || "/placeholder.svg",
        slug: product.cart_slug || ''
      };
    }).filter((item: { quantity: number; }) => item.quantity > 0); // Ensure quantity is positive

    return { items: fullCartItems, cartDocId };

  } catch (error) {
    console.error('Error fetching full cart data:', error);
    toast.error("Failed to load your cart", { id: "load-cart-error" });
    return { items: [], cartDocId: null };
  }
}

// --- Helper function to save cart data to Appwrite ---
async function saveCartToAppwrite(userId: string, cartDocId: string | null, items: CartItemBasic[]): Promise<string | null> {
  const productDetails = JSON.stringify(items);
  const productUUIDs = items.map(item => item.id).join(',');
  const currentISODate = new Date().toISOString();

  try {
    if (items.length > 0) {
      if (cartDocId) {
        // Update existing cart document
        await databases.updateDocument(
          APPWRITE_DATABASE_ID, 'cart', cartDocId,
          { productUUID: productUUIDs, productDetails, creationDate: currentISODate } // Ensure fields match your collection
        );
        return cartDocId;
      } else {
        // Create new cart document - apply type constraint
        const newCart = await databases.createDocument<AppwriteCartDoc>(
          APPWRITE_DATABASE_ID, 'cart', ID.unique(),
          { userId, productUUID: productUUIDs, productDetails, creationDate: currentISODate }
        );
        return newCart.$id;
      }
    } else {
      // Items are empty, delete the cart document if it exists
      if (cartDocId) {
        await databases.deleteDocument(APPWRITE_DATABASE_ID, 'cart', cartDocId);
      }
      return null; // Cart is now deleted or never existed
    }
  } catch (error) {
      console.error('Failed to save cart to Appwrite:', error);
      // throw new Error('Failed to save cart to database.'); // Throw error for mutation handler
      return null; // Return null on error
  }
}


interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.$id || null;
  const queryClient = useQueryClient();
  const { discountRate } = useDiscount();

  const cartQueryKey = useMemo(() => ['cart', userId], [userId]); // Memoize query key

  const {
    data: cartData, // Data is now { items: CartItem[], cartDocId: string | null }
    isLoading: isCartLoading,
    // isError, // Can be used if needed
    // refetch, // Can be used if needed
  } = useQuery<{ items: CartItem[], cartDocId: string | null }, Error>({
    queryKey: cartQueryKey,
    queryFn: () => fetchFullCartData(userId),
    enabled: !!userId && isAuthenticated, // Run only when logged in
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15,   // 15 minutes
    // Use placeholderData (TanStack Query v5+) to keep showing old data while refetching
    placeholderData: (previousData) => previousData ?? { items: [], cartDocId: null },
  });

  // Safely access query data, defaults handled by placeholderData
  const cartItems = cartData?.items ?? [];
  const cartDocId = cartData?.cartDocId ?? null;

  // Derived cart count with explicit types
  const cartCount = useMemo(() => cartItems.reduce((acc: number, item: CartItem) => acc + item.quantity, 0), [cartItems]);

  // --- Mutations for Cart Actions ---

  const { mutate: saveCartMutation } = useMutation<string | null, Error, CartItemBasic[]>({
      mutationFn: (newBasicItems) => {
          if (!userId) throw new Error("User not logged in");
          // saveCartToAppwrite now throws on failure, mutation handles it
          return saveCartToAppwrite(userId, cartDocId, newBasicItems);
      },
      // Type oldData parameter and remove unused 'variables'
      onSuccess: (newCartDocId /*, variables */) => {
          // Update the query data with the new cartDocId; rely on invalidation for items
          queryClient.setQueryData(cartQueryKey, (oldData: { items: CartItem[], cartDocId: string | null } | undefined) => {
              return { items: oldData?.items ?? [], cartDocId: newCartDocId };
          });
          // Invalidate to refetch the full accurate cart state
          queryClient.invalidateQueries({ queryKey: cartQueryKey });
          console.log("Cart saved successfully, new cartDocId:", newCartDocId);
      },
      onError: (error) => {
          console.error("Save cart error:", error);
          // Use error message from thrown error if available
          toast.error(error.message || "Failed to update cart on the server.", { id: "save-cart-error" });
          // Optional: Invalidate to ensure UI reflects actual server state after failure
          queryClient.invalidateQueries({ queryKey: cartQueryKey });
      }
  });


  // Action functions

  const addToCart = (item: Omit<CartItem, 'quantity'>, quantity: number): boolean => {
    if (!isAuthenticated || !userId) {
      toast.error("Please log in", { id: "auth-required-toast", description: "You need to log in to add items to your cart." });
      return false;
    }

    // Add type ': CartItem'
    const currentBasicItems = cartItems.map((ci: CartItem) => ({ id: ci.id, quantity: ci.quantity }));
    // Add type ': CartItemBasic'
    const existingItemIndex = currentBasicItems.findIndex((cartItem: CartItemBasic) => cartItem.id === item.id);
    let newBasicItems: CartItemBasic[];
    let successMessage = "Item added to cart";
    let toastId = "cart-add-toast";

    if (quantity > 99) { quantity = 99; toast.error("Maximum quantity is 99", { id: "max-quantity-toast" });}
    if (quantity < 1) { quantity = 1; toast.error("Minimum quantity is 1", { id: "min-quantity-toast" }); }

    if (existingItemIndex !== -1) {
      newBasicItems = [...currentBasicItems];
      newBasicItems[existingItemIndex].quantity = quantity;
      successMessage = "Cart updated";
      toastId = "cart-update-toast";
    } else {
        if (currentBasicItems.length >= 20) {
             toast.error("Cart is full! Maximum 20 unique items allowed.", { id: "cart-full-toast" });
             return false;
        }
      newBasicItems = [...currentBasicItems, { id: item.id, quantity }];
    }
    saveCartMutation(newBasicItems, {
        onSuccess: () => toast.success(successMessage, { id: toastId })
    });
    return true;
  };

  const updateQuantity = (id: string, quantity: number): boolean => {
    if (!isAuthenticated || !userId) {
      toast.error("Please log in", { id: "auth-required-toast", description: "You need to log in to update cart items." });
      return false;
    }
     if (quantity < 1) return removeItem(id); // Treat as removal
     if (quantity > 99) { quantity = 99; toast.error("Maximum quantity is 99", { id: "max-quantity-toast" }); }


    // Add type ': CartItem'
    const currentBasicItems = cartItems.map((ci: CartItem) => ({ id: ci.id, quantity: ci.quantity }));
    // Add type ': CartItemBasic'
    const itemIndex = currentBasicItems.findIndex((item: CartItemBasic) => item.id === id);

    if (itemIndex === -1) return false;

    const newBasicItems = [...currentBasicItems];
    newBasicItems[itemIndex].quantity = quantity;
    saveCartMutation(newBasicItems, {
        onSuccess: () => toast.success("Quantity updated", { id: "update-quantity-toast" })
    });
    return true;
  };

  const removeItem = (id: string): boolean => {
    if (!isAuthenticated || !userId) {
      toast.error("Please log in", { id: "auth-required-toast", description: "You need to log in to remove cart items." });
      return false;
    }

    // Add type ': CartItem'
    const currentBasicItems = cartItems.map((ci: CartItem) => ({ id: ci.id, quantity: ci.quantity }));
    // Add type ': CartItemBasic'
    const newBasicItems = currentBasicItems.filter((item: CartItemBasic) => item.id !== id);

    if (newBasicItems.length !== currentBasicItems.length) {
        saveCartMutation(newBasicItems, {
             onSuccess: () => toast.success("Item removed from cart", { id: "remove-item-toast" })
        });
    }
    return true;
  };

  const clearCart = (): boolean => {
    if (!isAuthenticated || !userId) {
      toast.error("Please log in", { id: "auth-required-toast", description: "You need to log in to clear your cart." });
      return false;
    }
    if (cartItems.length > 0) {
        saveCartMutation([], { // Pass empty array to clear
            onSuccess: () => toast.success("Cart cleared", { id: "clear-cart-toast" })
        });
    }
    return true;
  };


  // Calculate totals with explicit types
  const cartSubtotal = useMemo(() =>
      cartItems.reduce((total: number, item: CartItem) => total + item.discount_price * item.quantity, 0),
    [cartItems]
  );
  const cartDiscountAmount = useMemo(() => cartSubtotal * discountRate, [cartSubtotal, discountRate]);
  const cartTotal = useMemo(() => cartSubtotal - cartDiscountAmount, [cartSubtotal, cartDiscountAmount]);

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      updateQuantity,
      removeItem,
      clearCart,
      cartTotal,
      cartSubtotal,
      cartDiscountAmount,
      isLoading: isCartLoading, // Loading state from useQuery
      isAuthenticated, // Directly from useAuth
      cartCount // Derived from cartItems
    }}>
      {children}
    </CartContext.Provider>
  );
};
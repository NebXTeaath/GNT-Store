// src/context/CartContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import debounce from 'lodash.debounce';
import { client, databases, APPWRITE_DATABASE_ID } from "@/lib/appwrite";
import { Account, ID, Query } from "appwrite";
import { toast } from "sonner";
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/lib/supabase";
import { useDiscount } from './DiscountContext';

// CartItem represents the minimum data stored in Appwrite
export interface CartItemBasic { 
  id: string; 
  quantity: number; 
}

// CartItem with complete product information from the database
export interface CartItem {
  id: string;
  title: string;
  price: number;
  discount_price: number;
  quantity: number;
  image: string;
}

// Interface for product details returned from Supabase
interface ProductDetail {
  cart_product_id: string;
  cart_slug: string;
  cart_product_name: string;
  cart_price: string | number;
  cart_discount_price: string | number;
  cart_primary_image?: string;
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
  isLoading: boolean;
  isAuthenticated: boolean;
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

// Local storage key for cart count
const CART_COUNT_STORAGE_KEY = 'gnt_cart_count';

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [basicCartItems, setBasicCartItems] = useState<CartItemBasic[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [cartCount, setCartCount] = useState<number>(0);
  
  // Get discount context
  const { discountRate } = useDiscount();

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const account = new Account(client);
        const user = await account.get();
        setUserId(user.$id);
        // Try to load cart count from localStorage for quick display
        const storedCount = localStorage.getItem(CART_COUNT_STORAGE_KEY);
        if (storedCount) {
          setCartCount(parseInt(storedCount, 10));
        }
      } catch (error) {
        setUserId(null);
        // Clear cart count for unauthenticated users
        setCartCount(0);
        localStorage.removeItem(CART_COUNT_STORAGE_KEY);
      } finally {
        setAuthChecked(true);
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Load cart data when component mounts or user changes
  useEffect(() => {
    const loadCart = async () => {
      if (!authChecked) return;
      setIsLoading(true);
      try {
        if (userId) {
          await fetchCartFromAppwrite(userId);
        } else {
          // No local cart for non-authenticated users
          setBasicCartItems([]);
          setCartItems([]);
          setCartCount(0);
          localStorage.removeItem(CART_COUNT_STORAGE_KEY);
        }
      } catch (error) {
        console.error('Error loading cart:', error);
        toast.error("Failed to load your cart", {
          id: "load-cart-error",
          description: "An unexpected error occurred while loading the cart.",
          duration: 3000
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadCart();
  }, [userId, authChecked]);

  // Fetch cart from Appwrite
  const fetchCartFromAppwrite = async (uid: string) => {
    try {
      const { documents } = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        'cart',
        [Query.equal('userId', uid)]
      );
      if (documents.length > 0) {
        const userCart = documents[0];
        setCartId(userCart.$id);
        if (userCart.productDetails) {
          try {
            const parsedItems = JSON.parse(userCart.productDetails) as CartItemBasic[];
            setBasicCartItems(parsedItems);
            // Calculate and update cart count
            const count = parsedItems.reduce((total, item) => total + item.quantity, 0);
            setCartCount(count);
            localStorage.setItem(CART_COUNT_STORAGE_KEY, count.toString());
          } catch (error) {
            console.error('Failed to parse cart from Appwrite:', error);
            throw error;
          }
        } else {
          setBasicCartItems([]);
          setCartCount(0);
          localStorage.removeItem(CART_COUNT_STORAGE_KEY);
        }
      } else {
        setBasicCartItems([]);
        setCartId(null);
        setCartCount(0);
        localStorage.removeItem(CART_COUNT_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error fetching cart from Appwrite:', error);
      throw error;
    }
  };

  // Save cart to Appwrite
  const saveCart = async (items: CartItemBasic[]) => {
    if (!userId) return; // Ensure user is authenticated
    // Update cart count and cache in localStorage
    const count = items.reduce((total, item) => total + item.quantity, 0);
    setCartCount(count);
    localStorage.setItem(CART_COUNT_STORAGE_KEY, count.toString());

    if (items.length > 0) {
      try {
        const productDetails = JSON.stringify(items);
        const productUUIDs = items.map(item => item.id).join(',');

        if (cartId) {
          await databases.updateDocument(
            APPWRITE_DATABASE_ID,
            'cart',
            cartId,
            {
              productUUID: productUUIDs,
              productDetails,
              creationDate: new Date().toISOString()
            }
          );
         /* toast.success("Cart updated", {
            id: "cart-update-toast",
            description: "Your cart has been successfully updated.",
            duration: 3000,
          });*/
        } else {
          const newCart = await databases.createDocument(
            APPWRITE_DATABASE_ID,
            'cart',
            ID.unique(),
            {
              userId,
              productUUID: productUUIDs,
              productDetails,
              creationDate: new Date().toISOString()
            }
          );
          setCartId(newCart.$id);
          /*toast.success("Cart created", {
            id: "cart-create-toast",
            description: "A new cart has been created for your account.",
            duration: 3000,
          });*/
        }
      } catch (error) {
        console.error('Error saving cart to Appwrite:', error);
        toast.error("Failed to save cart to database", {
          id: "save-cart-error",
          description: "Your cart could not be updated on the server.",
          duration: 3000
        });
      }
    } else if (cartId) {
      try {
        await databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          'cart',
          cartId
        );
        setCartId(null);
        setCartCount(0);
        localStorage.removeItem(CART_COUNT_STORAGE_KEY);
        /*toast.success("Cart cleared", {
          id: "clear-cart-toast",
          description: "Your cart has been cleared.",
          duration: 3000
        });*/
      } catch (error) {
        console.error('Error deleting empty cart from Appwrite:', error);
        toast.error("Failed to clear cart from database", {
          id: "delete-cart-error",
          description: "There was an issue clearing your cart from the server.",
          duration: 3000
        });
      }
    }
  };

  // Create a debounced version of saveCart to aggregate rapid cart updates
  const debouncedSaveCart = useCallback(
    debounce((items: CartItemBasic[]) => {
      saveCart(items);
    }, 500),
    [userId, cartId]
  );

  // Save basicCartItems to storage whenever it changes using debounced save
  useEffect(() => {
    if (!isLoading && authChecked && userId) {
      // Only save if authenticated
      debouncedSaveCart(basicCartItems);
    }
  }, [basicCartItems, isLoading, authChecked, debouncedSaveCart, userId]);

  // Update cart count when basicCartItems change (immediately for UI responsiveness)
  useEffect(() => {
    if (userId && authChecked) {
      const count = basicCartItems.reduce((total, item) => total + item.quantity, 0);
      setCartCount(count);
      localStorage.setItem(CART_COUNT_STORAGE_KEY, count.toString());
    }
  }, [basicCartItems, userId, authChecked]);

  // Fetch product details from Supabase using the cart items
  const { data: productDetails, isLoading: isProductsLoading } = useQuery({
    queryKey: ['cartProducts', basicCartItems],
    queryFn: async () => {
      if (basicCartItems.length === 0) return [];

      try {
        const productIds = basicCartItems.map(item => item.id);
        const { data, error } = await supabase.rpc('get_cart_product_info', { product_uuids: productIds });

        if (error) {
          console.error('Error fetching product details:', error);
          toast.error("Failed to fetch product details", {
            id: "fetch-product-details-error",
            description: "An error occurred while fetching cart product details.",
            duration: 3000
          });
          throw error;
        }

        return data || [];
      } catch (error) {
        console.error('Error in query function:', error);
        return [];
      }
    },
    enabled: basicCartItems.length > 0 && authChecked,
  });

  // Combine product details with quantities to create complete cart items
  useEffect(() => {
    if (productDetails && basicCartItems.length > 0) {
      const fullCartItems = productDetails.map((product: ProductDetail) => {
        const basicItem = basicCartItems.find(item => item.id === product.cart_product_id);
        const quantity = basicItem ? basicItem.quantity : 1;

        return {
          id: product.cart_product_id,
          title: product.cart_product_name,
          price: parseFloat(typeof product.cart_price === 'string' ? product.cart_price : product.cart_price.toString()),
          discount_price: parseFloat(typeof product.cart_discount_price === 'string' ? product.cart_discount_price : product.cart_discount_price.toString()),
          quantity,
          image: product.cart_primary_image || "/placeholder.svg",
        };
      });
      setCartItems(fullCartItems);
    } else if (basicCartItems.length === 0) {
      setCartItems([]);
    }
  }, [productDetails, basicCartItems]);

  // Cart management functions
  const addToCart = (item: Omit<CartItem, 'quantity'>, quantity: number) => {
    // Check if user is authenticated
    if (!userId) {
      toast.error("Please log in", {
        id: "auth-required-toast",
        description: "You need to log in to add items to your cart.",
        duration: 4000
      });
      return false;
    }

    setBasicCartItems(prevItems => {
      if (prevItems.length >= 20 && !prevItems.find(cartItem => cartItem.id === item.id)) {
        toast.error("Cart is full! Maximum 20 unique items allowed.", {
          id: "cart-full-toast",
          description: "Remove an item from your cart before adding more.",
          duration: 4000
        });
        return prevItems;
      }

      const existingItemIndex = prevItems.findIndex(cartItem => cartItem.id === item.id);

      if (existingItemIndex !== -1) {
        // Item exists - OVERWRITE quantity instead of incrementing
        const updatedItems = [...prevItems];

        // Check if new quantity exceeds maximum
        if (quantity > 99) {
          toast.error("Maximum quantity is 99", { id: "max-quantity-toast" });
          updatedItems[existingItemIndex].quantity = 99;
        } else {
          updatedItems[existingItemIndex].quantity = quantity;
        }

        toast.success("Cart updated", {
          id: "cart-update-toast",
          description: "The quantity has been updated successfully.",
          duration: 3000,
        });
        return updatedItems;
      } else {
        // New item - add to cart
        toast.success("Item added to cart", {
          id: "cart-add-toast",
          description: "The item has been added to your cart successfully.",
          duration: 3000,
        });
        return [...prevItems, { id: item.id, quantity: quantity > 99 ? 99 : quantity }];
      }
    });
    return true;
  };

  const updateQuantity = (id: string, quantity: number) => {
    // Check if user is authenticated
    if (!userId) {
      toast.error("Please log in", {
        id: "auth-required-toast",
        description: "You need to log in to update items in your cart.",
        duration: 4000
      });
      return false;
    }

    if (quantity < 1) return false;
    if (quantity > 99) {
      toast.error("Maximum quantity is 99", { id: "max-quantity-toast" });
      return false;
    }

    setBasicCartItems(prevItems => prevItems.map(item => item.id === id ? { ...item, quantity } : item));
    toast.success("Quantity updated", {
      id: "update-quantity-toast",
      description: "The quantity has been successfully updated.",
      duration: 3000,
    });
    return true;
  };

  const removeItem = (id: string) => {
    // Check if user is authenticated
    if (!userId) {
      toast.error("Please log in", {
        id: "auth-required-toast",
        description: "You need to log in to remove items from your cart.",
        duration: 4000
      });
      return false;
    }

    setBasicCartItems(prevItems => prevItems.filter(item => item.id !== id));
    toast.success("Item removed from cart", {
      id: "remove-item-toast",
      description: "The item has been removed from your cart.",
      duration: 3000,
    });
    return true;
  };

  const clearCart = () => {
    // Check if user is authenticated
    if (!userId) {
      toast.error("Please log in", {
        id: "auth-required-toast",
        description: "You need to log in to clear your cart.",
        duration: 4000
      });
      return false;
    }

    setBasicCartItems([]);
    /*toast.success("Cart cleared", {
      id: "clear-cart-toast",
      description: "All items have been removed from your cart.",
      duration: 3000,
    });*/
    return true;
  };

  // Calculate cart subtotal
  const cartSubtotal = cartItems.reduce(
    (total, item) => total + item.discount_price * item.quantity,
    0
  );

  // Calculate discount amount
  const cartDiscountAmount = cartSubtotal * discountRate;

  // Calculate cart total with discount
  const cartTotal = cartSubtotal - cartDiscountAmount;

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
      isLoading: isLoading || isProductsLoading,
      isAuthenticated: !!userId,
      cartCount
    }}>
      {children}
    </CartContext.Provider>
  );
};
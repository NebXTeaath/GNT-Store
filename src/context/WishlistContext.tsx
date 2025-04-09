//src\context\WishlistContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import debounce from 'lodash.debounce';
import { client, databases, APPWRITE_DATABASE_ID } from "@/lib/appwrite";
import { Account, ID, Query } from "appwrite";
import { toast } from "sonner";
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/lib/supabase";

// WishlistItem represents the basic data stored in Appwrite
export interface WishlistItemBasic {
  id: string;
}

// WishlistItem with complete product information from the database
export interface WishlistItem {
  id: string;
  title: string;
  price: number;
  discount_price: number;
  image: string;
}

// Interface for product details returned from Supabase
interface ProductDetail {
  cart_product_id: string;
  cart_product_name: string;
  cart_price: string | number;
  cart_discount_price: string | number;
  cart_primary_image?: string;
}

interface WishlistContextType {
  wishlistItems: WishlistItem[];
  addToWishlist: (item: Omit<WishlistItem, 'quantity'>) => void;
  removeFromWishlist: (id: string) => void;
  clearWishlist: () => void;
  isInWishlist: (id: string) => boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

interface WishlistProviderProps {
  children: ReactNode;
}

export const WishlistProvider: React.FC<WishlistProviderProps> = ({ children }) => {
  const [basicWishlistItems, setBasicWishlistItems] = useState<WishlistItemBasic[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [wishlistId, setWishlistId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const account = new Account(client);
        const user = await account.get();
        setUserId(user.$id);
        setIsAuthenticated(true);
      } catch (error) {
        setUserId(null);
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Load wishlist data when component mounts or user changes
  useEffect(() => {
    const loadWishlist = async () => {
      if (!authChecked) return;
      if (!isAuthenticated) {
        setBasicWishlistItems([]);
        return;
      }
      
      setIsLoading(true);
      try {
        if (userId) {
          await fetchWishlistFromAppwrite(userId);
        }
      } catch (error) {
        console.error('Error loading wishlist:', error);
        toast.error("Failed to load your wishlist", {
          id: "load-wishlist-error",
          description: "An unexpected error occurred while loading the wishlist.",
          duration: 3000
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadWishlist();
  }, [userId, authChecked, isAuthenticated]);

  // Fetch wishlist from Appwrite
  const fetchWishlistFromAppwrite = async (uid: string) => {
    try {
      const { documents } = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        'wishlist',
        [Query.equal('userId', uid)]
      );
      
      if (documents.length > 0) {
        const userWishlist = documents[0];
        setWishlistId(userWishlist.$id);
        if (userWishlist.productUUID) {
          try {
            const productUUIDs = userWishlist.productUUID.split(',').filter(Boolean);
            const items: WishlistItemBasic[] = productUUIDs.map((id: string) => ({ id }));
            setBasicWishlistItems(items);
          } catch (error) {
            console.error('Failed to parse wishlist from Appwrite:', error);
            throw error;
          }
        } else {
          setBasicWishlistItems([]);
        }
      } else {
        setBasicWishlistItems([]);
        setWishlistId(null);
      }
    } catch (error) {
      console.error('Error fetching wishlist from Appwrite:', error);
      throw error;
    }
  };

  // Save wishlist to Appwrite
  const saveWishlist = async (items: WishlistItemBasic[]) => {
    if (!userId || !isAuthenticated) {
      return;
    }

    if (items.length > 0) {
      try {
        const productUUIDs = items.map(item => item.id).join(',');
        
        if (wishlistId) {
          await databases.updateDocument(
            APPWRITE_DATABASE_ID,
            'wishlist',
            wishlistId,
            {
              productUUID: productUUIDs,
              creationDate: new Date().toISOString()
            }
          );
        } else {
          const newWishlist = await databases.createDocument(
            APPWRITE_DATABASE_ID,
            'wishlist',
            ID.unique(),
            {
              userId,
              productUUID: productUUIDs,
              creationDate: new Date().toISOString()
            }
          );
          setWishlistId(newWishlist.$id);
        }
      } catch (error) {
        console.error('Error saving wishlist to Appwrite:', error);
        toast.error("Failed to save wishlist to database", {
          id: "save-wishlist-error",
          description: "Your wishlist could not be updated on the server.",
          duration: 3000
        });
      }
    } else if (wishlistId) {
      try {
        await databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          'wishlist',
          wishlistId
        );
        setWishlistId(null);
      } catch (error) {
        console.error('Error deleting empty wishlist from Appwrite:', error);
        toast.error("Failed to clear wishlist from database", {
          id: "delete-wishlist-error",
          description: "There was an issue clearing your wishlist from the server.",
          duration: 3000
        });
      }
    }
  };

  // Create a debounced version of saveWishlist to aggregate rapid wishlist updates
  const debouncedSaveWishlist = useCallback(
    debounce((items: WishlistItemBasic[]) => {
      saveWishlist(items);
    }, 500),
    [userId, wishlistId, isAuthenticated]
  );

  // Save basicWishlistItems to storage whenever it changes using debounced save
  useEffect(() => {
    if (!isLoading && authChecked && isAuthenticated) {
      debouncedSaveWishlist(basicWishlistItems);
    }
  }, [basicWishlistItems, isLoading, authChecked, isAuthenticated, debouncedSaveWishlist]);

  // Fetch product details from Supabase using the wishlist items
  const { data: productDetails, isLoading: isProductsLoading } = useQuery({
    queryKey: ['wishlistProducts', basicWishlistItems, isAuthenticated],
    queryFn: async () => {
      if (basicWishlistItems.length === 0 || !isAuthenticated) return [];
      try {
        const productIds = basicWishlistItems.map(item => item.id);
        const { data, error } = await supabase.rpc('get_cart_product_info', {
          product_uuids: productIds
        });
        if (error) {
          console.error('Error fetching product details:', error);
          toast.error("Failed to fetch product details", {
            id: "fetch-product-details-error",
            description: "An error occurred while fetching wishlist product details.",
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
    enabled: basicWishlistItems.length > 0 && authChecked && isAuthenticated,
  });

  // Combine product details to create complete wishlist items
  useEffect(() => {
    if (productDetails && basicWishlistItems.length > 0) {
      const fullWishlistItems = productDetails.map((product: ProductDetail) => {
        return {
          id: product.cart_product_id,
          title: product.cart_product_name,
          price: parseFloat(typeof product.cart_price === 'string' ? product.cart_price : product.cart_price.toString()),
          discount_price: parseFloat(typeof product.cart_discount_price === 'string' ? product.cart_discount_price : product.cart_discount_price.toString()),
          image: product.cart_primary_image || "/placeholder.svg",
        };
      });
      setWishlistItems(fullWishlistItems);
    } else if (basicWishlistItems.length === 0) {
      setWishlistItems([]);
    }
  }, [productDetails, basicWishlistItems]);

  // Add item to wishlist
  const addToWishlist = (item: Omit<WishlistItem, 'quantity'>) => {
    if (!isAuthenticated) {
      toast.error("Please log in to add items to your wishlist", {
        id: "login-required-toast"
      });
      return;
    }

    setBasicWishlistItems(prevItems => {
      const existingItem = prevItems.find(wishlistItem => wishlistItem.id === item.id);
      if (existingItem) {
        toast.info("Item already in wishlist", {
          id: "already-in-wishlist-toast",
          description: "This item is already in your wishlist."
        });
        return prevItems;
      } else {
        toast.success("Added to wishlist", {
          id: "wishlist-add-toast",
          description: "The item has been added to your wishlist."
        });
        return [...prevItems, { id: item.id }];
      }
    });
  };

  // Remove item from wishlist
  const removeFromWishlist = (id: string) => {
    setBasicWishlistItems(prevItems => prevItems.filter(item => item.id !== id));
    toast.success("Removed from wishlist", {
      id: "remove-wishlist-toast",
      description: "The item has been removed from your wishlist."
    });
  };

  // Clear wishlist
  const clearWishlist = () => {
    setBasicWishlistItems([]);
    toast.success("Wishlist cleared", {
      id: "clear-wishlist-toast",
      description: "All items have been removed from your wishlist."
    });
  };

  // Check if an item is in the wishlist
  const isInWishlist = (id: string) => {
    return basicWishlistItems.some(item => item.id === id);
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        addToWishlist,
        removeFromWishlist,
        clearWishlist,
        isInWishlist,
        isLoading: isLoading || isProductsLoading,
        isAuthenticated
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
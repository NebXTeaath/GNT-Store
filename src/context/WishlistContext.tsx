// src\context\WishlistContext.tsx
import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react'; // Added useCallback import
import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { databases, APPWRITE_DATABASE_ID } from "@/lib/appwrite";
import { ID, Query, Models } from "appwrite"; // Import Models
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from './AuthContext';

// Interfaces
export interface WishlistItemBasic { id: string; }
export interface WishlistItem { id: string; slug: string; title: string; price: number; discount_price: number; image: string; }
interface ProductDetail { cart_product_id: string; cart_slug: string; cart_product_name: string; cart_price: string | number; cart_discount_price: string | number; cart_primary_image?: string; }
interface ProductSlug { product_id: string; slug: string; }

// Appwrite Wishlist Document Type (extending Models.Document)
interface AppwriteWishlistDoc extends Models.Document {
  userId: string;
  productUUID: string; // Comma-separated string of product IDs
  creationDate: string; // Or your relevant date field
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

// --- Helper Function to Fetch Full Wishlist Data ---
async function fetchFullWishlistData(userId: string | null): Promise<{ items: WishlistItem[], wishlistDocId: string | null }> {
    if (!userId) return { items: [], wishlistDocId: null };
    console.log(`[WishlistContext] Fetching full wishlist for user: ${userId}`);
    try {
        let basicItemIds: string[] = [];
        let wishlistDocId: string | null = null;

        // Apply generic type constraint
        const { documents } = await databases.listDocuments<AppwriteWishlistDoc>(
            APPWRITE_DATABASE_ID,
            'wishlist',
            [Query.equal('userId', userId), Query.limit(1)]
        );

        if (documents.length > 0) {
            const userWishlist = documents[0];
            wishlistDocId = userWishlist.$id;
            if (userWishlist.productUUID) {
                basicItemIds = userWishlist.productUUID.split(',').filter(Boolean);
            }
        }

        if (basicItemIds.length === 0) {
            return { items: [], wishlistDocId };
        }

        const [detailsResult, slugsResult] = await Promise.all([
            supabase.rpc('get_cart_product_info', { product_uuids: basicItemIds }),
            supabase.rpc('get_product_slugs_by_ids', { product_ids: basicItemIds })
        ]);

        const { data: productDetails, error: detailsError } = detailsResult;
        const { data: productSlugs, error: slugsError } = slugsResult;

        if (detailsError || slugsError) {
            console.error('Error fetching wishlist product details/slugs:', { detailsError, slugsError });
            toast.error("Failed to fetch wishlist product details", { id: "fetch-wishlist-details-error" });
            return { items: [], wishlistDocId };
        }

        // Type reduce callback parameters
        const slugMap = (productSlugs || []).reduce((acc: Record<string, string>, item: ProductSlug) => {
            acc[item.product_id] = item.slug;
            return acc;
        }, {});

        // Type map callback parameter
        const fullWishlistItems = (productDetails || []).map((product: ProductDetail) => {
            const slug = slugMap[product.cart_product_id] || product.cart_slug || '';
            return {
                id: product.cart_product_id,
                slug,
                title: product.cart_product_name,
                price: parseFloat(typeof product.cart_price === 'string' ? product.cart_price : product.cart_price.toString()),
                discount_price: parseFloat(typeof product.cart_discount_price === 'string' ? product.cart_discount_price : product.cart_discount_price.toString()),
                image: product.cart_primary_image || "/placeholder.svg",
            };
        });

        return { items: fullWishlistItems, wishlistDocId };

    } catch (error) {
        console.error('Error fetching full wishlist data:', error);
        toast.error("Failed to load your wishlist", { id: "load-wishlist-error" });
        return { items: [], wishlistDocId: null };
    }
}

// --- Helper function to save wishlist data to Appwrite ---
async function saveWishlistToAppwrite(userId: string, wishlistDocId: string | null, itemIds: string[]): Promise<string | null> {
    const productUUIDs = itemIds.join(',');
    const currentISODate = new Date().toISOString();

    try {
        if (itemIds.length > 0) {
            if (wishlistDocId) {
                // Update existing wishlist
                await databases.updateDocument(
                    APPWRITE_DATABASE_ID, 'wishlist', wishlistDocId,
                    { productUUID: productUUIDs, creationDate: currentISODate } // Ensure field names match collection
                );
                return wishlistDocId;
            } else {
                // Create new wishlist - apply type constraint
                const newWishlist = await databases.createDocument<AppwriteWishlistDoc>(
                    APPWRITE_DATABASE_ID, 'wishlist', ID.unique(),
                    { userId, productUUID: productUUIDs, creationDate: currentISODate }
                );
                return newWishlist.$id;
            }
        } else {
            // Wishlist is empty, delete document if it exists
            if (wishlistDocId) {
                await databases.deleteDocument(APPWRITE_DATABASE_ID, 'wishlist', wishlistDocId);
            }
            return null;
        }
    } catch (error) {
        console.error('Failed to save wishlist to Appwrite:', error);
        throw new Error('Failed to save wishlist to database.'); // Throw error for mutation
    }
}


interface WishlistProviderProps {
  children: ReactNode;
}

export const WishlistProvider: React.FC<WishlistProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.$id || null;
  const queryClient = useQueryClient();

  const wishlistQueryKey = useMemo(() => ['wishlist', userId], [userId]);

  const {
    data: wishlistData, // Contains { items: WishlistItem[], wishlistDocId: string | null }
    isLoading: isWishlistLoading,
    // isError, // Can use if needed
    // refetch, // Can use if needed
  } = useQuery<{ items: WishlistItem[], wishlistDocId: string | null }, Error>({
    queryKey: wishlistQueryKey,
    queryFn: () => fetchFullWishlistData(userId),
    enabled: !!userId && isAuthenticated, // Only run when logged in
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
    // Use placeholderData (TanStack Query v5+)
    placeholderData: (previousData) => previousData ?? { items: [], wishlistDocId: null },
  });

  // Safely access query data
  const wishlistItems = wishlistData?.items ?? [];
  const wishlistDocId = wishlistData?.wishlistDocId ?? null;

  // Type 'item' parameter in 'some' callback
  const isInWishlist = useCallback((id: string): boolean => {
    return wishlistItems.some((item: WishlistItem) => item.id === id);
  }, [wishlistItems]);

  // --- Mutations for Wishlist Actions ---

   const { mutate: saveWishlistMutation } = useMutation<string | null, Error, string[]>({
      mutationFn: (newItemIds) => {
          if (!userId) throw new Error("User not logged in");
          // saveWishlistToAppwrite now throws on failure
          return saveWishlistToAppwrite(userId, wishlistDocId, newItemIds);
      },
      // Type oldData parameter and remove unused 'variables'
      onSuccess: (newWishlistDocId /*, variables */) => {
          // Update query data's wishlistDocId; rely on invalidation for items
          queryClient.setQueryData(wishlistQueryKey, (oldData: { items: WishlistItem[], wishlistDocId: string | null } | undefined) => {
               return { items: oldData?.items ?? [], wishlistDocId: newWishlistDocId };
          });
           // Invalidate to refetch the full accurate wishlist state
          queryClient.invalidateQueries({ queryKey: wishlistQueryKey });
          console.log("Wishlist saved successfully, new wishlistDocId:", newWishlistDocId);
      },
      onError: (error) => {
           console.error("Save wishlist error:", error);
           toast.error(error.message || "Failed to update wishlist on the server.", { id: "save-wishlist-error" });
           // Optional: Invalidate to ensure UI reflects actual server state
           queryClient.invalidateQueries({ queryKey: wishlistQueryKey });
      }
  });

  // Wishlist Actions

  const addToWishlist = (item: Omit<WishlistItem, 'quantity'>): void => {
    if (!isAuthenticated || !userId) {
      toast.error("Please log in to add items to your wishlist", { id: "login-required-toast" });
      return;
    }

    // Add type ': WishlistItem'
    const currentItemIds = wishlistItems.map((wi: WishlistItem) => wi.id);
    if (currentItemIds.includes(item.id)) {
      toast.info("Item already in wishlist", { id: "already-in-wishlist-toast" });
      return;
    }

    const newItemIds = [...currentItemIds, item.id];
    saveWishlistMutation(newItemIds, {
         onSuccess: () => toast.success("Added to wishlist", { id: "wishlist-add-toast" })
    });
  };

  const removeFromWishlist = (id: string): void => {
    if (!isAuthenticated || !userId) { return; } // Basic check

    // Add type ': WishlistItem'
    const currentItemIds = wishlistItems.map((wi: WishlistItem) => wi.id);
    // Add type ': string'
    const newItemIds = currentItemIds.filter((itemId: string) => itemId !== id);

     if (newItemIds.length !== currentItemIds.length) {
        saveWishlistMutation(newItemIds, {
            onSuccess: () => toast.success("Removed from wishlist", { id: "remove-wishlist-toast" })
        });
    }
  };

  const clearWishlist = (): void => {
    if (!isAuthenticated || !userId) {
      toast.error("Please log in to clear your wishlist", { id: "login-required-toast" });
      return;
    }
    if (wishlistItems.length > 0) {
        saveWishlistMutation([], { // Pass empty array
             onSuccess: () => toast.success("Wishlist cleared", { id: "clear-wishlist-toast" })
        });
    }
  };

  return (
    <WishlistContext.Provider value={{
      wishlistItems,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
      isInWishlist,
      isLoading: isWishlistLoading, // Loading state from useQuery
      isAuthenticated // From useAuth
    }}>
      {children}
    </WishlistContext.Provider>
  );
};
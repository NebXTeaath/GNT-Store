// src/pages/productsPage/productsListPage.tsx
import React, { useEffect, useLayoutEffect, useState } from "react";
import { useParams, useSearchParams, Link, useLocation, useNavigationType, NavigationType } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ProductCard } from "@/pages/searchPage/search/ProductCard";
import { Pagination } from "@/pages/searchPage/search/Pagination";
import { Product } from "@/lib/types/product";
import { useProducts } from "@/pages/productsPage/useProducts";
import { ProductCarousel } from "@/pages/HomePage/ProductCarousel";
import { useLoading } from "@/context/LoadingContext";

// --- Helper Functions ---
const capitalize = (text: string) => {
    if (!text) return "";
    return text
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

const truncate = (text: string, maxLength: number = 20) => text?.length > maxLength ? text.substring(0, maxLength) + "..." : text;

// --- Breadcrumb Component ---
function ProductPageBreadcrumb() {
    const { category, subcategory } = useParams<{ category: string; subcategory: string }>();
    const [searchParams] = useSearchParams();
    const labelParam = searchParams.get("label") || null;

    const breadcrumbItems = [
        { label: "HOME", href: "/" },
        ...(category ? [{ label: truncate(capitalize(category)).toUpperCase(), href: `/${category}` }] : []),
        ...(subcategory ? [{ label: truncate(capitalize(subcategory)).toUpperCase(), href: `/${category}/${subcategory}` }] : []),
        ...(labelParam ? [{ label: truncate(labelParam).toUpperCase(), href: null }] : []),
    ];

    return (
        <Breadcrumb className="mb-8">
            <BreadcrumbList className="text-xl font-bold">
                {breadcrumbItems.map((item, index) => {
                    const isLast = index === breadcrumbItems.length - 1;
                    return (
                        <React.Fragment key={item.label}>
                            {index > 0 && <BreadcrumbSeparator />}
                            <BreadcrumbItem>
                                {isLast || !item.href ? (
                                    <BreadcrumbPage className="text-white">{item.label}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink href={item.href} className="hover:text-[#5865f2] transition-colors">
                                        {item.label}
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </React.Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}

// --- Session Storage Key Helper ---
const getScrollStorageKey = (url: string): string => {
    // Unique key based on the full relative URL (path + search)
    const key = `scroll-position-${url}`;
    // console.log(`[Scroll Key] Generated key: ${key} for URL: ${url}`);
    return key;
};

// --- Main Component ---
export default function ProductsPage() {
    const { category, subcategory } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const navigationType = useNavigationType();
    const { setIsLoadingProducts, setLoadingMessage } = useLoading();

    // --- State ---
    const [productsReady, setProductsReady] = useState(false);

    // --- Derived State and Variables ---
    const page = parseInt(searchParams.get("page") || "1");
    const labelParam = searchParams.get("label") || null;
    const sortBy = searchParams.get("sortBy") || "featured";
    const effectivePageSize = labelParam ? parseInt(searchParams.get("pageSize") || "12") : 1000;
    const formattedCategory = category || null;
    const formattedSubcategory = subcategory || null;
    const currentPageUrl = location.pathname + location.search;

    // --- Product Fetching Hook ---
    const { products, totalPages, isLoading, error } = useProducts({
        category: formattedCategory,
        subcategory: formattedSubcategory,
        page,
        pageSize: effectivePageSize,
        label: labelParam,
        sortBy
    });

    // --- Effects ---

    // Set loading state based on product loading
    useEffect(() => {
        setLoadingMessage("Loading products...");
        setIsLoadingProducts(isLoading);
    }, [isLoading, setIsLoadingProducts, setLoadingMessage]);

    // Set manual scroll restoration on mount
    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            const originalScrollRestoration = window.history.scrollRestoration;
            if (originalScrollRestoration !== 'manual') {
                window.history.scrollRestoration = 'manual';
                console.log("[Scroll Restore] Set history.scrollRestoration to 'manual'");
                return () => {
                    if (window.history.scrollRestoration === 'manual') {
                        window.history.scrollRestoration = originalScrollRestoration;
                        console.log(`[Scroll Restore] Restored history.scrollRestoration to '${originalScrollRestoration}'`);
                    }
                };
            }
        } else {
            console.warn("[Scroll Restore] history.scrollRestoration API not supported by this browser.");
        }
    }, []); // Runs once on mount

    // Update productsReady State
    useEffect(() => {
        setProductsReady(!isLoading && products.length > 0);
        if (isLoading) {
            setProductsReady(false);
        }
    }, [isLoading, products]);

    // --- Scroll Position SAVING Effect ---
    useLayoutEffect(() => {
        const urlToSaveFor = currentPageUrl; // Capture URL context for this effect instance
        const storageKey = getScrollStorageKey(urlToSaveFor);

        // Function to save the current scroll position
        const saveCurrentScrollPosition = (source: string) => {
            // Get the current scroll position immediately
            const currentPosition = Math.max(0, Math.round(window.scrollY));
            
            console.log(`[Save Scroll - ${source}] Attempting Save | Key: ${storageKey} | Current ScrollY: ${window.scrollY} | Value to Save: ${currentPosition} | URL Context: ${urlToSaveFor}`);
            
            try {
                sessionStorage.setItem(storageKey, currentPosition.toString());
            } catch (e) {
                console.error(`Error saving scroll position to sessionStorage for ${storageKey}:`, e);
            }
        };

        // Capture scroll position at multiple points to ensure it's not missed
        
        // 1. On scroll events (throttled)
        let scrollTimeout: number | null = null;
        const handleScroll = () => {
            if (scrollTimeout) {
                window.clearTimeout(scrollTimeout);
            }
            scrollTimeout = window.setTimeout(() => {
                saveCurrentScrollPosition("Scroll Event");
            }, 200); // Throttle to avoid excessive saves
        };
        
        // 2. When leaving the page
        const handleBeforeUnload = () => {
            saveCurrentScrollPosition("Before Unload");
        };
        
        // 3. When click events occur (potential navigation)
        const handleClick = () => {
            saveCurrentScrollPosition("Click Event");
        };
        
        // Add all listeners
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('click', handleClick, { capture: true });
        
        // Cleanup function
        return () => {
            if (scrollTimeout) window.clearTimeout(scrollTimeout);
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('click', handleClick, { capture: true });
            
            // This is crucial - save position right as component unmounts
            saveCurrentScrollPosition("LayoutEffect Cleanup");
        };
    }, [currentPageUrl]);

    // --- Scroll Position RESTORATION Effect (Handles POP/Refresh - Forceful w/ Verification) ---
    useEffect(() => {
        const storageKey = getScrollStorageKey(currentPageUrl);
        // Keep logs minimal for clarity, or use verbose ones if needed during debug
        // console.log(`[Restore Scroll] Effect Start | Key: ${storageKey} | NavType: ${navigationType} | ProductsReady: ${productsReady}`);

        const savedScrollPositionString = sessionStorage.getItem(storageKey);
        let savedScrollPosition: number | null = null;
        let rafId: number | null = null;
        let timerId: number | null = null; // For the verification timeout

        // --- Parsing Logic ---
        if (savedScrollPositionString !== null) {
             const parsedPosition = parseInt(savedScrollPositionString, 10);
             if (!isNaN(parsedPosition) && parsedPosition >= 0) {
                 savedScrollPosition = parsedPosition;
                 // console.log(`[Restore Scroll] Read Success | Key: ${storageKey} | Found Value: ${savedScrollPosition}`);
             } // else { console.log(`[Restore Scroll] Read Invalid...`); }
        } // else { console.log(`[Restore Scroll] Read Miss...`); }

        // --- Restore Logic ---
        if (savedScrollPosition !== null && savedScrollPosition > 0) {
            if (productsReady) {
                // Initial scroll attempt using rAF
                rafId = requestAnimationFrame(() => {
                     // console.log(`[Restore Scroll] Applying Restore (Attempt 1 via rAF) | Key: ${storageKey} | Scrolling To: ${savedScrollPosition}`);
                     window.scrollTo({ top: savedScrollPosition, behavior: 'auto' });

                     // ** Verification Step **
                     timerId = window.setTimeout(() => {
                        const currentScroll = Math.round(window.scrollY);
                        if (currentScroll !== savedScrollPosition) {
                             console.warn(`[Restore Scroll] Mismatch after rAF! Current: ${currentScroll}, Target: ${savedScrollPosition}. Re-applying scroll for Key: ${storageKey}`);
                             window.scrollTo({ top: savedScrollPosition, behavior: 'auto' });
                        } else {
                             // console.log(`[Restore Scroll] Position confirmed after delay | Key: ${storageKey}`);
                        }
                     }, 150); // Wait 150ms
                });

                // Cleanup: Cancel both rAF and timeout
                return () => {
                    if (rafId) cancelAnimationFrame(rafId);
                    if (timerId) clearTimeout(timerId);
                };
            } else {
                // console.log(`[Restore Scroll] Waiting productsReady | Key: ${storageKey} | Target Value: ${savedScrollPosition}`);
                return; // No cleanup needed yet
            }
        }
        // --- Scroll Top Logic ---
        else if (navigationType !== NavigationType.Pop || savedScrollPosition === 0) {
            // console.log(`[Restore Scroll] Applying ScrollTop | Key: ${storageKey} | NavType: ${navigationType} | Saved Value: ${savedScrollPosition}`);
             window.scrollTo({ top: 0, behavior: 'auto' }); // Scroll immediately
        }

    }, [currentPageUrl, navigationType, productsReady]);

    // --- Page Change Handler ---
    const handlePageChange = (newPage: number) => {
        searchParams.set("page", newPage.toString());
        setSearchParams(searchParams);
    };

    // --- Rendering Logic --- (No changes below this line)

    // Render Grid View if labelParam exists
    if (labelParam) {
        return (
            <div className="min-h-screen bg-[#0f1115] text-white">
                <div className="container mx-auto px-4 py-8">
                    <ProductPageBreadcrumb />
                    <div className="mb-6"> {/* Spacing placeholder */} </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="w-8 h-8 text-[#5865f2] animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 bg-[#1a1c23] rounded-lg">
                            <h3 className="text-lg font-medium mb-2">Error</h3>
                            <p className="text-gray-400">{error}</p>
                        </div>
                    ) : products.length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                {products.map((product: Product) => (
                                    <ProductCard key={product.slug} product={product} />
                                ))}
                            </div>
                            {totalPages > 1 && (
                                <div className="mt-8 flex justify-center">
                                    <Pagination
                                        currentPage={page}
                                        totalPages={totalPages}
                                        onPageChange={handlePageChange}
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12 bg-[#1a1c23] rounded-lg">
                            <h3 className="text-lg font-medium mb-2">No products found</h3>
                            <p className="text-gray-400">Try Browse a different category</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- Group products for Category/Subcategory View ---
    let groupingKey: "subcategory" | "label" = "subcategory";
    if (formattedSubcategory) {
        groupingKey = "label";
    }

    const groupedProducts = products.reduce((groups: { [key: string]: Product[] }, product) => {
        const key = (product && typeof product[groupingKey] === 'string' && product[groupingKey]) || "Other";
        if (!groups[key]) groups[key] = [];
        groups[key].push(product);
        return groups;
    }, {});

    // Render Grouped View (Carousels)
    return (
        <div className="min-h-screen bg-[#0f1115] text-white">
            <div className="container mx-auto px-4 py-8">
                <ProductPageBreadcrumb />
                 <div className="mb-6"> {/* Spacing placeholder */} </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 text-[#5865f2] animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-center py-12 bg-[#1a1c23] rounded-lg">
                        <h3 className="text-lg font-medium mb-2">Error</h3>
                        <p className="text-gray-400">{error}</p>
                    </div>
                ) : Object.keys(groupedProducts).length > 0 ? (
                    Object.entries(groupedProducts).map(([groupKey, groupProducts]) => {
                        const previewProducts = groupProducts.slice(0, 10);
                        const showAllUrl =
                            groupingKey === "subcategory"
                                ? `/${formattedCategory}/${groupKey}?layout=list`
                                : `/${formattedCategory}/${formattedSubcategory}?label=${encodeURIComponent(groupKey)}&layout=list`;
                        return (
                            <div key={groupKey} className="mb-12">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold text-white">
                                        {capitalize(groupKey)} ({groupProducts.length})
                                    </h2>
                                        <div>
                                            <Button variant="ghost" className="text-gray-300 bg-gray-800 hover:text-white hover:bg-[#4752c4]">
                                                <Link to={showAllUrl}>Show All</Link>
                                            </Button>
                                        </div>
                                </div>
                                {/* Ensure ProductCarousel receives the products */}
                                <ProductCarousel products={previewProducts} />
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-12 bg-[#1a1c23] rounded-lg">
                        <h3 className="text-lg font-medium mb-2">No products found</h3>
                        <p className="text-gray-400">Try Browse a different category</p>
                    </div>
                )}
            </div>
        </div>
    );
}

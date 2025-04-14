// src/pages/productsPage/productsListPage.tsx
import React, { useEffect, useLayoutEffect, useState } from "react";
import { useParams, useSearchParams, Link, useLocation, useNavigationType, NavigationType } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ProductCard } from "@/pages/searchPage/search/ProductCard"; // Assuming ProductCard is in this location
import { Pagination } from "@/pages/searchPage/search/Pagination";
import { Product } from "@/lib/types/product";
import { useProducts } from "@/pages/productsPage/useProducts";
import { ProductCarousel } from "@/pages/HomePage/ProductCarousel";
import { useLoading } from "@/components/global/Loading/LoadingContext";
import SEO from '@/components/seo/SEO'; // Import SEO component

// --- Helper Functions ---
const capitalize = (text: string | null | undefined = "") => text ? text.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") : "";
const truncate = (text: string = "", maxLength: number = 20) => text?.length > maxLength ? text.substring(0, maxLength) + "..." : text;

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

    return ( <Breadcrumb className="mb-8"> <BreadcrumbList className="text-xl font-bold"> {breadcrumbItems.map((item, index) => { const isLast = index === breadcrumbItems.length - 1; return ( <React.Fragment key={item.label}> {index > 0 && <BreadcrumbSeparator />} <BreadcrumbItem> {isLast || !item.href ? ( <BreadcrumbPage className="text-white">{item.label}</BreadcrumbPage> ) : ( <BreadcrumbLink href={item.href} className="hover:text-[#5865f2] transition-colors">{item.label}</BreadcrumbLink> )} </BreadcrumbItem> </React.Fragment> ); })} </BreadcrumbList> </Breadcrumb> );
}

// --- Session Storage Key Helper ---
const getScrollStorageKey = (url: string): string => `scroll-position-${url}`;

// --- Main Component ---
export default function ProductsPage() {
    const { category, subcategory } = useParams<{ category: string; subcategory?: string }>(); // Make subcategory optional
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const navigationType = useNavigationType();
    const { setIsLoadingProducts, setLoadingMessage } = useLoading();
    const siteUrl = window.location.origin;

    // --- State ---
    const [productsReady, setProductsReady] = useState(false);

    // --- Derived State and Variables ---
    const page = parseInt(searchParams.get("page") || "1");
    const labelParam = searchParams.get("label") || null;
    const sortBy = searchParams.get("sortBy") || "featured";
    const effectivePageSize = labelParam ? parseInt(searchParams.get("pageSize") || "12") : 1000; // Show all if no label
    const formattedCategory = category || null;
    const formattedSubcategory = subcategory || null;
    const currentPageUrl = location.pathname + location.search;

    // --- Product Fetching Hook ---
    const { products, totalPages, isLoading, error } = useProducts({ category: formattedCategory, subcategory: formattedSubcategory, page, pageSize: effectivePageSize, label: labelParam, sortBy });

    // --- Effects ---
    useEffect(() => { setLoadingMessage("Loading products..."); setIsLoadingProducts(isLoading); }, [isLoading, setIsLoadingProducts, setLoadingMessage]);
    useEffect(() => { if ('scrollRestoration' in window.history) { window.history.scrollRestoration = 'manual'; } }, []);
    useEffect(() => { setProductsReady(!isLoading && products.length > 0); if (isLoading) setProductsReady(false); }, [isLoading, products]);
    useLayoutEffect(() => {
        // --- Save scroll position ---
        const handleScroll = () => {
            sessionStorage.setItem(getScrollStorageKey(currentPageUrl), window.scrollY.toString());
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [currentPageUrl]); // Rerun when URL changes

    useEffect(() => {
        // --- Restore scroll position ---
        if (navigationType === NavigationType.Pop && productsReady) {
             // Check if products are ready before restoring
            const savedPosition = sessionStorage.getItem(getScrollStorageKey(currentPageUrl));
            if (savedPosition) {
                window.scrollTo(0, parseInt(savedPosition, 10));
            } else {
                window.scrollTo({ top: 0, behavior: "auto" }); // Default to top if no saved position
            }
        } else if (navigationType !== NavigationType.Pop) {
            // Reset scroll on push/replace navigation (or initial load)
            window.scrollTo({ top: 0, behavior: "auto" });
        }
        // Only depend on these, productsReady signals data is loaded
    }, [currentPageUrl, navigationType, productsReady]);

    // --- Page Change Handler ---
    const handlePageChange = (newPage: number) => { searchParams.set("page", newPage.toString()); setSearchParams(searchParams); };

    // --- SEO Data Generation ---
    const generateTitle = () => {
        let title = "Shop";
        if (category) title += ` ${capitalize(category)}`;
        if (subcategory) title += ` ${capitalize(subcategory)}`;
        if (labelParam) title += ` - ${capitalize(labelParam)}`;
        return `${title} | GNT Store`;
    };
    const generateDescription = () => {
        let desc = `Browse ${capitalize(labelParam) || capitalize(subcategory) || capitalize(category) || 'all products'} at GNT Store. Find the best deals on gaming consoles, computers, and accessories.`;
        return desc.substring(0, 160); // Truncate
    };
    // Construct canonical URL carefully, excluding pagination and sorting
    const baseCanonicalPath = subcategory
        ? `/${category}/${subcategory}`
        : category
        ? `/${category}`
        : '/';
    // Include label in canonical ONLY IF it defines the primary view (grid view)
    const canonicalUrl = labelParam
        ? `${siteUrl}${baseCanonicalPath}?label=${encodeURIComponent(labelParam)}`
        : `${siteUrl}${baseCanonicalPath}`; // Otherwise, use the category/subcategory base


    // --- Rendering Logic ---

    // Render Grid View if labelParam exists
    if (labelParam) {
        return (
            <div className="min-h-screen bg-[#0f1115] text-white">
                <SEO
                    title={generateTitle()}
                    description={generateDescription()}
                    canonicalUrl={canonicalUrl}
                    ogData={{
                         title: generateTitle(),
                         description: generateDescription(),
                         url: canonicalUrl,
                         type: 'product.group',
                         image: `${siteUrl}/favicon/og-image.png` // Generic category image
                    }}
                />
                <div className="container mx-auto px-4 py-8">
                    <ProductPageBreadcrumb />
                    <div className="mb-6"></div>
                    {isLoading ? ( <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-[#5865f2] animate-spin" /></div> ) : error ? ( <div className="text-center py-12 bg-[#1a1c23] rounded-lg"><h3 className="text-lg font-medium mb-2">Error</h3><p className="text-gray-400">{error}</p></div> ) : products.length > 0 ? ( <> <div className="grid grid-cols-2 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"> {products.map((product: Product) => ( <ProductCard key={product.slug} product={product} /> ))} </div> {totalPages > 1 && ( <div className="mt-8 flex justify-center"> <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} /> </div> )} </> ) : ( <div className="text-center py-12 bg-[#1a1c23] rounded-lg"><h3 className="text-lg font-medium mb-2">No products found</h3><p className="text-gray-400">Try Browse a different category</p></div> )}
                </div>
            </div>
        );
    }

    // --- Group products for Category/Subcategory View ---
    let groupingKey: "subcategory" | "label" = "subcategory";
    if (formattedSubcategory) { groupingKey = "label"; }
    const groupedProducts = products.reduce((groups: { [key: string]: Product[] }, product) => { const key = (product && typeof product[groupingKey] === 'string' && product[groupingKey]) || "Other"; if (!groups[key]) groups[key] = []; groups[key].push(product); return groups; }, {});

    // Render Grouped View (Carousels)
    return (
        <div className="min-h-screen bg-[#0f1115] text-white">
             <SEO
                title={generateTitle()}
                description={generateDescription()}
                canonicalUrl={canonicalUrl}
                ogData={{
                    title: generateTitle(),
                    description: generateDescription(),
                    url: canonicalUrl,
                    type: 'product.group',
                    image: `${siteUrl}/favicon/og-image.png` // Generic category image
                }}
            />
            <div className="container mx-auto px-4 py-8">
                <ProductPageBreadcrumb />
                <div className="mb-6"></div>
                {isLoading ? ( <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-[#5865f2] animate-spin" /></div> ) : error ? ( <div className="text-center py-12 bg-[#1a1c23] rounded-lg"><h3 className="text-lg font-medium mb-2">Error</h3><p className="text-gray-400">{error}</p></div> ) : Object.keys(groupedProducts).length > 0 ? ( Object.entries(groupedProducts).map(([groupKey, groupProducts]) => { const previewProducts = groupProducts.slice(0, 10); const showAllUrl = groupingKey === "subcategory" ? `/${formattedCategory}/${groupKey}` : `/${formattedCategory}/${formattedSubcategory}?label=${encodeURIComponent(groupKey)}`; return ( <div key={groupKey} className="mb-12"> <div className="flex justify-between items-center mb-4"> <h2 className="text-xl font-bold text-white"> {capitalize(groupKey)} ({groupProducts.length}) </h2> <div> <Button variant="ghost" className="text-gray-300 bg-gray-800 hover:text-white hover:bg-[#4752c4]"> <Link to={showAllUrl}>Show All</Link> </Button> </div> </div> <ProductCarousel products={previewProducts} /> </div> ); }) ) : ( <div className="text-center py-12 bg-[#1a1c23] rounded-lg"><h3 className="text-lg font-medium mb-2">No products found</h3><p className="text-gray-400">Try Browse a different category</p></div> )}
            </div>
        </div>
    );
}
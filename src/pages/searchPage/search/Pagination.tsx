// src/pages/searchPage/search/Pagination.tsx
import {
  Pagination as UIPagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useEffect } from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  // ----- Scroll to Top on Mount -----
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <UIPagination>
      <PaginationContent>
        {currentPage > 1 && (
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => onPageChange(currentPage - 1)} 
              className=" bg-[#2a2d36] border-[#3f4354] text-white hover:text-white focus-visible:ring-[#5865f2] focus-visible:ring-offset-0 focus-visible:border-[#5865f2] hover:bg-[#5865f2] "
            />
          </PaginationItem>
        )}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum = currentPage;
          if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }
          if (pageNum < 1 || pageNum > totalPages) return null;
          return (
            <PaginationItem key={pageNum}>
              <PaginationLink 
                isActive={currentPage === pageNum} 
                onClick={() => onPageChange(pageNum)}
                className=" bg-[#2a2d36] border-[#3f4354] text-white focus-visible:ring-[#5865f2] focus-visible:ring-offset-0 focus-visible:border-[#5865f2]"
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          );
        })}
        {currentPage < totalPages && (
          <PaginationItem>
            <PaginationNext 
              onClick={() => onPageChange(currentPage + 1)} 
              className=" bg-[#2a2d36] border-[#3f4354] text-white hover:text-white focus-visible:ring-[#5865f2] focus-visible:ring-offset-0 focus-visible:border-[#5865f2] hover:bg-[#5865f2] "
            />
          </PaginationItem>
        )}
      </PaginationContent>
    </UIPagination>
  );
}
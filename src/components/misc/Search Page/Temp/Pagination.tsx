// src/components/app/search/Pagination.tsx
import {
    Pagination as UIPagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
  } from "@/components/ui/pagination";
  
  interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }
  
  export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    return (
      <UIPagination>
        <PaginationContent>
          {currentPage > 1 && (
            <PaginationItem>
              <PaginationPrevious onClick={() => onPageChange(currentPage - 1)} />
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
                <PaginationLink isActive={currentPage === pageNum} onClick={() => onPageChange(pageNum)}>
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          {currentPage < totalPages && (
            <PaginationItem>
              <PaginationNext onClick={() => onPageChange(currentPage + 1)} />
            </PaginationItem>
          )}
        </PaginationContent>
      </UIPagination>
    );
  }
  
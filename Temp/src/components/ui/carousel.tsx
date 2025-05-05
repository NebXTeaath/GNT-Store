//src\components\ui\carousel.tsx
import * as React from "react"
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
  // Controlled behavior props
  defaultIndex?: number
  index?: number
  onIndexChange?: (index: number) => void
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
  currentIndex: number
  settled: boolean
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)
  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }
  return context
}

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  defaultIndex = 0,
  index,
  onIndexChange,
  ...props
}: React.ComponentProps<"div"> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
      startIndex: defaultIndex,
      // Add alignment option to ensure centering
      align: "center",
      // Prevent misalignments with proper loop settings if using loops
      ...(opts?.loop && { loop: true, containScroll: "keepSnaps" }),
    },
    plugins
  )
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)
  const [currentIndex, setCurrentIndex] = React.useState(defaultIndex)
  
  // Track if carousel is currently animating
  const [isTransitioning, setIsTransitioning] = React.useState(false)
  // Track if carousel has settled (for applying smooth ease‑in)
  const [settled, setSettled] = React.useState(true)

  // Handle external index changes
  React.useEffect(() => {
    if (api && typeof index === "number" && index !== currentIndex && !isTransitioning) {
      setIsTransitioning(true)
      setSettled(false)
      api.scrollTo(index)
    }
  }, [api, index, currentIndex, isTransitioning])

  const onSelect = React.useCallback(
    (api: CarouselApi) => {
      if (!api) return
      
      const selectedIndex = api.selectedScrollSnap()
      setCurrentIndex(selectedIndex)
      
      if (onIndexChange) onIndexChange(selectedIndex)
      
      setCanScrollPrev(api.canScrollPrev())
      setCanScrollNext(api.canScrollNext())
      
      // Reset transitioning state and mark as settled
      setIsTransitioning(false)
      setSettled(true)
    },
    [onIndexChange]
  )

  const scrollPrev = React.useCallback(() => {
    if (api && !isTransitioning) {
      setIsTransitioning(true)
      setSettled(false)
      api.scrollPrev()
    }
  }, [api, isTransitioning])

  const scrollNext = React.useCallback(() => {
    if (api && !isTransitioning) {
      setIsTransitioning(true)
      setSettled(false)
      api.scrollNext()
    }
  }, [api, isTransitioning])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isTransitioning) return
      
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        scrollPrev()
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        scrollNext()
      }
    },
    [scrollPrev, scrollNext, isTransitioning]
  )

  React.useEffect(() => {
    if (api && setApi) {
      setApi(api)
    }
  }, [api, setApi])

  React.useEffect(() => {
    if (!api) return
    
    const handleScroll = () => {
      // Disable transition during scrolling
      setSettled(false)
    }
    
    const handleSettled = () => {
      // Once the carousel settles, update the state.
      setIsTransitioning(false)
      setSettled(true)
      onSelect(api)
    }
    
    // Initial setup
    onSelect(api)
    
    // Register event listeners
    api.on("reInit", onSelect)
    api.on("select", onSelect)
    api.on("scroll", handleScroll)
    api.on("settle", handleSettled)

    return () => {
      api.off("reInit", onSelect)
      api.off("select", onSelect)
      api.off("scroll", handleScroll)
      api.off("settle", handleSettled)
    }
  }, [api, onSelect])

  // More robust reinitialization on layout changes
  React.useEffect(() => {
    if (!api) return
    
    // Reinitialize on window resize to ensure proper alignment
    const handleResize = () => {
      // Add a small delay to ensure DOM updates have completed
      setTimeout(() => {
        api.reInit()
      }, 200)
    }
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [api])

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api,
        opts,
        orientation: orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
        currentIndex,
        defaultIndex,
        index,
        onIndexChange,
        settled,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { carouselRef, orientation, settled } = useCarousel()

  return (
    <div
      ref={carouselRef}
      className="overflow-hidden"
      data-slot="carousel-content"
    >
      <div
        className={cn(
          "flex gap-2",
          orientation === "horizontal" ? "flex-row" : "flex-col",
          className
        )}
        // Use a custom cubic-bezier for smoother deceleration while keeping 300ms duration
        style={
          settled
            ? { transition: "transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)" }
            : { transition: "none" }
        }
        {...props}
      />
    </div>
  )
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  useCarousel()

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        className
      )}
      {...props}
    />
  )
}

function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn(
        "flex gap-4",
        orientation === "horizontal" ? "flex-row" : "flex-col",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn(
        "absolute size-8 rounded-full",
        orientation === "horizontal"
          ? "top-1/2 -right-12 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight />
      <span className="sr-only">Next slide</span>
    </Button>
  )
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}

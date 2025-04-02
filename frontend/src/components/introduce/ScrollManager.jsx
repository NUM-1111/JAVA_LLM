import React, { useEffect, useState } from "react";

const ScrollManager = () => {
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const pages = document.querySelectorAll(".page");
    const totalPages = pages.length;
    let isScrolling = false;
    let startY = 0;
    let scrollTimeout;

    const getPageHeights = () => {
      return Array.from(pages).map((page) => {
        const rect = page.getBoundingClientRect();
        return {
          id: page.id,
          top: rect.top + window.scrollY,
          height: rect.height,
        };
      });
    };

    const smoothScrollTo = (targetY) => {
      isScrolling = true;

      window.scrollTo({
        top: targetY,
        behavior: "smooth",
      });

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, 1000);
    };

    const handleScroll = () => {
      if (isScrolling) return;

      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      const pageHeights = getPageHeights();

      for (let i = 0; i < pageHeights.length; i++) {
        const currentPageData = pageHeights[i];
        const nextPageData = pageHeights[i + 1];

        if (
          scrollY >= currentPageData.top &&
          (!nextPageData || scrollY < nextPageData.top)
        ) {
          if (i + 1 === currentPage) break;

          setCurrentPage(i + 1);
          break;
        }
      }

      for (let i = 0; i < pageHeights.length - 1; i++) {
        const currentPageData = pageHeights[i];
        const nextPageData = pageHeights[i + 1];

        const currentPageBottom = currentPageData.top + currentPageData.height;
        const distanceToNextPage = nextPageData.top - currentPageBottom;

        const thresholdPoint =
          currentPageData.top +
          currentPageData.height +
          distanceToNextPage * 0.4;

        if (
          scrollY > currentPageData.top &&
          scrollY < nextPageData.top &&
          scrollY > thresholdPoint
        ) {
          smoothScrollTo(nextPageData.top);
          setCurrentPage(i + 2);
          break;
        }

        if (
          scrollY > currentPageData.top &&
          scrollY < nextPageData.top &&
          scrollY < currentPageData.top + currentPageData.height * 0.6
        ) {
          smoothScrollTo(currentPageData.top);
          setCurrentPage(i + 1);
          break;
        }
      }
    };

    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      const endY = e.changedTouches[0].clientY;
      const diffY = startY - endY;

      if (Math.abs(diffY) > 50) {
        const direction = diffY > 0 ? 1 : -1;
        const pageHeights = getPageHeights();

        for (let i = 0; i < pageHeights.length; i++) {
          const currentPageData = pageHeights[i];
          const nextPageData = pageHeights[i + 1];
          const prevPageData = pageHeights[i - 1];

          if (
            window.scrollY >= currentPageData.top &&
            (!nextPageData || window.scrollY < nextPageData.top)
          ) {
            if (direction > 0 && nextPageData) {
              smoothScrollTo(nextPageData.top);
              setCurrentPage(i + 2);
            } else if (direction < 0 && prevPageData) {
              smoothScrollTo(prevPageData.top);
              setCurrentPage(i);
            }
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        const targetElement = document.querySelector(hash);
        if (targetElement) {
          const pageHeights = getPageHeights();
          const targetIndex = pageHeights.findIndex(
            (page) => page.id === hash.substring(1)
          );
          if (targetIndex !== -1) {
            setCurrentPage(targetIndex + 1);
          }
        }
      }
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("hashchange", handleHashChange);
      clearTimeout(scrollTimeout);
    };
  }, []);

  return (
    <div className="fixed right-5 top-1/2 transform -translate-y-1/2 z-40">
      <div className="flex flex-col space-y-2">
        {[1, 2, 3, 4].map((page) => (
          <a
            key={page}
            href={`#page${page}`}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              currentPage === page
                ? "bg-blue-500 transform scale-125"
                : "bg-gray-400 hover:bg-blue-300"
            }`}
            aria-label={`Go to page ${page}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ScrollManager;

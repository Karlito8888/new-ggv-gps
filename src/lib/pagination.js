/**
 * Pagination utilities for MyGGV GPS app
 * Optimized for mobile-first web app with Supabase integration
 */

// Pagination types and interfaces
export const PaginationTypes = {
  TRADITIONAL: "traditional",
  INFINITE_SCROLL: "infinite_scroll",
  GEOGRAPHIC: "geographic",
};

/**
 * Pagination metadata structure
 */
export class PaginationMetadata {
  constructor({
    page = 0,
    pageSize = 20,
    totalItems = 0,
    totalPages = 0,
    hasNextPage = false,
    hasPreviousPage = false,
    itemCount = 0,
  } = {}) {
    this.page = page;
    this.pageSize = pageSize;
    this.totalItems = totalItems;
    this.totalPages = totalPages;
    this.hasNextPage = hasNextPage;
    this.hasPreviousPage = hasPreviousPage;
    this.itemCount = itemCount;
  }

  /**
   * Calculate pagination metadata from total count
   */
  static calculate(page, pageSize, totalItems) {
    const totalPages = Math.ceil(totalItems / pageSize);
    const itemCount = Math.min(pageSize, totalItems - page * pageSize);

    return new PaginationMetadata({
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages - 1,
      hasPreviousPage: page > 0,
      itemCount,
    });
  }

  /**
   * Get Supabase range parameters
   */
  getSupabaseRange() {
    const start = this.page * this.pageSize;
    const end = start + this.pageSize - 1;
    return { start, end };
  }
}

/**
 * Pagination options configuration
 */
export const PAGINATION_DEFAULTS = {
  pageSize: 20,
  maxPageSize: 100,
  minPageSize: 5,
  debounceTime: 300,
  throttleTime: 100,
};

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(params = {}) {
  const {
    page = 0,
    pageSize = PAGINATION_DEFAULTS.pageSize,
    sortBy = "created_at",
    sortOrder = "desc",
    search = "",
    filters = {},
  } = params;

  // Validate page number
  const validatedPage = Math.max(0, Math.floor(page));

  // Validate page size
  const validatedPageSize = Math.min(
    Math.max(PAGINATION_DEFAULTS.minPageSize, pageSize),
    PAGINATION_DEFAULTS.maxPageSize,
  );

  // Validate sort order
  const validatedSortOrder = ["asc", "desc"].includes(sortOrder.toLowerCase())
    ? sortOrder.toLowerCase()
    : "desc";

  return {
    page: validatedPage,
    pageSize: validatedPageSize,
    sortBy,
    sortOrder: validatedSortOrder,
    search: search?.trim() || "",
    filters: filters || {},
  };
}

/**
 * Create Supabase query with pagination
 */
export function createPaginatedQuery(supabase, table, options = {}) {
  const {
    page = 0,
    pageSize = PAGINATION_DEFAULTS.pageSize,
    sortBy = "created_at",
    sortOrder = "desc",
    search = "",
    filters = {},
    select = "*",
    count = true,
  } = validatePaginationParams(options);

  let query = supabase.from(table).select(select, { count: count ? "exact" : undefined });

  // Apply search if provided
  if (search && search.length > 0) {
    // For locations, search in address and block/lot
    if (table === "locations") {
      query = query.or(`address.ilike.%${search}%,block.ilike.%${search}%,lot.ilike.%${search}%`);
    }
    // Add search logic for other tables as needed
  }

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else if (typeof value === "object") {
        // Handle complex filters like { operator: 'gt', value: 100 }
        const { operator, val } = value;
        switch (operator) {
          case "gt":
            query = query.gt(key, val);
            break;
          case "gte":
            query = query.gte(key, val);
            break;
          case "lt":
            query = query.lt(key, val);
            break;
          case "lte":
            query = query.lte(key, val);
            break;
          case "neq":
            query = query.neq(key, val);
            break;
          default:
            query = query.eq(key, val);
        }
      } else {
        query = query.eq(key, value);
      }
    }
  });

  // Apply sorting
  if (sortBy) {
    query = query.order(sortBy, {
      ascending: sortOrder === "asc",
      nullsFirst: false,
    });
  }

  // Apply pagination range
  const { start, end } = PaginationMetadata.calculate(page, pageSize, 0).getSupabaseRange();
  query = query.range(start, end);

  return query;
}

/**
 * Geographic pagination utilities for GPS app
 */
export class GeographicPagination {
  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Return distance in meters
  }

  /**
   * Convert degrees to radians
   */
  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Sort locations by distance from user's current position
   */
  static sortByDistance(locations, userLat, userLon) {
    if (!userLat || !userLon || !locations || locations.length === 0) {
      return locations;
    }

    return locations
      .map((location) => ({
        ...location,
        distance: this.calculateDistance(
          userLat,
          userLon,
          location.coordinates?.[1] || location.lat,
          location.coordinates?.[0] || location.lon,
        ),
      }))
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Filter locations within a specific radius
   */
  static filterByRadius(locations, userLat, userLon, radiusInMeters = 1000) {
    if (!userLat || !userLon || !locations || locations.length === 0) {
      return locations;
    }

    return locations.filter((location) => {
      const distance = this.calculateDistance(
        userLat,
        userLon,
        location.coordinates?.[1] || location.lat,
        location.coordinates?.[0] || location.lon,
      );
      return distance <= radiusInMeters;
    });
  }
}

/**
 * Debounce utility for search inputs
 */
export function debounce(func, wait = PAGINATION_DEFAULTS.debounceTime) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle utility for scroll events
 */
export function throttle(func, limit = PAGINATION_DEFAULTS.throttleTime) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Mobile-optimized pagination helpers
 */
export const MobilePaginationHelpers = {
  /**
   * Calculate optimal page size for mobile devices
   */
  getOptimalPageSize() {
    const isMobile = window.innerWidth <= 768;
    const isSmallMobile = window.innerWidth <= 480;

    if (isSmallMobile) return 10; // Smaller pages for small mobile
    if (isMobile) return 15; // Medium pages for mobile
    return 20; // Standard pages for desktop
  },

  /**
   * Check if user is near bottom of page for infinite scroll
   */
  isNearBottom(threshold = 200) {
    const scrollPosition = window.innerHeight + window.scrollY;
    const pageHeight = document.documentElement.scrollHeight;
    return scrollPosition >= pageHeight - threshold;
  },

  /**
   * Add scroll event listener for infinite scroll
   */
  setupInfiniteScroll(callback, threshold = 200) {
    const throttledCallback = throttle(callback, 200);

    const handleScroll = () => {
      if (this.isNearBottom(threshold)) {
        throttledCallback();
      }
    };

    window.addEventListener("scroll", handleScroll);

    // Return cleanup function
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  },
};

/**
 * Error handling for pagination
 */
export class PaginationError extends Error {
  constructor(message, code = "PAGINATION_ERROR") {
    super(message);
    this.code = code;
    this.name = "PaginationError";
  }
}

/**
 * Validate pagination response from Supabase
 */
export function validatePaginationResponse(response, expectedPageSize) {
  if (!response) {
    throw new PaginationError("No response received from database");
  }

  const { data, error, count } = response;

  if (error) {
    throw new PaginationError(`Database error: ${error.message}`, error.code);
  }

  if (!data) {
    throw new PaginationError("No data returned from database");
  }

  // Validate that we didn't receive more data than requested
  if (data.length > expectedPageSize) {
    console.warn(`Received ${data.length} items but expected maximum ${expectedPageSize}`);
  }

  return {
    data: data || [],
    count: count || data.length,
    error: null,
  };
}

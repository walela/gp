export const GP_DATA_CACHE_TAG = 'gp-data'
export const GP_DATA_REVALIDATE_SECONDS = 86400

export const GP_DATA_CACHE: RequestInit = {
  cache: 'force-cache',
  next: {
    revalidate: GP_DATA_REVALIDATE_SECONDS,
    tags: [GP_DATA_CACHE_TAG]
  }
}

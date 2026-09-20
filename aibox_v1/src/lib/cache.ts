import { cacheTag, unstable_cache } from "next/cache";

export function cached<T>(key: string, loader: () => Promise<T>, tags: string[] = []) {
  return unstable_cache(async () => {
    "use cache";
    tags.forEach((tag) => cacheTag(tag));
    return loader();
  }, [key], { tags, revalidate: 60 });
}

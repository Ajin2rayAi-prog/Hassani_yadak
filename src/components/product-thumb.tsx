import { ProductArt } from "./product-art";
import { cn } from "@/lib/utils";

/**
 * تصویر محصول. اگر product.image (عکس واقعی محلی مثل /products/amt-101.jpg) موجود باشد
 * همان نمایش داده می‌شود؛ در غیر این صورت تصویرسازی برداریِ اختصاصیِ دسته (ProductArt)
 * که همیشه و بدون نیاز به اینترنت لود می‌شود.
 */
export function ProductThumb({
  categorySlug,
  image,
  alt,
  seed = 0,
  className,
}: {
  categorySlug: string;
  image?: string;
  alt: string;
  seed?: number;
  className?: string;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={alt} className={cn("h-full w-full object-cover", className)} />
    );
  }

  return <ProductArt categorySlug={categorySlug} seed={seed} className={className} />;
}

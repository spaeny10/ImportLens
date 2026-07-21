// HS chapter (2-digit) display names for the chapters common in consumer imports.
export const HS_CHAPTERS: Record<string, string> = {
  "03": "Fish & seafood",
  "08": "Fruit & nuts",
  "09": "Coffee, tea & spices",
  "16": "Prepared meat & fish",
  "20": "Prepared vegetables & fruit",
  "22": "Beverages",
  "33": "Cosmetics & toiletries",
  "39": "Plastics & articles",
  "40": "Rubber & articles",
  "42": "Leather goods & bags",
  "44": "Wood & articles",
  "48": "Paper & paperboard",
  "61": "Apparel, knitted",
  "62": "Apparel, woven",
  "63": "Home textiles",
  "64": "Footwear",
  "69": "Ceramic products",
  "70": "Glass & glassware",
  "73": "Iron & steel articles",
  "76": "Aluminum & articles",
  "82": "Tools & cutlery",
  "83": "Misc. metal articles",
  "84": "Machinery & appliances",
  "85": "Electrical machinery & electronics",
  "87": "Vehicles & parts",
  "90": "Optical & medical instruments",
  "94": "Furniture & lighting",
  "95": "Toys, games & sports",
  "96": "Miscellaneous manufactures",
};

export function hsChapterName(code: string): string {
  return HS_CHAPTERS[code] ?? `Chapter ${code}`;
}

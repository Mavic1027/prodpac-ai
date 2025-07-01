import { useState } from "react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { 
  Star, 
  StarHalf,
  ShoppingCart, 
  Heart,
  Share2,
  ChevronDown,
  Shield,
  Truck,
  RotateCcw,
  MapPin
} from "lucide-react";

interface AmazonListingPreviewProps {
  title: string;
  bulletPoints: string;
  productImages?: string[];
  heroImageUrl?: string;
  lifestyleImageUrl?: string;
  infographicUrl?: string;
  price?: number;
  reviewCount?: number;
  starRating?: number;
  brandName?: string;
}

export function AmazonListingPreview({
  title,
  bulletPoints,
  productImages = [],
  heroImageUrl,
  lifestyleImageUrl,
  infographicUrl,
  price: initialPrice = 29.99,
  reviewCount: initialReviewCount = 1247,
  starRating: initialStarRating = 4.3,
  brandName = "Your Brand"
}: AmazonListingPreviewProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [price, setPrice] = useState(initialPrice);
  const [reviewCount, setReviewCount] = useState(initialReviewCount);
  const [starRating, setStarRating] = useState(initialStarRating);
  const [quantity, setQuantity] = useState(1);

  // Combine all available images
  const allImages = [
    heroImageUrl,
    ...productImages,
    lifestyleImageUrl,
    infographicUrl
  ].filter(Boolean);

  const selectedImage = allImages[selectedImageIndex] || '/placeholder-product.jpg';

  // Format price
  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  // Format review count
  const formatReviewCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Render star rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <StarHalf key="half" className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      );
    }
    
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
      );
    }
    
    return stars;
  };

  // Clean and parse bullet points - remove ** markdown symbols for display
  const cleanBulletPoints = (text: string): string => {
    if (!text) return '';
    return text.replace(/\*\*/g, '');
  };

  const bullets = bulletPoints ? cleanBulletPoints(bulletPoints).split('\n').filter(bullet => bullet.trim()) : [];

  return (
    <div className="w-full mx-auto bg-white">
      {/* Amazon Header */}
      <div className="bg-[#131921] text-white p-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <div className="text-white font-bold text-xl">amazon</div>
            <div className="ml-1 text-orange-400">.com</div>
          </div>
          <div className="flex-1 flex items-center max-w-2xl">
            <div className="flex-1 bg-white rounded-l-md">
              <input 
                type="text"
                placeholder="Search Amazon"
                className="w-full px-3 py-2 text-black rounded-l-md focus:outline-none"
                readOnly
              />
            </div>
            <Button className="bg-orange-400 hover:bg-orange-500 text-black rounded-r-md rounded-l-none px-4">
              🔍
            </Button>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="px-6 py-2 text-sm text-blue-600 bg-gray-50">
        <span className="hover:underline cursor-pointer">Amazon.com</span>
        <span className="mx-1">›</span>
        <span className="hover:underline cursor-pointer">Everything</span>
        <span className="mx-1">›</span>
        <span className="text-gray-700">Product Title</span>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 max-w-none mx-auto px-8">
          {/* Left: Product Images */}
          <div className="lg:col-span-4">
            <div className="space-y-6">
              {/* Main Image */}
              <div className="relative aspect-square bg-white border rounded-lg overflow-hidden">
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt={title || "Product Image"}
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <span className="text-gray-400">No image available</span>
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {allImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 border rounded-md overflow-hidden ${
                        selectedImageIndex === index ? 'border-orange-400 border-2' : 'border-gray-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`Product ${index + 1}`}
                        className="w-full h-full object-contain p-1"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Middle: Product Details */}
          <div className="lg:col-span-5 space-y-8">
            {/* Brand & Title */}
            <div>
              <div className="text-blue-600 text-sm hover:underline cursor-pointer">
                Visit the {brandName} Store
              </div>
              <h1 className="text-2xl font-normal mt-1 leading-tight">
                {title || "Product title will appear here"}
              </h1>
            </div>

            {/* Rating & Reviews */}
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {renderStars(starRating)}
                <span className="ml-2 text-blue-600 text-sm hover:underline cursor-pointer">
                  {starRating.toFixed(1)}
                </span>
              </div>
              <span className="text-blue-600 text-sm hover:underline cursor-pointer">
                {formatReviewCount(reviewCount)} ratings
              </span>
            </div>

            {/* Prime Badge */}
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600 text-white text-xs">
                Prime
              </Badge>
              <span className="text-sm text-gray-600">FREE delivery</span>
            </div>

            <hr className="border-gray-300" />

            {/* Bullet Points */}
            {bullets.length > 0 && (
              <div>
                <h3 className="font-medium text-base mb-2">About this item</h3>
                <ul className="space-y-1">
                  {bullets.slice(0, 5).map((bullet, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start">
                      <span className="mr-2 mt-1.5 w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                      <span>{bullet.replace(/^[•\-\*]\s*/, '').trim()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right: Buy Box */}
          <div className="lg:col-span-3">
            <Card className="p-6 border border-gray-300 rounded-lg">
              <div className="space-y-5">
                {/* Price */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Price:</span>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-20 h-6 text-sm"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="text-3xl font-normal">
                    <span className="text-lg align-top">$</span>
                    {formatPrice(price)}
                  </div>
                  <div className="text-sm text-gray-600">
                    & FREE Returns
                  </div>
                </div>

                {/* Delivery */}
                <div className="text-sm">
                  <div className="flex items-center gap-1 text-gray-700">
                    <Truck className="h-4 w-4" />
                    <span className="font-medium">FREE delivery</span>
                    <span>Wednesday, July 3</span>
                  </div>
                  <div className="text-gray-600 mt-1">
                    Order within <span className="text-green-700 font-medium">8 hrs 26 mins</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-gray-600">
                    <MapPin className="h-3 w-3" />
                    <span className="text-blue-600 hover:underline cursor-pointer">
                      Deliver to New York 10001
                    </span>
                  </div>
                </div>

                {/* Stock Status */}
                <div className="text-lg text-green-700 font-medium">
                  In Stock
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Qty:</span>
                    <select 
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="border border-gray-300 rounded px-2 py-1 text-sm bg-gray-50"
                    >
                      {[1,2,3,4,5,6,7,8,9,10].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium rounded-full py-2">
                    Add to Cart
                  </Button>
                  <Button className="w-full bg-orange-400 hover:bg-orange-500 text-black font-medium rounded-full py-2">
                    Buy Now
                  </Button>
                </div>

                {/* Security & Features */}
                <div className="space-y-2 text-xs text-gray-600 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    <span>Secure transaction</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-3 w-3" />
                    <span>Ships from Amazon</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-3 w-3" />
                    <span>Add to Wish List</span>
                  </div>
                </div>

                {/* Edit Controls */}
                <div className="pt-4 border-t space-y-2">
                  <div className="text-xs font-medium text-gray-600 uppercase">Edit Preview</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-16">Reviews:</span>
                      <Input
                        type="number"
                        value={reviewCount}
                        onChange={(e) => setReviewCount(Number(e.target.value))}
                        className="h-6 text-xs flex-1"
                        min="0"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-16">Rating:</span>
                      <Input
                        type="number"
                        value={starRating}
                        onChange={(e) => setStarRating(Number(e.target.value))}
                        className="h-6 text-xs flex-1"
                        min="1"
                        max="5"
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 
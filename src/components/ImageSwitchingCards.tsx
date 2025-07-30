import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button"; // Import Button component

// Import some example images
import combineImage from "@/assets/Combine.jpg";
import newTractor1 from "@/assets/Newtractor1.png";
import pivotImage from "@/assets/pivot.png";
import seed1 from "@/assets/seed-1.png";

interface ImageSwitchingCardsProps {
  images: string[]; // Array of image URLs or imported image variables
}

export const ImageSwitchingCards = ({ images }: ImageSwitchingCardsCardsProps) => {
  const [displayedImages, setDisplayedImages] = useState<string[]>([
    images[0], // Top
    images[1] || images[0], // Right (use first if not enough images)
    images[2] || images[0], // Bottom
    images[3] || images[0], // Left
  ]);

  const navigateImages = (direction: 'up' | 'down' | 'left' | 'right', currentIndex: number) => {
    const totalImages = images.length;
    let nextIndex = currentIndex;

    switch (direction) {
      case 'up':
        nextIndex = (currentIndex - 1 + totalImages) % totalImages;
        // Update the top card
        setDisplayedImages(prev => [images[nextIndex], prev[1], prev[2], prev[3]]);
        break;
      case 'down':
        nextIndex = (currentIndex + 1) % totalImages;
         // Update the bottom card
        setDisplayedImages(prev => [prev[0], prev[1], images[nextIndex], prev[3]]);
        break;
      case 'left':
        nextIndex = (currentIndex - 1 + totalImages) % totalImages;
        // Update the left card
         setDisplayedImages(prev => [prev[0], prev[1], prev[2], images[nextIndex]]);
        break;
      case 'right':
        nextIndex = (currentIndex + 1) % totalImages;
         // Update the right card
        setDisplayedImages(prev => [prev[0], images[nextIndex], prev[2], prev[3]]);
        break;
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <div className="grid grid-cols-3 grid-rows-3 gap-4 rotate-45">
        {/* Top Card */}
        <div className="col-start-2 row-start-1 w-32 h-32 overflow-hidden rounded-lg shadow-lg relative group">
          <img 
            src={displayedImages[0]}
            alt="Agricultural Equipment"
            className="w-full h-full object-cover -rotate-45 scale-125 transition-transform duration-300 group-hover:scale-150"
          />
          <Button 
            size="icon" 
            className="absolute inset-0 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
             onClick={() => navigateImages('up', images.indexOf(displayedImages[0]))}
          >
            <ChevronUp className="w-6 h-6" />
          </Button>
        </div>

        {/* Left Card */}
        <div className="col-start-1 row-start-2 w-32 h-32 overflow-hidden rounded-lg shadow-lg relative group">
          <img 
            src={displayedImages[3]}
            alt="Agricultural Equipment"
            className="w-full h-full object-cover -rotate-45 scale-125 transition-transform duration-300 group-hover:scale-150"
          />
           <Button 
            size="icon" 
            className="absolute inset-0 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
             onClick={() => navigateImages('left', images.indexOf(displayedImages[3]))}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
        </div>

        {/* Center (Optional) */}
        <div className="col-start-2 row-start-2 flex items-center justify-center">
          {/* Could add a logo or central element here */}
        </div>

        {/* Right Card */}
        <div className="col-start-3 row-start-2 w-32 h-32 overflow-hidden rounded-lg shadow-lg relative group">
          <img 
            src={displayedImages[1]}
            alt="Agricultural Equipment"
            className="w-full h-full object-cover -rotate-45 scale-125 transition-transform duration-300 group-hover:scale-150"
          />
           <Button 
            size="icon" 
            className="absolute inset-0 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
             onClick={() => navigateImages('right', images.indexOf(displayedImages[1]))}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>

        {/* Bottom Card */}
        <div className="col-start-2 row-start-3 w-32 h-32 overflow-hidden rounded-lg shadow-lg relative group">
          <img 
            src={displayedImages[2]}
            alt="Agricultural Equipment"
            className="w-full h-full object-cover -rotate-45 scale-125 transition-transform duration-300 group-hover:scale-150"
          />
           <Button 
            size="icon" 
            className="absolute inset-0 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
             onClick={() => navigateImages('down', images.indexOf(displayedImages[2]))}
          >
            <ChevronDown className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

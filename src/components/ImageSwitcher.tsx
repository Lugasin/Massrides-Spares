import React, { useState } from 'react';

interface ImageSwitcherProps {
  images: string[]; // Array of image URLs
}

const ImageSwitcher: React.FC<ImageSwitcherProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  // Basic click handler for navigation (swipe will need more complex implementation)
  const handleClick = (index: number) => {
      setCurrentIndex(index);
  };


  return (
    <div className="image-switcher-container">
      <div className="image-gallery" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
        {images.map((image, index) => (
          <div key={index} className="image-slide">
            <img src={image} alt={`Switcher Image ${index + 1}`} />
          </div>
        ))}
      </div>

      {/* Add navigation buttons here */}
      <button className="prev-button" onClick={prevImage}>&lt;</button>
      <button className="next-button" onClick={nextImage}>&gt;</button>

       {/* Add pagination/indicators here if needed */}
    </div>
  );
};

export default ImageSwitcher;
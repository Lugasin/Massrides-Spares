import React, { useState, useEffect } from 'react';

interface PageLoaderProps {
  isLoading: boolean;
}

const PageLoader: React.FC<PageLoaderProps> = ({ isLoading }) => {
  const [isVisible, setIsVisible] = useState(isLoading);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 500);

      return () => clearTimeout(timer);
    } else {
        setIsVisible(true);
        setIsFadingOut(false);
    }
  }, [isLoading]);


  if (!isVisible) {
    return null;
  }

  return (
    <div className={`page-loader-overlay ${isFadingOut ? 'fade-out' : ''}`}>
      <div className="loader-content">
        {/* Tractor Wheel SVG Placeholder */}
        <div className="tractor-wheel-loader">
            {/* Replace with your actual Tractor Wheel SVG */}
            <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                {/* Example circle - replace with your wheel design */}
                <circle cx="50" cy="50" r="45" fill="none" stroke="#333" strokeWidth="10">
                     <animateTransform
                        attributeName="transform"
                        attributeType="XML"
                        type="rotate"
                        from="0 50 50"
                        to="360 50 50"
                        dur="2s"
                        repeatCount="indefinite"
                    />
                </circle>
            </svg>
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
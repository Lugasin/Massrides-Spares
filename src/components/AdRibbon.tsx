import React, { useState } from 'react';

interface AdRibbonProps {
  text: string;
}

const AdRibbon: React.FC<AdRibbonProps> = ({ text }) => {
  const [isVisible, setIsVisible] = useState(true);

  const dismissRibbon = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null; // Don't render if not visible
  }

  return (
    <div className="ad-ribbon">
      <span>{text}</span>
      <button className="dismiss-button" onClick={dismissRibbon}>&times;</button>
    </div>
  );
};

export default AdRibbon;
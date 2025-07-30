import React from 'react';
import HeroSection from '../components/HeroSection';
import ImageSwitcher from '../components/ImageSwitcher';
import AdRibbon from '../components/AdRibbon';
import ProductTeasers from '../components/ProductTeasers';
import PartnersSection from '../components/PartnersSection';
import WhyChooseUsSection from '../components/WhyChooseUsSection'; // Import WhyChooseUsSection

// Assuming you have other components
// import FeaturesSection from '../components/FeaturesSection';


const Index: React.FC = () => {
  // Example array of images for the ImageSwitcher - Replace with your actual image paths
  const switcherImages = [
    '/src/assets/newTractors.jpg.png',
    '/src/assets/Harverster.jpg',
    '/src/assets/Dronesprayer.png',
    // Add more image paths as needed
  ];

  const adMessage = "20% Off All Planters This Week!";

  return (
    <div className="index-page">
      {/* Include the Hero Section */}
      <HeroSection />

      {/* Image Switcher and Ad Ribbon Section */}
      <section className="image-switcher-section">
        <ImageSwitcher images={switcherImages} />
        <AdRibbon text={adMessage} />
      </section>

      {/* Include Product Teasers Section */}
      <ProductTeasers />

      {/* Include Partners and Testimonials Section */}
      <PartnersSection />

      {/* Include Why Choose Us Section with Parallax */}
      <WhyChooseUsSection />

      {/* Include other sections of your landing page here */}
      {/* <FeaturesSection /> */}      
    </div>
  );
};

export default Index;
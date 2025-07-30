import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { Link } from 'react-router-dom';

interface Product {
  id: number;
  name: string;
  image: string;
  placeholder: string;
  price: string;
  badges: string[];
}

const featuredProducts: Product[] = [
  {
    id: 1,
    name: 'Advanced Planter 3000',
    image: '/src/assets/planter-seeding.jpg',
    placeholder: '/src/assets/placeholder.svg',
    price: '$15,000',
    badges: ['New', 'Limited Stock'],
  },
  {
    id: 2,
    name: 'High-Efficiency Combine',
    image: '/src/assets/ripe-wheat-cutting-with-heavy-machinery-outdoors-generated-by-ai.jpg',
    placeholder: '/src/assets/placeholder.svg',
    price: '$80,000',
    badges: ['Best Seller'],
  },
  {
    id: 3,
    name: 'Precision Irrigation System',
    image: '/src/assets/pivot.png',
    placeholder: '/src/assets/placeholder.svg',
    price: '$25,000',
    badges: [],
  },
  {
    id: 4,
    name: 'Durable Disc Harrow',
    image: '/src/assets/disc-mounted-47004.png',
    placeholder: '/src/assets/placeholder.svg',
    price: '$5,000',
    badges: ['New'],
  },
];

const ProductTeasers: React.FC = () => {
  const [animatingProducts, setAnimatingProducts] = useState<Product[]>([]);
  const cartIconRef = useRef<HTMLElement>(null); // Ref for the sticky cart icon (will need to be passed or obtained)


  // Function to handle "Add to Cart" click and animation
  const handleAddToCart = (product: Product, event: React.MouseEvent<HTMLButtonElement>) => {
    // In a real app, you would add the product to the cart state/context here

    // Get the position of the clicked button
    const startRect = event.currentTarget.getBoundingClientRect();

    // **Needs the position of the sticky cart icon**
    // For now, using placeholder values. You will need to get the actual position.
    const cartIconRect = cartIconRef.current ? cartIconRef.current.getBoundingClientRect() : { top: 20, left: window.innerWidth - 50 };


    // Create a temporary product object for animation
    const animatingProduct = {
        ...product,
        startX: startRect.left,
        startY: startRect.top,
        endX: cartIconRect.left,
        endY: cartIconRect.top,
        animationId: Date.now(), // Unique ID for animation
    };

    setAnimatingProducts(prev => [...prev, animatingProduct]);
  };

   // Effect to manage the animation
   useEffect(() => {
       if (animatingProducts.length > 0) {
           const timer = setTimeout(() => {
               // Remove the animated product after the animation duration
               setAnimatingProducts(prev => prev.slice(1));
           }, 1000); // Adjust animation duration (in milliseconds)

           return () => clearTimeout(timer);
       }
   }, [animatingProducts]);


    // Effect to get the cart icon position (Placeholder - Needs actual implementation)
    useEffect(() => {
        // In a real application, you would get the ref to your sticky cart icon here
        // For example, if your Navbar component exposes a ref or provides the position via context
        // const stickyCartIconElement = document.querySelector('.sticky-cart-icon'); // Example selector
        // if (stickyCartIconElement) {
        //     cartIconRef.current = stickyCartIconElement as HTMLElement;
        // }

         // Placeholder: Assume cart icon is always at top right
        // This will not be accurate if the navbar moves or cart icon position changes
         const updateCartIconPosition = () => {
             cartIconRef.current = {
                 getBoundingClientRect: () => ({
                     top: 20, // Example top position
                     left: window.innerWidth - 50, // Example left position
                      // Include other properties like right, bottom, width, height if needed
                      right: window.innerWidth - 50 + 30, // Example width 30px
                      bottom: 20 + 30, // Example height 30px
                      width: 30,
                      height: 30,
                 }),
                  // Add other properties that might exist on a DOM element if needed
                  contains: (node: Node) => false, // Placeholder contains method
                  // ... other properties
             } as HTMLElement; // Cast to HTMLElement
         };

         updateCartIconPosition();
         window.addEventListener('resize', updateCartIconPosition); // Update on resize

         return () => {
             window.removeEventListener('resize', updateCartIconPosition);
         };

    }, []); // Empty dependency array


  return (
    <section className="product-teasers-section">
      <div className="container">
        <h2 className="section-title">Featured Products</h2>
        <div className="product-list">
          {featuredProducts.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image-container">
                <img
                  src={product.placeholder}
                  data-src={product.image}
                  alt={product.name}
                  className="lazy-product-image"
                />
                <div className="badge-container">
                  {product.badges.map(badge => (
                    <span key={badge} className={`product-badge ${badge.toLowerCase().replace(/s/g, '-')}`}>
                      {badge}
                    </span>
                  ))}
                </div>
                {/* Animated SVG background on hover will be implemented with CSS/JS later */}
              </div>
              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-price">{product.price}</p>
                {/* Add to Cart Button */}
                <button className="add-to-cart-button" onClick={(event) => handleAddToCart(product, event)}>
                    Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="view-all-cta">
          <Link to="/catalog">View All Products</Link>
        </div>
      </div>

      {/* Animated Product Elements */}
      {animatingProducts.map(product => (
          <img
            key={product.animationId}
            src={product.image} // Use the actual product image for animation
            alt="Animating Product"
            className="animating-product-image"
            style={{
                '--startX': `${product.startX}px`,
                '--startY': `${product.startY}px`,
                '--endX': `${product.endX}px`,
                '--endY': `${product.endY}px`,
            } as React.CSSProperties} // Cast to React.CSSProperties to allow CSS variables
          />
      ))}
    </section>
  );
};

export default ProductTeasers;
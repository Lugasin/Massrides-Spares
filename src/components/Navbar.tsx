import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom'; // Assuming you use react-router-dom for navigation

const Navbar: React.FC = () => {
  const [isSticky, setIsSticky] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCatalogMenuOpen, setIsCatalogMenuOpen] = useState(false); // State for Catalog menu

  const navbarRef = useRef<HTMLElement>(null); // Ref for the navbar element

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) { // Adjust the scroll threshold as needed
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    // Close catalog menu when mobile menu is toggled
    setIsCatalogMenuOpen(false);
  };

  const toggleCatalogMenu = () => {
    setIsCatalogMenuOpen(!isCatalogMenuOpen);
  };

  // Close mobile menu when screen is resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && isMobileMenuOpen) { // Adjust breakpoint
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobileMenuOpen]);

  // Close catalog menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target as Node)) {
        setIsCatalogMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [navbarRef]);


  return (
    <nav ref={navbarRef} className={`navbar ${isSticky ? 'sticky' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-logo">{/* Your Logo Here */}Logo</div>
        <div className="menu-icon" onClick={toggleMobileMenu}>
          &#9776;
        </div>
        <ul className={`nav-links ${isMobileMenuOpen ? 'active' : ''}`}>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/about">About Us</Link></li>
          <li
            className="catalog-link"
            onMouseEnter={() => window.innerWidth > 768 && setIsCatalogMenuOpen(true)}
            onMouseLeave={() => window.innerWidth > 768 && setIsCatalogMenuOpen(false)}
            onClick={() => window.innerWidth <= 768 && toggleCatalogMenu()} // Toggle on click on mobile
          >
            <span>Catalog &#9662;</span> {/* Down arrow */}
            {/* Desktop Mega-Menu */}
            {window.innerWidth > 768 && isCatalogMenuOpen && (
              <div className="mega-menu">
                <ul>
                  <li><Link to="/catalog/tractors">Tractors</Link></li>
                  <li><Link to="/catalog/harvesters">Harvesters</Link></li>
                  <li><Link to="/catalog/irrigation">Irrigation</Link></li>
                  <li><Link to="/catalog/implements">Implements</Link></li>
                </ul>
              </div>
            )}
            {/* Mobile Collapsible Submenu */}
            {window.innerWidth <= 768 && isCatalogMenuOpen && (
                 <ul className="mobile-submenu">
                  <li><Link to="/catalog/tractors">Tractors</Link></li>
                  <li><Link to="/catalog/harvesters">Harvesters</Link></li>
                  <li><Link to="/catalog/irrigation">Irrigation</Link></li>
                  <li><Link to="/catalog/implements">Implements</Link></li>
                </ul>
            )}
          </li>
          <li><Link to="/partners">Partners</Link></li>
          <li><Link to="/contact">Contact</Link></li>
          <li>{/* Cart Icon */}Cart</li>
        </ul>
      </div>

      {/* Mobile Full-screen Overlay Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-overlay active"> {/* Added active class directly for transition */}
          <div className="close-icon" onClick={toggleMobileMenu}>&times;</div>
          <ul className="mobile-nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About Us</Link></li>
             {/* Mobile Collapsible Submenu within overlay */}
            <li className={`mobile-catalog-link ${isCatalogMenuOpen ? 'open' : ''}`}>
              <span onClick={toggleCatalogMenu}>Catalog &#9662;</span>
              {isCatalogMenuOpen && (
                <ul className="mobile-submenu">
                  <li><Link to="/catalog/tractors">Tractors</Link></li>
                  <li><Link to="/catalog/harvesters">Harvesters</Link></li>
                  <li><Link to="/catalog/irrigation">Irrigation</Link></li>
                  <li><Link to="/catalog/implements">Implements</Link></li>
                </ul>
              )}
            </li>
            <li><Link to="/partners">Partners</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li>{/* Cart Icon */}Cart</li>
          </ul>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
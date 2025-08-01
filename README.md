# Massrides Agriculture PWA

## Project Description

Massrides Agriculture PWA is a progressive web application designed to showcase agriculture equipment with features like product browsing, filtering, sorting, a global shopping cart, and a dynamic search experience.

## Features

*   **Product Catalog:** Browse a catalog of agriculture equipment with filtering by category and sorting options (name, price).
*   **Global Cart:** Add products to a persistent shopping cart, update quantities, and remove items. The cart state is maintained globally.
*   **Sticky Catalog Filter:** The filter and search section on the Catalog page remains visible at the top while scrolling.
*   **Header with Navigation:** Includes navigation links to key sections/pages, a cart item count indicator, and an authentication link.
*   **Landing Page Search with Suggestions:** A search bar in the header on the landing page that provides real-time product suggestions with product cards in an overlay, replacing the hero section when active.
*   **Responsive Design:** The application is designed to be viewable and functional across various devices.

## Technologies Used

*   **Frontend:**
    *   React
    *   TypeScript
    *   Tailwind CSS
    *   Shadcn UI (for UI components)
    *   React Router (for navigation)
    *   Zustand / React Context API (for state management - specifically for the global cart)
    *   Sonner (for toast notifications)
    *   Lucide React (for icons)
*   **Build Tool:** Vite

## Installation

To set up and run the project locally, follow these steps:

1.  **Clone the repository:**
    ```sh
git clone https://github.com/5ianga/massrides-agri-pwa.git
    ```
2.  **Navigate to the project directory:**
    ```sh
    cd massrides-agri-pwa
    ```
3.  **Install the necessary dependencies:**
    ```sh
    npm install
    ```
    or
    ```sh
    yarn install
    ```
    or
    ```sh
    pnpm install
    ```
4.  **Start the development server:**
    ```sh
    npm run dev
    ```
    This will start the application, and you can view it in your browser, typically at `http://localhost:5173/`.

## Project Structure

The main directories and files are organized as follows:

```
massrides-agri-pwa/
├── public/
│   ├── ... (assets and other public files)
├── src/
│   ├── assets/ (images, etc.)
│   ├── components/ (reusable React components)
│   │   ├── ui/ (Shadcn UI components)
│   │   ├── ... (other custom components like Header, Footer, HeroSection, etc.)
│   ├── context/ (React Context for global state, e.g., QuoteContext)
│   ├── data/ (local data like products, categories)
│   ├── lib/ (utility functions)
│   ├── pages/ (page-level components, e.g., Index, Catalog, Cart)
│   ├── App.tsx (main application component and router setup)
│   ├── main.tsx (entry point)
│   ├── global.css (global styles)
│   └── ...
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── README.md (this file)
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Scripts

*   `npm run dev`: Starts the development server.
*   `npm run build`: Builds the application for production.
*   `npm run lint`: Lints the code.
*   `npm run preview`: Previews the production build.

## Future Improvements

*   Implementing a dedicated product detail page.
*   Integrating a backend API for product data and orders.
*   Adding full user authentication and account management.
*   Completing the checkout process integration.
*   Enhancing search with backend capabilities and more advanced filtering.
*   Implementing full PWA features like offline support and push notifications.

## License

[Specify your project's license here]

---

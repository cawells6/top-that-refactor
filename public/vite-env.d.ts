/// <reference types="vite/client" />

// Declare module for SVG imports
declare module '*.svg' {
  const content: string;
  export default content;
}

// Declare module for PNG imports
declare module '*.png' {
  const content: string;
  export default content;
}

// Declare module for other image formats if needed
declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

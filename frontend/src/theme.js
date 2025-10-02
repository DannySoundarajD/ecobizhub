// src/theme.js
import { extendTheme } from '@chakra-ui/react';

// You can customize your theme here
const customTheme = extendTheme({
  // Global styles to fix the outline border issue while preserving accessibility.
  // This is the most important part to solve your problem.
  styles: {
    global: {
      // This selector ensures that the box-shadow is removed for a mouse click,
      // but is kept for keyboard navigation. This is a key accessibility best practice.
      '*:focus:not(:focus-visible)': {
        boxShadow: 'none !important',
      },
      // This is the new, custom focus style that appears on keyboard navigation.
      '*:focus-visible': {
        outline: 'none', // Removes the default browser outline
        boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.6)', // Adds a custom box-shadow as a focus indicator
      },
    },
  },

  // Your existing color palette
  colors: {
    brand: {
      50: '#E6FFFA',
      100: '#B2F5EA',
      200: '#81E6D9',
      300: '#4FD1C5',
      400: '#38B2AC',
      500: '#319795',
      600: '#2C7A7B',
      700: '#285E61',
      800: '#234E52',
      900: '#1D4044',
    },
    // Define your footer colors here based on your CSS
    footer: {
      darkBlue: '#1a1a2e',
      mediumBlue: '#16213e',
      deepBlue: '#0f3460',
      lightText: '#b0b0b0',
      gradientLightBlue: '#64b3f4',
      gradientLightGreen: '#c2e59c',
    },
  },
  
  // Your existing font settings
  fonts: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
  
  // Your existing component customizations
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'md', // Apply rounded corners to all buttons by default
      },
      variants: {
        solid: (props) => ({
          bg: props.colorMode === 'dark' ? 'brand.300' : 'brand.500',
          color: 'white',
          _hover: {
            bg: props.colorMode === 'dark' ? 'brand.400' : 'brand.600',
          },
        }),
      },
    },
    // Add other component customizations here as needed
  },

  // Other theme properties can be added here
  // For example: breakpoints, shadows, sizes, etc.
});

export default customTheme;
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Thème noir minimaliste à fort contraste : fond noir, texte et accents blancs. */
export const ThemeNoir = definePreset(Aura, {
  primitive: {
    borderRadius: { none: '0', xs: '2px', sm: '4px', md: '6px', lg: '6px', xl: '8px' },
  },
  semantic: {
    primary: {
      50: '{neutral.50}', 100: '{neutral.100}', 200: '{neutral.200}', 300: '{neutral.300}',
      400: '{neutral.400}', 500: '{neutral.500}', 600: '{neutral.600}', 700: '{neutral.700}',
      800: '{neutral.800}', 900: '{neutral.900}', 950: '{neutral.950}',
    },
    colorScheme: {
      dark: {
        surface: {
          0: '#ffffff', 50: '#fafafa', 100: '#f0f0f0', 200: '#d4d4d4', 300: '#a3a3a3', 400: '#737373',
          500: '#525252', 600: '#3a3a3a', 700: '#262626', 800: '#141414', 900: '#0a0a0a', 950: '#000000',
        },
        primary: {
          color: '#ffffff',
          contrastColor: '#000000',
          hoverColor: '{neutral.200}',
          activeColor: '{neutral.300}',
        },
        highlight: {
          background: '#ffffff',
          focusBackground: '{neutral.200}',
          color: '#000000',
          focusColor: '#000000',
        },
        formField: {
          background: '#000000',
          borderColor: '{neutral.600}',
          hoverBorderColor: '#ffffff',
          focusBorderColor: '#ffffff',
          color: '#ffffff',
          placeholderColor: '{neutral.400}',
        },
        content: { background: '#0a0a0a', borderColor: '{neutral.700}' },
        overlay: { modal: { background: '#0a0a0a', borderColor: '{neutral.600}' } },
        text: { color: '#ffffff', mutedColor: '{neutral.300}' },
      },
    },
  },
});

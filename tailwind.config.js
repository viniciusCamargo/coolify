const defaultTheme = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors');

module.exports = {
  mode: 'jit',
  purge: ['./resources/views/**/*.edge', './resources/assets/ts/**/*.ts'],
  important: true,
  darkMode: false,
  theme: {
    extend: {
      keyframes: {
				wiggle: {
					'0%, 100%': { transform: 'rotate(-3deg)' },
					'50%': { transform: 'rotate(3deg)' }
				}
			},
			animation: {
				wiggle: 'wiggle 0.5s ease-in-out infinite'
			},
			fontFamily: {
				sans: ['Poppins', ...defaultTheme.fontFamily.sans]
			},
			colors: {
				...colors,
				coollabs: '#6B16ED',
				coolblack: '#161616',
				'coolgray-100': '#181818',
				'coolgray-200': '#202020',
				'coolgray-300': '#242424'
			}
    },
  },
  variants: {
    extend: {
      opacity: ['disabled'],
			animation: ['hover', 'focus']
    },
  },
  plugins: [],
}

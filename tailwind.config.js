module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],  
  theme: {
    extend: {},
  },
  plugins: [],
  variants: {
    opacity: ({ after }) => after(['disabled'])
  }
}

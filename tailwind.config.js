module.exports = {
    content: [
      './**/*.html',
      './**/*.js',
      // Add any other file patterns where you use Tailwind classes
    ],
    theme: {
      extend: {
        fontFamily: {
          sans: ['"IBM Plex Sans"', 'sans-serif'],
        },
      },
    },
    plugins: [],
    safelist: [{ pattern: /.*/ }],
  }
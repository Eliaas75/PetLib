/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#00A389", hover: "#008C76" },
        bg: "#F7F7F8",
        text: "#111827",
        muted: "#6B7280",
        border: "#E5E7EB",
        surface: "#FFFFFF",
        tagbg: "#ECFDF5",
        tagtext: "#047857",
      },
      boxShadow: { soft: "0 10px 30px rgba(0,0,0,.10), 0 2px 8px rgba(0,0,0,.06)" },
      borderRadius: { xl2: "1rem" },
    },
  },
  plugins: [],
};

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Pretendard'", "system-ui", "sans-serif"],
      },
      colors: {
        panty: {
          bg: "#0b0b12",
          panel: "#14141f",
          pink: "#ff5da2",
          yellow: "#ffd84d",
          ink: "#f4f4f6",
          mute: "#9b9baf",
        },
      },
    },
  },
  plugins: [],
};

export default config;

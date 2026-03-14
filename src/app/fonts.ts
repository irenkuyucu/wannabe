import localFont from "next/font/local";

export const bangers = localFont({
  display: "swap",
  src: [
    {
      path: "../../public/fonts/Bangers-Regular.ttf",
      style: "normal",
      weight: "400",
    },
  ],
  variable: "--font-bangers",
});

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kiku - Video Meetings",
  description: "Simple video meetings with AI-powered notes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

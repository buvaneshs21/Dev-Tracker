import "./globals.css";

export const metadata = {
  title: "DevTrack",
  description: "Project tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

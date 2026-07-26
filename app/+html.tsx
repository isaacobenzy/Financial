import { ScrollViewStyleReset } from 'expo-router/html';

// Web-only HTML shell for static export / EAS Hosting shareable previews.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <title>Financial Copilot</title>
        <meta
          name="description"
          content="Personal finance companion for Ghana — balance, goals, MoMo alerts, and an AI grounded in your ledger."
        />
        <meta name="theme-color" content="#1B4332" />
        <meta property="og:title" content="Financial Copilot" />
        <meta
          property="og:description"
          content="Try the web preview — ledger, goals, and AI. Install the Android APK for SMS inbox and push."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <link rel="icon" href="/favicon.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #F3F7F4;
  margin: 0;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #0F2A20;
  }
}`;

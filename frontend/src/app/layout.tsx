import './globals.css';
import type { Metadata } from 'next';
import { AppProvider } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import AIAssistantModal from '../components/AIAssistantModal';
import VoiceAssistantModal from '../components/VoiceAssistantModal';
import WhatsAppSimulatorModal from '../components/WhatsAppSimulatorModal';

export const metadata: Metadata = {
  title: 'KrishakDrishti (कृषक दृष्टि) — Agricultural AI Intelligence Platform',
  description: 'Production-oriented agricultural AI platform for Indian farmers, FPOs, and agricultural extension officers supporting 22 Indian languages, drone mapping, IoT telemetry, Mandi rates, and weather alerts.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-agri-bg min-h-screen text-agri-text-primary antialiased">
        <AppProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Navbar />
              <main className="flex-1 p-4 md:p-6 lg:p-7 max-w-[1540px] w-full mx-auto pb-24 md:pb-8">
                {children}
              </main>
            </div>
          </div>

          {/* Persistent Floating & Channel Modals */}
          <AIAssistantModal />
          <VoiceAssistantModal />
          <WhatsAppSimulatorModal />
        </AppProvider>
      </body>
    </html>
  );
}

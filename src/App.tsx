import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar1 as Navbar } from './components/ui/navbar-1';
import { Footer } from './components/layout/Footer';
import { ToastContainer } from './components/common/ToastContainer';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ConfirmDeleteModal } from './components/modals/ConfirmDeleteModal';
import { AnonLimitModal } from './components/modals/AnonLimitModal';
import { OutputPreviewModal } from './components/modals/OutputPreviewModal';
import { LandingPage } from './components/pages/LandingPage';
import { ConvertPage } from './components/pages/ConvertPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { PricingPage } from './components/pages/PricingPage';
import { AccountPage } from './components/pages/AccountPage';
import { AuthPage } from './components/pages/AuthPage';
import { ToolsPage } from './components/pages/ToolsPage';
import { ToolPage } from './components/pages/ToolPage';
import { OcrPage } from './components/pages/OcrPage';
import { TranslatePage } from './components/pages/TranslatePage';
import { isMagicLinkUrl } from './services/firebase';

const MainContent: React.FC = () => {
  const { activePage, handleVerifyMagicLink } = useApp();

  useEffect(() => {
    if (isMagicLinkUrl()) {
      handleVerifyMagicLink();
    }
  }, []);

  return (
    <main className="flex-1 w-full min-h-[calc(100vh-4rem)] pt-20">
      {activePage === 'landing' && <LandingPage />}
      {activePage === 'convert' && <ConvertPage />}
      {activePage === 'dashboard' && <DashboardPage />}
      {activePage === 'pricing' && <PricingPage />}
      {activePage === 'account' && <AccountPage />}
      {activePage === 'auth' && <AuthPage />}
      {activePage === 'tools' && <ToolsPage />}
      {activePage === 'tools-ocr' && <OcrPage />}
      {activePage === 'tools-translate' && <TranslatePage />}
      {activePage.startsWith('tools-') && activePage !== 'tools-ocr' && activePage !== 'tools-translate' && <ToolPage />}
    </main>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-body)', color: 'var(--color-text)' }}>
          <Navbar />
          <MainContent />
          <Footer />

          <ConfirmDeleteModal />
          <OutputPreviewModal />
          <ToastContainer />
        </div>
      </AppProvider>
    </ErrorBoundary>
  );
}

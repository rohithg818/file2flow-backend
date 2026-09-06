import React, { ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

interface Props {
 children: ReactNode;
}

interface State {
 hasError: boolean;
 error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
 public override state: State = {
 hasError: false,
 error: null,
 };

 public static getDerivedStateFromError(error: Error): State {
 return { hasError: true, error };
 }

 public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
 console.error('Uncaught error in application:', error, errorInfo);
 }

 public override render(): ReactNode {
 if (this.state.hasError) {
 return (
 <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-900">
 <div className="max-w-md w-full p-8 bg-white rounded-2xl border border-slate-200 shadow-xl text-center space-y-4">
 <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50/60 text-rose-500 flex items-center justify-center">
 <AlertOctagon className="w-7 h-7" />
 </div>
 <h2 className="text-xl font-bold font-display">Something went wrong</h2>
 <p className="text-sm text-slate-500">
 An unexpected error occurred during rendering. You can try refreshing the view or resetting the workspace.
 </p>
 {this.state.error && (
 <div className="p-3 bg-slate-100 rounded-lg text-xs font-mono text-left text-slate-700 overflow-x-auto max-h-32">
 {this.state.error.message}
 </div>
 )}
 <div className="flex gap-3 pt-2">
 <button
 onClick={() => window.location.reload()}
 className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-sm"
 >
 <RefreshCw className="w-4 h-4" />
 Reload Page
 </button>
 <button
 onClick={() => {
 this.setState({ hasError: false, error: null });
 window.location.href = '/';
 }}
 className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-sm font-medium transition-all"
 >
 <Home className="w-4 h-4" />
 Home
 </button>
 </div>
 </div>
 </div>
 );
 }

 return this.props.children;
 }
}

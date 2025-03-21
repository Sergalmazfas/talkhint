
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Translation from "./pages/Translation";
import PhoneCall from "./pages/PhoneCall";
import NotFound from "./pages/NotFound";

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/translation" element={<Translation />} />
          <Route path="/phonecall" element={<PhoneCall />} />
          {/* Добавлены редиректы для URL без слеша в конце */}
          <Route path="/translation/" element={<Navigate to="/translation" replace />} />
          <Route path="/phonecall/" element={<Navigate to="/phonecall" replace />} />
          {/* Страница 404 для неизвестных маршрутов */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogOut, Bell, Settings, User } from 'lucide-react';

export function Header() {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
      {/* Bloco de Identidade da Marca */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-md flex items-center justify-center text-white font-bold text-lg shadow-md">
          M
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-900 leading-none">Medição Pro</h1>
          <p className="text-xs text-slate-500 mt-1">Sistema de Relatório Fotográfico</p>
        </div>
      </div>

      {/* Ações e Notificações */}
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" className="text-slate-600 hover:text-blue-600 transition-colors">
          <Bell className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-slate-600 hover:text-blue-600 transition-colors">
          <Settings className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-slate-600 hover:text-blue-600 transition-colors">
          <User className="w-5 h-5" />
        </Button>
        
        <div className="h-6 w-px bg-slate-200 mx-2" />
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleLogout}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-all"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}

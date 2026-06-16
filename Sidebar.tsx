'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Plus, FileText, Eye, LogOut } from 'lucide-react';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/nova-medicao', icon: Plus, label: 'Nova Medição' },
  { path: '/registros', icon: FileText, label: 'Registros' },
  { path: '/visao-operacional', icon: Eye, label: 'Visão Operacional' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col justify-between shadow-xl">
      <div>
        {/* Header da Sidebar */}
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-bold tracking-wide text-slate-100">Área de Controle</h2>
          <p className="text-xs text-slate-400 mt-1">Painel Administrativo</p>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 p-4 mt-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Botão de Rodapé para Sair */}
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}
          className="flex items-center justify-center space-x-2 w-full px-4 py-2.5 bg-slate-800 hover:bg-red-900/40 hover:text-red-400 text-slate-300 text-sm font-medium rounded-lg transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair do Sistema</span>
        </button>
      </div>
    </aside>
  );
}

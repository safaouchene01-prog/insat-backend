/**
 * TreatmentPlanCard
 * ==================
 * Reusable collapsible card for one treatment category.
 * Displays a bulleted list of clinical recommendations.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface Props {
  icon: React.ReactNode;
  title: string;
  color: 'cyan' | 'blue' | 'purple' | 'amber' | 'green' | 'red' | 'rose' | 'teal';
  items: string[];
  disclaimer?: string;
  defaultOpen?: boolean;
}

const COLOR_MAP: Record<string, { header: string; border: string; dot: string; iconBg: string; iconColor: string }> = {
  cyan:   { header: 'bg-cyan-50',   border: 'border-cyan-200',   dot: 'bg-cyan-400',   iconBg: 'bg-cyan-100',   iconColor: 'text-cyan-700' },
  blue:   { header: 'bg-blue-50',   border: 'border-blue-200',   dot: 'bg-blue-400',   iconBg: 'bg-blue-100',   iconColor: 'text-blue-700' },
  purple: { header: 'bg-purple-50', border: 'border-purple-200', dot: 'bg-purple-400', iconBg: 'bg-purple-100', iconColor: 'text-purple-700' },
  amber:  { header: 'bg-amber-50',  border: 'border-amber-200',  dot: 'bg-amber-400',  iconBg: 'bg-amber-100',  iconColor: 'text-amber-700' },
  green:  { header: 'bg-green-50',  border: 'border-green-200',  dot: 'bg-green-400',  iconBg: 'bg-green-100',  iconColor: 'text-green-700' },
  red:    { header: 'bg-red-50',    border: 'border-red-200',    dot: 'bg-red-400',    iconBg: 'bg-red-100',    iconColor: 'text-red-700' },
  rose:   { header: 'bg-rose-50',   border: 'border-rose-200',   dot: 'bg-rose-400',   iconBg: 'bg-rose-100',   iconColor: 'text-rose-700' },
  teal:   { header: 'bg-teal-50',   border: 'border-teal-200',   dot: 'bg-teal-400',   iconBg: 'bg-teal-100',   iconColor: 'text-teal-700' },
};

export default function TreatmentPlanCard({
  icon,
  title,
  color,
  items,
  disclaimer,
  defaultOpen = true,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const c = COLOR_MAP[color];

  if (!items || items.length === 0) return null;

  return (
    <div className={`rounded-2xl border overflow-hidden bg-white ${c.border}`}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-3.5 ${c.header} text-left`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.iconBg} ${c.iconColor}`}>
            {icon}
          </div>
          <span className={`font-[Poppins] font-bold text-[14px] ${c.iconColor}`}>
            {title}
          </span>
          <span className={`px-2 py-0.5 rounded-full font-[Poppins] font-medium text-[11px] ${c.iconBg} ${c.iconColor}`}>
            {items.length}
          </span>
        </div>
        {open
          ? <ChevronUp size={16} className={c.iconColor} />
          : <ChevronDown size={16} className={c.iconColor} />
        }
      </button>

      {/* Content */}
      {open && (
        <div className="px-5 py-4 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${c.dot}`} />
              <p className="font-[Poppins] text-[13px] text-[#2D3748] leading-relaxed">
                {item}
              </p>
            </div>
          ))}

          {disclaimer && (
            <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="font-[Poppins] text-[11px] text-amber-700 leading-relaxed">
                {disclaimer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Search, MapPin, CalendarDays, Users } from 'lucide-react';
import { eventService, useServiceData, EVENT_TYPES } from '../services/eventDataService';
import { formatRupiahShort, formatNumber, formatDate } from '../utils/formatters';
import { PageHeader, SectionCard, TableSkeleton, EmptyState, ErrorState, StatusBadge } from '../components/ui';

export default function Events({ onNavigate }) {
  const { data, loading, error, reload } = useServiceData(eventService.getEvents);
  const [q, setQ] = useState('');

  const events = (data || []).filter((e) =>
    (e.nama || '').toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Event Monitoring"
        microcopy="Daftar seluruh event beserta capaian DPK, akuisisi, dan rasio efektivitasnya."
      />

      <SectionCard
        title="Daftar Event"
        subtitle={data ? `${data.length} event tercatat` : ''}
        action={
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari event…"
              className="w-44 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] outline-none transition focus:border-bsi-400 focus:ring-2 focus:ring-bsi-100"
            />
          </div>
        }
      >
        {loading ? (
          <TableSkeleton rows={5} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : events.length === 0 ? (
          <EmptyState
            title="Belum ada event"
            desc="Tambahkan event pertama lewat menu Input Event Baru, lalu upload Excel hasil event."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2.5">Event</th>
                  <th className="px-3 py-2.5">Jenis</th>
                  <th className="px-3 py-2.5 text-right">Budget</th>
                  <th className="px-3 py-2.5 text-right">DPK Awal</th>
                  <th className="px-3 py-2.5 text-right">DPK Kini</th>
                  <th className="px-3 py-2.5 text-right">Rasio</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const m = e.metrics;
                  return (
                    <tr key={e.id} onClick={() => onNavigate?.('detail', e.id)} className="cursor-pointer border-b border-slate-50 transition hover:bg-bsi-50/40">
                      <td className="px-3 py-3">
                        <p className="font-bold text-bsi-950">{e.nama || '—'}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                          {e.lokasi && <span className="inline-flex items-center gap-1"><MapPin size={11} />{e.lokasi}</span>}
                          {e.tanggal && <span className="inline-flex items-center gap-1"><CalendarDays size={11} />{formatDate(e.tanggal)}</span>}
                          <span className="inline-flex items-center gap-1"><Users size={11} />{formatNumber(m.noaRekening)} NOA</span>
                        </p>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{EVENT_TYPES[e.jenis]?.label || e.jenis}</td>
                      <td className="px-3 py-3 text-right font-semibold text-gold-600">{formatRupiahShort(m.cost)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{formatRupiahShort(m.dpkAwal)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-bsi-700">{formatRupiahShort(m.dpkCurrent)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{m.rasioEfektivitas != null ? `Rp ${formatNumber(Math.round(m.rasioEfektivitas))}` : '—'}</td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={m.boncos ? 'Turun' : m.growthAmount > 0 ? 'Naik' : 'Stagnan'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

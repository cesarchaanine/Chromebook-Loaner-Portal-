import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  FileText, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Headphones, 
  RotateCcw, 
  Trash2, 
  ShieldAlert, 
  Check, 
  Search,
  User as UserIcon,
  DoorOpen,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Loan, LocationKey, LOCATIONS } from '../types';
import { loanService } from '../lib/services';
import Papa from 'papaparse';

interface HeadphoneReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLocation: LocationKey;
  currentUserRole?: string;
  currentUserName?: string;
  onHistoryUpdated?: () => void;
}

export function HeadphoneReportModal({
  isOpen,
  onClose,
  defaultLocation,
  currentUserRole,
  currentUserName,
  onHistoryUpdated
}: HeadphoneReportModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>(defaultLocation || 'ALL');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Default range: current month (1st of this month to today)
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<Loan[]>([]);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Deletion State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'single' | 'batch';
    loan?: Loan;
    count: number;
  } | null>(null);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedLocation(defaultLocation || 'ALL');
      fetchHeadphoneReport(defaultLocation || 'ALL', startDate, endDate, statusFilter);
    }
  }, [isOpen, defaultLocation]);

  const fetchHeadphoneReport = async (
    loc: string,
    start: string,
    end: string,
    stat: string
  ) => {
    setIsLoading(true);
    try {
      const [sY, sM, sD] = start.split('-').map(Number);
      const [eY, eM, eD] = end.split('-').map(Number);
      const startTs = new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime();
      const endTs = new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime();

      const results = await loanService.getFilteredLoans({
        location: loc === 'ALL' ? undefined : loc,
        startTs,
        endTs,
        type: 'headphones',
        status: stat === 'all' ? 'all' : (stat as any)
      });

      setReportData(results);
    } catch (err) {
      console.error('Error fetching headphone report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchHeadphoneReport(selectedLocation, startDate, endDate, statusFilter);
  };

  const handleQuickPreset = (type: 'today' | 'week' | 'month' | 'past30') => {
    const now = new Date();
    let s = new Date();
    const e = now.toISOString().split('T')[0];

    if (type === 'today') {
      s = now;
    } else if (type === 'week') {
      s = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (type === 'month') {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (type === 'past30') {
      s = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const startStr = s.toISOString().split('T')[0];
    setStartDate(startStr);
    setEndDate(e);
    fetchHeadphoneReport(selectedLocation, startStr, e, statusFilter);
  };

  const handleReturnHeadphones = async (loan: Loan) => {
    setReturningId(loan.id);
    try {
      await loanService.returnLoan(loan.id, currentUserName || 'Staff Tech');
      setReportData(prev => prev.map(l => l.id === loan.id ? { 
        ...l, 
        status: 'returned', 
        returnAt: Date.now(),
        returnTechName: currentUserName || 'Staff Tech'
      } : l));
      setActionSuccessMsg(`Headphones for ${loan.teacherName || loan.classroom || 'Room'} marked as returned!`);
      if (onHistoryUpdated) onHistoryUpdated();
      setTimeout(() => setActionSuccessMsg(null), 3500);
    } catch (err: any) {
      alert('Failed to return headphones: ' + err.message);
    } finally {
      setReturningId(null);
    }
  };

  const handleExportCsv = () => {
    if (filteredData.length === 0) return;

    const csvData = filteredData.map(l => ({
      'Checkout Date': new Date(l.checkoutAt).toLocaleDateString() + ' ' + new Date(l.checkoutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      'Return Date': l.returnAt ? new Date(l.returnAt).toLocaleDateString() + ' ' + new Date(l.returnAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'NOT RETURNED (ACTIVE)',
      'Status': l.status.toUpperCase(),
      'Room Number': l.classroom || 'N/A',
      'Teacher Name': l.teacherName || 'N/A',
      'Headphone # / Tag': l.assetTag,
      'Quantity': l.headphoneCount || 1,
      'Campus / Location': l.location,
      'Checked Out By (Tech)': l.techName,
      'Checked In By (Tech)': l.returnTechName || (l.status === 'returned' ? 'Staff' : 'N/A')
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Headphones_Report_${selectedLocation}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const cleanPin = adminPinInput.trim();
    if (cleanPin !== '7324' && cleanPin !== '1974') {
      setPinError('Invalid Admin PIN. Please enter PIN 7324.');
      return;
    }

    setIsDeleting(true);
    setPinError('');

    try {
      if (deleteTarget.type === 'single' && deleteTarget.loan) {
        await loanService.deleteLoan(deleteTarget.loan.id);
        setReportData(prev => prev.filter(l => l.id !== deleteTarget.loan!.id));
        setActionSuccessMsg('Headphone history record deleted!');
      } else if (deleteTarget.type === 'batch') {
        const ids = filteredData.map(l => l.id);
        const deletedCount = await loanService.deleteLoansBatch(ids);
        setReportData(prev => prev.filter(l => !ids.includes(l.id)));
        setActionSuccessMsg(`Successfully deleted ${deletedCount} headphone records!`);
      }

      if (onHistoryUpdated) onHistoryUpdated();
      setDeleteTarget(null);
      setAdminPinInput('');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      setPinError(`Deletion failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter by search term
  const filteredData = reportData.filter(l => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (l.teacherName && l.teacherName.toLowerCase().includes(term)) ||
      (l.classroom && l.classroom.toLowerCase().includes(term)) ||
      (l.assetTag && l.assetTag.toLowerCase().includes(term)) ||
      (l.techName && l.techName.toLowerCase().includes(term))
    );
  });

  if (!isOpen) return null;

  const totalRecords = filteredData.length;
  const activeRecords = filteredData.filter(l => l.status === 'active').length;
  const returnedRecords = filteredData.filter(l => l.status === 'returned').length;
  const totalHeadphoneUnits = filteredData.reduce((acc, l) => acc + (l.headphoneCount || 1), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <motion.div 
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        className="bg-white border-2 border-maroon-950 rounded-2xl shadow-2xl max-w-7xl w-full max-h-[92vh] flex flex-col overflow-hidden relative"
      >
        {/* Header */}
        <div className="bg-purple-900 text-white p-5 flex items-center justify-between border-b-2 border-purple-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <Headphones size={22} className="text-purple-200" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider">Headphones Loan History & Range Report</h2>
              <p className="text-[11px] text-purple-200 font-bold">
                Detailed Handout History, Classroom Tracking, Returns & CSV Export
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success Banner */}
        <AnimatePresence>
          {actionSuccessMsg && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-600 text-white px-6 py-2.5 flex items-center justify-between font-bold text-xs shadow-inner"
            >
              <div className="flex items-center gap-2">
                <Check size={16} />
                <span>{actionSuccessMsg}</span>
              </div>
              <button onClick={() => setActionSuccessMsg(null)} className="text-white/80 hover:text-white">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters & Actions Bar */}
        <div className="p-5 bg-slate-50 border-b-2 border-purple-900/20 space-y-4">
          {/* Quick Presets & Export */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Calendar size={13} className="text-purple-700" /> Presets:
              </span>
              <button 
                onClick={() => handleQuickPreset('today')}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:border-purple-600 rounded-lg text-[10px] font-bold text-slate-700 hover:text-purple-900 transition-all shadow-xs"
              >
                Today
              </button>
              <button 
                onClick={() => handleQuickPreset('week')}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:border-purple-600 rounded-lg text-[10px] font-bold text-slate-700 hover:text-purple-900 transition-all shadow-xs"
              >
                Past 7 Days
              </button>
              <button 
                onClick={() => handleQuickPreset('month')}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:border-purple-600 rounded-lg text-[10px] font-bold text-slate-700 hover:text-purple-900 transition-all shadow-xs"
              >
                This Month
              </button>
              <button 
                onClick={() => handleQuickPreset('past30')}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:border-purple-600 rounded-lg text-[10px] font-bold text-slate-700 hover:text-purple-900 transition-all shadow-xs"
              >
                Past 30 Days
              </button>
            </div>

            <div className="flex items-center gap-2">
              {filteredData.length > 0 && (
                <button
                  onClick={() => {
                    setDeleteTarget({ type: 'batch', count: filteredData.length });
                    setAdminPinInput('');
                    setPinError('');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 hover:text-rose-900 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                  title="Delete filtered records (Requires PIN 7324)"
                >
                  <Trash2 size={13} className="text-rose-600" />
                  <span>Delete Filtered ({filteredData.length})</span>
                </button>
              )}

              <button
                onClick={handleExportCsv}
                disabled={filteredData.length === 0 || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                <Download size={14} />
                <span>Export {filteredData.length} (CSV)</span>
              </button>
            </div>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Campus Selector */}
            <div className="bg-white border border-slate-300 rounded-xl p-2 relative focus-within:border-purple-600">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">CAMPUS / LOCATION</span>
              <select 
                value={selectedLocation} 
                onChange={(e) => setSelectedLocation(e.target.value)}
                disabled={currentUserRole === 'tech'}
                className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none"
              >
                {currentUserRole === 'admin' && <option value="ALL">All Campuses</option>}
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="bg-white border border-slate-300 rounded-xl p-2 relative focus-within:border-purple-600">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">RETURN STATUS</span>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none"
              >
                <option value="all">All (Active & Returned)</option>
                <option value="active">Active Only (Still Out)</option>
                <option value="returned">Returned Only</option>
              </select>
            </div>

            {/* Date Range Inputs */}
            <div className="bg-white border border-slate-300 rounded-xl p-2 flex items-center gap-1 focus-within:border-purple-600">
              <div className="flex-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">START DATE</span>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-transparent text-[11px] font-bold text-slate-800 outline-none"
                />
              </div>
              <span className="text-slate-300 text-xs">→</span>
              <div className="flex-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">END DATE</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-transparent text-[11px] font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Search Input */}
            <div className="bg-white border border-slate-300 rounded-xl p-2 relative focus-within:border-purple-600">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">SEARCH TEACHER / ROOM / #</span>
              <div className="flex items-center gap-1.5">
                <Search size={13} className="text-slate-400" />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ex. Smith, Rm 204, HP-1..."
                  className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none placeholder:text-slate-300"
                />
              </div>
            </div>

            {/* Run Query Button */}
            <button
              onClick={handleApplyFilters}
              disabled={isLoading}
              className="bg-purple-900 hover:bg-purple-950 text-white rounded-xl font-black uppercase text-[11px] tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 p-2 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Filter size={14} /> Run Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Metrics Summary */}
        <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
            <span className="text-[8px] font-black text-purple-600 uppercase tracking-wider block">TOTAL HANDOUTS</span>
            <span className="text-xl font-black text-purple-950">{totalRecords}</span>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-[8px] font-black text-amber-700 uppercase tracking-wider block">CURRENTLY ACTIVE / OUT</span>
            <span className="text-xl font-black text-amber-900">{activeRecords}</span>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <span className="text-[8px] font-black text-emerald-700 uppercase tracking-wider block">RETURNED TO IT</span>
            <span className="text-xl font-black text-emerald-900">{returnedRecords}</span>
          </div>
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
            <span className="text-[8px] font-black text-indigo-700 uppercase tracking-wider block">TOTAL HEADPHONES COUNT</span>
            <span className="text-xl font-black text-indigo-950">{totalHeadphoneUnits} Units</span>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-200">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-3 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest">Loading Headphone Records...</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Headphones size={40} className="mx-auto text-purple-300" />
              <p className="text-xs font-bold uppercase tracking-wider">No Headphone Records Found</p>
              <p className="text-[11px] text-slate-400">Try changing your date range or adjusting the filters above.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Checkout Date & Time</th>
                    <th className="p-3">Room / Classroom #</th>
                    <th className="p-3">Teacher Name</th>
                    <th className="p-3">Headphone # / Tag</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Campus</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Tech</th>
                    <th className="p-3 text-center">Return Action</th>
                    <th className="p-3 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredData.map((loan) => (
                    <tr key={loan.id} className="hover:bg-purple-50/40 transition-colors group">
                      <td className="p-3 whitespace-nowrap text-slate-700 font-bold text-[11px]">
                        {new Date(loan.checkoutAt).toLocaleDateString()} {new Date(loan.checkoutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 font-black text-purple-950">
                        <span className="inline-flex items-center gap-1">
                          <DoorOpen size={13} className="text-purple-600" />
                          {loan.classroom || '—'}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-800">
                        <span className="inline-flex items-center gap-1">
                          <UserIcon size={13} className="text-slate-400" />
                          {loan.teacherName || '—'}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-purple-800">
                        <span className="inline-flex items-center gap-1">
                          <Hash size={12} className="text-purple-400" />
                          {loan.assetTag}
                        </span>
                      </td>
                      <td className="p-3 font-black text-slate-900">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded-md text-[10px] font-black">
                          {loan.headphoneCount || 1}x
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-600">{loan.location}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                          loan.status === 'active' 
                            ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {loan.status === 'active' ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                          {loan.status === 'active' ? 'OUT / ACTIVE' : 'RETURNED'}
                        </span>
                        {loan.returnAt && (
                          <span className="block text-[8px] text-slate-400 mt-0.5">
                            Ret: {new Date(loan.returnAt).toLocaleDateString()} {new Date(loan.returnAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">
                        <div>{loan.techName}</div>
                        {loan.returnTechName && loan.returnTechName !== loan.techName && (
                          <div className="text-[9px] text-emerald-700">Ret: {loan.returnTechName}</div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {loan.status === 'active' ? (
                          <button
                            onClick={() => handleReturnHeadphones(loan)}
                            disabled={returningId === loan.id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
                          >
                            {returningId === loan.id ? (
                              <RotateCcw size={10} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={11} />
                            )}
                            <span>Mark Returned</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center justify-center gap-1">
                            <Check size={12} /> Returned
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setDeleteTarget({ type: 'single', loan, count: 1 });
                            setAdminPinInput('');
                            setPinError('');
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                          title="Delete this history record (Requires PIN 7324)"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t-2 border-purple-900/20 flex justify-between items-center text-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Showing {filteredData.length} records • Total Units: {totalHeadphoneUnits}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleExportCsv}
              disabled={filteredData.length === 0 || isLoading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>

        {/* Admin PIN 7324 Verification Dialog */}
        <AnimatePresence>
          {deleteTarget && (
            <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white border-2 border-maroon-950 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
              >
                <div className="flex items-center gap-3 text-rose-700">
                  <div className="p-2.5 bg-rose-100 rounded-xl border border-rose-200">
                    <ShieldAlert size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                      Authorize History Deletion
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">
                      Admin Verification Required
                    </p>
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1.5 text-xs text-rose-900">
                  <p className="font-bold">
                    {deleteTarget.type === 'single'
                      ? `Permanently delete headphone record for ${deleteTarget.loan?.teacherName || deleteTarget.loan?.classroom || 'Classroom'} (${deleteTarget.loan?.assetTag})?`
                      : `Permanently delete all ${deleteTarget.count} filtered headphone records?`}
                  </p>
                  <p className="text-[10px] text-rose-700 font-medium">
                    This removes the history log from reports. Campus inventory and student profiles remain untouched.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">
                    Enter Admin PIN (7324)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={adminPinInput}
                    onChange={(e) => {
                      setAdminPinInput(e.target.value);
                      setPinError('');
                    }}
                    placeholder="Enter PIN 7324"
                    className="w-full p-3 bg-slate-50 border-2 border-maroon-900 rounded-xl text-center text-lg tracking-widest font-mono font-bold outline-none focus:ring-2 focus:ring-maroon-600"
                    autoFocus
                  />
                  {pinError && (
                    <p className="text-xs font-bold text-rose-600 text-center">{pinError}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => {
                      setDeleteTarget(null);
                      setAdminPinInput('');
                      setPinError('');
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting || !adminPinInput}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isDeleting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trash2 size={13} /> Delete Record
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

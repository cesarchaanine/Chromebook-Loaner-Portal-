import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  FileText, 
  History, 
  User as UserIcon, 
  Monitor, 
  Battery, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Home,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { Student, Loan } from '../types';
import { loanService } from '../lib/services';
import Papa from 'papaparse';

interface StudentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

export function StudentHistoryModal({ isOpen, onClose, student }: StudentHistoryModalProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && student) {
      loadStudentHistory();
    }
  }, [isOpen, student]);

  const loadStudentHistory = async () => {
    if (!student) return;
    setIsLoading(true);
    try {
      const history = await loanService.getStudentLoansHistory(student.id);
      setLoans(history);
    } catch (err) {
      console.error('Error fetching student loan history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportStudentReport = () => {
    if (!student || loans.length === 0) return;

    const csvData = loans.map((l, index) => ({
      'Record #': loans.length - index,
      'Checkout Date': new Date(l.checkoutAt).toLocaleString(),
      'Return Date': l.returnAt ? new Date(l.returnAt).toLocaleString() : 'Active / Not Returned',
      'Device Type': l.type.toUpperCase(),
      'Asset Tag': l.assetTag,
      'Category / Reason': l.reason,
      'Status': l.status.toUpperCase(),
      'Campus / Location': l.location,
      'Classroom': l.classroom || 'N/A',
      'Teacher': l.teacherName || 'N/A',
      'Processed By Tech': l.techName,
      'Student Name': student.name,
      'Student ID': student.id,
      'Student Grade': student.grade || 'N/A',
      'Student Email': student.email || 'N/A'
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Student_Report_${student.name.replace(/\s+/g, '_')}_ID_${student.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || !student) return null;

  // Breakdown statistics
  const chromebookCount = loans.filter(l => l.type === 'chromebook').length;
  const chargerCount = loans.filter(l => l.type === 'charger').length;
  const loanerCount = loans.filter(l => l.reason === 'Loaner').length;
  const brokenCount = loans.filter(l => l.reason === 'Broken').length;
  const forgottenCount = loans.filter(l => l.reason === 'Forgotten at Home').length;
  const lostCount = loans.filter(l => l.reason === 'Lost Chromebook').length;
  const deadCount = loans.filter(l => l.reason === 'CB Dead / Needs Charging').length;
  const otherCount = loans.filter(l => l.reason === 'Other' || l.reason === 'Quick').length;
  const activeLoans = loans.filter(l => l.status === 'active');

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-white border-2 border-maroon-950 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-maroon-900 text-white p-5 flex items-center justify-between border-b-2 border-maroon-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl border border-white/20">
              <UserIcon size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider">{student.name}</h2>
              <p className="text-[11px] text-maroon-200 font-bold">
                Student ID: <span className="text-white font-mono">{student.id}</span> • Campus: <span className="text-white">{student.location}</span>
                {student.grade && <> • Grade: <span className="text-white">{student.grade}</span></>}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {/* Top Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Total Borrowed</span>
              <span className="text-2xl font-black text-slate-900">{loans.length}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">All-time transactions</span>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 text-center">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider block">Chromebooks</span>
              <span className="text-2xl font-black text-blue-900">{chromebookCount}</span>
              <span className="text-[9px] text-blue-600/70 block mt-0.5">Device checkouts</span>
            </div>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 text-center">
              <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider block">Chargers</span>
              <span className="text-2xl font-black text-amber-900">{chargerCount}</span>
              <span className="text-[9px] text-amber-600/70 block mt-0.5">Power cables</span>
            </div>

            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-3 text-center">
              <span className="text-[9px] font-black text-purple-600 uppercase tracking-wider block">Currently Active</span>
              <span className="text-2xl font-black text-purple-900">{activeLoans.length}</span>
              <span className="text-[9px] text-purple-600/70 block mt-0.5">Not yet returned</span>
            </div>
          </div>

          {/* Detailed Category Breakdown */}
          <div className="bg-slate-50 border-2 border-maroon-900/40 rounded-xl p-4 space-y-3">
            <h4 className="text-[10px] font-black text-maroon-900 uppercase tracking-widest flex items-center gap-1.5">
              <Layers size={14} className="text-maroon-700" /> Category & Reason Breakdown
            </h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-center">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-tight block">Standard Loan</span>
                <span className="text-lg font-black text-slate-800">{loanerCount}</span>
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                <span className="text-[8px] font-black text-emerald-700 uppercase tracking-tight block">Forgotten</span>
                <span className="text-lg font-black text-emerald-800">{forgottenCount}</span>
              </div>

              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-center">
                <span className="text-[8px] font-black text-rose-700 uppercase tracking-tight block">Broken</span>
                <span className="text-lg font-black text-rose-800">{brokenCount}</span>
              </div>

              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
                <span className="text-[8px] font-black text-indigo-700 uppercase tracking-tight block">Lost Device</span>
                <span className="text-lg font-black text-indigo-900">{lostCount}</span>
              </div>

              <div className="p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                <span className="text-[8px] font-black text-yellow-700 uppercase tracking-tight block">Dead / Charge</span>
                <span className="text-lg font-black text-yellow-800">{deadCount}</span>
              </div>

              <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-lg text-center">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-tight block">Other / Misc</span>
                <span className="text-lg font-black text-slate-800">{otherCount}</span>
              </div>
            </div>
          </div>

          {/* Full Transaction History Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <History size={14} className="text-maroon-700" /> Full Checkout History ({loans.length})
              </h4>
              <button
                onClick={handleExportStudentReport}
                disabled={loans.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-xs"
              >
                <Download size={12} />
                <span>Export Student Report (CSV)</span>
              </button>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <div className="w-6 h-6 border-2 border-maroon-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Loading history logs...</span>
              </div>
            ) : loans.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400">
                <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold uppercase tracking-wider">No Borrowing History Found</p>
                <p className="text-[10px] text-slate-400">This student has not checked out any Chromebooks or chargers yet.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Date & Time</th>
                      <th className="p-2.5">Device Type</th>
                      <th className="p-2.5">Asset Tag</th>
                      <th className="p-2.5">Category / Reason</th>
                      <th className="p-2.5">Campus</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Tech</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {loans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 whitespace-nowrap text-slate-600 font-bold text-[11px]">
                          {new Date(loan.checkoutAt).toLocaleDateString()} {new Date(loan.checkoutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            loan.type === 'chromebook' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {loan.type === 'chromebook' ? <Monitor size={10} /> : <Battery size={10} />}
                            {loan.type}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-slate-700">{loan.assetTag}</td>
                        <td className="p-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold ${
                            loan.reason === 'Broken' ? 'bg-rose-100 text-rose-800' :
                            loan.reason === 'Forgotten at Home' ? 'bg-emerald-100 text-emerald-800' :
                            loan.reason === 'Lost Chromebook' ? 'bg-purple-100 text-purple-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {loan.reason}
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-slate-600">{loan.location}</td>
                        <td className="p-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            loan.status === 'active' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {loan.status === 'active' ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                            {loan.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-500 text-[11px]">{loan.techName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t-2 border-maroon-900 flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Total Records: {loans.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all"
            >
              Close
            </button>
            <button
              onClick={handleExportStudentReport}
              disabled={loans.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-sm transition-all flex items-center gap-1.5"
            >
              <Download size={13} /> Export Report (CSV)
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

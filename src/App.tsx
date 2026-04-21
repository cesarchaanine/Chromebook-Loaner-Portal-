import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  LogOut, 
  Shield, 
  Zap,
  User as UserIcon, 
  Monitor, 
  Battery, 
  ChevronRight, 
  Upload, 
  CheckCircle2, 
  Clock,
  History,
  AlertCircle,
  X,
  Trash2,
  UserPlus,
  ChevronDown,
  RotateCcw,
  Home,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { auth, db } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { cn } from './lib/utils';
import { 
  LOCATIONS, 
  LocationKey, 
  Student, 
  Loan, 
  LoanReason,
  User
} from './types';
import { loanService, studentService, userService } from './lib/services';
import Papa from 'papaparse';

// --- Components ---

interface HoldToResetButtonProps {
  onReset: () => void;
  label: string;
  className?: string;
  icon?: React.ReactNode;
}

function HoldToResetButton({ onReset, label, className, icon }: HoldToResetButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = React.useRef<number>(0);

  const startHold = () => {
    setIsHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();
    
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / 1200) * 100, 100); // 1.2 seconds hold
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        clearInterval(timerRef.current!);
        onReset();
        setIsHolding(false);
        setProgress(0);
      }
    }, 50);
  };

  const stopHold = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsHolding(false);
    setProgress(0);
  };

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={stopHold}
      onMouseLeave={stopHold}
      onTouchStart={startHold}
      onTouchEnd={stopHold}
      className={cn(
        "relative flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border border-slate-100 bg-white/50 hover:bg-white hover:border-maroon-100 text-[8px] font-black uppercase tracking-widest transition-all overflow-hidden group shadow-sm active:scale-95",
        isHolding ? "text-maroon-700 ring-2 ring-maroon-100 ring-offset-1" : "text-slate-400 hover:text-maroon-600",
        className
      )}
    >
      <div className="relative z-10 flex items-center gap-2">
        {icon || <RotateCcw size={10} className={cn("transition-transform group-hover:rotate-45", isHolding && "rotate-reverse")} />}
        <span>{label}</span>
      </div>
      {isHolding && (
        <div 
          className="absolute inset-0 bg-maroon-50 transition-all duration-75 origin-left"
          style={{ width: `${progress}%` }}
        />
      )}
    </button>
  );
}

function Login() {
  const { loginWithPin, loginWithTechName } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [techName, setTechName] = useState('');

  const handleTechLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const success = await loginWithTechName(techName);
      if (!success) {
        setError('Tech name not found. Contact Admin to register your campus.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const success = await loginWithPin(pin);
      if (!success) {
        setError('Invalid Admin PIN');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[40px] p-12 shadow-2xl border border-slate-200 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-maroon-600" />
        
        <div className="text-center mb-12">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-2 uppercase leading-tight">AOH Portal<br/><span className="text-maroon-600">loaner chromebooks</span></h1>
          <div className="flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-slate-200" />
            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-[0.3em]">Official School System</p>
            <span className="h-px w-8 bg-slate-200" />
          </div>
        </div>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-bold flex items-center gap-3"
          >
            <AlertCircle size={18} />
            {error}
          </motion.div>
        )}

        <div className="space-y-6">
          <form onSubmit={handleTechLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Technician Name</label>
              <input 
                type="text"
                value={techName}
                onChange={(e) => setTechName(e.target.value)}
                placeholder="First Last"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-maroon-500 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !techName}
              className="w-full py-4 bg-maroon-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-maroon-700 transition-all shadow-xl shadow-maroon-100 active:scale-[0.98] disabled:opacity-50"
            >
              Log in to My Campus
            </button>
          </form>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-[10px] uppercase font-black text-slate-300">ADMIN ONLY</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          <form onSubmit={handlePinLogin} className="flex gap-2">
            <input 
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono focus:ring-2 focus:ring-slate-400 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-950 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              Admin Access
            </button>
          </form>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col items-center gap-4">
          <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-loose max-w-[200px]">
            Security Notice: Access restricted to assigned campus personnel.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function ActivityRow(props: any) {
  const { loan, onReturn } = props;
  return (
    <div className="text-[10px] flex justify-between items-center border-b border-slate-50/50 pb-3 group last:border-0 hover:bg-slate-50/50 px-2 rounded-lg transition-all">
      <div className="flex flex-col items-start gap-1 py-1">
        <div className="flex items-center gap-2">
          {loan.status === 'active' && <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" />}
          <span className="font-black uppercase text-slate-800 tracking-tight">
            {loan.studentName}
            {loan.type === 'charger' && loan.studentId === 'ANON' && <span className="text-slate-400 ml-1 font-medium lowercase">(untracked)</span>}
          </span>
          <span className="text-slate-400 font-medium lowercase tracking-tight">took {loan.type}</span>
        </div>
        <div className="flex items-center gap-4 pl-4">
          <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded">TAG: {loan.assetTag}</span>
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tight italic">{loan.reason}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end opacity-40 group-hover:opacity-100 transition-opacity">
           <span className="text-[7px] text-slate-400 uppercase font-black tracking-widest">{new Date(loan.updatedAt || loan.checkoutAt).toLocaleDateString()}</span>
           <span className="text-slate-900 font-black whitespace-nowrap leading-none mt-1">{new Date(loan.updatedAt || loan.checkoutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        
        <div className="flex flex-col items-end min-w-[60px]">
          {loan.status === 'active' ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 uppercase font-black text-[8px] tracking-widest">Active</span>
              <button 
                onClick={() => onReturn(loan.id)}
                className="text-maroon-700 font-black uppercase text-[10px] tracking-widest hover:text-maroon-900 hover:scale-105 transition-all bg-maroon-50 px-2 py-1 rounded-md"
              >
                Return
              </button>
            </div>
          ) : (
            <span className="text-green-600 uppercase font-black text-[8px] tracking-widest bg-green-50 px-2 py-1 rounded-md">Returned</span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusOverlay({ status, onDismiss }: { status: any, onDismiss: () => void }) {
  if (!status.type) return null;
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200",
        "bg-white/95 backdrop-blur-sm rounded-2xl"
      )}
    >
      <div className={cn(
        "mb-3 p-3 rounded-full",
        status.type === 'success' ? "bg-green-50 text-green-600" : 
        status.type === 'error' ? "bg-red-50 text-red-600" : 
        "bg-maroon-50 text-maroon-600"
      )}>
        {status.type === 'success' ? <CheckCircle2 size={32} /> : 
         status.type === 'error' ? <AlertCircle size={32} /> :
         <RotateCcw size={32} className="animate-spin" />}
      </div>
      
      <p className={cn(
        "text-[10px] font-black uppercase tracking-[0.1em] mb-4 px-4 line-clamp-2",
        status.type === 'success' ? "text-green-700" : 
        status.type === 'error' ? "text-red-700" : 
        "text-maroon-700"
      )}>
        {status.message}
      </p>

      {status.type !== 'loading' && (
        <button 
          onClick={onDismiss}
          className="px-6 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
        >
          Dismiss
        </button>
      )}
    </motion.div>
  );
}

function MainApp() {
  const { user, logout } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<LocationKey>((user?.location as LocationKey) || LOCATIONS[0]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [assetTag, setAssetTag] = useState('');
  const [reason, setReason] = useState<LoanReason>('Lost Chromebook');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const [quickAssetTag, setQuickAssetTag] = useState('');
  const [chargerSearchQuery, setChargerSearchQuery] = useState('');
  const [chargerQuantity, setChargerQuantity] = useState(1);
  const [chargerSearchResults, setChargerSearchResults] = useState<Student[]>([]);
  const [selectedQuickStudent, setSelectedQuickStudent] = useState<Student | null>(null);

  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [recentLoans, setRecentLoans] = useState<Loan[]>([]);
  
  const [reportStart, setReportStart] = useState(new Date().toISOString().split('T')[0]);
  const [reportEnd, setReportEnd] = useState(new Date().toISOString().split('T')[0]);
  
  // Helper to load location-specific resets
  const [resetCBOutTs, setResetCBOutTs] = useState<number>(0);
  const [resetChargerTs, setResetChargerTs] = useState<number>(0);
  const [resetQuickCBTs, setResetQuickCBTs] = useState<number>(0);
  const [resetForgottenTs, setResetForgottenTs] = useState<number>(0);
  const [resetBrokenTs, setResetBrokenTs] = useState<number>(0);
  const [resetLostTs, setResetLostTs] = useState<number>(0);
  const [resetQuickChargerTs, setResetQuickChargerTs] = useState<number>(0);
  const [resetQuickAnonChargerTs, setResetQuickAnonChargerTs] = useState<number>(0);
  const [anonChargerQuantity, setAnonChargerQuantity] = useState(1);

  const [handoutStatus, setHandoutStatus] = useState<{
    message: string,
    type: 'success' | 'error' | 'loading' | null
  }>({ message: '', type: null });

  const [quickCbStatus, setQuickCbStatus] = useState<{
    message: string,
    type: 'success' | 'error' | 'loading' | null
  }>({ message: '', type: null });

  // Modified loadData to be less disruptive (doesn't clear UI state unless needed)
  const loadData = useCallback(async (location: string, silent = false) => {
    if (!location) return;
    
    if (!silent) {
      setActiveLoans([]);
      setRecentLoans([]);
      setSearchResults([]);
      setChargerSearchResults([]);
    }
    
    // Refresh timestamps for local session filtering
    setResetCBOutTs(parseInt(localStorage.getItem(`aoh_portal_cb_reset_ts_${location}`) || '0', 10));
    setResetChargerTs(parseInt(localStorage.getItem(`aoh_portal_chg_reset_ts_${location}`) || '0', 10));
    setResetQuickCBTs(parseInt(localStorage.getItem(`aoh_portal_quick_cb_reset_ts_${location}`) || '0', 10));
    setResetForgottenTs(parseInt(localStorage.getItem(`aoh_portal_forgotten_reset_ts_${location}`) || '0', 10));
    setResetBrokenTs(parseInt(localStorage.getItem(`aoh_portal_broken_reset_ts_${location}`) || '0', 10));
    setResetLostTs(parseInt(localStorage.getItem(`aoh_portal_lost_reset_ts_${location}`) || '0', 10));
    setResetQuickChargerTs(parseInt(localStorage.getItem(`aoh_portal_quick_chg_reset_ts_${location}`) || '0', 10));
    setResetQuickAnonChargerTs(parseInt(localStorage.getItem(`aoh_portal_quick_anon_chg_reset_ts_${location}`) || '0', 10));

    try {
      const [active, recent] = await Promise.all([
        loanService.getActiveLoans(location),
        loanService.getRecentLoans(location)
      ]);
      setActiveLoans(active);
      setRecentLoans(recent);
    } catch (err) {
      console.error("Data load error:", err);
    }
  }, []);

  const handleResetCB = useCallback(() => {
    const now = Date.now();
    setResetCBOutTs(now);
    localStorage.setItem(`aoh_portal_cb_reset_ts_${selectedLocation}`, now.toString());
    loadData(selectedLocation);
    setCheckoutStatus({ message: 'CB Session Reset!', type: 'success' });
  }, [selectedLocation, loadData]);

  const handleResetCharger = useCallback(() => {
    const now = Date.now();
    setResetChargerTs(now);
    localStorage.setItem(`aoh_portal_chg_reset_ts_${selectedLocation}`, now.toString());
    loadData(selectedLocation);
    setQuickChargerStatus({ message: 'Charger Session Reset!', type: 'success' });
  }, [selectedLocation, loadData]);

  const handleResetQuickCB = useCallback(() => {
    const now = Date.now();
    setResetQuickCBTs(now);
    localStorage.setItem(`aoh_portal_quick_cb_reset_ts_${selectedLocation}`, now.toString());
    setQuickAssetTag('');
    loadData(selectedLocation);
    setQuickCbStatus({ message: 'Quick CB Session Reset!', type: 'success' });
  }, [selectedLocation, loadData]);

  const handleResetForgotten = useCallback(() => {
    const now = Date.now();
    setResetForgottenTs(now);
    localStorage.setItem(`aoh_portal_forgotten_reset_ts_${selectedLocation}`, now.toString());
    loadData(selectedLocation);
  }, [selectedLocation, loadData]);

  const handleResetBroken = useCallback(() => {
    const now = Date.now();
    setResetBrokenTs(now);
    localStorage.setItem(`aoh_portal_broken_reset_ts_${selectedLocation}`, now.toString());
    loadData(selectedLocation);
  }, [selectedLocation, loadData]);

  const handleResetLost = useCallback(() => {
    const now = Date.now();
    setResetLostTs(now);
    localStorage.setItem(`aoh_portal_lost_reset_ts_${selectedLocation}`, now.toString());
    loadData(selectedLocation);
  }, [selectedLocation, loadData]);

  const handleResetQuickCharger = useCallback(() => {
    const now = Date.now();
    setResetQuickChargerTs(now);
    localStorage.setItem(`aoh_portal_quick_chg_reset_ts_${selectedLocation}`, now.toString());
    setChargerSearchQuery('');
    loadData(selectedLocation);
    setQuickChargerStatus({ message: 'Named Charger Session Reset!', type: 'success' });
  }, [selectedLocation, loadData]);

  const handleResetQuickAnonCharger = useCallback(() => {
    const now = Date.now();
    setResetQuickAnonChargerTs(now);
    localStorage.setItem(`aoh_portal_quick_anon_chg_reset_ts_${selectedLocation}`, now.toString());
    setAnonChargerQuantity(1);
    loadData(selectedLocation);
    setHandoutStatus({ message: 'Anon Charger Session Reset!', type: 'success' });
  }, [selectedLocation, loadData]);

  const [dbStatus, setDbStatus] = useState<{
    message: string, 
    type: 'success' | 'error' | 'loading' | null,
    progress?: number
  }>({ message: '', type: null });

  const [techStatus, setTechStatus] = useState<{
    message: string, 
    type: 'success' | 'error' | 'loading' | null
  }>({ message: '', type: null });

  const [checkoutStatus, setCheckoutStatus] = useState<{
    message: string,
    type: 'success' | 'error' | 'loading' | null
  }>({ message: '', type: null });

  const [quickChargerStatus, setQuickChargerStatus] = useState<{
    message: string,
    type: 'success' | 'error' | 'loading' | null
  }>({ message: '', type: null });

  // Tech Management State
  const [techs, setTechs] = useState<User[]>([]);
  const [newTechName, setNewTechName] = useState('');
  const [newTechLocation, setNewTechLocation] = useState<LocationKey>(LOCATIONS[0]);
  const [isRegisteringTech, setIsRegisteringTech] = useState(false);
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [editingTechName, setEditingTechName] = useState('');
  const [editingTechLocation, setEditingTechLocation] = useState<LocationKey | null>(null);
  const [isManageMode, setIsManageMode] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Lock tech to their assigned location
  useEffect(() => {
    if (user?.role === 'tech' && user.location) {
      setSelectedLocation(user.location as LocationKey);
    }
  }, [user]);

  useEffect(() => {
    if (selectedLocation) {
      loadData(selectedLocation);
      setSearchQuery('');
      setChargerSearchQuery('');
    }
    if (user?.role === 'admin') {
      loadTechs();
    }
  }, [selectedLocation, user]);

  const loadTechs = async () => {
    try {
      const list = await userService.getTechs();
      setTechs(list);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterTech = async () => {
    if (!newTechName || !newTechLocation) return;
    setIsRegisteringTech(true);
    try {
      await userService.registerTech(newTechName, newTechLocation);
      setNewTechName('');
      loadTechs();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRegisteringTech(false);
    }
  };

  const handleDeleteTech = async (uid: string) => {
    // Save previous state for rollback
    const previousTechs = [...techs];
    
    // Optimistic Update: Remove from UI immediately
    setTechs(prev => prev.filter(t => t.uid !== uid));
    setTechStatus({ message: 'Removing technician...', type: 'loading' });
    setConfirmDeleteId(null);
    
    try {
      // Direct deletion from the doc ID
      await userService.deleteTech(uid);
      // Wait a moment for consistency then reload
      setTimeout(() => loadTechs(), 500);
      setTechStatus({ message: 'Technician removed successfully.', type: 'success' });
    } catch (err: any) {
      console.error("Deletion error:", err);
      // Rollback on failure
      setTechs(previousTechs);
      setTechStatus({ message: 'Failed to remove: ' + err.message, type: 'error' });
    }
  };

  const handleStartEditTech = (tech: User) => {
    setEditingTechId(tech.uid);
    setEditingTechName(tech.name);
    setEditingTechLocation(tech.location as LocationKey || null);
  };

  const handleCancelEditTech = () => {
    setEditingTechId(null);
    setEditingTechName('');
    setEditingTechLocation(null);
  };

  const handleUpdateTech = async () => {
    if (!editingTechId || !editingTechName) return;
    setTechStatus({ message: 'Updating technician...', type: 'loading' });
    try {
      await userService.updateTech(editingTechId, {
        name: editingTechName.trim(),
        location: editingTechLocation || undefined
      });
      setEditingTechId(null);
      await loadTechs();
      setTechStatus({ message: 'Technician updated successfully.', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setTechStatus({ message: 'Update failed: ' + err.message, type: 'error' });
    }
  };


  const handleStudentSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length > 0) {
      const results = await studentService.searchStudents(selectedLocation, val);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleCheckout = async () => {
    if (!selectedStudent || !assetTag || !user) return;
    setCheckoutStatus({ message: 'Logging checkout...', type: 'loading' });
    try {
      await loanService.checkout({
        type: 'chromebook',
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        studentEmail: selectedStudent.email || undefined,
        studentGrade: selectedStudent.grade || undefined,
        assetTag,
        reason,
        location: selectedLocation,
        techId: user.uid,
        techName: user.name
      });
      setSelectedStudent(null);
      setAssetTag('');
      setSearchQuery('');
      setSearchResults([]);
      setCheckoutStatus({ message: 'Check-out Logged!', type: 'success' });
      loadData(selectedLocation);
    } catch (err: any) {
      console.error(err);
      setCheckoutStatus({ message: 'Failed: ' + err.message, type: 'error' });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleQuickLoan = async () => {
    if (!quickAssetTag || !user) return;
    setQuickCbStatus({ message: 'Logging quick loan...', type: 'loading' });
    try {
      await loanService.checkout({
        type: 'chromebook',
        assetTag: quickAssetTag,
        reason: 'Quick',
        location: selectedLocation,
        techId: user.uid,
        techName: user.name
      });
      setQuickAssetTag('');
      setQuickCbStatus({ message: 'Handout Logged!', type: 'success' });
      loadData(selectedLocation);
    } catch (err: any) {
      console.error(err);
      setQuickCbStatus({ message: 'Failed: ' + err.message, type: 'error' });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleResetActivity = useCallback(async (customStatus?: any) => {
    if (!window.confirm("ARE YOU SURE? This will clear all activity and counts for this LOCATION. (Students remain safe)")) return;
    
    const targetStatus = customStatus || setDbStatus;
    targetStatus({ message: 'Resetting location activity...', type: 'loading' });
    
    // INSTANT FEEDBACK
    setActiveLoans([]);
    setRecentLoans([]);
    
    try {
      await loanService.clearLoans(selectedLocation);
      
      const now = Date.now();
      const nowStr = now.toString();
      
      localStorage.setItem(`aoh_portal_cb_reset_ts_${selectedLocation}`, nowStr);
      localStorage.setItem(`aoh_portal_chg_reset_ts_${selectedLocation}`, nowStr);
      localStorage.setItem(`aoh_portal_quick_cb_reset_ts_${selectedLocation}`, nowStr);
      localStorage.setItem(`aoh_portal_forgotten_reset_ts_${selectedLocation}`, nowStr);
      localStorage.setItem(`aoh_portal_broken_reset_ts_${selectedLocation}`, nowStr);
      localStorage.setItem(`aoh_portal_lost_reset_ts_${selectedLocation}`, nowStr);
      localStorage.setItem(`aoh_portal_quick_chg_reset_ts_${selectedLocation}`, nowStr);
      localStorage.setItem(`aoh_portal_quick_anon_chg_reset_ts_${selectedLocation}`, nowStr);
      
      setResetCBOutTs(now);
      setResetChargerTs(now);
      setResetQuickCBTs(now);
      setResetForgottenTs(now);
      setResetBrokenTs(now);
      setResetLostTs(now);
      setResetQuickChargerTs(now);
      setResetQuickAnonChargerTs(now);
      
      await loadData(selectedLocation);
      targetStatus({ message: 'SUCCESS: Location activity reset.', type: 'success' });
    } catch (err: any) {
      console.error("Clear activity error:", err);
      targetStatus({ message: `ERROR: ${err.message}`, type: 'error' });
      loadData(selectedLocation);
    }
  }, [selectedLocation, loadData]);

  const handleSystemWipe = useCallback(async (customStatus?: any) => {
    if (!window.confirm("GLOBAL WIPE: Delete ALL loan activity across ALL campuses? (Student database will be preserved)")) return;
    
    const targetStatus = customStatus || setDbStatus;
    targetStatus({ message: 'GLOBAL ACTIVITY WIPE IN PROGRESS...', type: 'loading' });
    
    setActiveLoans([]);
    setRecentLoans([]);
    
    try {
      await loanService.wipeAllLoans();
      
      const now = Date.now();
      const nowStr = now.toString();

      LOCATIONS.forEach(loc => {
        localStorage.setItem(`aoh_portal_cb_reset_ts_${loc}`, nowStr);
        localStorage.setItem(`aoh_portal_chg_reset_ts_${loc}`, nowStr);
        localStorage.setItem(`aoh_portal_quick_cb_reset_ts_${loc}`, nowStr);
        localStorage.setItem(`aoh_portal_forgotten_reset_ts_${loc}`, nowStr);
        localStorage.setItem(`aoh_portal_broken_reset_ts_${loc}`, nowStr);
        localStorage.setItem(`aoh_portal_lost_reset_ts_${loc}`, nowStr);
        localStorage.setItem(`aoh_portal_quick_chg_reset_ts_${loc}`, nowStr);
        localStorage.setItem(`aoh_portal_quick_anon_chg_reset_ts_${loc}`, nowStr);
      });
      
      setResetCBOutTs(now);
      setResetChargerTs(now);
      setResetQuickCBTs(now);
      setResetForgottenTs(now);
      setResetBrokenTs(now);
      setResetLostTs(now);
      setResetQuickChargerTs(now);
      setResetQuickAnonChargerTs(now);
      
      await loadData(selectedLocation);
      targetStatus({ message: 'SUCCESS: All campus activity purged.', type: 'success' });
    } catch (err: any) {
      console.error("System wipe error:", err);
      targetStatus({ message: `WIPE FAILED: ${err.message}`, type: 'error' });
      loadData(selectedLocation);
    }
  }, [selectedLocation, loadData]);

  const handleFactoryReset = useCallback(async () => {
    if (!window.confirm("TOTAL FACTORY RESET: This deletes EVERYTHING (Students, Activity, Techs). Are you absolutely sure?")) return;
    
    setDbStatus({ message: 'FACTORY RESET IN PROGRESS...', type: 'loading' });
    try {
      await loanService.wipeAllLoans();
      await studentService.wipeAllStudents();
      localStorage.clear();
      window.location.reload();
    } catch (err: any) {
      console.error("Factory reset error:", err);
      setDbStatus({ message: `RESET FAILED: ${err.message}`, type: 'error' });
    }
  }, []);

  const handleReturn = async (loanId: string) => {
    // Optimistic update
    setActiveLoans(prev => prev.filter(l => l.id !== loanId));
    setRecentLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: 'returned', returnAt: Date.now() } : l));
    
    try {
      await loanService.returnLoan(loanId);
      // Wait a bit to ensure Firestore has updated before re-fetching
      setTimeout(() => loadData(selectedLocation), 500);
    } catch (err: any) {
      console.error(err);
      setCheckoutStatus({ message: 'Return Failed: ' + err.message, type: 'error' });
      loadData(selectedLocation); // Revert on failure
    }
  };

  const handleDeleteAllStudents = async () => {
    if (!user || user.role !== 'admin') return;
    if (!confirm(`WARNING: This will permanently delete ALL student records for ${selectedLocation}. This cannot be undone. Are you sure?`)) return;
    
    setDbStatus({ message: 'Deleting database...', type: 'loading' });
    try {
      await studentService.clearStudents(selectedLocation);
      setDbStatus({ message: 'SUCCESS: Student database cleared.', type: 'success' });
    } catch (err: any) {
      setDbStatus({ message: `FAILED: ${err.message}`, type: 'error' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDbStatus({ message: 'Verifying permissions...', type: 'loading', progress: 0 });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const students = results.data.map((row: any) => {
          // Normalize matching for headers
          const keys = Object.keys(row);
          const getVal = (patterns: string[]) => {
            const match = keys.find(k => {
              const cleaned = k.toLowerCase().replace(/[^a-z0-9]/g, '');
              return patterns.some(p => cleaned.includes(p));
            });
            return match ? String(row[match]).trim() : '';
          };

          const id = getVal(['schoolid', 'studentid', 'id']);
          const fName = getVal(['firstname', 'first']);
          const lName = getVal(['lastname', 'last']);
          const email = getVal(['email']);
          const grade = getVal(['grade']);
          const fullName = getVal(['studentname', 'name']);
          
          // Logic: Prioritize combined First + Last if both exist, otherwise use full name field
          let finalName = '';
          if (fName && lName) {
            finalName = `${fName} ${lName}`.replace(/\s+/g, ' ').trim();
          } else {
            finalName = (fullName || fName || lName || 'MISSING_NAME').trim();
          }
          
          return { 
            id: id || 'MISSING_ID', 
            name: finalName,
            email: email || null,
            grade: grade || null
          };
        }).filter(s => s.id !== 'MISSING_ID' && s.name !== 'MISSING_NAME');

        if (students.length > 0) {
          try {
            setDbStatus({ message: `Preparing ${students.length} records...`, type: 'loading', progress: 5 });
            
            // Short delay to ensure Firebase Auth has settled if just reloaded
            await new Promise(resolve => setTimeout(resolve, 500));

            await studentService.uploadStudents(
              selectedLocation, 
              students, 
              (p) => setDbStatus(prev => ({ ...prev, progress: Math.max(5, p) }))
            );
            
            setDbStatus({ 
              message: `SUCCESS: Updated ${students.length} students for ${selectedLocation}`, 
              type: 'success' 
            });
          } catch (err: any) {
            console.error("Critical Upload Error:", err);
            setDbStatus({ 
              message: `FAILED: ${err.code || 'Error'} - ${err.message}`, 
              type: 'error' 
            });
          }
        } else {
          setDbStatus({ message: 'FAILED: No valid student data (School Id # / Name) found.', type: 'error' });
        }
      }
    });

    // Reset input
    e.target.value = '';
  };

  const handleGenerateReport = () => {
    const start = new Date(reportStart).getTime();
    const end = new Date(reportEnd).setHours(23, 59, 59, 999);
    
    const filtered = recentLoans.filter(l => {
      const ts = l.updatedAt || l.checkoutAt;
      return ts >= start && ts <= end;
    });
    
    if (filtered.length === 0) {
      alert("No data found for the selected range.");
      return;
    }

    const csvData = filtered.map(l => ({
      'Action Date': new Date(l.updatedAt || l.checkoutAt).toLocaleString(),
      'Checkout Date': new Date(l.checkoutAt).toLocaleString(),
      'Return Date': l.returnAt ? new Date(l.returnAt).toLocaleString() : 'N/A',
      'Type': l.type.toUpperCase(),
      'Status': l.status.toUpperCase(),
      'Student Name': l.studentName || 'N/A',
      'Student ID': l.studentId || 'N/A',
      'Student Email': l.studentEmail || 'N/A',
      'Student Grade': l.studentGrade || 'N/A',
      'Asset Tag': l.assetTag,
      'Reason': l.reason,
      'Location': l.location,
      'Technician': l.techName
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Detailed_Loan_Report_${reportStart}_to_${reportEnd}.csv`;
    a.click();
  };

  const handleChargerLoan = async (isAnonymous = false, customName?: string) => {
    if (!user) return;
    
    const targetStatus = isAnonymous ? setHandoutStatus /* New Anon Section */ : setQuickChargerStatus;

    targetStatus({ 
      message: `Logging ${chargerQuantity} Charger${chargerQuantity > 1 ? 's' : ''}...`, 
      type: 'loading'
    });

    try {
      let targetStudent = selectedQuickStudent;
      const count = isAnonymous ? Math.max(1, anonChargerQuantity) : 1;
      
      // If we are in the "Named" section and no student selected but we have a query
      if (!targetStudent && !isAnonymous && chargerSearchQuery && chargerSearchQuery.trim().length > 0) {
        const studentResults = await studentService.searchStudents(selectedLocation, chargerSearchQuery);
        targetStudent = studentResults.find(s => s.id === chargerSearchQuery) || null;
      }

      const loansToCreate = [];
      for (let i = 0; i < count; i++) {
        const loanData: any = {
          type: 'charger',
          studentId: targetStudent?.id || (isAnonymous ? 'ANONYMOUS' : (chargerSearchQuery.trim() || 'N/A')),
          studentName: targetStudent?.name || customName?.trim() || (isAnonymous ? 'Anonymous Handout' : 'Named Charger Handout'),
          studentEmail: targetStudent?.email || null,
          studentGrade: targetStudent?.grade || (targetStudent ? 'N/A' : null),
          // Interference Guard: Differentiate by reason
          reason: isAnonymous ? 'Quick-Anon' : 'Quick-Student',
          assetTag: `CHG-${isAnonymous ? 'ANON' : 'STUDENT'}-${Date.now()}-${i}`,
          location: selectedLocation,
          techId: user.uid,
          techName: user.name
        };
        loansToCreate.push(loanService.checkout(loanData));
      }

      await Promise.all(loansToCreate);
      
      if (!isAnonymous) {
        setChargerSearchQuery('');
        setSelectedQuickStudent(null);
      }
      setAnonChargerQuantity(1);
      targetStatus({ message: `${count} Charger${count > 1 ? 's' : ''} Logged!`, type: 'success' });
      
      await loadData(selectedLocation, true); // SILENT LOAD
    } catch (err: any) {
      console.error("Charger Handout Error:", err);
      targetStatus({ message: 'Failed: ' + (err.message || 'Check database'), type: 'error' });
    }
  };

  const handleQuickChargerSearch = async (val: string) => {
    setChargerSearchQuery(val);
    if (val.length > 1) {
      const results = await studentService.searchStudents(selectedLocation, val);
      setChargerSearchResults(results);
      
      // Auto-pull/select: If it's an exact ID match and unique, pull it automatically
      const exactMatch = results.find(s => s.id === val);
      if (exactMatch && results.length === 1) {
        setSelectedQuickStudent(exactMatch);
        setChargerSearchResults([]);
        setChargerSearchQuery('');
      }
    } else {
      setChargerSearchResults([]);
    }
  };

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();

    const getTs = (val: any) => {
      if (typeof val === 'number') return val;
      if (val && typeof val.toMillis === 'function') return val.toMillis();
      if (val && typeof val.seconds === 'number') return val.seconds * 1000;
      return 0;
    };
    
    // Independent session starts
    const cbStart = Math.max(todayTs, resetCBOutTs);
    const chgStart = Math.max(todayTs, resetChargerTs);
    const forgottenStart = Math.max(todayTs, resetForgottenTs);
    const brokenStart = Math.max(todayTs, resetBrokenTs);
    const lostStart = Math.max(todayTs, resetLostTs);
    const quickChgStart = Math.max(todayTs, resetQuickChargerTs);
    const anonChgStart = Math.max(todayTs, resetQuickAnonChargerTs);
    const quickCbStart = Math.max(todayTs, resetQuickCBTs);

    const cbActiveFiltered = activeLoans.filter(l => l.type === 'chromebook' && getTs(l.updatedAt || l.checkoutAt) >= cbStart);
    const chgActiveFiltered = activeLoans.filter(l => l.type === 'charger' && getTs(l.updatedAt || l.checkoutAt) >= chgStart);
    
    const forgottenCount = activeLoans.filter(l => l.reason === 'Forgotten at Home' && getTs(l.updatedAt || l.checkoutAt) >= forgottenStart).length;
    const brokenCount = activeLoans.filter(l => l.reason === 'Broken' && getTs(l.updatedAt || l.checkoutAt) >= brokenStart).length;
    const lostCount = activeLoans.filter(l => l.reason === 'Lost Chromebook' && getTs(l.updatedAt || l.checkoutAt) >= lostStart).length;
    
    const quickHandoutCount = activeLoans.filter(l => l.type === 'chromebook' && l.reason === 'Quick' && getTs(l.updatedAt || l.checkoutAt) >= quickCbStart).length;
    
    // Split Chargers: Named vs Anon
    const namedChargerCount = activeLoans.filter(l => l.type === 'charger' && l.reason === 'Quick-Student' && getTs(l.updatedAt || l.checkoutAt) >= quickChgStart).length;
    const anonChargerCount = activeLoans.filter(l => l.type === 'charger' && l.reason === 'Quick-Anon' && getTs(l.updatedAt || l.checkoutAt) >= anonChgStart).length;

    return {
      chromebooksOut: cbActiveFiltered.length,
      chargersOut: chgActiveFiltered.length,
      forgottenToday: forgottenCount,
      brokenToday: brokenCount,
      lostToday: lostCount,
      quickCbOut: quickHandoutCount,
      namedChargersToday: namedChargerCount,
      anonChargersToday: anonChargerCount
    };
  }, [activeLoans, recentLoans, resetCBOutTs, resetChargerTs, resetForgottenTs, resetBrokenTs, resetLostTs, resetQuickChargerTs, resetQuickCBTs, resetQuickAnonChargerTs]);

  const [firstName, lastName] = useMemo(() => {
    if (!selectedStudent) return ['', ''];
    const parts = selectedStudent.name.trim().split(/\s+/);
    if (parts.length === 1) return [parts[0], ''];
    return [parts[0], parts.slice(1).join(' ')];
  }, [selectedStudent]);

  const groupedActivity = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTs = yesterday.getTime();

    const groups = {
      today: [] as Loan[],
      yesterday: [] as Loan[],
      older: [] as Loan[]
    };

    // Filter to only show ACTIVE loans in the feed
    const activeRecent = recentLoans.filter(l => l.status === 'active');

    activeRecent.forEach(loan => {
      const loanDate = new Date(loan.updatedAt || loan.checkoutAt);
      loanDate.setHours(0, 0, 0, 0);
      const loanTs = loanDate.getTime();

      if (loanTs === todayTs) {
        groups.today.push(loan);
      } else if (loanTs === yesterdayTs) {
        groups.yesterday.push(loan);
      } else {
        groups.older.push(loan);
      }
    });

    return groups;
  }, [recentLoans]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Header Section */}
      <header className="bg-[#1a0a0d] h-16 flex items-center justify-between px-6 shrink-0 border-b border-black">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Monitor size={20} className="text-[#702131]" />
            </div>
            <h1 className="text-white font-black tracking-wider uppercase text-sm">ILTEXAS LOANER PORTAL</h1>
          </div>

          <div className="h-8 w-px bg-white/10" />

          <div className="flex items-center gap-3">
            <div className="bg-[#301015] rounded-full px-4 py-1.5 flex items-center gap-2 border border-white/5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="text-white/70 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                {user?.role === 'admin' ? 'ADMIN' : 'TECH'}: {user?.name}
              </span>
            </div>

            <div className="relative group">
              <div className="bg-[#301015] rounded-full px-4 py-1.5 flex items-center gap-3 border border-white/5 cursor-pointer hover:bg-[#40151c] transition-all">
                <span className="text-white text-[10px] font-bold uppercase tracking-widest">{selectedLocation}</span>
                <ChevronRight size={14} className="text-white group-hover:rotate-90 transition-transform" />
              </div>
              <select 
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value as LocationKey)}
                disabled={user?.role === 'tech'}
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
              >
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc} className="text-slate-800 bg-white">{loc}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">
            <History size={14} /> Team
          </button>
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="flex-1 p-6 space-y-6">
        
        {/* Row 1: Visual Counts Dashboard */}
        <section className="relative">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden h-32">
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 bg-maroon-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Monitor size={16} className="text-maroon-600" />
                </div>
                <HoldToResetButton onReset={handleResetCB} label="R" icon={<RotateCcw size={8} />} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1 text-maroon-600">CB LOANS</span>
                <p className="text-2xl font-black text-maroon-800 leading-tight">{stats.chromebooksOut}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden h-32">
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap size={16} className="text-amber-600" />
                </div>
                <HoldToResetButton onReset={handleResetQuickCharger} label="R" icon={<RotateCcw size={8} />} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1 text-amber-500">NAMED CHG</span>
                <p className="text-2xl font-black text-amber-700 leading-tight">{stats.namedChargersToday}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden h-32">
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap size={16} className="text-blue-600" />
                </div>
                <HoldToResetButton onReset={handleResetQuickAnonCharger} label="R" icon={<RotateCcw size={8} />} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1 text-blue-500">ANON CHG</span>
                <p className="text-2xl font-black text-blue-800 leading-tight">{stats.anonChargersToday}</p>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden h-32">
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Home size={16} className="text-slate-400" />
                </div>
                <HoldToResetButton onReset={handleResetForgotten} label="R" icon={<RotateCcw size={8} />} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">FORGOTTEN</span>
                <p className="text-2xl font-black text-slate-600 leading-tight">{stats.forgottenToday}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden h-32">
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <AlertTriangle size={16} className="text-red-600" />
                </div>
                <HoldToResetButton onReset={handleResetBroken} label="R" icon={<RotateCcw size={8} />} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1 text-red-400">BROKEN</span>
                <p className="text-2xl font-black text-red-600 leading-tight">{stats.brokenToday}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden h-32">
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 bg-maroon-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <AlertCircle size={16} className="text-maroon-900" />
                </div>
                <HoldToResetButton onReset={handleResetLost} label="R" icon={<RotateCcw size={8} />} />
              </div>
              <div>
                <span className="text-[8px] font-black text-maroon-700 uppercase tracking-widest block leading-none mb-1 text-maroon-900">LOST CB</span>
                <p className="text-2xl font-black text-maroon-950 leading-tight">{stats.lostToday}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Row 1: Checkout + Detail + Quick */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* Checkout Card */}
          <section className="col-span-12 lg:col-span-6 xl:col-span-6 bg-white rounded-2xl shadow-md border border-slate-200 flex flex-col overflow-hidden relative">
            <StatusOverlay status={checkoutStatus} onDismiss={() => setCheckoutStatus({ message: '', type: null })} />
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2 text-slate-800 text-xs uppercase tracking-widest">
                <Shield size={16} className="text-maroon-600" /> CHROMEBOOK CHECKOUT
              </h3>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-black text-maroon-600 leading-none">{stats.chromebooksOut}</span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-2">SESSION LOANS</span>
                <HoldToResetButton 
                  onReset={handleResetCB}
                  label="RESET"
                  icon={<RotateCcw size={10} />}
                />
              </div>
            </div>

            <div className="p-8 space-y-6 flex-1">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Student Lookup (Name or ID)</label>
                  <div className="relative">
                    <Search className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors", selectedStudent ? "text-green-500" : "text-slate-400")} size={16} />
                    <input 
                      type="text"
                      value={selectedStudent ? selectedStudent.name.toUpperCase() : searchQuery}
                      onChange={(e) => handleStudentSearch(e.target.value)}
                      placeholder="Search by ID or Name..."
                      className={cn(
                        "w-full p-3 pl-11 pr-11 bg-slate-50 border rounded-lg text-sm outline-none transition-all placeholder:text-slate-300 font-bold",
                        selectedStudent 
                          ? "border-green-500 bg-green-50/20 text-green-700 focus:ring-0" 
                          : "border-slate-200 focus:ring-1 focus:ring-maroon-600"
                      )}
                    />
                    {selectedStudent && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <UserIcon size={16} className="text-green-500" />
                      </div>
                    )}
                    
                    {/* Search Popover */}
                    <AnimatePresence>
                      {searchResults.length > 0 && !selectedStudent && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-2 space-y-1 max-h-60 overflow-y-auto"
                        >
                          {searchResults.map(s => (
                            <button 
                              key={s.id}
                              onClick={() => { setSelectedStudent(s); setSearchResults([]); setSearchQuery(''); }}
                              className="w-full p-4 text-left hover:bg-slate-50 rounded-lg flex items-center justify-between transition-all group"
                            >
                              <div className="leading-tight">
                                <span className="block font-black text-xs text-slate-800">{s.name}</span>
                                <div className="flex gap-2 items-center">
                                  <span className="text-[10px] text-slate-400 font-bold tracking-tight">ID: {s.id}</span>
                                  {s.email && <span className="text-[10px] text-maroon-600/60 font-bold tracking-tight truncate max-w-[120px]">{s.email}</span>}
                                </div>
                              </div>
                              <CheckCircle2 size={14} className="text-maroon-600 opacity-0 group-hover:opacity-100" />
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Scan or Enter Asset Tag</label>
                  <input 
                    type="text"
                    value={assetTag}
                    onChange={(e) => setAssetTag(e.target.value)}
                    placeholder="LTX-2026-XXXXX"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-maroon-600 outline-none transition-all font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Reason for Loaner</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['Lost Chromebook', 'Forgotten at Home', 'Broken', 'Other'] as LoanReason[]).map(r => (
                      <button 
                        key={r}
                        onClick={() => setReason(r)}
                        className={cn(
                          "p-4 rounded-lg border text-[9px] font-black uppercase transition-all tracking-tight leading-normal h-16 flex items-center justify-center text-center",
                          reason === r 
                            ? "bg-maroon-900 border-maroon-900 text-white shadow-inner" 
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                        )}
                      >
                      {r === 'Lost Chromebook' ? 'LOST Device' : r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleCheckout}
                disabled={!selectedStudent || !assetTag || isCheckingOut}
                className="w-full bg-[#a38087] text-white py-6 rounded-lg font-black uppercase tracking-widest text-sm shadow-md hover:bg-maroon-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {isCheckingOut ? 'Processing...' : 'Confirm Checkout'}
              </button>
            </div>
          </section>

          {/* Student Detail Card */}
          <section className="col-span-12 lg:col-span-3 xl:col-span-3 bg-white rounded-2xl shadow-md border border-slate-200 p-8 flex flex-col relative">
            <h3 className="font-bold flex items-center gap-2 text-slate-400 text-[10px] uppercase tracking-widest mb-10">
              <UserIcon size={14} className="text-slate-400" /> STUDENT DETAIL
            </h3>
            
            {selectedStudent ? (
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-10">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block underline underline-offset-4 decoration-maroon-600/20">FIRST NAME</label>
                    <h4 className="text-xl font-black text-maroon-900 uppercase truncate tracking-tight">{firstName}</h4>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block underline underline-offset-4 decoration-maroon-600/20">LAST NAME</label>
                    <h4 className="text-xl font-black text-maroon-900 uppercase truncate tracking-tight">{lastName}</h4>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">STUDENT ID</label>
                    <span className="text-lg font-black text-slate-900 block tracking-tight">{selectedStudent.id}</span>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">GRADE</label>
                    <span className="text-lg font-black text-slate-900 block tracking-tight">{selectedStudent.grade || 'N/A'}</span>
                   </div>
                </div>

                {selectedStudent.email && (
                  <div className="space-y-3 pt-4">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block underline underline-offset-4 decoration-maroon-600/20">EMAIL ADDRESS</label>
                    <span className="text-xs font-bold text-slate-600 block truncate">{selectedStudent.email}</span>
                  </div>
                )}

                <div className="pt-8 border-t border-slate-50">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Enrollment Verified</p>
                    <button 
                      onClick={() => setSelectedStudent(null)}
                      className="text-[10px] items-center gap-1.5 text-red-500 font-black uppercase tracking-widest flex hover:underline active:scale-95 transition-all"
                    >
                      <X size={12} /> Clear
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-200">
                <UserIcon size={64} strokeWidth={1} />
                <span className="text-[10px] font-black uppercase tracking-widest">Select Student</span>
              </div>
            )}
          </section>

          {/* Quick CB Loan Card */}
          <section className="col-span-12 lg:col-span-3 bg-white rounded-2xl shadow-md border border-slate-200 p-6 flex flex-col relative overflow-hidden">
            <StatusOverlay status={quickCbStatus} onDismiss={() => setQuickCbStatus({ message: '', type: null })} />
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold flex items-center gap-2 text-slate-800 text-[10px] uppercase tracking-widest">
                <Monitor size={14} className="text-maroon-600" /> QUICK CB LOAN
              </h3>
              <div className="flex flex-col items-end">
                <span className="text-lg font-black text-maroon-600 leading-none">{stats.quickCbOut}</span>
                <HoldToResetButton 
                  onReset={handleResetQuickCB}
                  label="RESET"
                  icon={<RotateCcw size={10} />}
                />
              </div>
            </div>

            <div className="flex flex-col items-center flex-1 space-y-4 text-center">
              <div className="w-full space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block text-center">CB # OR ASSET TAG</label>
                <input 
                  type="text" 
                  value={quickAssetTag}
                  onChange={(e) => setQuickAssetTag(e.target.value)}
                  placeholder="Ex. 1, 2, or scan tag"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-sm focus:ring-1 focus:ring-maroon-600 outline-none transition-all placeholder:text-slate-300"
                />
              </div>

              <button 
                onClick={handleQuickLoan}
                disabled={!quickAssetTag || isCheckingOut}
                className="w-full bg-[#a38087] text-white py-4 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-sm hover:bg-maroon-700 transition-all active:scale-95 disabled:opacity-50"
              >
                Hand Out CB
              </button>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">NO STUDENT REQUIRED</p>
            </div>
          </section>

          {/* New Anonymous Charger Section */}
          <section className="col-span-12 lg:col-span-3 bg-white rounded-2xl shadow-md border border-slate-200 p-6 flex flex-col relative overflow-hidden">
            <StatusOverlay status={handoutStatus} onDismiss={() => setHandoutStatus({ message: '', type: null })} />
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold flex items-center gap-2 text-slate-800 text-[10px] uppercase tracking-widest">
                <Zap size={14} className="text-blue-600" /> ANON CHARGER
              </h3>
              <div className="flex flex-col items-end">
                <span className="text-lg font-black text-blue-600 leading-none">{stats.anonChargersToday}</span>
                <HoldToResetButton 
                  onReset={handleResetQuickAnonCharger}
                  label="RESET"
                  icon={<RotateCcw size={10} />}
                />
              </div>
            </div>

            <div className="flex flex-col items-center flex-1 space-y-4 text-center">
               <div className="flex flex-col items-center">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">QUANTITY</label>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setChargerQuantity(q => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 active:scale-90 transition-all font-bold"
                    >
                      -
                    </button>
                    <span className="text-xl font-black text-slate-800 w-6 text-center">{chargerQuantity}</span>
                    <button 
                      onClick={() => setChargerQuantity(q => q + 1)}
                      className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 active:scale-90 transition-all font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => handleChargerLoan(true)}
                  className="w-full bg-blue-600 text-white py-4 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-sm hover:bg-blue-700 transition-all active:scale-95 mt-auto"
                >
                  Log {chargerQuantity}x Anon Handout
                </button>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">ISOLATED FROM NAMED LOANS</p>
            </div>
          </section>

        </div>

        {/* Row 2: Database Update + Tech Management */}
        <div className="grid grid-cols-12 gap-6">
          {/* Database Update Card - Admin Only */}
          {user?.role === 'admin' && (
            <section className="col-span-12 lg:col-span-4 bg-white rounded-2xl shadow-md border border-slate-200 p-6 relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold flex items-center gap-2 text-slate-800 text-[10px] uppercase tracking-widest">
                  <Upload size={16} className="text-maroon-600" /> UPDATE STUDENT DATABASE
                </h3>
                <button 
                  onClick={handleDeleteAllStudents}
                  className="text-[8px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest flex items-center gap-1.5 transition-colors border border-red-100 px-2.5 py-1.5 rounded-lg bg-red-50/30 hover:bg-red-50"
                >
                  <Trash2 size={12} /> CLEAR ALL STUDENTS
                </button>
              </div>

              <label className="w-full h-40 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-all group relative overflow-hidden">
                <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
                <div className="p-3 bg-slate-100 rounded-xl group-hover:scale-110 transition-transform">
                  <Upload size={24} className="text-slate-400 group-hover:text-maroon-600 transition-colors" />
                </div>
                <div className="text-center px-4">
                  <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Upload CSV</p>
                  <p className="text-[8px] text-slate-400 font-medium mt-1 uppercase">Required: School Id #, Names</p>
                </div>
                
                {dbStatus.type && (
                  <div className={cn(
                    "absolute inset-0 flex items-center justify-center bg-white/95 backdrop-blur-[2px] transition-all z-10",
                    dbStatus.type === 'success' ? "text-green-600" : (dbStatus.type === 'error' ? "text-red-600" : "text-maroon-600")
                  )}>
                    <div className="flex flex-col items-center gap-2 w-full max-w-[90%]">
                      {dbStatus.type === 'success' ? <CheckCircle2 size={32} /> : 
                       dbStatus.type === 'error' ? <AlertCircle size={32} /> :
                       <div className="w-10 h-10 border-4 border-maroon-600/20 border-t-maroon-600 rounded-full animate-spin" />}
                      
                      <span className="font-black text-[9px] uppercase tracking-widest text-center px-4 leading-tight">{dbStatus.message}</span>
                      
                      {dbStatus.type === 'loading' && (
                        <div className="w-full bg-slate-100 h-1 rounded-full mt-4 overflow-hidden max-w-[150px]">
                          <motion.div 
                            className="bg-maroon-600 h-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${dbStatus.progress || 0}%` }}
                          />
                        </div>
                      )}

                      {dbStatus.type !== 'loading' && (
                        <button 
                          onClick={() => setDbStatus({ message: '', type: null })} 
                          className="text-[9px] underline uppercase tracking-widest mt-4 font-bold text-slate-500"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </label>

              {/* Session Control Center */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock size={16} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Session Management</span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold leading-relaxed">
                    Reset activity markers for this campus or globally. This clears dashboard counts and history but keeps your uploaded student lists safe.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={handleResetActivity}
                      className="py-3 bg-white border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-widest hover:border-maroon-600 hover:text-maroon-600 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                    >
                      <RotateCcw size={10} /> Campus Reset
                    </button>
                    <button 
                      onClick={handleSystemWipe}
                      className="py-3 bg-white border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-widest hover:border-maroon-600 hover:text-maroon-600 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                    >
                      <History size={10} /> Global Reset
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle size={16} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Danger Zone</span>
                  </div>
                  <p className="text-[9px] text-red-600 font-bold leading-relaxed">
                    A total wipe deletes students, technicians, and all activity history. This cannot be undone.
                  </p>
                  <button 
                    onClick={handleFactoryReset}
                    className="w-full py-3 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                  >
                    <Trash2 size={12} /> Factory Reset (Total Wipe)
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Quick Charger Loan Card */}
          <section className="col-span-12 lg:col-span-4 bg-white rounded-2xl shadow-md border border-slate-200 p-6 flex flex-col relative overflow-hidden">
            <StatusOverlay status={quickChargerStatus} onDismiss={() => setQuickChargerStatus({ message: '', type: null })} />
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <h3 className="font-bold flex items-center gap-2 text-slate-800 text-[10px] uppercase tracking-widest">
                  <Zap size={16} className="text-maroon-600" /> QUICK CHARGER LOAN
                </h3>
                <div className="flex flex-col">
                  <span className="text-lg font-black text-maroon-600 leading-none">{stats.namedChargersToday}</span>
                  <HoldToResetButton 
                    onReset={handleResetQuickCharger}
                    label="RESET"
                    icon={<RotateCcw size={10} />}
                  />
                </div>
              </div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">WITH STUDENT INFO</span>
            </div>
            
            <div className="space-y-4 flex flex-col flex-1">
              <div className="relative group">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 text-center">
                  SEARCH STUDENT (NAME, EMAIL, OR ID)
                </label>
                
                {selectedQuickStudent ? (
                  <div className="flex flex-col p-4 bg-maroon-50 border border-maroon-100 rounded-xl relative">
                    <div className="text-left space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="text-[11px] font-black text-maroon-900 uppercase">{selectedQuickStudent.name}</p>
                        <button 
                          onClick={() => setSelectedQuickStudent(null)}
                          className="p-1 hover:bg-maroon-100 rounded-lg text-maroon-600 transition-colors"
                        >
                          <X size={14} strokeWidth={3} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-maroon-400 uppercase tracking-widest">School ID</span>
                          <span className="text-[10px] font-bold text-maroon-800 uppercase">{selectedQuickStudent.id}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-maroon-400 uppercase tracking-widest">Grade</span>
                          <span className="text-[10px] font-bold text-maroon-800 uppercase">{selectedQuickStudent.grade || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col col-span-2 border-t border-maroon-100 pt-1 mt-1">
                          <span className="text-[7px] font-black text-maroon-400 uppercase tracking-widest">Email</span>
                          <span className="text-[9px] font-bold text-maroon-800 lowercase truncate">{selectedQuickStudent.email || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <input 
                      type="text" 
                      value={chargerSearchQuery}
                      onChange={(e) => handleQuickChargerSearch(e.target.value)}
                      placeholder="Search Name, Email, or Scan ID..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && chargerSearchQuery) {
                          handleChargerLoan(false, chargerSearchQuery);
                        }
                      }}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-sm focus:ring-1 focus:ring-maroon-600 outline-none transition-all placeholder:text-slate-300"
                    />
                    
                    {chargerSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto overflow-x-hidden p-1 scrollbar-hide">
                        {chargerSearchResults.map(s => (
                          <button
                            key={s.id}
                            onClick={() => {
                              setSelectedQuickStudent(s);
                              setChargerSearchResults([]);
                              setChargerSearchQuery('');
                            }}
                            className="w-full p-3 text-left hover:bg-slate-50 flex flex-col rounded-lg transition-colors border-b border-slate-50 last:border-0"
                          >
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{s.name}</span>
                              <span className="text-[8px] font-black text-maroon-600 bg-maroon-50 px-1.5 rounded uppercase">Gr: {s.grade || '??'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] font-bold text-slate-400 uppercase">ID: {s.id}</span>
                              <span className="text-[8px] font-medium text-slate-400 lowercase">{s.email || ''}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-col items-center flex-1 justify-center py-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-lg italic">
                  One charger per student name/ID
                </p>
              </div>

              <button 
                onClick={() => handleChargerLoan(false, (!selectedQuickStudent && chargerSearchQuery) ? chargerSearchQuery : undefined)}
                className="w-full bg-maroon-900 border-2 border-maroon-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-sm hover:bg-maroon-800 transition-all active:scale-95 mt-auto"
              >
                Log Charger Handout
              </button>
            </div>
          </section>

          {/* Admin: Tech Management Card */}
          {user?.role === 'admin' && (
            <section className="col-span-12 lg:col-span-4 bg-white rounded-2xl shadow-md border border-slate-200 p-6 flex flex-col relative overflow-hidden">
              <StatusOverlay status={techStatus} onDismiss={() => setTechStatus({ message: '', type: null })} />
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold flex items-center gap-2 text-slate-800 text-[10px] uppercase tracking-widest">
                  <UserPlus size={16} className="text-maroon-600" /> REGISTER TECHS
                </h3>
              </div>

              <div className="space-y-4 mb-4">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newTechName} 
                    onChange={(e) => setNewTechName(e.target.value)} 
                    placeholder="Full Name" 
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                  <select 
                    value={newTechLocation} 
                    onChange={(e) => setNewTechLocation(e.target.value as LocationKey)} 
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                  <button 
                    onClick={handleRegisterTech}
                    disabled={!newTechName || isRegisteringTech}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-950 disabled:opacity-50"
                  >
                    {isRegisteringTech ? '...' : 'ADD'}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-50">
                  <button 
                    onClick={() => handleResetActivity(setTechStatus)}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={10} /> Reset Campus
                  </button>
                  <button 
                    onClick={() => handleSystemWipe(setTechStatus)}
                    className="px-3 py-2 bg-maroon-50 text-maroon-600 border border-maroon-100 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-maroon-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <History size={10} /> Global Reset
                  </button>
                </div>
              </div>

              <div className="flex-1 max-h-48 overflow-y-auto space-y-2 pr-2">
                 {techs.length === 0 ? (
                   <p className="text-[10px] text-slate-300 italic text-center py-4 uppercase font-bold">No registered technicians</p>
                 ) : (
                   techs.map(t => (
                     <div key={t.uid} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 transition-all group overflow-hidden relative">
                        {editingTechId === t.uid ? (
                          <div className="space-y-2">
                            <input 
                              type="text" 
                              value={editingTechName}
                              onChange={(e) => setEditingTechName(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded text-[10px] font-bold"
                            />
                            <div className="flex gap-2">
                              <select 
                                value={editingTechLocation || ''}
                                onChange={(e) => setEditingTechLocation(e.target.value as LocationKey)}
                                className="flex-1 p-2 bg-white border border-slate-200 rounded text-[10px] font-bold"
                              >
                                {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                              </select>
                              <button 
                                onClick={handleUpdateTech}
                                className="px-3 py-1 bg-green-600 text-white rounded text-[10px] font-bold uppercase"
                              >
                                SAVE
                              </button>
                              <button 
                                onClick={handleCancelEditTech}
                                className="px-3 py-1 bg-slate-400 text-white rounded text-[10px] font-bold uppercase"
                              >
                                X
                              </button>
                            </div>
                          </div>
                        ) : confirmDeleteId === t.uid ? (
                          <div className="flex flex-col items-center justify-center py-1 gap-2">
                             <span className="text-[9px] font-black text-red-600 uppercase tracking-widest text-center">Permanently remove {t.name}?</span>
                             <div className="flex gap-4">
                                <button 
                                  onClick={() => handleDeleteTech(t.uid)}
                                  className="px-4 py-1.5 bg-red-600 text-white rounded-md text-[9px] font-black uppercase hover:bg-red-700 active:scale-95 transition-all"
                                >
                                  YES, DELETE
                                </button>
                                <button 
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-4 py-1.5 bg-slate-200 text-slate-600 rounded-md text-[9px] font-black uppercase hover:bg-slate-300 transition-all"
                                >
                                  CANCEL
                                </button>
                             </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="leading-none">
                              <span className="block text-[10px] font-black text-slate-800 uppercase tracking-tight">{t.name}</span>
                              <span className="text-[8px] font-black text-maroon-600 uppercase tracking-widest mt-1 inline-block">{t.location}</span>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleStartEditTech(t)}
                                className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Edit Tech"
                              >
                                <UserPlus size={14} />
                              </button>
                              <button 
                                onClick={() => setConfirmDeleteId(t.uid)}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                title="Remove Tech"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                     </div>
                   ))
                 )}
              </div>
            </section>
          )}
        </div>

        {/* Row 3: Overview Card */}
        <section className="bg-white rounded-2xl shadow-md border border-slate-200 p-8">
          <div className="flex justify-between items-center mb-10">
            <h3 className="font-bold flex items-center gap-2 text-slate-800 text-[10px] uppercase tracking-widest">
              <Plus size={16} className="text-maroon-600 rotate-45" /> LIVE LOANER OVERVIEW
            </h3>
          </div>

          <div className="grid grid-cols-12 gap-10">
            {/* Stats Column */}
            <div className="col-span-12 lg:col-span-5 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-100 p-6 rounded-2xl flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Chromebooks Out</span>
                  <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">{stats.chromebooksOut}</span>
                </div>
                <div className="bg-white border border-slate-100 p-6 rounded-2xl flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Forgotten Reason</span>
                  <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">{stats.forgottenToday}</span>
                </div>
                <div className="bg-white border border-slate-100 p-6 rounded-2xl flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Chargers Loaned</span>
                  <span className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center text-xs font-black">{stats.chargersOut}</span>
                </div>
                <div className="bg-white border border-slate-100 p-6 rounded-2xl flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Broken Reason</span>
                  <span className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center text-xs font-black">{stats.brokenToday}</span>
                </div>
              </div>
            </div>

            {/* Activity & Report Column */}
            <div className="col-span-12 lg:col-span-7 flex flex-col gap-4 relative overflow-hidden">
              <StatusOverlay status={dbStatus} onDismiss={() => setDbStatus({ message: '', type: null })} />
              <div className="flex-1 bg-white border border-slate-200 rounded-xl flex flex-col min-h-[300px] overflow-hidden">
                <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">ACTIVITY FEED</span>
                    {user?.role === 'admin' && (
                      <HoldToResetButton 
                        onReset={handleResetActivity}
                        label="HOLD TO CLEAR"
                        className="text-slate-300 hover:text-red-500"
                        icon={<RotateCcw size={12} />}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Returned</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-8 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                  {/* Today Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] whitespace-nowrap">TODAY'S ACTIVITY</span>
                      <div className="h-px w-full bg-slate-100" />
                    </div>
                    {groupedActivity.today.length > 0 ? (
                      <div className="space-y-1">
                        {groupedActivity.today.map(l => (
                          <ActivityRow key={l.id} loan={l} onReturn={handleReturn} />
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <span className="text-[10px] text-slate-300 italic font-medium">No activity today</span>
                      </div>
                    )}
                  </div>

                  {/* Yesterday Section */}
                  {groupedActivity.yesterday.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] whitespace-nowrap">YESTERDAY'S ACTIVITY</span>
                        <div className="h-px w-full bg-slate-100" />
                      </div>
                      <div className="space-y-1">
                        {groupedActivity.yesterday.map(l => (
                          <ActivityRow key={l.id} loan={l} onReturn={handleReturn} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Older Activity */}
                  {groupedActivity.older.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] whitespace-nowrap">OLDER ACTIVITY</span>
                        <div className="h-px w-full bg-slate-100" />
                      </div>
                      <div className="space-y-1">
                        {groupedActivity.older.map(l => (
                          <ActivityRow key={l.id} loan={l} onReturn={handleReturn} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Report Controls */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-8 flex gap-4">
                   <div className="flex-1 bg-white border border-slate-200 rounded-lg p-3 relative">
                      <span className="absolute -top-2 left-3 bg-white px-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">FROM</span>
                      <input 
                        type="date" 
                        value={reportStart}
                        onChange={(e) => setReportStart(e.target.value)}
                        className="w-full bg-transparent text-[10px] font-bold outline-none uppercase"
                      />
                   </div>
                   <div className="flex-1 bg-white border border-slate-200 rounded-lg p-3 relative">
                      <span className="absolute -top-2 left-3 bg-white px-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">TO</span>
                      <input 
                        type="date" 
                        value={reportEnd}
                        onChange={(e) => setReportEnd(e.target.value)}
                        className="w-full bg-transparent text-[10px] font-bold outline-none uppercase"
                      />
                   </div>
                </div>
                <button 
                  onClick={handleGenerateReport}
                  className="col-span-4 bg-white border border-maroon-600 text-maroon-600 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-maroon-50 transition-all border-opacity-30"
                >
                  <History size={14} /> Generate Report
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* System Footer info */}
        <div className="flex items-center justify-center gap-10 px-4 text-slate-300 font-bold uppercase text-[9px] tracking-[0.2em] pt-6">
           <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500/50" /> System Live</span>
           <span>ILTEXAS LOANER PORTAL 2026</span>
        </div>
      </main>
    </div>
  );
}
function AppContent() {
  const { initialized, loading, user } = useAuth();

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-maroon-600/20 border-t-maroon-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <MainApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

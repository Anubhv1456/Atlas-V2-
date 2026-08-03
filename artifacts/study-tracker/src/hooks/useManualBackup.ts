import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { exportData, importData } from '@/db';
import { encryptClientData, decryptClientData, isEncryptedPayload, EncryptedPayload } from '@/lib/crypto';
import { getAutoSnapshots, createAutoSnapshot } from '@/lib/autoBackup';

const LS_KEY = 'atlas_last_backup';

export interface ImportPreview {
  backupDate: string | null;
  subjects: number;
  systems: number;
  history: number;
  raw: any;
}

export function useManualBackup() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [showEncryptExportModal, setShowEncryptExportModal] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [encryptingExport, setEncryptingExport] = useState(false);
  
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [pendingEncryptedPayload, setPendingEncryptedPayload] = useState<EncryptedPayload | null>(null);
  const [importPassphrase, setImportPassphrase] = useState('');
  const [decryptingImport, setDecryptingImport] = useState(false);
  
  const [cryptoStage, setCryptoStage] = useState<string>('');
  const [cryptoProgress, setCryptoProgress] = useState<number>(0);

  useEffect(() => {
    setLastBackup(localStorage.getItem(LS_KEY));
  }, []);

  const updateLastBackupTime = useCallback(() => {
    const iso = new Date().toISOString();
    localStorage.setItem(LS_KEY, iso);
    setLastBackup(iso);
  }, []);

  const handleQuickBackup = useCallback(async () => {
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atlas-study-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      updateLastBackupTime();
      toast({ title: 'Backup Successful', description: 'Your data has been exported successfully.' });
    } catch (e) {
      toast({ title: 'Export Failed', description: String(e), variant: 'destructive' });
    }
  }, [toast, updateLastBackupTime]);

  const handleEncryptedExport = useCallback(async () => {
    if (exportPassphrase.length < 4) {
      toast({ title: 'Password too short', description: 'Please use at least 4 characters for your password.', variant: 'destructive' });
      return;
    }
    setEncryptingExport(true);
    setCryptoStage('Preparing data...');
    setCryptoProgress(10);
    try {
      const data = await exportData();
      setCryptoStage('Generating secure keys...');
      setCryptoProgress(40);
      const jsonStr = JSON.stringify(data);
      const payload = await encryptClientData(jsonStr, exportPassphrase);
      setCryptoStage('Finalizing encrypted file...');
      setCryptoProgress(90);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atlas-locked-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      updateLastBackupTime();
      setShowEncryptExportModal(false);
      setExportPassphrase('');
      toast({ title: 'Secure Backup Successful', description: 'Your password-protected data has been exported.' });
    } catch (e) {
      toast({ title: 'Encryption Failed', description: String(e), variant: 'destructive' });
    } finally {
      setEncryptingExport(false);
      setCryptoProgress(0);
      setCryptoStage('');
    }
  }, [exportPassphrase, toast, updateLastBackupTime]);

  const processImportFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const parsed = JSON.parse(result);
        if (isEncryptedPayload(parsed)) {
          setPendingEncryptedPayload(parsed as EncryptedPayload);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
        if (!parsed.subjects || !parsed.systems) {
          throw new Error('Invalid backup file structure.');
        }
        setImportPreview({
          backupDate: parsed.exportedAt || null,
          subjects: parsed.subjects.length,
          systems: parsed.systems.length,
          history: parsed.history?.length || 0,
          raw: parsed,
        });
      } catch (err) {
        toast({ title: 'Invalid File', description: 'The selected file is not a valid Atlas backup.', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [toast]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImportFile(file);
  }, [processImportFile]);

  const handleConfirmImport = useCallback(async () => {
    if (!importPreview?.raw) return;
    setImporting(true);
    try {
      await createAutoSnapshot();
      await importData(importPreview.raw);
      toast({ title: 'Restore Complete', description: 'Your study data has been successfully restored.' });
      setImportPreview(null);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      toast({ title: 'Restore Failed', description: String(e), variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  }, [importPreview, toast]);

  const handleDecryptAndPreview = useCallback(async () => {
    if (!pendingEncryptedPayload) return;
    if (importPassphrase.length < 4) {
      toast({ title: 'Password required', description: 'Please enter the password used to encrypt this file.', variant: 'destructive' });
      return;
    }
    setDecryptingImport(true);
    setCryptoStage('Verifying password...');
    setCryptoProgress(30);
    try {
      const decryptedStr = await decryptClientData(pendingEncryptedPayload, importPassphrase);
      setCryptoStage('Processing data...');
      setCryptoProgress(80);
      const parsed = JSON.parse(decryptedStr);
      if (!parsed.subjects || !parsed.systems) throw new Error('Invalid decrypted data structure.');
      setImportPreview({
        backupDate: parsed.exportedAt || null,
        subjects: parsed.subjects.length,
        systems: parsed.systems.length,
        history: parsed.history?.length || 0,
        raw: parsed,
      });
      setPendingEncryptedPayload(null);
      setImportPassphrase('');
    } catch (e: any) {
      toast({ title: 'Decryption Failed', description: e.message || 'Incorrect password or corrupted file.', variant: 'destructive' });
    } finally {
      setDecryptingImport(false);
      setCryptoProgress(0);
      setCryptoStage('');
    }
  }, [pendingEncryptedPayload, importPassphrase, toast]);

  return {
    fileInputRef,
    lastBackup,
    handleQuickBackup,
    handleFileChange,
    
    showEncryptExportModal,
    setShowEncryptExportModal,
    exportPassphrase,
    setExportPassphrase,
    encryptingExport,
    handleEncryptedExport,
    
    importPreview,
    setImportPreview,
    importing,
    handleConfirmImport,
    
    pendingEncryptedPayload,
    setPendingEncryptedPayload,
    importPassphrase,
    setImportPassphrase,
    decryptingImport,
    handleDecryptAndPreview,
    
    cryptoStage,
    cryptoProgress
  };
}

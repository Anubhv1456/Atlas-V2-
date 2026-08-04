import {
  AppearanceSection,
  PWASection,
  NotificationsSection,
  CloudSyncSection,
  AutoBackupSection,
  ManualBackupSection,
  SecuritySection,
  DangerZoneSection,
  PresetsSection
} from './settings';

export default function Settings() {
  return (
    <div className="min-h-full bg-background px-4 pt-10 pb-36 max-w-2xl mx-auto flex flex-col relative animate-in fade-in slide-in-from-bottom-2 duration-300">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold text-foreground tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Manage your app experience, backup your data, and secure your study progress.
        </p>
      </header>
      <div className="space-y-10 flex-1">
        <AppearanceSection />
        <PresetsSection />
        <PWASection />
        <NotificationsSection />
        <CloudSyncSection />
        <AutoBackupSection />
        <ManualBackupSection />
        <SecuritySection />
        <DangerZoneSection />
      </div>
    </div>
  );
}

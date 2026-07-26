import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  placeholder: string;
  onSave: (name: string) => void;
}

export function AddDialog({ open, onOpenChange, title, placeholder, onSave }: AddDialogProps) {
  const [name, setName] = useState('');

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      setName('');
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) setName('');
    }}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            autoFocus
            placeholder={placeholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-lg py-6 px-4 bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()} className="rounded-xl font-semibold px-8 shadow-sm">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

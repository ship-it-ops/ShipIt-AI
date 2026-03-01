'use client';

import { useState } from 'react';
import { Github, Container, BarChart3, BookOpen, Ticket, UserCircle, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const connectorTypes = [
  { id: 'github', name: 'GitHub', icon: <Github className="h-8 w-8" />, description: 'Repositories, teams, workflows, CODEOWNERS' },
  { id: 'kubernetes', name: 'Kubernetes', icon: <Container className="h-8 w-8" />, description: 'Namespaces, deployments, services, pods' },
  { id: 'datadog', name: 'Datadog', icon: <BarChart3 className="h-8 w-8" />, description: 'Monitors, SLOs, service catalog' },
  { id: 'backstage', name: 'Backstage', icon: <BookOpen className="h-8 w-8" />, description: 'Service catalog, APIs, documentation' },
  { id: 'jira', name: 'Jira', icon: <Ticket className="h-8 w-8" />, description: 'Projects, issues, sprints' },
  { id: 'identity', name: 'Identity Provider', icon: <UserCircle className="h-8 w-8" />, description: 'Users, groups, roles' },
];

const steps = ['Select Type', 'Configure', 'Set Scope', 'Review'];

interface AddConnectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddConnectorDialog({ open, onOpenChange }: AddConnectorDialogProps) {
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [config, setConfig] = useState({ apiKey: '', baseUrl: '' });

  const selectedConnector = connectorTypes.find((c) => c.id === selectedType);

  const handleClose = () => {
    onOpenChange(false);
    setStep(0);
    setSelectedType(null);
    setConfig({ apiKey: '', baseUrl: '' });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Connector</DialogTitle>
          <DialogDescription>
            Connect a data source to populate your knowledge graph
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  i <= step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={`text-xs ${i <= step ? 'font-medium' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {i < steps.length - 1 && <div className="h-px w-6 bg-border" />}
            </div>
          ))}
        </div>

        <div className="min-h-[200px]">
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3">
              {connectorTypes.map((ct) => (
                <button
                  key={ct.id}
                  onClick={() => setSelectedType(ct.id)}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                    selectedType === ct.id ? 'border-primary bg-accent' : ''
                  }`}
                >
                  <div className="shrink-0 text-muted-foreground">{ct.icon}</div>
                  <div>
                    <div className="font-medium text-sm">{ct.name}</div>
                    <div className="text-xs text-muted-foreground">{ct.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 1 && selectedConnector && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">API Key / Token</label>
                <Input
                  type="password"
                  placeholder="Enter your API key..."
                  value={config.apiKey}
                  onChange={(e) => setConfig((c) => ({ ...c, apiKey: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Base URL (optional)</label>
                <Input
                  placeholder="https://api.example.com"
                  value={config.baseUrl}
                  onChange={(e) => setConfig((c) => ({ ...c, baseUrl: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Scope</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Configure which resources to sync
                </p>
                <Input placeholder="e.g., org/*, team:payments-*" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Sync Schedule</label>
                <p className="text-xs text-muted-foreground">
                  Default: every 60 minutes
                </p>
              </div>
            </div>
          )}

          {step === 3 && selectedConnector && (
            <div className="space-y-3">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-muted-foreground">{selectedConnector.icon}</div>
                  <div>
                    <div className="font-medium">{selectedConnector.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedConnector.description}</div>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">API Key</span>
                    <span>••••••••</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Schedule</span>
                    <span>Every 60 minutes</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !selectedType}
              className="gap-1"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleClose} className="gap-1">
              <Check className="h-4 w-4" />
              Connect
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

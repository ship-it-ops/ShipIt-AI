'use client';

import { Search, Siren } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function IncidentModePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Siren className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold">Incident Mode</h1>
          <p className="text-muted-foreground">
            Quick blast radius analysis for on-call incident response
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="What service is having problems?"
            className="h-14 pl-12 text-lg"
            autoFocus
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">How it works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Search for the affected service by name</p>
            <p>2. View downstream blast radius in production</p>
            <p>3. See affected teams and on-call contacts</p>
            <p>4. Review recent changes to the service and its neighbors</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

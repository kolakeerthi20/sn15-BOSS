'use client';
import React, { useState } from 'react';
import { User, Bell, Shield, Palette, Save } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useUIStore } from '@/store/app-store';
import { getInitials } from '@/lib/utils';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { darkMode, toggleDarkMode } = useUIStore();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const user = session?.user;

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Settings" />
      <div className="flex-1 p-6 max-w-3xl">
        <Tabs defaultValue="profile">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-600" /> Profile Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {user && (
                  <>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        {user.image && <AvatarImage src={user.image} alt={user.name ?? ''} />}
                        <AvatarFallback name={user.name ?? ''} className="text-lg">
                          {getInitials(user.name ?? user.email ?? '?')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                        <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                          {(user as any).role?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Your profile information is managed through Google. To update your name or profile picture, visit your Google account settings.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4 text-indigo-600" /> Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Task assigned to me', email: true, inApp: true },
                  { label: 'Comment mention (@me)', email: true, inApp: true },
                  { label: 'Task overdue', email: true, inApp: true },
                  { label: 'Daily log reminder (5pm)', email: false, inApp: true },
                  { label: 'Blocker escalation', email: true, inApp: true },
                  { label: 'Project status change', email: false, inApp: true },
                  { label: 'Weekly summary report', email: true, inApp: false },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                    <div className="flex gap-4 text-xs text-slate-500">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" defaultChecked={item.email} className="rounded" />
                        Email
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" defaultChecked={item.inApp} className="rounded" />
                        In-app
                      </label>
                    </div>
                  </div>
                ))}
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saved ? 'Saved!' : 'Save Preferences'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Palette className="h-4 w-4 text-indigo-600" /> Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Theme</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => darkMode && toggleDarkMode()}
                      className={`flex-1 rounded-xl border-2 p-4 text-sm font-medium transition-colors ${!darkMode ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'}`}
                    >
                      ☀️ Light
                    </button>
                    <button
                      onClick={() => !darkMode && toggleDarkMode()}
                      className={`flex-1 rounded-xl border-2 p-4 text-sm font-medium transition-colors ${darkMode ? 'border-indigo-500 bg-indigo-950/30 text-indigo-400' : 'border-slate-200 text-slate-600 dark:border-slate-700'}`}
                    >
                      🌙 Dark
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-600" /> Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Authentication</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    You are signed in via Google OAuth. Password management is handled by Google.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Active Sessions</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">1 session active</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

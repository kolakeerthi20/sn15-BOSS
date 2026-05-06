'use client';
import React, { useState } from 'react';
import { User, Bell, Shield, Palette, CreditCard, Building2, Save } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAppStore } from '@/store/app-store';
import { getInitials } from '@/lib/utils';

export default function SettingsPage() {
  const { currentUser, darkMode, toggleDarkMode } = useAppStore();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
                {currentUser && (
                  <>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback name={currentUser.name} className="text-lg">{getInitials(currentUser.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <Button variant="outline" size="sm">Change Avatar</Button>
                        <p className="mt-1 text-xs text-slate-500">JPG or PNG, max 2MB</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Full Name" defaultValue={currentUser.name} />
                      <Input label="Email" type="email" defaultValue={currentUser.email} />
                      <Input label="Designation" defaultValue={currentUser.designation} />
                      <Input label="Department" defaultValue={currentUser.department} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Skills</label>
                      <div className="flex flex-wrap gap-2">
                        {currentUser.skills.map(s => (
                          <span key={s} className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400">{s}</span>
                        ))}
                        <button className="rounded-full border border-dashed border-indigo-300 px-3 py-1 text-xs text-indigo-500 hover:bg-indigo-50">+ Add skill</button>
                      </div>
                    </div>
                    {currentUser.billableRate && (
                      <Input label="Billable Rate ($/hr)" type="number" defaultValue={String(currentUser.billableRate)} />
                    )}
                    <Button onClick={handleSave} className="gap-2">
                      <Save className="h-4 w-4" />
                      {saved ? 'Saved!' : 'Save Changes'}
                    </Button>
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
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Default Task View</p>
                  <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    <option>Kanban Board</option>
                    <option>List View</option>
                  </select>
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
                <div className="space-y-3">
                  <Input label="Current Password" type="password" placeholder="••••••••" />
                  <Input label="New Password" type="password" placeholder="Min 12 characters" />
                  <Input label="Confirm New Password" type="password" placeholder="••••••••" />
                </div>
                <Button onClick={handleSave} variant="outline" className="gap-2">
                  <Shield className="h-4 w-4" />
                  {saved ? 'Updated!' : 'Update Password'}
                </Button>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Two-Factor Authentication</p>
                  <Button variant="outline" size="sm">Enable 2FA</Button>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Active Sessions</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">1 session active — macOS Chrome</p>
                  <Button variant="destructive" size="sm">Revoke All Sessions</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

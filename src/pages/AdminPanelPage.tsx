import { useState } from 'react';
import { useEmployees, useUpdateEmployeeRole, useUpdateEmployee } from '@/hooks/useEmployees';
import type { UserRole } from '@/types/employee';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { UserCog, Shield, Eye, Users, Search, Edit2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ROLE_LABELS: Record<UserRole, string> = {
  administrator: 'Administrator',
  umum: 'Umum',
  viewer: 'Viewer',
};

const ROLE_COLORS: Record<UserRole, string> = {
  administrator: 'bg-primary/10 text-primary border-primary/20',
  umum: 'bg-accent/10 text-accent border-accent/20',
  viewer: 'bg-muted text-muted-foreground border-border',
};

const ROLE_ICONS: Record<UserRole, typeof Shield> = {
  administrator: Shield,
  umum: UserCog,
  viewer: Eye,
};

export default function AdminPanelPage() {
  const { data: employees, isLoading, refetch } = useEmployees();
  const updateRole = useUpdateEmployeeRole();
  const updateEmployee = useUpdateEmployee();
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', position: '', nip: '' });

  // New user form
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', nip: '', email: '', password: '123456', role: 'viewer' as UserRole, position: '' });
  const [addingUser, setAddingUser] = useState(false);

  const handleRoleChange = async (employeeId: string, newRole: UserRole) => {
    setChangingRole(employeeId);
    try {
      await updateRole.mutateAsync({ id: employeeId, role: newRole });
      toast.success('Role berhasil diubah');
    } catch {
      toast.error('Gagal mengubah role');
    } finally {
      setChangingRole(null);
    }
  };

  const handleToggleActive = async (employeeId: string, currentStatus: boolean) => {
    try {
      await updateEmployee.mutateAsync({ id: employeeId, is_active: !currentStatus });
      toast.success(currentStatus ? 'Pengguna dinonaktifkan' : 'Pengguna diaktifkan');
    } catch {
      toast.error('Gagal mengubah status');
    }
  };

  const handleEditSave = async () => {
    if (!editingEmployee) return;
    try {
      await updateEmployee.mutateAsync({ id: editingEmployee.id, name: editForm.name, position: editForm.position });
      toast.success('Data pegawai berhasil diperbarui');
      setEditingEmployee(null);
    } catch {
      toast.error('Gagal memperbarui data');
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.nip || !newUser.email) {
      toast.error('Nama, NIP, dan Email wajib diisi');
      return;
    }
    setAddingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email: newUser.email, password: newUser.password, name: newUser.name, nip: newUser.nip, role: newUser.role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Pengguna ${newUser.name} berhasil ditambahkan`);
      setNewUser({ name: '', nip: '', email: '', password: '123456', role: 'viewer', position: '' });
      setShowAddUser(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambah pengguna');
    } finally {
      setAddingUser(false);
    }
  };

  const filtered = (employees ?? []).filter(emp => {
    const matchSearch = !searchQuery ||
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.nip.includes(searchQuery) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = filterRole === 'all' || emp.role === filterRole;
    return matchSearch && matchRole;
  });

  const roleCounts = (employees ?? []).reduce((acc, emp) => {
    acc[emp.role] = (acc[emp.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground">Kelola pengguna dan hak akses</p>
          </div>
        </div>
        <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
          <DialogTrigger asChild>
            <Button className="gap-2"><UserPlus className="w-4 h-4" /> Tambah Pengguna</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Nama Lengkap *</Label>
                <Input value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>NIP *</Label>
                  <Input value={newUser.nip} onChange={e => setNewUser(p => ({ ...p, nip: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Jabatan</Label>
                  <Input value={newUser.position} onChange={e => setNewUser(p => ({ ...p, position: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Password</Label>
                  <Input value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select value={newUser.role} onValueChange={(v: UserRole) => setNewUser(p => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="administrator">Administrator</SelectItem>
                      <SelectItem value="umum">Umum</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full" onClick={handleAddUser} disabled={addingUser}>
                {addingUser ? 'Menambahkan...' : 'Tambah Pengguna'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Total Pengguna</p>
            <p className="text-2xl font-bold text-foreground">{employees?.length ?? 0}</p>
          </CardContent>
        </Card>
        {(['administrator', 'umum', 'viewer'] as UserRole[]).map(role => {
          const Icon = ROLE_ICONS[role];
          return (
            <Card key={role} className="border-border">
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <Icon className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">{ROLE_LABELS[role]}</p>
                  <p className="text-2xl font-bold text-foreground">{roleCounts[role] ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, NIP, atau email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                <SelectItem value="administrator">Administrator</SelectItem>
                <SelectItem value="umum">Umum</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Nama</TableHead>
                  <TableHead className="font-semibold">NIP</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Jabatan</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Tidak ada pengguna ditemukan</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((emp, i) => {
                    const role = (emp.role as UserRole) || 'viewer';
                    const RoleIcon = ROLE_ICONS[role];
                    return (
                      <TableRow key={emp.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                        <TableCell className="font-medium text-sm">{emp.name}</TableCell>
                        <TableCell className="text-sm font-mono">{emp.nip}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{emp.email}</TableCell>
                        <TableCell className="text-sm">{emp.position || '-'}</TableCell>
                        <TableCell>
                          <Select value={emp.role} onValueChange={(v: UserRole) => handleRoleChange(emp.id, v)} disabled={changingRole === emp.id}>
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <div className="flex items-center gap-1.5">
                                <RoleIcon className="w-3.5 h-3.5" />
                                <SelectValue />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="administrator">Administrator</SelectItem>
                              <SelectItem value="umum">Umum</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={emp.is_active ? 'default' : 'secondary'}
                            className={`text-xs cursor-pointer`}
                            onClick={() => handleToggleActive(emp.id, emp.is_active)}
                          >
                            {emp.is_active ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setEditingEmployee(emp);
                              setEditForm({ name: emp.name, position: emp.position || '', nip: emp.nip });
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pegawai</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Nama</Label>
              <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Jabatan</Label>
              <Input value={editForm.position} onChange={e => setEditForm(p => ({ ...p, position: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={handleEditSave}>Simpan Perubahan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

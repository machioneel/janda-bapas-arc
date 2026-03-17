import { useState } from 'react';
import { useEmployees, useUpdateEmployeeRole, useUpdateEmployee } from '@/hooks/useEmployees';
import type { UserRole } from '@/types/employee';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserCog, Shield, Eye, Users } from 'lucide-react';

const ROLE_LABELS: Record<UserRole, string> = {
  administrator: 'Administrator',
  umum: 'Umum',
  viewer: 'Viewer',
};

const ROLE_ICONS: Record<UserRole, typeof Shield> = {
  administrator: Shield,
  umum: UserCog,
  viewer: Eye,
};

export default function AdminPanelPage() {
  const { data: employees, isLoading } = useEmployees();
  const updateRole = useUpdateEmployeeRole();
  const updateEmployee = useUpdateEmployee();
  const [changingRole, setChangingRole] = useState<string | null>(null);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Users className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground">Kelola pengguna dan hak akses</p>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Daftar Pegawai</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Nama</TableHead>
                  <TableHead className="font-semibold">NIP</TableHead>
                  <TableHead className="font-semibold">Jabatan</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : employees?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Belum ada pegawai
                    </TableCell>
                  </TableRow>
                ) : (
                  employees?.map((emp, i) => {
                    const RoleIcon = ROLE_ICONS[(emp.role as UserRole) || 'viewer'];
                    return (
                      <TableRow key={emp.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                        <TableCell className="font-medium text-sm">{emp.name}</TableCell>
                        <TableCell className="text-sm font-mono">{emp.nip}</TableCell>
                        <TableCell className="text-sm">{emp.position || '-'}</TableCell>
                        <TableCell>
                          <Select
                            value={emp.role}
                            onValueChange={(v: UserRole) => handleRoleChange(emp.id, v)}
                            disabled={changingRole === emp.id}
                          >
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
                          <Badge variant={emp.is_active ? 'default' : 'secondary'} className="text-xs">
                            {emp.is_active ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(emp.id, emp.is_active)}
                            className="text-xs"
                          >
                            {emp.is_active ? 'Nonaktifkan' : 'Aktifkan'}
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
    </div>
  );
}

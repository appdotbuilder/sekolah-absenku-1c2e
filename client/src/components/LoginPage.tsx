import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import { mockLogin } from './auth/StubAuth';
import { BookOpen, GraduationCap, School, Users, CheckCircle, Clock, Calendar } from 'lucide-react';
import type { LoginInput, AuthResponse } from '../../../server/src/schema';

interface LoginPageProps {
  onLogin: (user: AuthResponse['user']) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [formData, setFormData] = useState<LoginInput>({
    role: 'siswa',
    username: '',
    nip: '',
    nisn: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = (role: 'admin' | 'guru' | 'siswa') => {
    setFormData(prev => ({
      ...prev,
      role,
      username: '',
      nip: '',
      nisn: '',
      password: ''
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // STUB: Using mock login for demo purposes
      // TODO: Replace with actual tRPC call when backend is implemented
      const response = await mockLogin(formData);
      
      if (response.success && response.user) {
        onLogin(response.user);
      } else {
        setError(response.message || 'Login gagal');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Terjadi kesalahan saat login. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Users className="w-5 h-5" />;
      case 'guru': return <GraduationCap className="w-5 h-5" />;
      case 'siswa': return <BookOpen className="w-5 h-5" />;
      default: return <School className="w-5 h-5" />;
    }
  };

  const getInputPlaceholder = () => {
    switch (formData.role) {
      case 'admin': return 'Masukkan username';
      case 'guru': return 'Masukkan NIP';
      case 'siswa': return 'Masukkan NISN';
      default: return 'Masukkan identitas';
    }
  };

  const getInputValue = () => {
    switch (formData.role) {
      case 'admin': return formData.username || '';
      case 'guru': return formData.nip || '';
      case 'siswa': return formData.nisn || '';
      default: return '';
    }
  };

  const handleInputChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      username: prev.role === 'admin' ? value : '',
      nip: prev.role === 'guru' ? value : '',
      nisn: prev.role === 'siswa' ? value : ''
    }));
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 animate-float">
          <BookOpen className="w-24 h-24 text-white" />
        </div>
        <div className="absolute top-1/4 right-20 animate-float-delayed">
          <GraduationCap className="w-32 h-32 text-white" />
        </div>
        <div className="absolute bottom-1/4 left-1/4 animate-bounce">
          <School className="w-20 h-20 text-white" />
        </div>
        <div className="absolute bottom-10 right-10 animate-pulse">
          <Users className="w-28 h-28 text-white" />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Welcome Section */}
          <div className="text-white space-y-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-full bg-white/20 backdrop-blur-md">
                  <School className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  Sekolah Absenku
                </h1>
              </div>
              <p className="text-xl text-blue-100 leading-relaxed">
                Sistem Absensi Digital Modern untuk Sekolah yang Efisien dan Terpercaya
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="grid gap-4">
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <span className="text-lg">Absensi Real-time & Akurat</span>
              </div>
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
                <Clock className="w-6 h-6 text-blue-400" />
                <span className="text-lg">Monitoring Kehadiran Otomatis</span>
              </div>
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
                <Calendar className="w-6 h-6 text-purple-400" />
                <span className="text-lg">Laporan Komprehensif</span>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto">
            <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-white flex items-center justify-center space-x-2">
                  {getRoleIcon(formData.role)}
                  <span>Masuk Akun</span>
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Pilih role dan masukkan kredensial Anda
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Role Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Role</label>
                    <Select value={formData.role} onValueChange={handleRoleChange}>
                      <SelectTrigger className="bg-white/10 border-white/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="siswa">
                          <div className="flex items-center space-x-2">
                            <BookOpen className="w-4 h-4" />
                            <span>Siswa</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="guru">
                          <div className="flex items-center space-x-2">
                            <GraduationCap className="w-4 h-4" />
                            <span>Guru</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4" />
                            <span>Admin</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Identity Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">
                      {formData.role === 'admin' ? 'Username' : 
                       formData.role === 'guru' ? 'NIP' : 'NISN'}
                    </label>
                    <Input
                      value={getInputValue()}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e.target.value)}
                      placeholder={getInputPlaceholder()}
                      className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                      required
                    />
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Password</label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setFormData(prev => ({ ...prev, password: e.target.value }))
                      }
                      placeholder="Masukkan password"
                      className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                      required
                    />
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/20 border border-red-400/50">
                      <p className="text-red-300 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Login Button */}
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Memverifikasi...</span>
                      </div>
                    ) : (
                      'Masuk'
                    )}
                  </Button>
                </form>

                {/* Demo Credentials */}
                <div className="mt-6 pt-6 border-t border-white/20">
                  <p className="text-xs text-blue-200 text-center mb-3">Akun Demo:</p>
                  <div className="text-xs text-blue-100 space-y-1">
                    <div>👨‍💼 Admin: admin / admin123</div>
                    <div>👨‍🏫 Guru: 1987654321 / guru123</div>
                    <div>👨‍🎓 Siswa: 1234567890 / siswa123</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>


    </div>
  );
}
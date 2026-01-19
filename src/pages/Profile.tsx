import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { userAPI } from '@/integrations/laravel/api';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Upload, User } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

const profileSchema = z.object({
  display_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100),
  email: z.string().email('Email invalide'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// Utility function to crop and resize image to a square
const cropAndResizeImage = (file: File, size: number = 256): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate centered square crop
      const minDimension = Math.min(img.width, img.height);
      const offsetX = (img.width - minDimension) / 2;
      const offsetY = (img.height - minDimension) / 2;

      // Set canvas size to desired output size
      canvas.width = size;
      canvas.height = size;

      // Draw cropped and resized image
      ctx.drawImage(
        img,
        offsetX, offsetY, minDimension, minDimension,  // Source (centered square)
        0, 0, size, size                                // Destination (256x256)
      );

      // Convert to JPEG Blob
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to convert image'));
        },
        'image/jpeg',
        0.9  // 90% quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

const Profile = () => {
  const { user, profile, setProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (profile) {
      setValue('display_name', profile.display_name || '');
      setValue('email', profile.email);
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile, setValue]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image doit faire moins de 2MB');
      return;
    }

    toast.info('Avatar upload functionality temporarily disabled - Laravel file storage pending implementation');
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setLoading(true);

    try {
      // Update profile using Laravel API
      const response = await userAPI.updateProfile(data);

      setProfile({ ...profile!, display_name: data.display_name, email: data.email });
      toast.success('Profil mis à jour avec succès');

      // Note: Email changes in Laravel typically require separate verification process
      if (data.email !== user.email) {
        toast.info('Note: Email changes may require verification through Laravel backend');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mon Profil</h1>
          <p className="text-muted-foreground">Gérez vos informations personnelles</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Photo de profil</CardTitle>
            <CardDescription>
              Téléchargez une photo pour personnaliser votre profil
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
              <AvatarFallback className="text-2xl">
                <User className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="hidden"
              />
              <Label htmlFor="avatar">
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => document.getElementById('avatar')?.click()}
                  className="cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Téléchargement...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Changer l'avatar
                    </>
                  )}
                </Button>
              </Label>
              <p className="text-xs text-muted-foreground mt-2">
                JPG, PNG ou GIF. Max 2MB.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>
              Mettez à jour vos informations de profil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Nom d'affichage</Label>
                <Input
                  id="display_name"
                  {...register('display_name')}
                  placeholder="Votre nom"
                />
                {errors.display_name && (
                  <p className="text-sm text-destructive">{errors.display_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="votre@email.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Si vous changez votre email, vous devrez confirmer la nouvelle adresse.
                </p>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer les modifications'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;

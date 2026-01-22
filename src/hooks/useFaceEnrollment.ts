import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnrollFaceParams {
  volunteerId: string;
  volunteerName: string;
  planningCenterId?: string;
  source: 'profile' | 'volunteer_qrcode';
  faceDescriptor: Float32Array;
  photoBlob?: Blob;
}

export function useFaceEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: EnrollFaceParams) => {
      const { volunteerId, volunteerName, planningCenterId, source, faceDescriptor, photoBlob } = params;
      
      // Convert Float32Array to regular array for storage
      const descriptorArray = Array.from(faceDescriptor);
      
      // Upload photo if provided
      let photoUrl: string | null = null;
      if (photoBlob) {
        const fileName = `${volunteerId}_${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('face-photos')
          .upload(fileName, photoBlob, {
            contentType: 'image/jpeg',
            upsert: true,
          });
        
        if (uploadError) {
          console.error('Photo upload error:', uploadError);
          throw new Error('Falha ao enviar foto');
        }
        
        const { data: urlData } = supabase.storage
          .from('face-photos')
          .getPublicUrl(fileName);
        
        photoUrl = urlData.publicUrl;
      }

      // Update the appropriate table based on source
      if (source === 'profile') {
        // Format descriptor as PostgreSQL vector string
        const vectorString = `[${descriptorArray.join(',')}]`;
        
        const { error } = await supabase
          .from('profiles')
          .update({ 
            face_descriptor: vectorString,
            avatar_url: photoUrl || undefined,
          })
          .eq('id', volunteerId);
        
        if (error) {
          console.error('Profile update error:', error);
          throw new Error('Falha ao salvar dados faciais');
        }
      } else {
        // For volunteer_qrcodes, update by id
        const vectorString = `[${descriptorArray.join(',')}]`;
        
        const { error } = await supabase
          .from('volunteer_qrcodes')
          .update({ 
            face_descriptor: vectorString,
            avatar_url: photoUrl || undefined,
          })
          .eq('id', volunteerId);
        
        if (error) {
          console.error('Volunteer QR code update error:', error);
          throw new Error('Falha ao salvar dados faciais');
        }
      }

      return { success: true, photoUrl };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volunteers-qrcodes'] });
      toast.success('Rosto cadastrado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao cadastrar rosto');
    },
  });
}

interface FaceMatchResult {
  volunteer_id: string | null;
  volunteer_name: string;
  planning_center_id: string | null;
  source: string;
  distance: number;
}

export function useFaceMatch() {
  return useMutation({
    mutationFn: async (faceDescriptor: Float32Array): Promise<FaceMatchResult | null> => {
      const descriptorArray = Array.from(faceDescriptor);
      const vectorString = `[${descriptorArray.join(',')}]`;
      
      const { data, error } = await supabase.rpc('find_face_match', {
        query_descriptor: vectorString,
        match_threshold: 0.6,
      });
      
      if (error) {
        console.error('Face match error:', error);
        throw new Error('Erro ao buscar correspondência facial');
      }
      
      if (data && data.length > 0) {
        return data[0] as FaceMatchResult;
      }
      
      return null;
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { averageDescriptors } from '@/lib/faceUtils';

interface EnrollFaceParams {
  volunteerId: string;
  volunteerName: string;
  planningCenterId?: string;
  source: 'profile' | 'volunteer_qrcode';
  faceDescriptors: Float32Array[]; // Support multiple descriptors for multi-angle capture
  photoBlob?: Blob;
}

export function useFaceEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      volunteerId,
      volunteerName,
      source,
      faceDescriptors,
      photoBlob,
    }: EnrollFaceParams) => {
      // Validate we have at least one descriptor
      if (faceDescriptors.length === 0) {
        throw new Error('Nenhum descritor facial fornecido');
      }

      // Calculate average descriptor if multiple angles provided
      const finalDescriptor = averageDescriptors(faceDescriptors);
      
      // Convert Float32Array to regular number array for RPC
      const descriptorArray = Array.from(finalDescriptor);
      
      // Validate descriptor length
      if (descriptorArray.length !== 128) {
        throw new Error(`Descriptor inválido: esperado 128 dimensões, recebido ${descriptorArray.length}`);
      }

      console.log(`Processing ${faceDescriptors.length} descriptor(s) for enrollment`);

      // Upload photo if provided
      let photoUrl: string | null = null;
      if (photoBlob) {
        const fileName = `${volunteerId}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('face-photos')
          .upload(fileName, photoBlob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          console.error('Photo upload error:', uploadError);
          // Continue without photo - not critical
        } else {
          const { data: urlData } = supabase.storage
            .from('face-photos')
            .getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }
      }

      console.log('Saving face descriptor via RPC:', {
        volunteerId,
        volunteerName,
        source,
        descriptorLength: descriptorArray.length,
        descriptorSample: descriptorArray.slice(0, 5),
        photoUrl,
      });

      // Use the appropriate RPC function based on source
      if (source === 'profile') {
        const { data, error } = await supabase.rpc('save_profile_face_descriptor', {
          profile_id: volunteerId,
          descriptor: descriptorArray,
          photo_url: photoUrl,
        });

        if (error) {
          console.error('Profile RPC error:', error);
          throw new Error('Falha ao salvar dados faciais: ' + error.message);
        }

        if (!data || data.length === 0) {
          console.error('No profile rows returned from RPC');
          throw new Error('Perfil não encontrado. Verifique o ID.');
        }

        const result = data[0];
        if (!result.saved) {
          console.error('Profile face_descriptor not saved:', result);
          throw new Error('Falha ao persistir dados faciais. Tente novamente.');
        }

        console.log('Profile face descriptor saved successfully:', result);
      } else {
        // For volunteer_qrcodes
        const { data, error } = await supabase.rpc('save_volunteer_qrcode_face_descriptor', {
          qrcode_id: volunteerId,
          descriptor: descriptorArray,
          photo_url: photoUrl,
        });

        if (error) {
          console.error('Volunteer QR code RPC error:', error);
          throw new Error('Falha ao salvar dados faciais: ' + error.message);
        }

        if (!data || data.length === 0) {
          console.error('No volunteer_qrcodes rows returned from RPC');
          throw new Error('Voluntário não encontrado. Verifique o ID.');
        }

        const result = data[0];
        if (!result.saved) {
          console.error('Volunteer face_descriptor not saved:', result);
          throw new Error('Falha ao persistir dados faciais. Tente novamente.');
        }

        console.log('Volunteer QR code face descriptor saved successfully:', {
          id: result.id,
          name: result.volunteer_name,
          saved: result.saved,
        });
      }

      return { success: true, photoUrl };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volunteers-qrcodes'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Rosto cadastrado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Face enrollment failed:', error);
      toast.error(error.message || 'Falha ao cadastrar rosto');
    },
  });
}

// Match face against enrolled faces
export interface FaceMatchResult {
  volunteer_id: string;
  volunteer_name: string;
  planning_center_id: string | null;
  avatar_url: string | null;
  source: string;
  distance: number;
}

export function useFaceMatch() {
  return useMutation({
    mutationFn: async (faceDescriptor: Float32Array): Promise<FaceMatchResult | null> => {
      const descriptorArray = Array.from(faceDescriptor);
      
      // Format as PostgreSQL vector string for the RPC
      const vectorString = `[${descriptorArray.join(',')}]`;

      const { data, error } = await supabase.rpc('find_face_match', {
        query_descriptor: vectorString,
        match_threshold: 0.6,
      });

      if (error) {
        console.error('Face match error:', error);
        throw error;
      }

      if (data && data.length > 0) {
        const match = data[0];
        console.log('Face match found:', {
          name: match.volunteer_name,
          distance: match.distance,
          source: match.source,
        });
        return match;
      }

      console.log('No face match found');
      return null;
    },
  });
}
